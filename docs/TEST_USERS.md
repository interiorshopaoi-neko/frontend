# PRO MATCH — テストユーザー管理

> **重要：パスワード・APIキー・秘密情報は絶対に書かない**
> 実際の認証情報は Bitwarden などのパスワードマネージャーで管理してください。
> このファイルには「役割・用途・注意点」のみを記載します。

---

## テストアカウントの種類

### admin テストアカウント

| 項目 | 内容 |
|---|---|
| 役割 | 管理者画面（`/admin/dashboard`）の確認 |
| 用途 | 依頼一覧・職人一覧・通知設定のテスト |
| アクセス先 | `/admin/dashboard`、`/admin/requests` |
| 注意 | 管理画面は認証なしでもアクセスできる（現状）。本番では注意 |

### craftsman テストアカウント（職人）

| 項目 | 内容 |
|---|---|
| 役割 | 職人として案件一覧・応募・助っ人機能を確認 |
| 用途 | `/craftsman/jobs`・`/craftsman/help`・`/craftsman/help-list` のテスト |
| 注意点1 | 登録後に `craftsmen` テーブルに行が作成されているか必ず確認する |
| 注意点2 | メール確認フローが完了しないと一部機能が使えない |
| 確認方法 | Supabase Studio → `craftsmen` テーブルで user_id を検索 |

### customer テストフロー（お客様）

| 項目 | 内容 |
|---|---|
| 役割 | 依頼者として工事依頼を送信 |
| 用途 | `/corporate` フォームの動作確認・受付メール送信のテスト |
| 注意 | 認証不要。メールアドレスを入力すると実際にメールが送信される |
| テスト用メール | 受信可能なメールアドレスを使用。実際の送信先に注意 |

---

## 助っ人募集のテストフロー

### 正常系

1. **craftsman A**（募集主）: `/craftsman/help` で助っ人を募集
   - `help_requests` に行が挿入される
   - `craftsman_id = craftsman A の user_id` になっていることを確認

2. **craftsman B**（応募者）: `/craftsman/help-list` で応募
   - `help_applications` に行が挿入される
   - `notify-helper-application` が呼ばれ、管理者と craftsman A にメールが届くことを確認

3. **craftsman A**: 応募を承認
   - `help_applications.status = 'approved'`
   - `notify-helper-approved` が呼ばれ、craftsman B にメールが届くことを確認
   - メール本文に craftsman A のメールアドレスが記載されていることを確認

### 通知が届かない場合の確認手順

```bash
# 実際にAPIを叩いてレスポンスを確認する
curl -X POST https://promatch-app.jp/api/notify-helper-application \
  -H 'Content-Type: application/json' \
  -d '{"request_id": "<id>", "application_id": "<id>"}'

# レスポンスで ownerReason を確認
# "sent" → 成功
# "email_empty" → craftsmen テーブルを確認
# "no_owner_id" → help_requests.craftsman_id が null（下記を参照）
```

---

## 壊れたデータの扱い

### `craftsman_id = null` の助っ人募集（設計上の限界）

| 項目 | 内容 |
|---|---|
| 何が起きるか | 募集主が特定できないため、応募通知が届かない |
| 発生原因 | ログイン機能が実装される前に作成された古い募集 |
| 管理画面での表示 | `/admin/dashboard` でアンバー警告として一覧表示 |
| 対処方法 | 新しい募集では発生しない。古いデータは警告を確認・必要なら削除を検討（要判断） |
| **注意** | このドキュメントで `craftsman_id = null` の募集に対してテストを行う場合、通知が届かないのは想定通りの動作 |

---

## テスト後の確認チェックリスト

- [ ] `craftsmen` テーブルに職人の行があるか（Supabase Studio）
- [ ] メールが実際に届いたか
- [ ] API レスポンスの `ownerReason` / `applicantReason` が `"sent"` か
- [ ] Vercel ログにエラーが出ていないか
- [ ] `help_requests.craftsman_id` が null でないか

---

## テスト環境と本番環境の切り替え

| 項目 | 本番 | テスト |
|---|---|---|
| URL | `https://promatch-app.jp` | ローカル `http://localhost:5173` |
| API | Vercel production | `npx vercel dev` または localhost |
| メール | 実際に送信される | 実際に送信される（！要注意） |
| DB | 本番 Supabase プロジェクト | 本番 Supabase プロジェクト（共通） |

> **注意：** テスト環境でも本番 Supabase を使うため、テスト中に作成したデータは本番 DB に残ります。
> 不要なテストデータは Supabase Studio から手動で削除してください。
