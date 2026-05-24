-- ================================================================
-- help_requests カラム補完（冪等）
--
-- 20260516_help_requests_meta.sql および
-- 20260520_help_requests_status.sql が本番DBに未適用だった場合に備え、
-- IF NOT EXISTS で安全に再適用できるようにしたもの。
--
-- ⚠️  Supabase SQL Editor で手動実行が必要です。
-- ================================================================

-- meta: 現場レーダー・写真URL等を格納する JSONB（Phase53〜）
ALTER TABLE public.help_requests
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT NULL;

-- status: 'recruiting' | 'closed' | 'completed'（Phase57〜）
ALTER TABLE public.help_requests
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'recruiting';

-- expires_at: NULL = 無期限（Phase57〜）
ALTER TABLE public.help_requests
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
