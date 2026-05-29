-- ================================================================
-- craftsmen テーブルに利用規約同意カラムを追加
--
-- ⚠️  Supabase SQL Editor で手動実行が必要です。
--     IF NOT EXISTS で冪等。既存データに影響なし。
--     agreed_to_terms はデフォルト false。
--     既存職人は次回プロフィール保存時に同意させる設計。
-- ================================================================

ALTER TABLE public.craftsmen
  ADD COLUMN IF NOT EXISTS agreed_to_terms    boolean     NOT NULL DEFAULT false;

ALTER TABLE public.craftsmen
  ADD COLUMN IF NOT EXISTS agreed_to_terms_at timestamptz;
