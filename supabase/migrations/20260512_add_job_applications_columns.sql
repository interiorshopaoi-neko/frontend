-- ================================================================
-- job_applications に成約・レビュー関連カラムを追加
--
-- 背景:
--   フロントエンド (CraftsmanDashboardPage / RequestApplicationsPage / ReviewPage)
--   は is_contracted / contracted_at / review_requested_at / reviewed_at /
--   service_fee を参照しているが、本番 DB に列が存在しなかった。
--   このマイグレーションで揃える。
--
-- 既存データへの影響:
--   全て DEFAULT NULL / DEFAULT false のため既存行は安全。
-- ================================================================

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS is_contracted       boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS contracted_at       timestamptz,
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS service_fee         integer;

-- ================================================================
-- insert_customer_review() を列追加後の実スキーマで再定義
--
-- 変更点（20260512_create_reviews.sql との差分）:
--   ・is_contracted 列が存在しなかったため関数が失敗していた問題を修正
--   ・craftsman_id が uuid 型のため text へ明示キャスト
-- ================================================================
CREATE OR REPLACE FUNCTION public.insert_customer_review(
  p_application_id   uuid,
  p_reviewer_id      text,
  p_rating           smallint,
  p_tags             text[]    DEFAULT '{}',
  p_comment          text      DEFAULT NULL,
  p_would_use_again  boolean   DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_craftsman_id  text;
BEGIN
  -- ① 対象 application が実在し、成約済みかを確認
  SELECT craftsman_id::text
  INTO   v_craftsman_id
  FROM   public.job_applications
  WHERE  id            = p_application_id
    AND  is_contracted = true
  LIMIT  1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application not found or not contracted: %', p_application_id;
  END IF;

  -- ② UUID v4 形式チェック（空文字はデモ用として許容）
  IF p_reviewer_id <> '' AND
     p_reviewer_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN
    RAISE EXCEPTION 'invalid reviewer_id format: %', p_reviewer_id;
  END IF;

  -- ③ reviews INSERT（UNIQUE 制約が重複時に例外を上げる）
  INSERT INTO public.reviews (
    job_application_id,
    review_type,
    reviewer_type,
    reviewer_id,
    target_type,
    target_id,
    rating,
    tags,
    comment,
    would_use_again
  ) VALUES (
    p_application_id,
    'customer_to_craftsman',
    'customer',
    p_reviewer_id,
    'craftsman',
    COALESCE(v_craftsman_id, ''),
    p_rating,
    COALESCE(p_tags, '{}'),
    p_comment,
    p_would_use_again
  );

  -- ④ job_applications.reviewed_at を更新
  --    deriveStatus(): reviewed_at → '工事完了' の判定を維持
  UPDATE public.job_applications
  SET    reviewed_at = now()
  WHERE  id          = p_application_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_customer_review(uuid, text, smallint, text[], text, boolean)
  TO anon, authenticated;
