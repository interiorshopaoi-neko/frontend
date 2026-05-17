# ⚠️ このディレクトリは本番 Vercel で実行されません

## 重要

このディレクトリ (`frontend/api/`) 内のファイルは、
**Vercel の serverless function としては認識されず、本番 `/api/...` にはなりません。**

## なぜ存在するか

過去にここで API を開発し、後から `root api/` に移動した歴史的な経緯があります。
「参照用コピー」として残っていますが、実際に本番で動くのは `root api/` だけです。

## Vercel の API 配置ルール

```
リポジトリ root/
  api/          ← ✅ Vercel serverless。/api/* として本番で動く
    auth/
      login.ts  → POST /api/auth/login
    notify.ts   → POST /api/notify
  frontend/
    api/        ← ❌ Vercel には見えない。本番では動かない
      auth/
        login.ts  → 本番 /api/auth/login にはならない
```

## 絶対にやってはいけないこと

- このディレクトリに新しい API を追加しても本番では動きません
- `frontend/api/` を編集しても `root api/` は変わりません
- 同名ファイルを両方に更新したつもりでも、本番に反映されるのは `root api/` だけです

## 新しい `/api/...` endpoint を追加するときは

**必ず `root api/` (リポジトリ最上位の `api/` ディレクトリ) に作成してください。**

```bash
# 確認コマンド
node scripts/check-api-routes.mjs
npm run check:api-routes  # frontend/ ディレクトリから実行する場合
```

## インシデント記録

このディレクトリが原因で `/api/auth/login` が 405 になりログイン不能になった事故が発生しています。
詳細: `docs/INCIDENTS.md` インシデント #7
