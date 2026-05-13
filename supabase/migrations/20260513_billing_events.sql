-- ================================================================
-- 課金基盤 MVP（Stripeなし）
--
-- 1. billing_events テーブル作成
-- 2. craftsmen に課金管理カラム追加
-- 3. claim_free_credit_and_get_contact() SECURITY DEFINER RPC
--    ── アトミックにクレジット消費＋billing_event INSERT＋連絡先返却
--
-- RLS 方針:
--   billing_events は RLS で全ロール拒否（直接アクセス禁止）。
--   連絡先取得・課金記録はすべて SECURITY DEFINER 関数経由のみ。
-- ================================================================

-- ─── 1. billing_events テーブル ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.billing_events (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 誰が
  craftsman_id              text        NOT NULL,   -- craftsmen.user_id
  application_id            uuid        NOT NULL,   -- job_applications.id

  -- 何を
  event_type                text        NOT NULL DEFAULT 'contact_disclosure',
  -- 将来: 'subscription_month' | 'premium_listing' 等に拡張

  -- 無料 or 有料
  is_free                   boolean     NOT NULL DEFAULT false,
  free_reason               text,
  -- 'initial_credits'  : 初回2件無料
  -- 'referral_bonus'   : 紹介+1件
  -- 'admin_grant'      : 管理者付与
  -- NULL               : 有料（Stripe経由）

  -- Stripe 用（今回は未使用・NULL のまま）
  amount_jpy                integer,
  stripe_session_id         text,
  stripe_payment_intent_id  text,
  stripe_status             text,
  -- 'pending' | 'paid' | 'failed' | 'refunded'

  paid_at                   timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),

  -- 同一 application への二重課金防止
  UNIQUE (application_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_events_craftsman
  ON public.billing_events (craftsman_id, created_at DESC);

-- RLS: 全ロール直接アクセス禁止（SECURITY DEFINER 関数のみがアクセス）
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
-- ポリシーを一切作らないことで、anon / authenticated とも SELECT/INSERT 不可

-- ─── 2. craftsmen 課金管理カラム追加 ─────────────────────────────────────────

ALTER TABLE public.craftsmen
  ADD COLUMN IF NOT EXISTS free_credits_remaining   integer NOT NULL DEFAULT 2,
  -- 残り初回無料枠（新規登録時 2）
  ADD COLUMN IF NOT EXISTS referral_bonus_credits   integer NOT NULL DEFAULT 0,
  -- 紹介で付与されるボーナス無料枠
  ADD COLUMN IF NOT EXISTS total_contacts_used      integer NOT NULL DEFAULT 0,
  -- 累計連絡先確認数（分析・監査用）
  ADD COLUMN IF NOT EXISTS referred_by              text;
  -- 紹介元職人の user_id（紹介+1ロジック用。将来実装）

-- ─── 3. claim_free_credit_and_get_contact() ──────────────────────────────────
--
-- 呼び出し: POST /rest/v1/rpc/claim_free_credit_and_get_contact
--           { p_application_id: uuid, p_craftsman_id: text }
--
-- 戻り値 (result):
--   'ok'              → クレジット消費・billing_event INSERT・連絡先返却
--   'already_unlocked'→ 既存 billing_event あり・連絡先を再返却
--   'no_credits'      → 無料枠なし → API は payment_required を返す
--   'not_contracted'  → is_contracted != true
--   'error'           → craftsmen 行が存在しない等

DROP FUNCTION IF EXISTS public.claim_free_credit_and_get_contact(uuid, text);

CREATE OR REPLACE FUNCTION public.claim_free_credit_and_get_contact(
  p_application_id uuid,
  p_craftsman_id   text
)
RETURNS TABLE (
  result         text,
  contact_method text,
  contact_value  text,
  free_reason    text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_craftsman record;
  v_app       record;
  v_reason    text;
BEGIN
  -- ── Step 1: 既存 billing_event チェック（冪等）──────────────────────────────
  IF EXISTS (
    SELECT 1 FROM public.billing_events
    WHERE  application_id = p_application_id
      AND  craftsman_id   = p_craftsman_id
  ) THEN
    RETURN QUERY
      SELECT 'already_unlocked'::text,
             er.contact_method::text,
             er.contact_value::text,
             be.free_reason::text
      FROM   public.billing_events be
      JOIN   public.job_applications ja
             ON  ja.id            = be.application_id
      JOIN   public.estimate_requests er
             ON  er.id::text      = ja.estimate_request_id  -- bigint::text = text ✓
      WHERE  be.application_id = p_application_id
        AND  be.craftsman_id   = p_craftsman_id
      LIMIT 1;
    RETURN;
  END IF;

  -- ── Step 2: 成約確認 ─────────────────────────────────────────────────────────
  SELECT ja.is_contracted, ja.craftsman_id
  INTO   v_app
  FROM   public.job_applications ja
  WHERE  ja.id           = p_application_id
    AND  ja.craftsman_id = p_craftsman_id::uuid;            -- uuid = uuid ✓

  IF NOT FOUND OR NOT COALESCE(v_app.is_contracted, false) THEN
    RETURN QUERY
      SELECT 'not_contracted'::text, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- ── Step 3: 職人クレジット取得（排他ロック）─────────────────────────────────
  SELECT free_credits_remaining, referral_bonus_credits
  INTO   v_craftsman
  FROM   public.craftsmen
  WHERE  user_id = p_craftsman_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY
      SELECT 'error'::text, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- ── Step 4: 無料枠チェック ───────────────────────────────────────────────────
  IF v_craftsman.free_credits_remaining <= 0
     AND v_craftsman.referral_bonus_credits <= 0
  THEN
    RETURN QUERY
      SELECT 'no_credits'::text, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- ── Step 5: クレジット消費（initial_credits 優先）──────────────────────────
  IF v_craftsman.free_credits_remaining > 0 THEN
    v_reason := 'initial_credits';
    UPDATE public.craftsmen
       SET free_credits_remaining = free_credits_remaining - 1,
           total_contacts_used    = total_contacts_used    + 1,
           updated_at             = now()
     WHERE user_id = p_craftsman_id;
  ELSE
    v_reason := 'referral_bonus';
    UPDATE public.craftsmen
       SET referral_bonus_credits = referral_bonus_credits - 1,
           total_contacts_used    = total_contacts_used    + 1,
           updated_at             = now()
     WHERE user_id = p_craftsman_id;
  END IF;

  -- ── Step 6: billing_events INSERT（UNIQUE 制約で二重 INSERT 防止）──────────
  INSERT INTO public.billing_events (
    craftsman_id, application_id, event_type, is_free, free_reason
  ) VALUES (
    p_craftsman_id, p_application_id, 'contact_disclosure', true, v_reason
  )
  ON CONFLICT (application_id) DO NOTHING;

  -- ── Step 7: 連絡先を返す ─────────────────────────────────────────────────────
  RETURN QUERY
    SELECT 'ok'::text,
           er.contact_method::text,
           er.contact_value::text,
           v_reason::text
    FROM   public.job_applications ja
    JOIN   public.estimate_requests er
           ON  er.id::text = ja.estimate_request_id    -- bigint::text = text ✓
    WHERE  ja.id = p_application_id
    LIMIT 1;
END;
$$;

GRANT EXECUTE
  ON FUNCTION public.claim_free_credit_and_get_contact(uuid, text)
  TO anon, authenticated;

-- ─── 追記: get_my_free_credits() ─────────────────────────────────────────────
-- 無料クレジット残数を SECURITY DEFINER で返す（RLS バイパス）
-- フロントエンドの表示専用。課金判定の正は claim_free_credit_and_get_contact。

CREATE OR REPLACE FUNCTION public.get_my_free_credits(p_user_id text)
RETURNS TABLE (
  free_credits_remaining  int,
  referral_bonus_credits  int,
  total_contacts_used     int
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT free_credits_remaining, referral_bonus_credits, total_contacts_used
  FROM   public.craftsmen
  WHERE  user_id = p_user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_free_credits(text) TO anon, authenticated;
