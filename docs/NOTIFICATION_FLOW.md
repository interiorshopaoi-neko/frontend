# PRO MATCH — 通知フロー

> 最終更新：2026年5月16日（Phase52 時点）

---

## 基本ルール

- **送信元は原則 `PRO MATCH <noreply@promatch-app.jp>`**
- `onboarding@resend.dev` は**絶対に使わない**（アカウントオーナー宛にしか届かない）
- APIレスポンスは `{ ok: true }` だけにしない。**失敗した理由が追える形にする**

---

## 1. 見積もり依頼が投稿されたとき

**トリガー：** お客様が `/corporate` フォームを送信

| 送信先 | 手段 | ファイル |
|---|---|---|
| お客様（受付確認） | Supabase Edge Function | `send-customer-email` |
| 職人（新着案件通知） | Supabase Edge Function | `send-craftsman-notification` |
| 管理者 | Vercel API Route | `api/notify.ts` |

### お客様受付メールの内容
- 受付完了の案内
- 応募状況確認リンク（`/request/:id/applications`）
- 追加情報入力リンク（`/request/:id/extra-info`）

### 職人新着通知の内容
- 新着案件の概要
- 案件一覧へのリンク（認証済みユーザーが `/craftsman/jobs` で確認）

---

## 2. 助っ人募集に応募があったとき

**トリガー：** 職人Bが `/craftsman/help-list` で「参加する」ボタンを押す

**API:** `POST /api/notify-helper-application`

### レスポンス形式
```json
{
  "adminOk": true,
  "ownerOk": true,
  "ownerReason": "sent",
  "ownerEmail": null
}
```

| フィールド | 意味 |
|---|---|
| `adminOk` | 管理者への通知が成功したか |
| `ownerOk` | 募集主（職人A）への通知が成功したか |
| `ownerReason` | 失敗した場合の理由（`sent` / `email_empty` / `email_invalid_format` / `no_owner_id` / `resend_error` / `exception`） |
| `ownerEmail` | デバッグ用（本番では null または省略を推奨） |

### 送信先と内容

| 送信先 | 送信元 | 内容 |
|---|---|---|
| 管理者 | `noreply@promatch-app.jp` | 応募者名・工事種別・エリア・作業日 |
| 募集主（職人A） | `noreply@promatch-app.jp` | 「○○さんから応募が届きました」＋助っ人一覧リンク |

### 注意事項
- 募集主のメールは `get_craftsman_contact(text)` RPC 経由で取得（RLS バイパス）
- `help_requests.craftsman_id = null` の古い募集は**募集主が特定できないため通知不可**

---

## 3. 助っ人応募が承認されたとき

**トリガー：** 募集主（職人A）が応募を承認（`help_applications.status = 'approved'`）

**API:** `POST /api/notify-helper-approved`  
**引数:** `{ application_id: string }`

### レスポンス形式
```json
{
  "ok": true,
  "applicantOk": true,
  "applicantReason": "sent",
  "requesterEmailFound": true
}
```

| フィールド | 意味 |
|---|---|
| `ok` | 全体の成否（`applicantOk` と同値） |
| `applicantOk` | 応募者（職人B）への通知が成功したか |
| `applicantReason` | 失敗した場合の理由（`sent` / `email_empty` / `email_invalid_format` / `resend_error` / `exception`） |
| `requesterEmailFound` | 募集主のメールが取得できたか（連絡先開示の可否に影響） |

### メールの内容
- 「応募が承認されました」の案内
- 募集主（職人A）のメールアドレスを**開示**（連絡先）
- 作業日・工事種別
- 助っ人一覧へのリンク

### 連絡先開示のロジック
```
help_applications.application_id
  → help_applications.request_id / craftsman_id（応募者ID）
  → help_requests.craftsman_id（募集主ID）・work_type・area・work_date
  → get_craftsman_contact(応募者ID) → 応募者のメール
  → get_craftsman_contact(募集主ID) → 募集主のメール（メール本文中に記載）
```

---

## 4. APIレスポンスの設計方針

### NG（失敗を隠蔽）
```json
{ "ok": true }
```
これだけでは「成功したように見えて実は送れていない」状態を検出できない。

### OK（失敗を追跡できる）
```json
{
  "adminOk": true,
  "ownerOk": false,
  "ownerReason": "email_empty",
  "applicantOk": false,
  "applicantReason": "resend_error"
}
```

**`ownerReason` / `applicantReason` の値一覧**

| 値 | 意味 |
|---|---|
| `sent` | 送信成功 |
| `not_sent` | 送信しなかった（初期値） |
| `email_empty` | メールアドレスが空 |
| `email_invalid_format` | `@` を含まないなど形式不正 |
| `no_owner_id` | 募集主の craftsman_id が null（古いデータ） |
| `resend_error` | Resend API がエラーを返した |
| `exception` | 予期しない例外 |

---

## 5. デバッグ方法

通知が届かない場合は以下の順で確認する：

1. **Vercel Function ログ**（Vercel Dashboard → Logs）で API のログを確認
2. レスポンスの `ownerReason` / `applicantReason` を確認
3. `email_empty` なら → `craftsmen` テーブルに行があるか、`get_craftsman_contact` RPC を直接呼んで確認
4. `resend_error` なら → Resend ダッシュボードで送信ログを確認
5. `no_owner_id` なら → `help_requests.craftsman_id` が null（設計上の限界。管理画面で警告表示済み）
