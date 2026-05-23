-- ================================================================
-- feedback_reports v2 migration
--
-- 1. feedback_reports テーブルを作成（存在しない場合）
-- 2. screenshot_url / meta カラムを追加（既存テーブルへの追加も含む）
-- 3. admin_settings テーブルを作成（通知ON/OFF等の設定保存用）
--
-- ⚠️  このファイルは Supabase SQL Editor で手動実行が必要です。
--     supabase/migrations/ 内に存在するだけでは本番DBには適用されません。
-- ================================================================

-- ── 1. feedback_reports 本体 ───────────────────────────────────────────────────

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
  admin_note    text,
  screenshot_url text,
  meta          jsonb        NOT NULL DEFAULT '{}'::jsonb
);

-- 既存テーブルへの追加分（既に存在する場合は DO NOTHING）
ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS screenshot_url text;

ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── 2. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_insert_only" ON public.feedback_reports;

CREATE POLICY "feedback_insert_only"
  ON public.feedback_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT / UPDATE / DELETE はポリシーなし → service role のみ（管理 API 経由）

-- ── 3. admin_settings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_settings (
  key        text         PRIMARY KEY,
  value      jsonb        NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz  NOT NULL DEFAULT now()
);

-- デフォルト: フィードバックメール通知 ON
INSERT INTO public.admin_settings (key, value)
VALUES ('feedback_email_notification', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- admin_settings は service role 経由のみ（一般ユーザー不可）
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
-- ポリシーなし → service role のみアクセス可
