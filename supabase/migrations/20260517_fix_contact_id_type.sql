-- estimate_requests.id は BIGINT だが contact_unlocks / stripe_payments は uuid 型で定義されていた。
-- job_applications.estimate_request_id は TEXT (bigint 文字列) として保存されているため
-- 連絡先開示が常に失敗していた。uuid → text に変更して一致させる。

-- ── contact_unlocks ───────────────────────────────────────────────────────────
ALTER TABLE public.contact_unlocks
  ALTER COLUMN estimate_request_id TYPE text USING estimate_request_id::text;

-- ── stripe_payments ───────────────────────────────────────────────────────────
ALTER TABLE public.stripe_payments
  ALTER COLUMN estimate_request_id TYPE text USING estimate_request_id::text;

-- ── unlock_contact RPC: uuid → text ──────────────────────────────────────────
-- 旧シグネチャを削除してから再作成
DROP FUNCTION IF EXISTS public.unlock_contact(text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.unlock_contact(
  p_craftsman_id         text,
  p_estimate_request_id  text,
  p_unlock_type          text  DEFAULT 'free',
  p_payment_id           text  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.contact_unlocks (
    craftsman_id,
    estimate_request_id,
    unlock_type,
    payment_id
  )
  VALUES (
    p_craftsman_id,
    p_estimate_request_id,
    p_unlock_type,
    p_payment_id
  )
  ON CONFLICT (craftsman_id, estimate_request_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_contact(text, text, text, text)
  TO authenticated, service_role;
