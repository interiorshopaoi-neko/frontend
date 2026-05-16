# PRO MATCH — RLS 運用ルール

> 最終更新：2026年5月16日（Phase52 時点）
> このルールは Phase51 の事故を教訓に作成しました。

---

## 「RLS」とは何か（初心者向け）

**RLS（Row Level Security）** は Supabase の「行レベルのアクセス制御」です。

テーブルに誰がアクセスできるかをルール（policy）で決めます。
ルールがない場合、そのロールからは**行が存在していても空配列 `[]` が返ります**。

```
例：
  craftsmen テーブルに 100 行データがある
  → anon（未認証ユーザー）に SELECT policy がない
  → anon key で取得すると [] が返る（エラーにはならない！）
  → 「データがない」と勘違いしやすい
```

この「見えない」と「存在しない」を混同するのがよくある事故パターンです。

---

## 絶対ルール

### 1. anon に直接 SELECT を安易に開けない

```sql
-- ❌ やってはいけない例
CREATE POLICY "craftsmen_anon_select" ON craftsmen
  FOR SELECT TO anon USING (true);
```

craftsmen テーブルには職人のメールアドレスや個人情報が含まれる。
anon に直接 SELECT を開けると、ログインしていない誰でもデータを取得できてしまう。

### 2. 必要な情報は SECURITY DEFINER RPC 経由で取得する

```sql
-- ✅ 正しいアプローチ
-- サーバー側で「必要な情報だけ」を安全に返す RPC を作る
CREATE OR REPLACE FUNCTION get_craftsman_contact(p_user_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- ← これが重要。関数実行者の権限ではなく、関数作成者の権限で動く
AS $$
BEGIN
  RETURN (
    SELECT json_build_object('email', auth.email, 'full_name', c.full_name)
    FROM craftsmen c
    JOIN auth.users au ON c.user_id = au.id::text
    WHERE c.user_id = p_user_id
    LIMIT 1
  );
END;
$$;

-- anon に実行権限だけを付与（SELECT権限ではない）
GRANT EXECUTE ON FUNCTION get_craftsman_contact TO anon;
```

**なぜ安全か：**
- RPC は「この情報だけ返す」と明示的に定義されている
- SELECT 権限を持たない anon でも、RPC 経由なら必要な情報だけ取得できる
- RLS の行フィルタリングをサーバー側でコントロールできる

---

## `get_craftsman_contact(text)` の正式な使い方

**目的：** 職人の `email` と `full_name` を安全に取得するための正式ルート

**呼び出し方（TypeScript）：**
```typescript
const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_craftsman_contact`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ p_user_id: craftsmanUserId }),
});
const contact = await res.json() as { email?: string; full_name?: string } | null;
```

**注意：**
- `p_user_id` は `craftsmen.user_id`（UUID の文字列形式）
- 存在しない user_id を渡すと `null` が返る
- エラーではなく `null` なので、`contact?.email` のように null チェックが必要

---

## よくある間違いパターン

### ❌ 間違い1：直接 REST で craftsmen を取得しようとする

```typescript
// anon key では [] が返る。エラーにならないので気づきにくい！
const res = await fetch(`${SUPABASE_URL}/rest/v1/craftsmen?user_id=eq.${id}`);
const rows = await res.json(); // → [] （RLS で見えない）
```

### ✅ 正しいアプローチ：RPC 経由
```typescript
const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_craftsman_contact`, {
  method: 'POST',
  body: JSON.stringify({ p_user_id: id }),
  ...
});
const contact = await res.json(); // → { email: '...', full_name: '...' }
```

---

## 「行がない」と「RLSで見えない」の区別方法

| 状況 | PostgREST の挙動 | どう区別するか |
|---|---|---|
| 行が存在しない | `[]` を返す | Supabase Studio で直接確認 |
| RLS で見えない | `[]` を返す（同じ！） | authenticated role で同じクエリを実行してみる |
| RPC が null を返す | `null` を返す | 行がないか、RPC の WHERE 条件を確認 |

**確認手順：**
1. Supabase Studio → Table Editor → 直接確認
2. Supabase Studio → SQL Editor → `SET role authenticated; SELECT * FROM craftsmen WHERE user_id = '...';`
3. anon と authenticated で結果が違う → RLS の問題

---

## RLS を緩める前に必ず検討すること

新しい機能で「anon からデータが取れない」問題が発生したら、以下の順で検討する：

```
1. SECURITY DEFINER RPC で「必要な情報だけ」返せないか？
   → YES → RPC を作る（推奨）

2. authenticated ユーザーだけに絞れないか？
   → フロントで認証を必須にする

3. どうしても anon に必要か？
   → 公開情報のみ（PII を含まない）であれば SELECT policy を検討
   → 必ずレビューしてから実施
```

---

## 現在の主要 RPC 一覧

| 関数名 | 用途 | 呼び出し元 |
|---|---|---|
| `get_craftsman_contact(text)` | 職人のメール・名前取得 | `notify-helper-application.ts`, `notify-helper-approved.ts` |
| `ensure_craftsman_for_auth_user(text, text, text)` | 職人登録時の craftsmen 行作成 | 登録フロー |

> 新しい RPC を追加した場合はこの一覧を更新してください。
