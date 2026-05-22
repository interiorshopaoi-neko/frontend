-- ================================================================
-- 紹介ボーナス付与タイミング変更
-- 「プロフィール保存時」→「紹介相手の初回連絡先開示時」へ
--
-- 背景:
--   プロフィール保存時に付与すると複数アカウントで無料枠を増やせる。
--   実際にサービスを使った（連絡先開示した）ことを確認してから付与する。
--
-- 変更内容:
--   1. save_referred_by:
--        referred_by 保存のみ。+2 付与を削除。
--        pending_bonus: true を返し「後で付与予定」を示す。
--   2. grant_referral_bonus_on_first_unlock (新規):
--        連絡先開示成功時に呼ばれる共通関数。
--        紹介者に +2。referral_bonus_grants で重複防止。
--   3. claim_free_credit_and_get_contact:
--        Step 6 (billing_events INSERT) 後に上記を PERFORM。
--        ネストブロックで例外吸収 → 開示失敗にならない。
--
-- 呼び出し経路:
--   無料枠 : claim_free_credit_and_get_contact (DB トランザクション内)
--   Stripe : check-billing.ts Stripe paid 確認後 await (API 側)
--
-- 冪等設計:
--   referral_bonus_grants.UNIQUE(referred_user_id) で二重付与防止
-- ================================================================

-- ─── 1. save_referred_by (再更新: +2 付与を削除) ─────────────────────────────

DROP FUNCTION IF EXISTS public.save_referred_by(text, text);

CREATE OR REPLACE FUNCTION public.save_referred_by(
  p_user_id     text,   -- 紹介された人の user_id (UUID v4)
  p_referred_by text    -- 紹介コード (PROM-XXXX)
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_user_id text;
  v_already_set      boolean := false;
BEGIN

  -- ── バリデーション ─────────────────────────────────────────────────────────
  IF p_user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'invalid user_id format: must be UUID v4';
  END IF;

  -- ── referred_by が既に設定済みか確認 ─────────────────────────────────────
  SELECT (referred_by IS NOT NULL)
  INTO   v_already_set
  FROM   public.craftsmen
  WHERE  user_id = p_user_id;

  IF v_already_set IS TRUE THEN
    RETURN jsonb_build_object('status', 'already_set');
  END IF;

  -- ── 自己紹介防止 ─────────────────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM public.craftsmen
    WHERE  user_id       = p_user_id
      AND  referral_code = p_referred_by
  ) THEN
    RETURN jsonb_build_object('status', 'self_referral');
  END IF;

  -- ── 紹介コードを持つ職人を検索 ───────────────────────────────────────────
  SELECT user_id
  INTO   v_referrer_user_id
  FROM   public.craftsmen
  WHERE  referral_code = p_referred_by
  LIMIT  1;

  IF v_referrer_user_id IS NULL THEN
    -- 無効な紹介コード → referred_by は保存しない
    RETURN jsonb_build_object('status', 'invalid_code');
  END IF;

  -- ── referred_by を保存するだけ（+2 は初回連絡先開示時に遅延付与）────────
  UPDATE public.craftsmen
     SET referred_by = p_referred_by,
         updated_at  = now()
   WHERE user_id = p_user_id;

  -- pending_bonus: true = 「初回連絡先開示時に紹介者へ +2 付与予定」
  RETURN jsonb_build_object(
    'status',        'ok',
    'referrer',      v_referrer_user_id,
    'pending_bonus', true
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'detail', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_referred_by(text, text) TO anon, authenticated;


-- ─── 2. grant_referral_bonus_on_first_unlock (新規) ─────────────────────────
-- 紹介された職人が初めて連絡先開示した時に、紹介者へ +2 付与する。
--
-- 呼び出し元:
--   - claim_free_credit_and_get_contact (PERFORM, サブブロック内)
--   - check-billing.ts Stripe paid 経路 (await)
--
-- 戻り値 (jsonb):
--   { "status": "granted"       }  — 付与成功
--   { "status": "already_granted" } — 既に付与済み（冪等）
--   { "status": "no_referral"   }  — referred_by 未設定
--   { "status": "referrer_not_found" } — 紹介コード無効
--   { "status": "self_referral" }  — 自己紹介（ガード）
--   { "status": "error", "detail": "..." } — 予期しない例外

DROP FUNCTION IF EXISTS public.grant_referral_bonus_on_first_unlock(text);

CREATE OR REPLACE FUNCTION public.grant_referral_bonus_on_first_unlock(
  p_referred_user_id text   -- 連絡先を開示した職人（紹介された側）の user_id
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_by      text;   -- craftsmen.referred_by に保存された紹介コード
  v_referrer_user_id text;
  v_already_granted  boolean;
BEGIN

  -- ── 紹介コード（referred_by）確認 ────────────────────────────────────────
  SELECT referred_by
  INTO   v_referred_by
  FROM   public.craftsmen
  WHERE  user_id = p_referred_user_id;

  IF v_referred_by IS NULL THEN
    -- 紹介なし → 何もしない
    RETURN jsonb_build_object('status', 'no_referral');
  END IF;

  -- ── 重複付与ソフトチェック（UNIQUE 制約の前に早期リターン）─────────────
  SELECT EXISTS (
    SELECT 1 FROM public.referral_bonus_grants
    WHERE  referred_user_id = p_referred_user_id
  ) INTO v_already_granted;

  IF v_already_granted THEN
    RETURN jsonb_build_object('status', 'already_granted');
  END IF;

  -- ── 紹介者を取得（referral_code で検索）─────────────────────────────────
  SELECT user_id
  INTO   v_referrer_user_id
  FROM   public.craftsmen
  WHERE  referral_code = v_referred_by
  LIMIT  1;

  IF v_referrer_user_id IS NULL THEN
    -- 紹介コード無効 or 紹介者削除済み
    RETURN jsonb_build_object('status', 'referrer_not_found');
  END IF;

  -- ── 自己紹介ガード ────────────────────────────────────────────────────────
  IF v_referrer_user_id = p_referred_user_id THEN
    RETURN jsonb_build_object('status', 'self_referral');
  END IF;

  -- ── 紹介者の referral_bonus_credits += 2 ─────────────────────────────────
  UPDATE public.craftsmen
     SET referral_bonus_credits = referral_bonus_credits + 2,
         updated_at             = now()
   WHERE user_id = v_referrer_user_id;

  -- ── ログ記録（ON CONFLICT DO NOTHING で並行呼び出しも安全）─────────────
  INSERT INTO public.referral_bonus_grants (
    referrer_user_id, referred_user_id, bonus_amount
  ) VALUES (
    v_referrer_user_id, p_referred_user_id, 2
  )
  ON CONFLICT (referred_user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'status',  'granted',
    'referrer', v_referrer_user_id,
    'bonus',   2
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'detail', SQLERRM);
END;
$$;

-- anon / authenticated に呼び出し権限付与
-- （check-billing.ts からは anon key 経由で呼ぶため）
GRANT EXECUTE ON FUNCTION public.grant_referral_bonus_on_first_unlock(text) TO anon, authenticated;


-- ─── 3. claim_free_credit_and_get_contact (再定義) ───────────────────────────
-- 変更点: Step 7 として grant_referral_bonus_on_first_unlock を PERFORM。
--   - ネストした BEGIN...EXCEPTION...END ブロックで例外を吸収
--   - ボーナス付与失敗が連絡先開示をブロックしない

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

  -- ── Step 7: 紹介ボーナス付与（初回開示時のみ有効）───────────────────────────
  -- ネストブロックで例外を吸収 → ボーナス付与失敗が連絡先開示をブロックしない
  BEGIN
    PERFORM public.grant_referral_bonus_on_first_unlock(p_craftsman_id);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- 失敗は無視してトランザクションを継続
  END;

  -- ── Step 8: 連絡先を返す ─────────────────────────────────────────────────────
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
