# PRO MATCH — 改善バックログ

> 「今は触らない」と決めたもの。
> 実装するときは必ず `docs/DO_NOT_BREAK.md` と `docs/CRITICAL_FLOWS.md` を確認してから着手すること。

---

## 🔴 重要度：高（近いうちに対応したい）

### Stripe 本番モード切替
- 現在テストキー（`sk_test_`）で動いている可能性あり
- 本番化前に `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CONTACT_UNLOCK` を本番値に切替
- `docs/ENVIRONMENT.md` の切替チェックリスト参照

### feedback_reports_v2 migration 本番適用
- `supabase/migrations/20260523_feedback_reports_v2.sql` を Supabase SQL Editor で実行
- 未実行だと `/feedback` 送信がDBエラーになる

### レビュー DB 保存
- 現在 `ReviewPage` は UI のみ（DB保存なし）
- `reviews` テーブルへの保存・表示が未実装
- 将来的に職人プロフィールにレビュー星表示を追加

---

## 🟡 重要度：中（3ヶ月以内に検討）

### Vercel Hobby 12関数制限への対応
- 現在 `api/` に20本以上の関数がある
- Hobby プランは12本上限のため、超過分が動いていない可能性
- 対策: 関連する小さな関数を統合（例: `admin-help-action` + `admin-request-action` → `admin-action`）
- または Pro プランへのアップグレード

### 動画圧縮
- 顧客が大容量動画をアップロードするとStorageコスト増大
- FFmpegを使ったサーバーサイド圧縮 or クライアント圧縮を検討

### demo案件の完全分離
- 現在 `hidden` フラグで管理しているが、demo用DBテーブル or スキーマの分離が望ましい
- demo案件が本番職人に見えないよう保証する仕組みが必要

### 助っ人募集の課金化
- 現在は無料
- 将来: 地域・工種フィルター通知（有料オプション）
- 設計前に `help_requests`, `help_applications` のスキーマを確認

---

## 🟢 重要度：低（半年以上先）

### 施工事例の強化
- 現在4枚上限・1サイズ
- 動画投稿・ビフォーアフター・工種タグ等の追加
- Storage容量コストとのバランス検討

### 管理画面の分析強化
- `/admin/dashboard` に売上推移グラフ・職人ランキング等を追加
- 現在は raw データ表示のみ

### 紹介制度の不正対策
- 現在: 同一IP/デバイスでの自己紹介を防ぐ仕組みがない
- 将来: fingerprint チェック or 運営承認制

### 通知設定の高度化
- 職人が「新着通知メールのオン/オフ」をプロフィールで設定できるようにする
- 現在は管理者側の送信制御のみ

### feedback修正済みの公開
- 改善報告で「対応済み」になったものをユーザーに見せる（変更ログ的な機能）

### スクショ付き改善データの分析
- `feedback_reports.meta` + `screenshot_url` を使った UI問題の傾向分析
- 将来的に Supabase Analytics or 外部ツール連携

### AI見積
- お客様が写真を送ると想定工事費が返ってくる機能
- Vision API or 専用モデル利用が必要

### 法人向け定額プラン
- 複数物件・月次契約の職人向けプラン
- 現在の成果報酬型とは別設計が必要

---

## 📝 バックログ管理ルール

- 着手前に `docs/CRITICAL_FLOWS.md` で影響フローを確認する
- Stripe・通知・成約・応募に触れる場合は単独のPRで小さく
- migration は必ず `IF NOT EXISTS` で冪等に書く
- 本番反映後は `docs/CURRENT_STATUS.md` の「migration適用状況」を更新する
