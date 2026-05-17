-- ================================================================
-- 連絡先開示課金 DB 土台（Stripe Checkout 本体は未実装）
--
-- 1. craftsman_free_credits  — 職人ごとの無料開示残数（独立テーブル）
-- 2. contact_unlocks         — 案件ごとの開示履歴
-- 3. stripe_payments         — Stripe 決済履歴
--
-- RLS 方針:
--   全テーブルで RLS を有効化し、ポリシーを作らない。
--   anon / authenticated の直接アクセスを禁止。
--   将来 SECURITY DEFINER RPC 経由でのみアクセス可能にする。
--
-- 既存テーブルとの関係:
--   billing_events       : application_id ベースの既存課金ログ（変更しない）
--   craftsmen カラム     : free_credits_remaining / referral_bonus_credits（変更しない）
--   contact_unlocks      : estimate_request_id ベース。Stripe 課金後の開示も管理する新テーブル
--   craftsman_free_credits: craftsmen カラムと並存する独立テーブル（将来統合候補）
-- ================================================================

-- ─── 1. craftsman_free_credits ───────────────────────────────────────────────
-- 職人ごとの無料開示残数管理。
-- craftsmen.free_credits_remaining / referral_bonus_credits カラムと並存。
-- 将来 Stripe 課金フローのクレジット管理はこちらに集約予定。

CREATE TABLE IF NOT EXISTS public.craftsman_free_credits (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  craftsman_id     text        NOT NULL UNIQUE,  -- craftsmen.user_id
  free_unlocks     integer     NOT NULL DEFAULT 2,
  referral_bonus   integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.craftsman_free_credits IS '職人ごとの無料連絡先開示残数';
COMMENT ON COLUMN public.craftsman_free_credits.free_unlocks   IS '初回無料枠（新規登録時 2）';
COMMENT ON COLUMN public.craftsman_free_credits.referral_bonus IS '紹介ボーナス枠（紹介完了ごと +1）';

-- RLS: ポリシーなし = 全ロール直接アクセス禁止
ALTER TABLE public.craftsman_free_credits ENABLE ROW LEVEL SECURITY;

-- ─── 2. contact_unlocks ──────────────────────────────────────────────────────
-- 誰がどの案件の連絡先を開示したかの履歴。
-- billing_events（application_id ベース）とは別に estimate_request_id で管理。
-- Stripe 課金後の開示（paid）もここに記録する。

CREATE TABLE IF NOT EXISTS public.contact_unlocks (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  craftsman_id          text        NOT NULL,    -- craftsmen.user_id
  estimate_request_id   uuid        NOT NULL,    -- estimate_requests.id
  unlock_type           text        NOT NULL,    -- 'free' | 'paid' | 'admin'
  payment_id            text        NULL,        -- stripe_payments.id::text（paid の場合）
  unlocked_at           timestamptz NOT NULL DEFAULT now(),

  -- 同一職人 × 同一案件で重複開示しない
  UNIQUE (craftsman_id, estimate_request_id),

  -- unlock_type の値を制限
  CONSTRAINT contact_unlocks_unlock_type_check
    CHECK (unlock_type IN ('free', 'paid', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_contact_unlocks_craftsman
  ON public.contact_unlocks (craftsman_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_unlocks_request
  ON public.contact_unlocks (estimate_request_id);

COMMENT ON TABLE  public.contact_unlocks IS '案件ごとの連絡先開示履歴';
COMMENT ON COLUMN public.contact_unlocks.unlock_type  IS 'free=無料枠 / paid=Stripe課金 / admin=管理者付与';
COMMENT ON COLUMN public.contact_unlocks.payment_id   IS 'paid の場合の stripe_payments.id（UUID を text で保持）';

-- RLS: ポリシーなし = 全ロール直接アクセス禁止
ALTER TABLE public.contact_unlocks ENABLE ROW LEVEL SECURITY;

-- ─── 3. stripe_payments ──────────────────────────────────────────────────────
-- Stripe Checkout Session の決済履歴。
-- billing_events の stripe_session_id カラムとは別の独立テーブル。
-- Stripe Webhook で status を更新する想定。

CREATE TABLE IF NOT EXISTS public.stripe_payments (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  craftsman_id          text        NOT NULL,    -- craftsmen.user_id
  estimate_request_id   uuid        NOT NULL,    -- estimate_requests.id
  stripe_session_id     text        NOT NULL UNIQUE,
  amount                integer     NOT NULL,    -- 金額（最小単位: 円）
  currency              text        NOT NULL DEFAULT 'jpy',
  status                text        NOT NULL,    -- 'pending' | 'paid' | 'failed' | 'refunded'
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT stripe_payments_status_check
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded'))
);

CREATE INDEX IF NOT EXISTS idx_stripe_payments_craftsman
  ON public.stripe_payments (craftsman_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_payments_session
  ON public.stripe_payments (stripe_session_id);

COMMENT ON TABLE  public.stripe_payments IS 'Stripe Checkout 決済履歴';
COMMENT ON COLUMN public.stripe_payments.amount           IS '金額（円）。Stripe は最小通貨単位なので JPY は円をそのまま整数で保存';
COMMENT ON COLUMN public.stripe_payments.stripe_session_id IS 'Stripe Checkout Session ID（cs_xxx）';
COMMENT ON COLUMN public.stripe_payments.status           IS 'pending=決済前 / paid=完了 / failed=失敗 / refunded=返金';

-- RLS: ポリシーなし = 全ロール直接アクセス禁止
ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;
