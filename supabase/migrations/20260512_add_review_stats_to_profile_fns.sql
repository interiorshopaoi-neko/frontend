-- ================================================================
-- get_craftsman_public_profile() / get_craftsmen_by_ids() に
-- reviews 集計カラムを追加
--
-- 追加カラム:
--   avg_rating  numeric(3,1)  平均星評価（レビュー0件は NULL）
--   review_count int          レビュー件数（0件は 0）
--   top_tags    text[]        よく付いたタグ上位3件
--
-- 対象: review_type = 'customer_to_craftsman' のみ
-- RLS: 変更なし（既存の SECURITY DEFINER / anon GRANT を維持）
-- ================================================================

-- RETURNS TABLE の変更は CREATE OR REPLACE では不可のため先に DROP
DROP FUNCTION IF EXISTS public.get_craftsman_public_profile(text);
DROP FUNCTION IF EXISTS public.get_craftsmen_by_ids(text[]);

-- ─── 1. get_craftsman_public_profile()（単一職人・公開プロフィール）──────────
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
  -- 追加
  avg_rating             numeric,
  review_count           int,
  top_tags               text[]
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT
    c.user_id, c.shop_name, c.full_name, c.service_area, c.radius_km,
    c.work_types, c.specialty, c.available_weekdays, c.profile_image_url,
    c.age, c.experience_years, c.bio, c.available_time,
    c.has_car, c.has_tools, c.public_profile_enabled,
    -- review stats
    ROUND(AVG(r.rating)::numeric, 1)                         AS avg_rating,
    COUNT(r.id)::int                                          AS review_count,
    (
      SELECT COALESCE(array_agg(tag ORDER BY cnt DESC), '{}')
      FROM (
        SELECT unnest(r2.tags) AS tag, COUNT(*) AS cnt
        FROM   public.reviews r2
        WHERE  r2.target_id   = c.user_id
          AND  r2.review_type = 'customer_to_craftsman'
        GROUP  BY tag
        ORDER  BY cnt DESC
        LIMIT  3
      ) t
    )                                                         AS top_tags
  FROM  public.craftsmen c
  LEFT JOIN public.reviews r
         ON r.target_id   = c.user_id
        AND r.review_type = 'customer_to_craftsman'
  WHERE c.user_id = p_user_id
  GROUP BY
    c.user_id, c.shop_name, c.full_name, c.service_area, c.radius_km,
    c.work_types, c.specialty, c.available_weekdays, c.profile_image_url,
    c.age, c.experience_years, c.bio, c.available_time,
    c.has_car, c.has_tools, c.public_profile_enabled
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_craftsman_public_profile(text) TO anon, authenticated;

-- ─── 2. get_craftsmen_by_ids()（複数職人・応募確認画面用）──────────────────
CREATE OR REPLACE FUNCTION public.get_craftsmen_by_ids(p_user_ids text[])
RETURNS TABLE (
  user_id           text,
  shop_name         text,
  full_name         text,
  experience_years  int,
  work_types        text[],
  has_car           boolean,
  has_tools         boolean,
  bio               text,
  profile_image_url text,
  -- 追加
  avg_rating        numeric,
  review_count      int,
  top_tags          text[]
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT
    c.user_id, c.shop_name, c.full_name, c.experience_years,
    c.work_types, c.has_car, c.has_tools, c.bio, c.profile_image_url,
    -- review stats
    ROUND(AVG(r.rating)::numeric, 1)                         AS avg_rating,
    COUNT(r.id)::int                                          AS review_count,
    (
      SELECT COALESCE(array_agg(tag ORDER BY cnt DESC), '{}')
      FROM (
        SELECT unnest(r2.tags) AS tag, COUNT(*) AS cnt
        FROM   public.reviews r2
        WHERE  r2.target_id   = c.user_id
          AND  r2.review_type = 'customer_to_craftsman'
        GROUP  BY tag
        ORDER  BY cnt DESC
        LIMIT  3
      ) t
    )                                                         AS top_tags
  FROM  public.craftsmen c
  LEFT JOIN public.reviews r
         ON r.target_id   = c.user_id
        AND r.review_type = 'customer_to_craftsman'
  WHERE c.user_id = ANY(p_user_ids)
  GROUP BY
    c.user_id, c.shop_name, c.full_name, c.experience_years,
    c.work_types, c.has_car, c.has_tools, c.bio, c.profile_image_url;
$$;

GRANT EXECUTE ON FUNCTION public.get_craftsmen_by_ids(text[]) TO anon, authenticated;
