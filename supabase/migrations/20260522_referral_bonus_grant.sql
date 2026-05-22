-- ================================================================
-- 紹介ボーナス付与 MVP (+2 credits)
--
-- 1. referral_bonus_grants テーブル  — 重複付与防止ログ
-- 2. save_referred_by 関数を更新
--      変更点:
--        - 戻り値: void → jsonb (呼び出し元がエラーを判別可能)
--        - 紹介成功時に紹介者の referral_bonus_credits += 2
--        - referral_bonus_grants に記録して重複付与を防止
--        - 自己紹介・無効コード・既設定を明示的にハンドル
--
-- 注意:
--   - 付与タイミング: 紹介された職人がプロフィールを保存し
--     save_referred_by を呼んだ瞬間（upsert_craftsman_profile 後）
--   - +2 は紹介者 (craftsmen.referral_bonus_credits) に加算
--   - 1 人の被紹介者につき 1 回のみ（UNIQUE referred_user_id）
-- ================================================================

-- ─── 1. referral_bonus_grants ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_bonus_grants (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id text        NOT NULL,  -- 無料枠を受け取った職人 (craftsmen.user_id)
  referred_user_id text        NOT NULL,  -- 紹介された職人 (craftsmen.user_id)
  bonus_amount     integer     NOT NULL DEFAULT 2,
  granted_at       timestamptz NOT NULL DEFAULT now(),

  -- 1 人の被紹介者につき 1 回のみ付与
  UNIQUE (referred_user_id)
);

COMMENT ON TABLE  public.referral_bonus_grants IS '紹介ボーナス付与ログ（重複付与防止）';
COMMENT ON COLUMN public.referral_bonus_grants.referrer_user_id IS '紹介した職人の user_id';
COMMENT ON COLUMN public.referral_bonus_grants.referred_user_id IS '紹介された職人の user_id';
COMMENT ON COLUMN public.referral_bonus_grants.bonus_amount     IS '付与クレジット数（現在は固定 2）';

-- RLS: SECURITY DEFINER 関数のみがアクセス（anon / authenticated の直接アクセス不可）
ALTER TABLE public.referral_bonus_grants ENABLE ROW LEVEL SECURITY;

-- ─── 2. save_referred_by (更新) ──────────────────────────────────────────────

-- 旧版 (void 返却) を削除して新版に置き換える
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
  v_already_granted  boolean := false;
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
    WHERE  user_id      = p_user_id
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

  -- ── referred_by を保存 ────────────────────────────────────────────────────
  UPDATE public.craftsmen
     SET referred_by = p_referred_by,
         updated_at  = now()
   WHERE user_id = p_user_id;

  -- ── 重複付与確認 ─────────────────────────────────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM public.referral_bonus_grants
    WHERE  referred_user_id = p_user_id
  ) INTO v_already_granted;

  IF NOT v_already_granted THEN
    -- ── 紹介者の referral_bonus_credits += 2 ─────────────────────────────
    UPDATE public.craftsmen
       SET referral_bonus_credits = referral_bonus_credits + 2,
           updated_at             = now()
     WHERE user_id = v_referrer_user_id;

    -- ── ログ記録（ON CONFLICT DO NOTHING で競合時も安全）────────────────
    INSERT INTO public.referral_bonus_grants (
      referrer_user_id, referred_user_id, bonus_amount
    ) VALUES (
      v_referrer_user_id, p_user_id, 2
    )
    ON CONFLICT (referred_user_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'status',  'ok',
    'referrer', v_referrer_user_id,
    'bonus',    CASE WHEN v_already_granted THEN 0 ELSE 2 END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'detail', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_referred_by(text, text) TO anon, authenticated;
