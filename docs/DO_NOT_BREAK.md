# PRO MATCH — 絶対に壊してはいけないもの

> このファイルは「触ると本番事故になるもの」の一覧です。
> 変更前に必ずここを確認し、関係する箇所を特定してからコードを書いてください。

---

## 🔴 API ファイル（触禁止・変更は超慎重に）

| ファイル | 理由 |
|---|---|
| `api/notify.ts` | 全通知の共通ユーティリティ。壊すと全メール通知が止まる |
| `api/stripe-webhook.ts` | Stripe決済 → 連絡先開示の心臓部。冪等性・署名検証あり |
| `api/create-checkout-session.ts` | Stripe Checkout作成。壊すと職人が連絡先を取得できなくなる |
| `api/check-billing.ts` | 無料枠消費・請求チェック。壊すと二重課金または無料枠バグ |
| `api/get-contact-email.ts` | 連絡先開示後のメール取得。RLSバイパスのRPC依存 |
| `api/notify-contracted.ts` | 成約通知。職人・お客様へのメール。壊すと成約が通知されない |
| `api/notify-helper.ts` | 助っ人募集・承認通知。連絡先開示を含む |
| `api/notify-application.ts` | 応募通知。管理者へのメール |
| `api/notify-review.ts` | 工事完了後レビュー依頼メール |

---

## 🔴 Supabase RPC / Function（シグネチャ変更禁止）

| 関数名 | 理由 |
|---|---|
| `unlock_contact(p_request_id, p_craftsman_id, p_free)` | Stripe Webhook が呼ぶ。引数変更で webhook 全滅 |
| `get_craftsman_contact(craftsman_id)` | 助っ人承認時の連絡先取得。RLSバイパス |
| `ensure_craftsman_for_auth_user(...)` | 職人登録時の自動craftsmen行作成 |
| `claim_free_credit_and_get_contact(...)` | 無料枠消費と連絡先開示の原子操作 |
| `get_craftsman_reviews(craftsman_id)` | レビュー取得 |

---

## 🔴 DB テーブル・カラム（消さない・型変更しない）

| テーブル/カラム | 理由 |
|---|---|
| `estimate_requests.meta` (JSONB) | `rooms`, `roomAdditionalInfo`, `preCheck`, 写真URL等すべてを格納 |
| `estimate_requests.contact_value` | お客様メールアドレス。連絡先開示の起点 |
| `estimate_requests.status` | `pending/contracted/completed` の値が複数コンポーネントで参照 |
| `job_applications.status` | `pending/accepted/rejected/completed` の値がフロー制御に直結 |
| `craftsmen.free_contact_credits` | 無料枠カウンター。変更すると課金ロジックが壊れる |
| `billing_events` テーブル | Stripe決済履歴。削除不可 |
| `contact_disclosures` テーブル | 連絡先開示記録。削除不可 |
| `feedback_reports` テーブル | 改善報告の保存先。削除不可 |
| `admin_settings` テーブル | 管理設定（通知ON/OFF等）。削除不可 |
| `help_requests.meta` (JSONB) | 助っ人募集の現場情報・写真URL |

---

## 🔴 Supabase Edge Functions（変更は Supabase Dashboard から）

| Function名 | 理由 |
|---|---|
| `send-customer-email` | お客様への受付完了メール。依頼投稿直後に呼ばれる |
| `send-craftsman-notification` | 職人への新着案件通知。admin画面から手動トリガー |

---

## 🔴 フロントエンド ロジック（計算ロジック変更禁止）

| ファイル / 関数 | 理由 |
|---|---|
| `frontend/src/lib/serviceFee.ts` の `calculateServiceFee()` | 手数料計算の基準。変更すると表示と実際の請求が乖離 |
| `frontend/src/lib/revenueEstimate.ts` の `getRevenueDisplay()` | 売上カード表示の統一関数。View側で個別計算しない約束 |
| `frontend/src/lib/requestMeta.ts` の `getRoomAdditionalInfo()` | meta JSONB のパース。キー名に直接依存 |

---

## 🔴 環境変数（削除・変更時は全APIに影響）

| 変数名 | 影響範囲 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | 全serverless API のDB保存・取得 |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook.ts の署名検証。変更するとWebhook全滅 |
| `STRIPE_SECRET_KEY` | Checkout Session作成。変更するとStripe連携停止 |
| `RESEND_API_KEY` | 全メール通知。変更するとメール送信停止 |

---

## ✅ 変更してもよいもの（影響範囲が限定的）

- `docs/` 以下のmarkdown
- `frontend/src/pages/*/UI部分`（ロジックを変えない場合）
- `api/admin-feedback.ts`（管理機能のみ）
- `api/feedback.ts`（フィードバック機能のみ）
- `api/health.ts`（ヘルスチェックのみ）
- `scripts/` 以下の検査スクリプト
- `supabase/migrations/` への追加（削除・変更は要注意）

---

## 🛑 変更前チェックリスト

1. `git diff` で変更範囲を確認した
2. このドキュメントの「触禁止」ファイルに触れていないことを確認した
3. `npx tsc --noEmit` でTypeScriptエラーなし
4. `npm run build` でビルド成功
5. ステージング/テスト環境で動作確認した（または確認計画がある）
6. `api/notify.ts` の関数シグネチャを変えていない
7. Stripe関連ファイルを変えていない
