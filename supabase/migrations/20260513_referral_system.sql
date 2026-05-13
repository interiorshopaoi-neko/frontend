-- ================================================================
-- 紹介制度 MVP
--
-- 1. craftsmen に referral_code カラム追加（UNIQUE）
-- 2. generate_referral_code() ヘルパー
-- 3. 既存 craftsmen に PROM-XXXX 形式でコード付与
-- 4. upsert_craftsman_profile を更新（INSERT 時に referral_code 自動生成）
-- 5. save_referred_by(p_user_id, p_referred_by) SECURITY DEFINER RPC
-- 6. get_my_referral_code(p_user_id)            SECURITY DEFINER RPC
-- ================================================================

-- ─── 1. referral_code カラム ──────────────────────────────────────

ALTER TABLE public.craftsmen
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- ─── 2. generate_referral_code() ─────────────────────────────────
-- PROM-XXXX 形式。紛らわしい文字（0/O, 1/I）を除いた 32 文字セット。
-- 呼び出し元の関数 / DO ブロックから使うためスキーマ修飾で参照する。

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 chars (0/O/1/I 除外)
  len   int  := length(chars);
  code  text;
  i     int;
BEGIN
  FOR i IN 1..50 LOOP
    code := 'PROM-' ||
      substr(chars, 1 + floor(random() * len)::int, 1) ||
      substr(chars, 1 + floor(random() * len)::int, 1) ||
      substr(chars, 1 + floor(random() * len)::int, 1) ||
      substr(chars, 1 + floor(random() * len)::int, 1);
    IF NOT EXISTS (SELECT 1 FROM public.craftsmen WHERE referral_code = code) THEN
      RETURN code;
    END IF;
  END LOOP;
  -- フォールバック（50 回衝突した場合：現実的には発生しない）
  RETURN 'PROM-' || upper(substr(md5(now()::text || random()::text), 1, 4));
END;
$$;

-- ─── 3. 既存 craftsmen に referral_code を付与 ───────────────────

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT user_id FROM public.craftsmen WHERE referral_code IS NULL LOOP
    UPDATE public.craftsmen
      SET referral_code = public.generate_referral_code()
    WHERE user_id = r.user_id;
  END LOOP;
END;
$$;

-- ─── 4. upsert_craftsman_profile 更新 ─────────────────────────────
-- INSERT 時に referral_code を自動生成。
-- ON CONFLICT UPDATE 時は既存コードを保持（COALESCE で NULL 時のみ再生成）。
-- 関数シグネチャは変更しないため DROP 不要。

CREATE OR REPLACE FUNCTION public.upsert_craftsman_profile(
  p_user_id                text,
  p_email                  text,
  p_shop_name              text,
  p_full_name              text,
  p_service_area           text,
  p_radius_km              int,
  p_work_types             text[],
  p_specialty              text,
  p_available_weekdays     text[],
  p_notification_enabled   boolean,
  p_profile_image_url      text,
  p_age                    int,
  p_experience_years       int,
  p_bio                    text,
  p_available_time         text,
  p_has_car                boolean,
  p_has_tools              boolean,
  p_public_profile_enabled boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- UUID v4 形式バリデーション
  IF p_user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'invalid user_id format: must be UUID v4';
  END IF;

  INSERT INTO public.craftsmen (
    user_id, email, shop_name, full_name, service_area, radius_km,
    work_types, specialty, available_weekdays, notification_enabled,
    profile_image_url, age, experience_years, bio, available_time,
    has_car, has_tools, public_profile_enabled, referral_code, updated_at
  ) VALUES (
    p_user_id, p_email, p_shop_name, p_full_name, p_service_area, p_radius_km,
    p_work_types, p_specialty, p_available_weekdays, p_notification_enabled,
    p_profile_image_url, p_age, p_experience_years, p_bio, p_available_time,
    p_has_car, p_has_tools, p_public_profile_enabled,
    public.generate_referral_code(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email                  = EXCLUDED.email,
    shop_name              = EXCLUDED.shop_name,
    full_name              = EXCLUDED.full_name,
    service_area           = EXCLUDED.service_area,
    radius_km              = EXCLUDED.radius_km,
    work_types             = EXCLUDED.work_types,
    specialty              = EXCLUDED.specialty,
    available_weekdays     = EXCLUDED.available_weekdays,
    notification_enabled   = EXCLUDED.notification_enabled,
    profile_image_url      = EXCLUDED.profile_image_url,
    age                    = EXCLUDED.age,
    experience_years       = EXCLUDED.experience_years,
    bio                    = EXCLUDED.bio,
    available_time         = EXCLUDED.available_time,
    has_car                = EXCLUDED.has_car,
    has_tools              = EXCLUDED.has_tools,
    public_profile_enabled = EXCLUDED.public_profile_enabled,
    -- referral_code: 既存を優先。NULL の場合のみ新規生成（COALESCE は short-circuit）
    referral_code          = COALESCE(craftsmen.referral_code, public.generate_referral_code()),
    updated_at             = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_craftsman_profile(
  text, text, text, text, text, int, text[], text, text[],
  boolean, text, int, int, text, text, boolean, boolean, boolean
) TO anon, authenticated;

-- ─── 5. save_referred_by() ────────────────────────────────────────
-- 条件: referred_by が未設定 かつ 自己紹介でないこと

DROP FUNCTION IF EXISTS public.save_referred_by(text, text);

CREATE OR REPLACE FUNCTION public.save_referred_by(
  p_user_id     text,
  p_referred_by text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'invalid user_id format: must be UUID v4';
  END IF;

  UPDATE public.craftsmen
    SET referred_by = p_referred_by,
        updated_at  = now()
  WHERE user_id     = p_user_id
    AND referred_by IS NULL                                        -- 既設定なら変更しない
    AND (referral_code IS NULL OR referral_code != p_referred_by); -- 自己紹介防止
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_referred_by(text, text) TO anon, authenticated;

-- ─── 6. get_my_referral_code() ────────────────────────────────────
-- フロントエンド表示専用。SECURITY DEFINER で craftsmen を直接参照。

DROP FUNCTION IF EXISTS public.get_my_referral_code(text);

CREATE OR REPLACE FUNCTION public.get_my_referral_code(p_user_id text)
RETURNS TABLE (referral_code text)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT referral_code FROM public.craftsmen WHERE user_id = p_user_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_code(text) TO anon, authenticated;
