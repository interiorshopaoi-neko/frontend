# PRO MATCH — 本番反映前チェックリスト

> このチェックリストは「本番に反映する前に必ず確認する」手順です。
> 実運用フェーズに入っているため、チェックを省略しないでください。

---

## ⚡ クイックチェック（最低限これだけ）

```bash
# 1. 現在地確認
git branch --show-current && git status && git log --oneline -1

# 2. API route 確認（MISSING/FRONTEND-ONLY が出たらデプロイしない）
node scripts/check-api-routes.mjs

# 3. tsc + build
cd frontend && npx tsc --noEmit && npm run build

# 4. push
git push origin HEAD:main

# 5. 本番確認（push 後 1〜2 分待ってから）
curl -s -o /dev/null -w "%{http_code}" -X POST https://promatch-app.jp/api/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"x@x.com","password":"wrong"}'
# → 401 (OK) / 405 は NG
```

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

## ✅ Step 3.5：API ルートチェック（必須）

> **インシデント #7 の再発防止。**
> `/api/auth/login` が 405 で本番ログイン不能になった事故の教訓。

```bash
# リポジトリ root から実行
node scripts/check-api-routes.mjs

# または frontend/ から
npm run check:api-routes
```

出力の確認ポイント：

| 表示 | 意味 | アクション |
|---|---|---|
| `✅ OK` | root api/ に対応あり | 問題なし |
| `❌ MISSING` | 本番で 405 になる | **デプロイ禁止。root api/ にファイルを追加** |
| `⚠️ FRONTEND-ONLY` | frontend/api/ にしかない | root api/ にコピー |
| `⚠️ OUT-OF-SYNC` | root と frontend で内容が違う | root を最新にしているか確認 |
| `⚪ LEGACY` | 既知の未対応 | 無視でOK（docs/CURRENT_STATUS.md 参照） |

**`❌ MISSING` が 1 つでも出たらデプロイしない。**

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

### ✅ Vercel Current commit の確認

Vercel ダッシュボード → Deployments → **Production** の commit hash が、  
`git log --oneline -1` の hash と一致していることを確認する。

> **Preview と Production を間違えない。** Vercel は Preview URL が先に生成されるが、  
> Production（promatch-app.jp）への反映には alias が必要。`Aliased:` の表示を必ず確認。

### ✅ 405 確認（最低限）

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST https://promatch-app.jp/api/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"x@x.com","password":"wrong"}'
# → 401 (OK) / 405 は NG
```

または：
```bash
npm run check:production-health
```

### ✅ Safari / 実機確認時の注意

Safari はキャッシュが強いため、デプロイ後に古い画面が表示されることがある。  
**プライベートタブ（またはシークレットモード）で確認する**と確実。

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

## 🗂️ Step 10：Vercel Serverless API ルール（必読）

> **インシデント #7（2026-05-17）の再発防止ルール。**
> `/api/auth/login` が 405 になってログインできなくなった事故の教訓。

### ✅ Vercel は root `api/` だけを serverless function として認識する

```
リポジトリ構成:
  vercel.json         ← Vercel が参照（root 配置）
  api/                ← ✅ Vercel が serverless function として認識するのはここだけ
    auth/login.ts     → POST /api/auth/login
    notify.ts         → POST /api/notify
  frontend/
    api/              ← ❌ Vercel には見えない（フロントのソース管理用）
      auth/login.ts   → 本番 /api/auth/login にはならない
```

### ✅ 新しい `/api/...` endpoint を追加するときのルール

1. **必ず `api/` (root) にファイルを作る** — `frontend/api/` に置いても本番では動かない
2. ファイル名＝エンドポイント名：`api/foo-bar.ts` → `/api/foo-bar`
3. サブディレクトリ対応：`api/auth/login.ts` → `/api/auth/login`

### ✅ デプロイ前の確認コマンド

```bash
# フロントから呼ばれている /api/* と root api/ の対応を確認
node scripts/check-api-routes.mjs
```

問題があれば `⚠️ MISSING` が表示される。全て `✅ OK` になってからデプロイする。

### ✅ デプロイ後の確認

```bash
# ログイン API が 405 でないことを確認（200 or 401 が期待値）
curl -s -o /dev/null -w "%{http_code}" -X POST https://promatch-app.jp/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"wrong"}'
# → 401 なら OK（405 は NG）
```

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
| **`frontend/api/` に新しい API を置く** | **本番の `/api/...` にならず 405 になる** |
