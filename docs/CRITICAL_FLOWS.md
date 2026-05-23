# PRO MATCH — 壊してはいけない重要フロー

> このドキュメントは「触ったら影響が大きいフロー」を記録したものです。
> 変更前に必ず対応する「関係ファイル」「関係API」「関係DB」を確認してください。

---

## 1. お客様依頼投稿

**ルート:** `/corporate`

| 種別 | 内容 |
|---|---|
| 関係ファイル | `frontend/src/pages/corporate/CorporateRequest.tsx` |
| 関係API | `api/request-meta.ts`（meta保存）、`send-customer-email`（Edge Fn） |
| 関係DB | `estimate_requests`（id, meta JSONB, contact_value, status） |
| 触る時の注意 | `meta` の構造変更は `RequestExtraInfoPage`・`JobsListView`・`getRoomAdditionalInfo()` に連鎖。`roomAdditionalInfo` キーは絶対に変えない |

---

## 2. 追加情報投稿

**ルート:** `/request/:id/extra-info`

| 種別 | 内容 |
|---|---|
| 関係ファイル | `frontend/src/pages/corporate/RequestExtraInfoPage.tsx` |
| 関係API | `api/request-meta.ts`（PATCH で meta を上書き） |
| 関係DB | `estimate_requests.meta`（JSONB マージ） |
| 触る時の注意 | meta の PATCH は merge 方式。既存キーを消さないように注意。写真URLは Storage `estimate-videos/` bucket に保存済み |

---

## 3. 職人応募

**ルート:** `/craftsman/apply/:id`

| 種別 | 内容 |
|---|---|
| 関係ファイル | `frontend/src/pages/craftsman/CraftsmanApplyPage.tsx` |
| 関係API | `api/notify-application.ts` |
| 関係DB | `job_applications`（request_id, craftsman_id, status, amount） |
| 触る時の注意 | 二重応募防止ロジックあり。`status` の値（pending/accepted/rejected）は DB CHECK制約と紐づき |

---

## 4. 成約

**ルート:** `/craftsman/dashboard`（お客様が応募者を選択）

| 種別 | 内容 |
|---|---|
| 関係ファイル | `frontend/src/pages/craftsman/CraftsmanDashboardPage.tsx`、`frontend/src/pages/customer/RequestApplicationsPage.tsx` |
| 関係API | `api/notify-contracted.ts`、`api/check-billing.ts` |
| 関係DB | `job_applications.status = 'accepted'`、`estimate_requests.status = 'contracted'` |
| 触る時の注意 | 成約 → 職人に「選ばれた」通知 → 職人がStripeへ。この順番を崩さない |

---

## 5. Stripe決済（連絡先unlock前払い）

**トリガー:** 職人がダッシュボードから「連絡先を確認する」を押す

| 種別 | 内容 |
|---|---|
| 関係ファイル | `frontend/src/pages/craftsman/CraftsmanDashboardPage.tsx` |
| 関係API | `api/create-checkout-session.ts`、`api/stripe-webhook.ts`、`api/check-billing.ts` |
| 関係DB | `billing_events`、`contact_disclosures`、`craftsmen.free_contact_credits` |
| 触る時の注意 | **Stripeは絶対に単体でテストすること**。Webhook の `checkout.session.completed` イベントで `unlock_contact()` RPC を呼ぶ。冪等性あり（二重実行防止） |

---

## 6. 連絡先開示

**トリガー:** Stripe Webhook 受信後 / 無料枠消費時

| 種別 | 内容 |
|---|---|
| 関係ファイル | — |
| 関係API | `api/stripe-webhook.ts`、`api/get-contact-email.ts` |
| 関係DB | `contact_disclosures`、`unlock_contact()` SECURITY DEFINER RPC |
| 触る時の注意 | `unlock_contact()` は SECURITY DEFINER で実行。RLSをバイパスして安全に保存。関数シグネチャを変えると全て壊れる |

---

## 7. 施工前確認（Pre-Check）

**ルート:** `/craftsman/dashboard`（成約後の施工前確認モーダル）

| 種別 | 内容 |
|---|---|
| 関係ファイル | `frontend/src/pages/craftsman/CraftsmanDashboardPage.tsx` |
| 関係API | なし（フロントstate） |
| 関係DB | `job_applications.pre_check_confirmed`（BOOLEAN） |
| 触る時の注意 | 施工前確認は工事完了・レビュー依頼の前提条件。フラグを消すと完了フローが壊れる |

---

## 8. 工事完了

**ルート:** `/craftsman/dashboard`

| 種別 | 内容 |
|---|---|
| 関係ファイル | `frontend/src/pages/craftsman/CraftsmanDashboardPage.tsx` |
| 関係API | `api/notify-review.ts` |
| 関係DB | `job_applications.status = 'completed'` |
| 触る時の注意 | 完了 → `notify-review.ts` でお客様にレビュー依頼メール送信 |

---

## 9. レビュー

**ルート:** `/request/:id/review`

| 種別 | 内容 |
|---|---|
| 関係ファイル | `frontend/src/pages/customer/ReviewPage.tsx` |
| 関係API | なし（現在UIのみ） |
| 関係DB | `reviews`テーブル（現在未使用）、`get_craftsman_reviews()` RPC |
| 触る時の注意 | DB保存未実装。将来実装時は `reviews` テーブルのRLSを確認すること |

---

## 10. 助っ人募集

**ルート:** `/craftsman/help`

| 種別 | 内容 |
|---|---|
| 関係ファイル | `frontend/src/pages/craftsman/HelpRequestPage.tsx` |
| 関係API | `api/notify-helper.ts`（募集通知） |
| 関係DB | `help_requests`（id, craftsman_id, status, meta JSONB） |
| 触る時の注意 | `meta` に現場写真URLが入る。`status` の値（open/closed/expired）はフィルター条件 |

---

## 11. 助っ人応募・承認

**ルート:** `/craftsman/help-list`

| 種別 | 内容 |
|---|---|
| 関係ファイル | `frontend/src/pages/craftsman/HelpListPage.tsx` |
| 関係API | `api/notify-helper.ts`（承認通知・連絡先開示） |
| 関係DB | `help_applications`（help_request_id, craftsman_id, status） |
| 触る時の注意 | 承認時に応募者へ募集主の連絡先メールを通知。`get_craftsman_contact()` RPC でメール取得。RLSをバイパスするため RPC シグネチャを変えない |

---

## 12. 改善報告（フィードバック）

**ルート:** `/feedback`

| 種別 | 内容 |
|---|---|
| 関係ファイル | `frontend/src/pages/FeedbackPage.tsx`、`frontend/src/pages/admin/AdminFeedbackPage.tsx` |
| 関係API | `api/feedback.ts`、`api/upload-feedback-image.ts`、`api/admin-feedback.ts` |
| 関係DB | `feedback_reports`（id/category/message/screenshot_url/meta/status）、`admin_settings` |
| 触る時の注意 | `feedback_reports_v2` migration が本番DB未適用の場合は保存失敗。**必ず SQL Editor で実行すること** |

---

## 共通注意事項

- **`api/notify.ts` は共通メール送信ユーティリティ**。単独では動かないが他のAPI全員が依存する
- **`estimate_requests.meta` のJSONB構造**は複数コンポーネントが直接キーを参照する。キー名変更は全体影響
- **Supabase SECURITY DEFINER RPC**（`unlock_contact`, `get_craftsman_contact`, `ensure_craftsman_for_auth_user`）は関数シグネチャ変更禁止
- **Vercel Hobby は serverless function 12本上限**。新規APIを追加する際は現在の本数を確認
