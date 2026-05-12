-- ================================================================
-- P0 RLS 修正
--
-- 問題1: job_applications の INSERT が anon のみ許可されており、
--         ログイン済み職人（authenticated）が応募できなかった。
--
-- 問題2: estimate_requests の SELECT が authenticated のみ許可されており、
--         未認証顧客（anon）が /request/:id/applications で
--         実データを読めず DEMO fallback に落ちていた。
--
-- 冪等対応: DROP POLICY IF EXISTS → CREATE POLICY で安全に再適用可能。
-- ================================================================

-- ─── 1. authenticated が job_applications に応募できるようにする ───────────
DROP POLICY IF EXISTS "authenticated can insert job_applications" ON public.job_applications;

CREATE POLICY "authenticated can insert job_applications"
  ON public.job_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ─── 2. anon が estimate_requests を読めるようにする（顧客応募確認画面）────
DROP POLICY IF EXISTS "anon can select estimate_requests" ON public.estimate_requests;

CREATE POLICY "anon can select estimate_requests"
  ON public.estimate_requests
  FOR SELECT
  TO anon
  USING (true);
