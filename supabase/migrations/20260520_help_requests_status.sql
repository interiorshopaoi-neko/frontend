-- ================================================================
-- help_requests に status / expires_at を追加
--
-- status: 'recruiting' | 'closed' | 'completed'
--   - recruiting : 募集中（デフォルト）
--   - closed     : 募集終了（手動または expires_at 超過）
--   - completed  : 作業完了
--
-- expires_at: NULL = 無期限。設定されていれば、その日時を過ぎると
--             フロントエンドで「募集終了」扱いになる（クライアント判定）
-- ================================================================

ALTER TABLE public.help_requests
  ADD COLUMN IF NOT EXISTS status     text        NOT NULL DEFAULT 'recruiting',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
