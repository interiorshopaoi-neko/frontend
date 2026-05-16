-- Phase53: 現場レーダー MVP
-- help_requests テーブルに meta JSONB カラムを追加
-- 既存行は NULL のまま（graceful fallback）。古いデータでは meta = null が返る。
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT NULL;
