-- ================================================================
-- reviews テーブル + insert_customer_review() SECURITY DEFINER 関数
--
-- 設計方針:
--   ・レビューは PRO MATCH 内で成約した取引のみ投稿可能
--   ・anon の直接 INSERT は RLS でブロック → 必ず関数経由
--   ・reviewed_at は job_applications 側に残し、deriveStatus() を壊さない
--   ・UNIQUE(job_application_id, reviewer_type) で重複防止
--
-- 今回実装: customer → craftsman のみ
-- 将来追加: craftsman → customer, craftsman → craftsman
-- ================================================================

-- ─── テーブル ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- どの成約に紐づくレビューか（必須・成約の証明）
  job_application_id  uuid        NOT NULL REFERENCES public.job_applications(id),

  -- レビューの種別（将来: 'customer_to_craftsman' / 'craftsman_to_customer' / 'craftsman_to_craftsman'）
  review_type         text        NOT NULL
    CHECK (review_type IN ('customer_to_craftsman', 'craftsman_to_customer', 'craftsman_to_craftsman')),

  -- 誰が書いたか
  reviewer_type       text        NOT NULL CHECK (reviewer_type IN ('customer', 'craftsman')),
  reviewer_id         text        NOT NULL,   -- localStorage UUID

  -- 誰への評価か
  target_type         text        NOT NULL CHECK (target_type IN ('craftsman', 'customer')),
  target_id           text        NOT NULL,   -- localStorage UUID（craftsman.user_id）

  -- 内容
  rating              smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags                text[]      DEFAULT '{}',
  comment             text,
  would_use_again     boolean,

  created_at          timestamptz DEFAULT now(),

  -- 同一案件から同一 reviewer_type は1件のみ（重複防止の主軸）
  UNIQUE (job_application_id, reviewer_type)
);

-- ─── RLS 有効化（直接アクセス全ブロック）────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
-- anon / authenticated ともに直接 INSERT / UPDATE / DELETE はポリシーなし → ブロック

-- authenticated（管理者）のみ直接 SELECT 可
CREATE POLICY "reviews_admin_select"
  ON public.reviews
  FOR SELECT TO authenticated
  USING (true);

-- ================================================================
-- SECURITY DEFINER 関数
-- insert_customer_review()
--
-- 役割:
--   ① job_application が存在し is_contracted = true であることを確認
--   ② reviewer_id の UUID v4 形式チェック
--   ③ reviews INSERT（UNIQUE 制約が重複を防ぐ）
--   ④ job_applications.reviewed_at を更新（deriveStatus への影響を維持）
--
-- 呼び出し例:
--   const { error } = await supabase.rpc('insert_customer_review', {
--     p_application_id:  appId,
--     p_reviewer_id:     customerId,   // localStorage UUID（将来用。MVP では空可）
--     p_rating:          4,
--     p_tags:            ['丁寧', '時間通り'],
--     p_comment:         '仕上がりが良かったです',
--     p_would_use_again: true,
--   })
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
  SELECT craftsman_id
  INTO   v_craftsman_id
  FROM   public.job_applications
  WHERE  id             = p_application_id
    AND  is_contracted  = true
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

  -- ③ reviews INSERT
  --    UNIQUE(job_application_id, reviewer_type) が重複時に例外を上げる
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


-- ================================================================
-- 将来追加予定（今回は実装しない）
-- ================================================================
-- insert_craftsman_review()        craftsman → customer
-- insert_craftsman_peer_review()   craftsman → craftsman
-- get_craftsman_review_stats()     avg_rating / review_count / top_tags
-- ================================================================
