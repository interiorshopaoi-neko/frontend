-- ================================================================
-- P0 RLS 修正 #2
--
-- 問題: job_applications の UPDATE が authenticated のみ許可されており、
--       未認証顧客（anon）が is_contracted=true にできなかった。
--       顧客は localStorage UUID 認証のため anon ロールで動作する。
--
-- 冪等対応: DROP POLICY IF EXISTS → CREATE POLICY で安全に再適用可能。
-- ================================================================

DROP POLICY IF EXISTS "anon can update job_applications" ON public.job_applications;

CREATE POLICY "anon can update job_applications"
  ON public.job_applications
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
