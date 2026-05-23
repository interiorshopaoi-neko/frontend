-- ================================================================
-- feedback_reports テーブル
--
-- 利用者からの不具合・改善報告を保存する。
-- anon / authenticated は INSERT のみ許可。
-- SELECT / UPDATE / DELETE は service role API 経由（RLS バイパス）のみ。
-- ================================================================

CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  category      text         NOT NULL CHECK (category <> ''),
  message       text         NOT NULL CHECK (message <> ''),
  contact_email text,
  page_url      text,
  user_role     text,
  user_id       text,
  status        text         NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new', 'reviewing', 'done')),
  admin_note    text
);

-- RLS 有効化
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

-- anon / authenticated は INSERT のみ（誰でも報告可）
CREATE POLICY "feedback_insert_only"
  ON public.feedback_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT / UPDATE / DELETE はポリシーなし → service role のみ（管理 API 経由）
-- service role は RLS をバイパスするため追加ポリシー不要
