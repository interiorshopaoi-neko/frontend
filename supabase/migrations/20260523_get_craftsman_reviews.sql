-- get_craftsman_reviews: 公開プロフィール用レビュー取得
-- RLS をバイパスして anon から reviews を読み取る
CREATE OR REPLACE FUNCTION public.get_craftsman_reviews(p_user_id text)
RETURNS TABLE (
  rating      smallint,
  tags        text[],
  comment     text,
  created_at  timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT rating, tags, comment, created_at
  FROM   public.reviews
  WHERE  target_id   = p_user_id
    AND  review_type = 'customer_to_craftsman'
    AND  comment IS NOT NULL
    AND  comment <> ''
  ORDER  BY created_at DESC
  LIMIT  10;
$$;
GRANT EXECUTE ON FUNCTION public.get_craftsman_reviews(text) TO anon, authenticated;
