# PRO MATCH — 事故記録と学び

> 「同じ事故を二度起こさない」ためのログ。
> Phase51 / Phase52 で発生・解決した問題を記録します。

---

## インシデント #1：カラム名 typo（`name` vs `full_name`）

### 何が起きたか
助っ人応募通知 API が募集主のメールアドレスを取得できなかった。

### 原因
`craftsmen` テーブルのカラム名は `full_name` だが、API コードで `select=email,name` と書いていた。
PostgREST は存在しないカラムを指定すると 400 エラーを返す → メール取得失敗 → 通知送れない。

### 気づきにくかった理由
- API 自体は 200 OK を返していた
- `ok: true` しか返していなかったので、フロントや管理者から見ると「成功した」ように見えた
- メールが届かないことで初めて問題発覚

### 修正内容
`select=email,name` → `select=email,full_name` に修正。

### 学び
- **DBのカラム名は必ず実際のスキーマを確認してから書く**（推測で書かない）
- **APIレスポンスに失敗理由を含める**（`{ ok: true }` だけでは隠蔽になる）
- TypeScript の型定義と実テーブルのカラム名が一致しているか確認する

---

## インシデント #2：RLS により anon から craftsmen が空配列に見えた

### 何が起きたか
カラム名を修正してもまだ募集主への通知が届かなかった。

### 原因
`craftsmen` テーブルには `authenticated` ロール向けの SELECT policy しかない。
anon key（API Routeが使用）でアクセスすると、行が存在していても `[]` が返る。

```
// anon key でアクセス
GET /rest/v1/craftsmen?user_id=eq.xxxxx
→ [] （行はあるが RLS でフィルタされる。エラーにならない！）
```

### 気づきにくかった理由
- PostgREST は 200 OK + `[]` を返す（エラーではない）
- 「行がない」と「RLS で見えない」が同じレスポンス形式
- `rows.length === 0` でチェックしていたが、この 2 パターンを区別できなかった

### 修正内容
craftsmen テーブルへの直接アクセスをやめ、`SECURITY DEFINER` RPC `get_craftsman_contact(text)` を作成。
この RPC は anon に EXECUTE 権限を付与し、必要な情報（email / full_name）だけを返す。

### 学び
- **anon に SELECT を開けずに情報を取るには SECURITY DEFINER RPC を使う**
- **RLS の「見えない」と「存在しない」は区別が難しい。Supabase Studio で直接確認する**
- **新しい API を作るとき、anon / authenticated で動作を両方確認する**

---

## インシデント #3：Resend の `onboarding@resend.dev` 制限

### 何が起きたか
職人宛の通知メールが届かなかった。

### 原因
`from: 'Aoi Interior <onboarding@resend.dev>'` を職人宛メールにも使っていた。
`onboarding@resend.dev` は Resend のテスト送信者アドレスであり、
**Resend のアカウントオーナーのメールアドレス宛にしか送信できない**。

職人のメールアドレス宛に送ろうとすると、Resend 側でサイレントにドロップされる
（エラーにならない、または送信済みとして返すが実際には届かない）。

### 修正内容
全通知 API の `from` を以下に統一：
```
PRO MATCH <noreply@promatch-app.jp>
```
`promatch-app.jp` は Resend で検証済みドメインのため、任意のアドレス宛に送信可能。

### 学び
- **`onboarding@resend.dev` は絶対に本番で使わない**
- **新しい通知 API を作るときは `from` アドレスを最初に確認する**
- **実際にメールが届くかをテストアカウントで確認してからデプロイする**

---

## インシデント #4：リファクタリング後の `rows.length` ReferenceError

### 何が起きたか
RPC に切り替えた後、`notify-helper-application.ts` が内部エラーを起こして通知送信に失敗した。

### 原因
変数名を `rows`（配列）から `contact`（オブジェクト）にリファクタリングしたが、
ログ出力の行に `rows.length` が残っていた。

```typescript
// ❌ リファクタ後に残ってしまったコード
console.log('取得結果:', { rows_count: rows.length }); // ReferenceError!
```

### 気づきにくかった理由
- TypeScript のコンパイルは通る（`rows` は他のスコープで宣言されていた可能性 or ランタイムエラー）
- `try/catch` で例外をキャッチし `ownerReason: 'exception'` を返していたが、詳細ログが不十分だった
- `exception` という理由だけでは原因がわからなかった

### 修正内容
`rows.length` → `found: contact !== null` に修正。

### 学び
- **リファクタリング後は変数名の参照が全て更新されているか確認する**
- **TypeScript で検出できない実行時エラー（ランタイムエラー）がある**
- **`catch` 節では必ず `err.message` をログに出す**
- **`reason: 'exception'` はデバッグの出発点として有効だが、スタックトレースも残す**

---

## インシデント #5：レスポンスが `{ ok: true }` のみで失敗を隠蔽

### 何が起きたか
API が「成功」を返しているのに、実際にはメールが届いていなかった。

### 原因
通知 API が `res.status(200).json({ ok: true })` だけを返す設計だった。
内部でどこが失敗していても、HTTP 200 + `ok: true` が返るため、
フロントエンドや管理者からは成功に見えた。

### 修正内容
全通知 API のレスポンスに詳細フィールドを追加：
```json
{
  "adminOk": true,
  "ownerOk": false,
  "ownerReason": "email_empty",
  "applicantOk": false,
  "applicantReason": "resend_error"
}
```

### 学び
- **通知 API は「誰に送れたか」「なぜ送れなかったか」を必ずレスポンスに含める**
- **Vercel のログと組み合わせることで問題箇所を素早く特定できる**

---

## 今後の対応方針（共通ルール）

1. **実DB・実ログ・実レスポンス・実メール送信結果を確認してから修正を決める**
2. 「前回と同じはずだから」と決め打ちしない。原因が複数層に重なっていることがある
3. 新しい通知 API を作るときは:
   - `from` アドレスを `noreply@promatch-app.jp` にする
   - レスポンスに失敗理由フィールドを含める
   - `try/catch` で例外をキャッチし、理由を返す
   - デプロイ後に実際にメールが届くか確認する
