# PRO MATCH — AI実装ルール

> Claude Code がコードを書く前に必ず読むファイルです。
> 詳細は `docs/PROJECT_CONTEXT.md` / `docs/DECISIONS.md` を参照。

---

## サービス概要

**PRO MATCH** — ショート動画で壁紙・床CF（クッションフロア）の工事見積もりができるマッチングサービス。

| ユーザー | 説明 |
|---|---|
| 依頼者 | 動画を送るだけ。完全無料 |
| 職人（PRO） | 概算を提示 → 成約時のみ手数料 |
| 運営 | `/admin/dashboard` で状況管理 |

**収益モデル（職人側のみ）**
```
〜 ¥30,000  → ¥500
〜 ¥80,000  → ¥1,500
〜 ¥150,000 → ¥3,000
  ¥150,001〜 → ¥5,000
```
工事代金は依頼者と職人が直接やり取り。PRO MATCHは預からない。

---

## 絶対ルール

1. **最小差分（Minimum Diff）** — 変更範囲を絞る。既存UIを壊さない
2. **TypeScript エラーゼロ** — 毎回 `npx tsc --noEmit` を実行する
3. **Supabaseスキーマ変更なし** — 既存テーブルを使い回す。新カラムが必要な場合は `meta` JSONB に保存して graceful fallback
4. **成約前は個人情報を開示しない** — 住所・電話番号は成約後のみ
5. **デモ fallback OK** — DB未実装なら `isDemo` フラグで `console.log` 代替
6. **BottomNav は4タブ固定** — 案件 / 管理 / 応援 / マイページ。タブを増やさない

---

## UI方針

| 要素 | 方針 |
|---|---|
| 背景 | 白（`bg-white` / `bg-slate-50`） |
| アクセント | `blue-600`（CTA・選択状態） |
| 利益表示 | `emerald-*` |
| カード | `rounded-2xl` / `rounded-3xl` + `ring-1 ring-slate-200` |
| 数字 | `font-extrabold`・大きく |
| レイアウト | `max-w-lg mx-auto px-4`（スマホ優先） |
| ロゴ | `/public/logo-full.svg`（横長）/ `/public/logo-icon.svg`（アイコン） |
| ブランド名 | **PRO MATCH**（「内装見積もり」「Aoi Interior」は使わない） |

**新機能の配置先**
- BottomNavには出さない
- 既存ページへのカードリンク、または `/tools` に集約する

---

## 技術方針

- **フレームワーク** — Vite + React + TypeScript（strict）
- **スタイル** — Tailwind CSS のみ（外部UIライブラリは追加しない）
- **ルーティング** — React Router v6（`useNavigate` / `useParams`）
- **DB** — Supabase（テーブル: `estimate_requests` / `job_applications` / `craftsmen`）
- **アニメーション** — Framer Motion は使わない。必要なら inline `<style>` で `@keyframes`
- **グラフ** — 複雑なグラフライブラリを追加しない
- **決済** — Stripe 等は未実装。表示だけならOK
- **コメント** — WHYが自明でない場合のみ。コード説明コメントは書かない

**meta JSONB 保存パターン**
```ts
// 既存 meta を保持しながら更新する（上書き禁止）
const { data: existing } = await supabase
  .from('estimate_requests').select('meta').eq('id', id).single();
const merged = { ...(existing?.meta as object ?? {}), newKey: value };
await supabase.from('estimate_requests')
  .update({ meta: merged } as Record<string, unknown>).eq('id', id);
```

**null安全パターン**
```ts
// NG: room.condition.length  → クラッシュ
// OK: (room.condition ?? []).length
// NG: job.meta!.rooms!.map  → 非null assertionを多用しない
// OK: const rooms = job?.meta?.rooms ?? [];
```

---

## 禁止事項

| 禁止 | 理由 |
|---|---|
| 依頼者側に手数料金額を表示する | 依頼者は完全無料が前提 |
| BottomNav にタブを追加する | UX・認知負荷 |
| 工事代金のエスクロー・預かり設計 | 資金移動業登録が必要になる |
| Stripe 等の決済実装（依頼なし） | MVP優先 |
| 複雑なグラフライブラリの追加 | バンドルサイズ・依存 |
| Supabase テーブル構造の変更 | スキーマ変更は影響範囲が大きい |
| 大規模リファクタリング（依頼なし） | 最小差分文化 |
| ブランド名「内装見積もり」「Aoi Interior」 | PRO MATCH に統一済み |
