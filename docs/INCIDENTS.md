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

## インシデント #6：Supabase Cached Egress が無料枠（5GB）を超過

> 発生：2026年5月16日（Phase54 対応）

### 何が起きたか
Supabase Usage で Cached Egress が 9.866 GB / 5 GB に達した（無料枠の約2倍）。
正式リリース前の段階でこの転送量になっており、本番ユーザーが増えると急速に超過する可能性がある。

### 推定原因
案件一覧・管理画面など、複数の `<video>` タグが `preload="metadata"` で同時にレンダリングされていた。
`preload="metadata"` はブラウザが自動的に動画の先頭数秒〜メタデータ（多くの場合数百KB〜数MB）を読み込む。
10件のカードが並ぶ画面を開くたびに、数MB〜数十MBの転送が発生していた可能性がある。

### 修正内容（Phase54）

**`preload="metadata"` → `preload="none"` に変更したファイルと場所：**

| ファイル | 場所 | 変更前 | 変更後 |
|---|---|---|---|
| `JobsListView.tsx` | 案件カード一覧（複数同時表示） | `preload="metadata"` | `preload="none"` |
| `JobsSwipeView.tsx` | スワイプビュー + `loop` 削除 | `preload="metadata" loop` | `preload="none"` |
| `AdminRequests.tsx` (L499) | 依頼詳細ドロワー内プレビュー | `preload="metadata"` | `preload="none"` |
| `AdminRequests.tsx` (L1147) | 管理画面一覧カード内サムネイル | `preload="metadata"` | `preload="none"` |

**そのまま維持したもの（ユーザー操作後に開くモーダル）：**
- `AdminRequests.tsx` L407：動画フルスクリーンモーダル（`autoPlay` + `preload="metadata"`）
- `ProJobs.tsx` L140：動画フルスクリーンモーダル（`autoPlay` + `preload="metadata"`）

**アップロード画面の改善：**
- `CorporateRequest.tsx`：動画選択エリアに「10〜15秒の短い動画がおすすめです」と注意文を追加

**既存の動画サイズ・秒数制限：なし**（強制制限の実装は別 Phase で検討）

### 学び
- **一覧画面では `preload="auto"` / `preload="metadata"` を使わない**
- **ユーザーが能動的に開いたモーダル・詳細画面のみ preload を許容する**
- **`loop` 属性はバックグラウンドで無限転送につながるため、必要な場面のみ使う**
- **Supabase Usage は定期的に確認する**（月次でも週次でも）

### 将来的な対策（今回は未実装）

| 対策 | 優先度 | 内容 |
|---|---|---|
| 動画圧縮（アップロード前） | B | ファイルサイズ制限・ffmpeg.wasm などで圧縮 |
| サムネイル生成 | B | 動画の静止画サムネイルを Storage に保存し、`<img>` で代替 |
| Cloudflare R2 移行 | C | Supabase の転送量制限を回避。リージョン最適化も可能 |
| CDN 最適化 | C | Cloudflare 経由でキャッシュ効率を上げる |
| 動画サイズ強制制限 | A | アップロード時に 50MB または30秒超の場合はエラー表示 |

> **注意：** Cloudflare R2 移行・Supabase リージョン変更は、既存 URL が変わるため正式リリース前に慎重に計画する。

---

## インシデント #7：`/api/auth/login` が 405 — ログイン完全不能

> 発生：2026年5月17日

### 何が起きたか

本番で職人ログインが全て失敗した。DevTools の Network タブで確認すると：

```
POST https://promatch-app.jp/api/auth/login → 405 Method Not Allowed
```

### 実際の原因

`frontend/api/auth/login.ts` は Vercel から serverless function として認識されない位置にあった。

```
vercel.json（root）
  outputDirectory: frontend/dist
  → Vercel は root api/ だけを /api/* にマップする

frontend/api/auth/login.ts  ← ❌ Vercel には見えない
api/auth/login.ts            ← ✅ ここにないと本番で動かない
```

POST `/api/auth/login` は対応する serverless function がなかったため、
SPA の rewrite（`/(.*) → /index.html`）にフォールスルー →
静的ファイル `index.html` は POST を受け付けない → **405**。

### 気づきにくかった理由

- `frontend/api/auth/login.ts` が存在し、ローカルでは Vite dev server が `frontend/vercel.json` のルールで中継して動いていた
- 本番とローカルで API routing の動作が異なることが見えていなかった
- エラーが「パスワード間違い」に見えた（実際は HTTP layer の問題）
- **Network タブで HTTP status を確認して初めて 405 と判明した**

### 修正内容

1. `api/auth/login.ts`（root）を作成 — `frontend/api/auth/login.ts` と同期
2. `api/auth/register.ts`（root）を作成 — 同じ問題が register にもあった

### 教訓

- **ログインできない = パスワード問題とは限らない。まず Network タブで HTTP status を確認する**
- **新しい `/api/...` endpoint は必ず root `api/` に作る。`frontend/api/` は本番では動かない**
- **デプロイ前に `node scripts/check-api-routes.mjs` でルート対応を確認する**
- **デプロイ後に `curl -X POST https://promatch-app.jp/api/auth/login` で 405 でないことを確認する**

---

## インシデント #8：`capture="environment"` でスマホカメラが直起動しアルバム選択できなかった

> 発生：2026年5月17日（Phase59 で修正）

### 何が起きたか

助っ人募集フォームの「現場写真」で、スマホから写真を選ぼうとするとカメラが即起動してしまい、アルバムから既存の写真を選べなかった。

### 原因

`<input type="file" accept="image/*" capture="environment">` の `capture="environment"` 属性。  
この属性はブラウザに「バックカメラを直接起動せよ」と指示する。アルバム選択ダイアログは表示されない。

### 修正内容

- `capture="environment"` を削除
- `multiple` 属性を追加（アルバムから複数枚まとめて選択できるようにする）
- ラベル文言：「写真を追加」→「写真を選択・撮影」
- 補足文：「その場で撮影しても、アルバムから選んでも大丈夫です。」を追加

### 教訓

- **`capture` 属性はカメラ限定専用。アルバム選択を許可したい場合は使わない**
- `accept="image/*"` だけで「カメラ撮影 or アルバム選択」のシート（iOS のアクションシート）が出る
- `multiple` なしだと 1 枚しか選べない。フォームで複数枚受け入れるなら必ずセットで付ける

---

## インシデント #9：`frontend/api/` と `root api/` の二重管理による混乱

> 発覚：2026年5月17日（Phase59/60 調査中）

### 何が起きたか

`frontend/api/` に 12 個の `.ts` ファイルが存在し、`root api/` とは別に管理されていた。
Phase59 の調査で `notify.ts` が out-of-sync（frontend 側が古い test sender のまま）だったことが判明。
他のファイルも「正しいのはどちらか」が不明確な状態だった。

### 原因

- Vercel は `root api/` のみを serverless function として認識するが、この事実が周知されていなかった
- `frontend/api/` に新しい API を作成→動作確認→`root api/` へのコピーを忘れる、というパターンが繰り返された
- `check-api-routes.mjs` が `frontend/` ディレクトリから実行すると `process.cwd()` がズレて誤った結果を返すバグもあった

### 修正内容（Phase59/60）

1. `frontend/api/*.ts` を全削除（`root api/` が唯一の source of truth）
2. `WARNING.md` を `frontend/api/` に配置（このディレクトリは本番では動かない旨を明記）
3. `check-api-routes.mjs` の root 検出を `vercel.json` の有無で判定するよう修正
4. `scripts/check-production-health.mjs` を追加（405 非発生を本番で確認できるスクリプト）
5. `npm run check:production-health` を package.json に追加

### 教訓

- **API は最初から `root api/` に作る。`frontend/api/` には置かない**
- **デプロイ前: `npm run check:deploy-safety`、デプロイ後: `npm run check:production-health`**
- **スクリプトは実行ディレクトリに依存しない作りにする（`process.cwd()` 直用は危険）**

---

## 今後の対応方針（共通ルール）

1. **実DB・実ログ・実レスポンス・実メール送信結果を確認してから修正を決める**
2. 「前回と同じはずだから」と決め打ちしない。原因が複数層に重なっていることがある
3. 新しい通知 API を作るときは:
   - `from` アドレスを `noreply@promatch-app.jp` にする
   - レスポンスに失敗理由フィールドを含める
   - `try/catch` で例外をキャッチし、理由を返す
   - デプロイ後に実際にメールが届くか確認する

4. dead code / legacy route の扱い:
   - **ファイルを削除する前に App.tsx のimport・route・他ファイルからのimportを全て確認する**
   - 「route がない = dead」とは限らない（sub-component として使われている場合がある）
   - import されているが render されていないコード（例: unused import）は tsc では検出されないことがある
   - `basename` substring マッチの grep では `CraftsmanDashboard` が `CraftsmanDashboardPage` にマッチするなど誤検出が起きる。**完全一致 `from '...CraftsmanDashboard'` で検索する**
   - legacy route がある画面は「APIが動かない」ことをコード（TODO コメント）と docs の両方に明記する
