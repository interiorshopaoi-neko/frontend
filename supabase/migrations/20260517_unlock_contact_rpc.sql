-- ================================================================
-- unlock_contact() SECURITY DEFINER RPC
--
-- 目的:
--   連絡先開示をアトミックに処理する。
--   無料枠の二重消費・同時開示競合・重複開示を防ぐ。
--
-- 戻り値 (json):
--   { "ok": true,  "already_unlocked": false }  — 開示成功
--   { "ok": true,  "already_unlocked": true  }  — 既に開示済み（冪等）
--
-- 例外 (RAISE EXCEPTION → HTTP 400 相当):
--   'INVALID_UNLOCK_TYPE' — p_unlock_type が 'free'/'paid'/'admin' 以外
--   'NO_FREE_UNLOCKS'     — free_unlocks が 0 以下
--
-- 同時実行安全性:
--   free type: craftsman_free_credits 行を FOR UPDATE でロックし直列化。
--              ロック取得後に contact_unlocks を再確認して競合を防ぐ。
--   paid/admin: ロックなし。contact_unlocks の UNIQUE 制約が最終防衛。
--              unique_violation は EXCEPTION ブロックで already_unlocked: true に変換。
--
-- SECURITY DEFINER + search_path 固定:
--   RLS をバイパスして 3 テーブル（craftsman_free_credits / contact_unlocks /
--   stripe_payments）に直接アクセスする。anon / authenticated の直接 INSERT は不可。
-- ================================================================

DROP FUNCTION IF EXISTS public.unlock_contact(text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.unlock_contact(
  p_craftsman_id         text,
  p_estimate_request_id  uuid,
  p_unlock_type          text  DEFAULT 'free',
  p_payment_id           text  DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits   integer;
BEGIN

  -- ── Step 1: unlock_type バリデーション ──────────────────────────────────────
  IF p_unlock_type NOT IN ('free', 'paid', 'admin') THEN
    RAISE EXCEPTION 'INVALID_UNLOCK_TYPE: %', p_unlock_type;
  END IF;

  -- ── Step 2: already_unlocked 確認（ファストパス）─────────────────────────────
  -- ロックなしで先に確認し、大多数の冪等呼び出しを早期リターンさせる。
  IF EXISTS (
    SELECT 1
    FROM   public.contact_unlocks
    WHERE  craftsman_id        = p_craftsman_id
      AND  estimate_request_id = p_estimate_request_id
  ) THEN
    RETURN json_build_object('ok', true, 'already_unlocked', true);
  END IF;

  -- ── Step 3: free の場合のみ残数確認 + decrement ──────────────────────────────
  IF p_unlock_type = 'free' THEN

    -- 行が存在しない職人は free_unlocks=2 で自動作成
    -- ON CONFLICT DO NOTHING で並行 INSERT を安全に処理
    INSERT INTO public.craftsman_free_credits (craftsman_id, free_unlocks)
    VALUES (p_craftsman_id, 2)
    ON CONFLICT (craftsman_id) DO NOTHING;

    -- FOR UPDATE: 同一 craftsman_id の同時呼び出しを直列化
    SELECT free_unlocks
    INTO   v_credits
    FROM   public.craftsman_free_credits
    WHERE  craftsman_id = p_craftsman_id
    FOR UPDATE;

    -- ロック取得後に already_unlocked を再確認
    -- （Step 2 チェック後 → ロック取得前の競合ウィンドウを閉じる）
    IF EXISTS (
      SELECT 1
      FROM   public.contact_unlocks
      WHERE  craftsman_id        = p_craftsman_id
        AND  estimate_request_id = p_estimate_request_id
    ) THEN
      RETURN json_build_object('ok', true, 'already_unlocked', true);
    END IF;

    -- 残数確認（FOR UPDATE ロック保持中なので安全）
    IF v_credits <= 0 THEN
      RAISE EXCEPTION 'NO_FREE_UNLOCKS';
    END IF;

    -- decrement（FOR UPDATE でロック保持中のため negative は起こらない）
    UPDATE public.craftsman_free_credits
    SET    free_unlocks = free_unlocks - 1,
           updated_at   = now()
    WHERE  craftsman_id = p_craftsman_id;

  END IF;
  -- paid / admin は残数操作なし

  -- ── Step 4: contact_unlocks insert ──────────────────────────────────────────
  -- UNIQUE (craftsman_id, estimate_request_id) 違反は EXCEPTION ブロックで捕捉
  INSERT INTO public.contact_unlocks (
    craftsman_id,
    estimate_request_id,
    unlock_type,
    payment_id
  ) VALUES (
    p_craftsman_id,
    p_estimate_request_id,
    p_unlock_type,
    p_payment_id
  );

  -- ── Step 5: return ──────────────────────────────────────────────────────────
  RETURN json_build_object('ok', true, 'already_unlocked', false);

EXCEPTION
  -- unique_violation (SQLSTATE 23505):
  --   paid/admin で同時に 2 リクエストが Step 2 をすり抜けた場合に発生。
  --   free type では FOR UPDATE + 再確認により通常到達しないが念のため保護。
  WHEN unique_violation THEN
    RETURN json_build_object('ok', true, 'already_unlocked', true);

END;
$$;

-- anon / authenticated に実行権限を付与（呼び出し自体は API Route 経由を想定）
GRANT EXECUTE
  ON FUNCTION public.unlock_contact(text, uuid, text, text)
  TO anon, authenticated;
