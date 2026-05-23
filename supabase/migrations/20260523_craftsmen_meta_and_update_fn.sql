-- craftsmen.meta カラム追加 + update_craftsman_meta() 関数
ALTER TABLE public.craftsmen ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.update_craftsman_meta(
  p_user_id text,
  p_meta    jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'invalid user_id format';
  END IF;
  UPDATE public.craftsmen
     SET meta = p_meta, updated_at = now()
   WHERE user_id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_craftsman_meta(text, jsonb) TO anon, authenticated;

-- get_my_craftsman_profile と get_craftsman_public_profile に meta を追加
-- (get_my_craftsman_profile は RETURNS TABLE 変更のため DROP → RECREATE)
DROP FUNCTION IF EXISTS public.get_my_craftsman_profile(text);
CREATE OR REPLACE FUNCTION public.get_my_craftsman_profile(p_user_id text)
RETURNS TABLE (
  id                     uuid,
  user_id                text,
  email                  text,
  shop_name              text,
  full_name              text,
  service_area           text,
  radius_km              int,
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
  meta                   jsonb,
  created_at             timestamptz,
  updated_at             timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT
    c.id, c.user_id, c.email,
    c.shop_name, c.full_name, c.service_area, c.radius_km,
    c.work_types, c.specialty, c.available_weekdays,
    c.notification_enabled, c.profile_image_url,
    c.age, c.experience_years, c.bio, c.available_time,
    c.has_car, c.has_tools, c.public_profile_enabled,
    c.meta,
    c.created_at, c.updated_at
  FROM public.craftsmen c
  WHERE c.user_id = p_user_id
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_craftsman_profile(text) TO anon, authenticated;

-- get_craftsman_public_profile も meta を返す (DROP → RECREATE)
DROP FUNCTION IF EXISTS public.get_craftsman_public_profile(text);
CREATE OR REPLACE FUNCTION public.get_craftsman_public_profile(p_user_id text)
RETURNS TABLE (
  user_id                text,
  shop_name              text,
  full_name              text,
  service_area           text,
  radius_km              int,
  work_types             text[],
  specialty              text,
  available_weekdays     text[],
  profile_image_url      text,
  age                    int,
  experience_years       int,
  bio                    text,
  available_time         text,
  has_car                boolean,
  has_tools              boolean,
  public_profile_enabled boolean,
  avg_rating             numeric,
  review_count           int,
  top_tags               text[],
  meta                   jsonb
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT
    c.user_id, c.shop_name, c.full_name, c.service_area, c.radius_km,
    c.work_types, c.specialty, c.available_weekdays, c.profile_image_url,
    c.age, c.experience_years, c.bio, c.available_time,
    c.has_car, c.has_tools, c.public_profile_enabled,
    ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
    COUNT(r.id)::int                 AS review_count,
    (
      SELECT COALESCE(array_agg(tag ORDER BY cnt DESC), '{}')
      FROM (
        SELECT unnest(r2.tags) AS tag, COUNT(*) AS cnt
        FROM   public.reviews r2
        WHERE  r2.target_id   = c.user_id
          AND  r2.review_type = 'customer_to_craftsman'
        GROUP  BY tag ORDER BY cnt DESC LIMIT 3
      ) t
    ) AS top_tags,
    c.meta
  FROM  public.craftsmen c
  LEFT JOIN public.reviews r
         ON r.target_id   = c.user_id
        AND r.review_type = 'customer_to_craftsman'
  WHERE c.user_id = p_user_id
  GROUP BY c.user_id, c.shop_name, c.full_name, c.service_area, c.radius_km,
    c.work_types, c.specialty, c.available_weekdays, c.profile_image_url,
    c.age, c.experience_years, c.bio, c.available_time,
    c.has_car, c.has_tools, c.public_profile_enabled, c.meta
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_craftsman_public_profile(text) TO anon, authenticated;
