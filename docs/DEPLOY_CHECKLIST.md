# PRO MATCH — 本番反映前チェックリスト

> このチェックリストは「本番に反映する前に必ず確認する」手順です。
> 実運用フェーズに入っているため、チェックを省略しないでください。

---

## 🔍 Step 1：現在地の確認

本番デプロイの前に、自分が「どのブランチ・コミット」で作業しているかを確認します。

```bash
pwd                          # worktree のパスを確認
git branch --show-current    # 現在のブランチ
git log --oneline -3         # 直近のコミット
git status                   # 未コミットの変更がないか
git diff --stat HEAD         # 変更ファイルの一覧
```

**なぜ確認するか：** 間違ったブランチのコードを本番に上げてしまうのを防ぐため。

---

## 🔍 Step 2：変更ファイルの内容確認

```bash
git diff HEAD -- <変更したファイル>
```

- UI やロジックを**意図せず変更していないか**確認する
- 機密情報（API キー・メールアドレス・パスワード）が含まれていないか確認する

---

## ✅ Step 3：TypeScript チェック

```bash
cd frontend
npx tsc --noEmit
```

- **エラー 0 件を確認してから次に進む**
- WarningはOKだが、エラーが残ったままデプロイしない

**なぜやるか：** TypeScript は実行前にバグを発見できる。ここで通れば、型エラーによるクラッシュを防げる。

---

## ✅ Step 4：ビルド確認

```bash
npm run build
```

- `✓ built in X.XXs` が表示されれば成功
- エラーが出た場合は修正してから進む

**なぜやるか：** 本番 Vercel のビルドと同じ結果を手元で確認するため。

---

## 🚀 Step 5：Vercel デプロイ

```bash
npx vercel --prod
```

- `Production: https://...vercel.app [Xs]` が表示されることを確認
- `Aliased: https://promatch-app.jp [Xs]` が表示されることを確認（本番 URL に反映された証拠）
- 最後に `"readyState": "READY"` を確認

---

## 🌐 Step 6：本番 URL での動作確認

ブラウザで以下を開いて確認する：

- `https://promatch-app.jp` — トップページが表示されるか
- 変更した画面を実際に開いて動作確認
- エラーが出ていないかブラウザの DevTools で確認

---

## 📧 Step 7：通知系を変更した場合（必須）

**通知 API（`api/notify-*.ts`）に変更を加えた場合は、実際にメールが届くかテストする。**

### テスト手順の例（助っ人応募通知）
```bash
curl -X POST https://promatch-app.jp/api/notify-helper-application \
  -H 'Content-Type: application/json' \
  -d '{"request_id": "<テスト用のrequest_id>", "application_id": "<テスト用のapplication_id>"}'
```

### レスポンスで確認すること
```json
{
  "adminOk": true,
  "ownerOk": true,
  "ownerReason": "sent"
}
```

- `adminOk: true` → 管理者にメールが届いたか確認
- `ownerOk: true` → 募集主にメールが届いたか確認
- `ownerReason: "sent"` 以外の場合は Vercel ログを確認

**なぜやるか：** API が 200 OK を返しても、実際にメールが届かないケースがある（過去に複数回発生）。

---

## 🔐 Step 8：RLS・RPC に触れた場合（必須）

`craftsmen` テーブルや Supabase RLS / RPC を変更した場合：

### anon ロールの確認
```bash
# anon key で craftsmen に直接アクセスして [] が返ることを確認（意図通り）
curl -H 'apikey: <ANON_KEY>' \
  'https://<project>.supabase.co/rest/v1/craftsmen?user_id=eq.<uid>'
# → [] が返れば RLS は維持されている

# RPC 経由で email が取得できることを確認
curl -X POST -H 'apikey: <ANON_KEY>' -H 'Content-Type: application/json' \
  'https://<project>.supabase.co/rest/v1/rpc/get_craftsman_contact' \
  -d '{"p_user_id": "<uid>"}'
# → { "email": "...", "full_name": "..." } が返れば OK
```

**なぜやるか：** RLS の変更は影響範囲が大きい。anon から不必要な情報が見えていないか確認が必要。

---

## 📋 Step 9：最後に残リスクを報告する

デプロイ後に、以下を確認・報告する：

- ✅ 変更したファイル一覧
- ✅ tsc / build の結果
- ✅ デプロイ URL（本番 URL の alias 確認）
- ⚠️ 残るリスク・未解決の問題
- 📝 次のフェーズで対応すべきこと

---

## ⚠️ 絶対にやってはいけないこと

| NG | 理由 |
|---|---|
| tsc エラーが残ったままデプロイ | 本番クラッシュの原因になる |
| API キー・パスワードをコードに直書き | セキュリティ事故 |
| `onboarding@resend.dev` を from に使う | 職人宛メールが届かない |
| anon に craftsmen の SELECT を直接開ける | 個人情報漏洩リスク |
| build を確認せずにデプロイ | Vercel ビルドが失敗して本番が壊れる |
| git status を確認せずにデプロイ | 意図しないファイルが含まれる |
