# PRO MATCH — 環境変数リファレンス

> ⚠️ **このファイルに実際の値を書かないでください。**
> 値は Vercel Dashboard → Settings → Environment Variables で管理してください。

---

## 必須環境変数（本番）

### Supabase

| 変数名 | 用途 | 公開範囲 | 注意 |
|---|---|---|---|
| `SUPABASE_URL` | Supabase REST API のベースURL | サーバーサイドAPI | `VITE_SUPABASE_URL` と同じ値でOK |
| `SUPABASE_SERVICE_ROLE_KEY` | DB操作（RLSバイパス）。全serverless APIで使用 | **サーバーのみ** | ⚠️ 絶対にフロントに渡さない。漏洩でDB全操作が可能になる |
| `VITE_SUPABASE_URL` | フロントエンドからのSupabase接続URL | クライアント公開 | ビルド時に埋め込まれる |
| `VITE_SUPABASE_ANON_KEY` | フロントエンドからのSupabase認証・DB読み取り | クライアント公開 | RLS が有効なので anon でも安全。ただし漏洩注意 |

### Stripe

| 変数名 | 用途 | 公開範囲 | 注意 |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Checkout Session作成、Webhook処理 | **サーバーのみ** | ⚠️ test(`sk_test_`) / live(`sk_live_`) を間違えない。本番は `sk_live_` |
| `STRIPE_WEBHOOK_SECRET` | Webhook署名検証（`stripe-webhook.ts`） | **サーバーのみ** | ⚠️ VercelのWebhook URLに対して発行したシークレット。変更すると決済通知が全滅 |
| `STRIPE_PRICE_CONTACT_UNLOCK` | 連絡先開示の価格ID（`price_XXXX`） | **サーバーのみ** | test/live で値が異なる。本番切替時に必ず変更 |

### メール送信

| 変数名 | 用途 | 公開範囲 | 注意 |
|---|---|---|---|
| `RESEND_API_KEY` | Resend APIキー。全メール通知で使用 | **サーバーのみ** | 漏洩でメール送信が悪用される。rotateしたら全APIに反映 |

### サイト設定

| 変数名 | 用途 | 公開範囲 | 注意 |
|---|---|---|---|
| `SITE_URL` | リダイレクト・メール内URLの生成に使用 | サーバーサイドAPI | 本番: `https://promatch-app.jp`（末尾スラッシュなし） |

---

## Supabase Edge Functions の環境変数

Edge Functions は Vercel ではなく Supabase 上で動く。
Supabase Dashboard → Edge Functions → Secrets で管理。

| 変数名 | 対象Function | 用途 |
|---|---|---|
| `RESEND_API_KEY` | `send-customer-email`、`send-craftsman-notification` | メール送信 |
| `SUPABASE_SERVICE_ROLE_KEY` | （Supabaseが自動注入） | DB操作 |

---

## Vercel での設定方法

```
Vercel Dashboard
→ プロジェクト選択
→ Settings
→ Environment Variables
→ 各変数を Production / Preview / Development 別に設定
```

**重要：** `VITE_` プレフィックスの変数はビルド時にバンドルされフロントに公開される。
それ以外の変数（`SUPABASE_SERVICE_ROLE_KEY` 等）はサーバーサイドのみ。

---

## test / live 切替チェックリスト（Stripe本番化時）

- [ ] `STRIPE_SECRET_KEY` を `sk_live_XXXX` に変更
- [ ] `STRIPE_WEBHOOK_SECRET` を本番WebhookエンドポイントのシークレットURL（`whsec_XXXX`）に変更
- [ ] `STRIPE_PRICE_CONTACT_UNLOCK` を本番Productの価格ID（`price_XXXX`）に変更
- [ ] Stripe Dashboard → Webhooks → 本番エンドポイント `https://promatch-app.jp/api/stripe-webhook` が登録済み
- [ ] `checkout.session.completed` イベントを購読している

---

## セキュリティ注意事項

1. **`SUPABASE_SERVICE_ROLE_KEY` はRLSをすべてバイパスする。** DBに対して何でもできる管理者キー。フロントエンドコードに含まれた瞬間にDB全データが漏洩リスクになる
2. **`STRIPE_SECRET_KEY` が漏洩すると不正課金・返金操作が可能になる**
3. **定期的に Vercel の Environment Variables を棚卸しし、不要な変数を削除する**
4. **`git log` で変数の値がコミット履歴に含まれていないか確認する**
   ```bash
   git log --all -S "sk_live" --oneline
   git log --all -S "whsec_" --oneline
   ```
