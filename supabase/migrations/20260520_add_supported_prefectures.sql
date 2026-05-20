-- ================================================================
-- supported_prefectures カラム追加 + RPC 更新
--
-- service_area (テキスト) に加え、対応都道府県を配列で保持。
-- 通知マッチングをテキスト部分一致から配列 overlap に変更する。
-- 後方互換: supported_prefectures が空 ({}) なら service_area で従来通りマッチ。
-- ================================================================

-- ─── カラム追加 ───────────────────────────────────────────────────
ALTER TABLE public.craftsmen
  ADD COLUMN IF NOT EXISTS supported_prefectures text[] DEFAULT '{}';

-- ================================================================
-- get_my_craftsman_profile を supported_prefectures を含む形に更新
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_my_craftsman_profile(p_user_id text)
RETURNS TABLE (
  id                     uuid,
  user_id                text,
  email                  text,
  shop_name              text,
  full_name              text,
  service_area           text,
  radius_km              int,
  supported_prefectures  text[],
  work_types             text[],
  specialty              text,
  available_weekdays     text[],
  notification_enabled   boolean,
  profile_image_url      text,
  age                    int,
  experience_years       int,
  bio                    text,
  available_time         text,
  has_car                boolean,
  has_tools              boolean,
  public_profile_enabled boolean,
  created_at             timestamptz,
  updated_at             timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT
    c.id, c.user_id, c.email,
    c.shop_name, c.full_name, c.service_area, c.radius_km,
    c.supported_prefectures,
    c.work_types, c.specialty, c.available_weekdays,
    c.notification_enabled, c.profile_image_url,
    c.age, c.experience_years, c.bio, c.available_time,
    c.has_car, c.has_tools, c.public_profile_enabled,
    c.created_at, c.updated_at
  FROM public.craftsmen c
  WHERE c.user_id = p_user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_craftsman_profile(text) TO anon, authenticated;

-- ================================================================
-- upsert_craftsman_profile に p_supported_prefectures を追加
-- 引数が増えるため古い関数シグネチャを先に drop
-- ================================================================
DROP FUNCTION IF EXISTS public.upsert_craftsman_profile(
  text, text, text, text, text, int, text[], text, text[],
  boolean, text, int, int, text, text, boolean, boolean, boolean
);

CREATE OR REPLACE FUNCTION public.upsert_craftsman_profile(
  p_user_id                text,
  p_email                  text,
  p_shop_name              text,
  p_full_name              text,
  p_service_area           text,
  p_radius_km              int,
  p_supported_prefectures  text[],
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
  IF p_user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'invalid user_id format: must be UUID v4';
  END IF;

  INSERT INTO public.craftsmen (
    user_id, email, shop_name, full_name, service_area, radius_km,
    supported_prefectures,
    work_types, specialty, available_weekdays, notification_enabled,
    profile_image_url, age, experience_years, bio, available_time,
    has_car, has_tools, public_profile_enabled, updated_at
  ) VALUES (
    p_user_id, p_email, p_shop_name, p_full_name, p_service_area, p_radius_km,
    COALESCE(p_supported_prefectures, '{}'),
    p_work_types, p_specialty, p_available_weekdays, p_notification_enabled,
    p_profile_image_url, p_age, p_experience_years, p_bio, p_available_time,
    p_has_car, p_has_tools, p_public_profile_enabled, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email                  = EXCLUDED.email,
    shop_name              = EXCLUDED.shop_name,
    full_name              = EXCLUDED.full_name,
    service_area           = EXCLUDED.service_area,
    radius_km              = EXCLUDED.radius_km,
    supported_prefectures  = EXCLUDED.supported_prefectures,
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
    updated_at             = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_craftsman_profile(
  text, text, text, text, text, int, text[], text[], text, text[],
  boolean, text, int, int, text, text, boolean, boolean, boolean
) TO anon, authenticated;
