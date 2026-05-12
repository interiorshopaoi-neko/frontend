-- ================================================================
-- job_applications RLS ポリシー補完
--
-- 背景:
--   job_applications には INSERT(anon) のみ存在し、
--   SELECT / UPDATE ポリシーが一切なかった。
--   その結果:
--     - 職人ダッシュボード(authenticated)が応募一覧を読めない
--     - 顧客の応募確認画面が応募を読めない
--     - 成約操作(is_contracted=true UPDATE)が失敗
--     - ReviewPage が job_applications を読めず insert_customer_review が実行不可
--
-- 設計方針:
--   - localStorage UUID 運用のため完全な本人認証は現状困難
--   - 「最小で本線が動く」設計 = 行レベルフィルタなしで全件開放するが
--     書き込み(UPDATE)は authenticated ロールのみに限定
--   - anon SELECT: ReviewPage + 顧客応募確認画面(未ログイン顧客)のために必要
--   - anon UPDATE: 与えない（書き込みセキュリティラインを維持）
--
-- 将来改善:
--   - craftsman_id が Supabase Auth UUID と一致したら auth.uid() フィルタ追加
--   - 顧客側に認証導入後、customer_id フィルタ追加
-- ================================================================

-- ── authenticated: SELECT（職人ダッシュボード / 管理画面） ───────────────────
CREATE POLICY "authenticated can select job_applications"
  ON public.job_applications
  FOR SELECT
  TO authenticated
  USING (true);

-- ── authenticated: UPDATE（成約・review_requested_at 更新） ──────────────────
CREATE POLICY "authenticated can update job_applications"
  ON public.job_applications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── anon: SELECT（ReviewPage / 未認証顧客の応募確認画面） ────────────────────
CREATE POLICY "anon can select job_applications"
  ON public.job_applications
  FOR SELECT
  TO anon
  USING (true);

-- anon UPDATE は付与しない（insert_customer_review は SECURITY DEFINER で代替）
