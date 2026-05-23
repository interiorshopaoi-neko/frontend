# PRO MATCH — リリース前確認チェックリスト

> **使い方：** 本番反映前に必ずこのリストを上から順に確認してください。
> チェックを省略した場合、本番事故の責任は確認者にあります。

---

## 🔧 コード・デプロイ確認

- [ ] **ブランチ確認**
  ```bash
  git branch --show-current
  # → main に向いているか、または正しい作業ブランチか
  ```

- [ ] **main に最新コミットが入っている**
  ```bash
  git log --oneline -5
  git log --oneline origin/main -5
  # → ローカルとリモートが一致しているか
  ```

- [ ] **Vercel Production が最新コミットを参照している**
  - Vercel Dashboard → Deployments → Production の commit SHA が `git log` の最新と一致するか

- [ ] **TypeScript エラーなし**
  ```bash
  cd frontend && npx tsc --noEmit
  # → エラー0
  ```

- [ ] **ビルド成功**
  ```bash
  cd frontend && npm run build
  # → ✓ built
  ```

- [ ] **API ルート存在チェック**
  ```bash
  cd frontend && npm run check:api-routes
  # → フロントが呼ぶ /api/* が root api/ に存在するか確認
  ```

---

## 🗃️ Supabase 確認

- [ ] **migration 適用確認**
  - Supabase Dashboard → Table Editor で以下のテーブルが存在するか確認
    - `estimate_requests` ✅
    - `job_applications` ✅
    - `craftsmen` ✅
    - `billing_events` ✅
    - `contact_disclosures` ✅
    - `help_requests` ✅
    - `help_applications` ✅
    - `feedback_reports`（screenshot_url・meta カラムあり） ✅
    - `admin_settings` ✅

- [ ] **`20260523_feedback_reports_v2.sql` を SQL Editor で実行済み**
  - 未実行の場合 → `/feedback` 送信時に「保存に失敗しました」が出る

- [ ] **RLS が有効になっている**
  - `feedback_reports` の RLS enabled + `feedback_insert_only` policy あり

---

## 🌐 本番動作テスト

### お客様フロー
- [ ] `/corporate` から依頼フォームを最後まで送信できる
- [ ] 受付完了メールがお客様に届く
- [ ] `/request/:id/extra-info` から追加情報を送信できる

### 職人フロー
- [ ] `/craftsman/jobs` で案件一覧が表示される（未ログイン時はプレビューのみ）
- [ ] ログイン後に案件詳細が見える
- [ ] `/craftsman/apply/:id` で応募できる
- [ ] 応募通知が管理者に届く

### 成約・決済フロー（テスト環境で確認）
- [ ] 管理者が案件を「成約」できる
- [ ] 職人のダッシュボードに「選ばれました」が表示される
- [ ] Stripe Checkout が開く（テストカード `4242 4242 4242 4242`）
- [ ] 決済完了後に連絡先が開示される
- [ ] 成約通知メールが職人・お客様に届く

### フィードバック
- [ ] `/feedback` で送信できる（スクショ添付オプション）
- [ ] `feedback_reports` テーブルに保存される
- [ ] 管理者メールに通知が届く
- [ ] `/admin/feedback` で報告一覧が表示される
- [ ] ステータス変更・メモ保存が動く
- [ ] 通知ON/OFFトグルが動く

### 管理画面
- [ ] `/admin/dashboard` で依頼・職人データが表示される
- [ ] `/admin/requests` で hidden 切替が動く
- [ ] `/admin/help-requests` で助っ人承認が動く
- [ ] hidden 案件が `/craftsman/jobs` に出ていない

---

## 🔐 セキュリティ確認

- [ ] **demo案件（admin側でhidden設定した案件）が職人側に露出していない**
- [ ] **Stripe が本番モードになっている**（テストキーのままになっていないか）
  - 環境変数 `STRIPE_SECRET_KEY` が `sk_live_` で始まるか確認
  - `STRIPE_WEBHOOK_SECRET` も本番用か確認
- [ ] **service role key が外部に露出していない**
  - フロントのソースに `SUPABASE_SERVICE_ROLE_KEY` が含まれていないか確認
  - `grep -r "service_role\|SUPABASE_SVC\|SERVICE_ROLE_KEY" frontend/src` → 0件

---

## 📧 メール通知確認

- [ ] Resend Dashboard でメール送信履歴を確認
- [ ] 送信元が `noreply@promatch-app.jp` になっている
- [ ] SPF/DKIM 認証が通っている（Resend Dashboard → Domains）
- [ ] 管理者メール（`interior.shop.aoi@gmail.com`）に通知が届いている

---

## 🚨 リリース後の監視

- [ ] Vercel Dashboard → Functions → エラー率確認（1時間）
- [ ] Supabase Dashboard → Logs → API エラー確認
- [ ] `/api/health` で `{ "ok": true }` が返る
- [ ] Resend → Activity でメール送信エラーがないか確認

---

## ロールバック手順（緊急時）

```bash
# 直前のコミットに戻す
git revert HEAD --no-edit
git push origin main

# または特定コミットに戻す
git revert <commit-sha> --no-edit
git push origin main
```

Vercel は push を検知して自動デプロイする。完了まで約2分。
