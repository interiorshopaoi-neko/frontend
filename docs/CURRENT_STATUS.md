# PRO MATCH — 現在の実装状況

> 最終更新：2026年5月23日（安定運用・事故防止 Phase 完了時点）

---

## 🌐 本番URL

```
https://promatch-app.jp
```

- Vercel Hobby プラン（serverless function 12本上限に注意）
- Supabase project: `lboskhjidbqxwrenwjdr`
- メール送信: Resend（`noreply@promatch-app.jp`）

---

## 💰 収益モデル

### 通常案件（職人 ←→ お客様）

| 項目 | 内容 |
|---|---|
| 応募 | 無料 |
| 成約時手数料 | `calculateServiceFee(revenue)` で計算（`frontend/src/lib/serviceFee.ts`） |
| 支払い方法 | Stripe Checkout |
| 無料枠 | 初回2成約無料 / 紹介ボーナスで+1無料 |
| 連絡先開示 | 成約 → Stripe決済 → Webhook → `unlock_contact()` RPC |

### 助っ人募集（職人 ←→ 職人）

| 項目 | 内容 |
|---|---|
| 現在の課金 | **なし**（無料） |
| 将来 | 課金化予定（`docs/BACKLOG.md` 参照） |

---

## ✅ 実装済み機能

### お客様側

| ページ/機能 | ルート | 状態 |
|---|---|---|
| トップページ | `/` | ✅ 本番稼働 |
| 依頼フォーム | `/corporate` | ✅ 7ステップ・動画・写真・複数部屋 |
| 追加情報入力 | `/request/:id/extra-info` | ✅ meta JSONB 保存 |
| 依頼詳細 | `/request/:id` | ✅ |
| 応募者一覧 | `/request/:id/applications` | ✅ |
| レビュー | `/request/:id/review` | ✅ UIのみ（DB保存なし） |
| 受付完了メール | `send-customer-email` Edge Function | ✅ 本番稼働 |

### 職人側

| ページ/機能 | ルート | 状態 |
|---|---|---|
| 案件一覧 | `/craftsman/jobs` | ✅ 未認証は売上プレビューのみ |
| 案件応募 | `/craftsman/apply/:id` | ✅ |
| ダッシュボード | `/craftsman/dashboard` | ✅ ステータス管理 |
| プロフィール編集 | `/craftsman/profile` | ✅ アバター・施工事例4枚 |
| 公開プロフィール | `/craftsman/profile/:userId` | ✅ |
| 助っ人募集フォーム | `/craftsman/help` | ✅ |
| 助っ人一覧 | `/craftsman/help-list` | ✅ 承認制 |
| 職人ツール | `/tools` | ✅ ローカルstateのみ |
| 職人登録 | `/pro-signup`, `/for-pros` | ✅ |

### 管理者側

| ページ/機能 | ルート | 状態 |
|---|---|---|
| ダッシュボード | `/admin/dashboard` | ✅ |
| 依頼一覧 | `/admin/requests` | ✅ hidden管理含む |
| 助っ人管理 | `/admin/help-requests` | ✅ 承認・完了操作 |
| 改善報告 | `/admin/feedback` | ✅ スクショ・meta・通知ON/OFF |

### 通知（Resend 本番稼働中）

| トリガー | 実装場所 | 送信先 |
|---|---|---|
| 依頼受付 | `send-customer-email` Edge Fn | お客様・管理者 |
| 職人通知 | `send-craftsman-notification` Edge Fn | 対象職人 |
| 応募通知 | `api/notify-application.ts` | 管理者 |
| 成約通知 | `api/notify-contracted.ts` | 職人・お客様 |
| レビュー依頼 | `api/notify-review.ts` | お客様 |
| 助っ人通知 | `api/notify-helper.ts` | 募集主・応募者 |

### 決済（Stripe）

| 項目 | 状態 |
|---|---|
| Checkout Session 作成 | `api/create-checkout-session.ts` ✅ |
| Webhook 受信・連絡先開示 | `api/stripe-webhook.ts` ✅ |
| 請求確認 | `api/check-billing.ts` ✅ |
| 本番モード | ⚠️ 環境変数を本番キーに切替済みか確認必須 |

### フィードバック（改善報告）

| 項目 | 状態 |
|---|---|
| `/feedback` フォーム | ✅ スクショ添付・meta自動収集 |
| `api/feedback.ts` | ✅ service role保存・admin_settings連動 |
| `api/upload-feedback-image.ts` | ✅ 5MB以下 jpg/png/webp |
| `/admin/feedback` 管理画面 | ✅ ステータス管理・通知ON/OFF |
| `feedback_reports` テーブル | ⚠️ **Supabase SQL Editorで実行必須** |
| `admin_settings` テーブル | ⚠️ **Supabase SQL Editorで実行必須** |

---

## 🗃️ Supabase Migration 適用状況

| ファイル | 内容 | 本番適用 |
|---|---|---|
| `20260509_create_craftsmen.sql` | craftsmen テーブル基本 | ✅ 済 |
| `20260512_add_job_applications_columns.sql` | applications列追加 | ✅ 済 |
| `20260512_create_reviews.sql` | reviews テーブル | ✅ 済 |
| `20260512_fix_job_applications_rls.sql` | RLS修正 | ✅ 済 |
| `20260513_billing_events.sql` | 請求イベント | ✅ 済 |
| `20260513_referral_system.sql` | 紹介コード | ✅ 済 |
| `20260513_fix_anon_update_job_applications.sql` | anon更新RLS | ✅ 済 |
| `20260513_fix_rls_p0.sql` | RLS強化 | ✅ 済 |
| `20260516_help_requests_meta.sql` | 助っ人meta | ✅ 済 |
| `20260517_contact_disclosure_tables.sql` | 連絡先開示テーブル | ✅ 済 |
| `20260517_fix_contact_id_type.sql` | 型修正 | ✅ 済 |
| `20260517_unlock_contact_rpc.sql` | unlock_contact RPC | ✅ 済 |
| `20260520_add_supported_prefectures.sql` | 対応都道府県 | ✅ 済 |
| `20260520_help_requests_status.sql` | 助っ人ステータス | ✅ 済 |
| `20260522_referral_bonus_grant.sql` | 紹介ボーナス付与 | ✅ 済 |
| `20260522_referral_bonus_on_first_unlock.sql` | 初回unlock時ボーナス | ✅ 済 |
| `20260523_craftsmen_meta_and_update_fn.sql` | craftsmen meta/fn | ✅ 済 |
| `20260523_get_craftsman_reviews.sql` | レビュー取得RPC | ✅ 済 |
| `20260523_feedback_reports.sql` | feedback_reports v1 | ⚠️ 要確認 |
| **`20260523_feedback_reports_v2.sql`** | v2（screenshot_url/meta/admin_settings） | ❌ **要実行** |

---

## ⚠️ 本番前に必ず確認すること

1. **`20260523_feedback_reports_v2.sql` を Supabase SQL Editor で実行**
   → feedback保存・スクショ・通知ON/OFFが機能する
2. **Stripe キーを本番モードに切替確認**
   → `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CONTACT_UNLOCK`
3. **Storage bucket `estimate-videos` が public に設定済み**
   → 画像・動画の公開URLが正しく表示される
4. **`feedback-images/` prefix のファイルが公開URL返却される**
   → スクショ表示テスト
5. **Vercel serverless function 本数確認**
   → Hobby プランは12本上限。`ls api/` で確認（現在20本前後→要確認）
6. **メール送信テスト**
   → 本番ドメインからの受信確認（Resend送信ドメイン認証済みか）
