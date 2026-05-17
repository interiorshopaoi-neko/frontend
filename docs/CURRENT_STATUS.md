# PRO MATCH — 現在の実装状況

> 最終更新：2026年5月17日（Phase60 完了時点）

---

## 🚀 実運用テストフェーズに入っています

Phase52 をもって、通知・RLS・本番デプロイまで到達しました。
実ユーザーが使い始めた後も安全にアップデートできるよう、この状態を記録します。

---

## ✅ 実装済み機能

### お客様側
| ページ | ルート | 説明 |
|---|---|---|
| トップページ | `/` | 動画ファーストLP。BottomNav(subtle)あり |
| 動画フォーム依頼 | `/corporate` | マルチステップ7ステップ依頼フォーム（動画・写真・複数部屋対応） |
| 受付完了メール | Supabase Edge Function: `send-customer-email` | `noreply@promatch-app.jp` から送信。request_id 付きリンク2本含む |
| 追加情報入力 | `/request/:id/extra-info` | 依頼送信後の任意情報（家具・駐車・材料等）。meta JSONB 保存 |
| レビューページ | `/request/:id/review` | 星評価・確認チェックリスト（UIのみ・DB保存なし） |

### 職人側
| ページ | ルート | 説明 |
|---|---|---|
| 案件一覧 | `/craftsman/jobs` | 動画タブ優先・想定売上/手取り表示 |
| 応募ページ | `/craftsman/apply/:id` | 概算金額入力・手数料プレビュー |
| 応募管理ダッシュボード | `/craftsman/dashboard` | ステータス管理・レビュー待ちバナー |
| プロフィール | `/craftsman/profile` | 編集画面・職人ツール導線 |
| 公開プロフィール | `/craftsman/profile/:userId` | 閲覧専用・通報リンク |
| 助っ人募集 | `/craftsman/help` | 職人同士の応援募集フォーム |
| 助っ人一覧 | `/craftsman/help-list` | 応援案件一覧・参加ボタン |
| 職人ツール | `/tools` | 利益管理・簡単見積計算（ローカルstateのみ） |

### 管理者側
| ページ | ルート | 説明 |
|---|---|---|
| 管理ダッシュボード | `/admin/dashboard` | 依頼・職人・応募データ取得・分析。null owner 助っ人警告あり |
| 依頼一覧 | `/admin/requests` | 依頼一覧・ログアウト確認モーダルあり |

### 認証
- `/pro-signup` — 職人登録（メール確認フロー、SECURITY DEFINER RPC で craftsmen 行自動作成）
- `/auth/login`、`/auth/verify`、`/reset-password` — Supabase Auth + localStorage 並列運用

### 通知（Resend 本番稼働中）
- 見積もり依頼受付 → 管理者・お客様・職人へのメール
- 助っ人応募 → 管理者・募集主へのメール（Phase51 で修正）
- 助っ人承認 → 応募者へのメール（募集主の連絡先を開示、Phase51 で修正）
- 送信元は `PRO MATCH <noreply@promatch-app.jp>` に統一

### セキュリティ
- Supabase RLS：各テーブルに適切な policy あり
- SECURITY DEFINER RPC：`get_craftsman_contact(text)`、`ensure_craftsman_for_auth_user(...)` など
- anon に craftsmen 直接 SELECT を開けない設計を維持

---

## 🏗️ API 配置ルール（必読）

| 項目 | 内容 |
|---|---|
| **本番 API の source of truth** | `root api/` のみ（`frontend/api/` は本番では動かない） |
| **`frontend/api/`** | Phase60 で削除済み（WARNING.md のみ残存）。編集しても本番に反映されない |
| **デプロイ前必須チェック** | `npm run check:deploy-safety`（tsc + API route 確認） |
| **本番反映後確認** | `npm run check:production-health` または curl で 405 でないことを確認 |
| **Vercel Current commit** | Vercel ダッシュボードで意図した commit が Production に反映されているか確認 |

---

## 🐛 Phase51 / Phase52 で解決したこと

| 問題 | 解決策 |
|---|---|
| 募集主への助っ人応募通知が届かなかった | craftsmen.name → full_name カラム名 typo 修正 |
| anon key で craftsmen が空配列になった | SECURITY DEFINER RPC `get_craftsman_contact` 経由に切替 |
| Resend 送信制限（onboarding@resend.dev） | 職人宛メール全てを `noreply@promatch-app.jp` に統一 |
| リファクタ後の ReferenceError（rows.length） | 変数名 contact に合わせて修正 |
| ログアウット誤タップ | LogoutConfirmModal（ワンクッション確認）を4箇所に実装 |
| 承認通知のレスポンスが不透明 | `applicantOk`/`applicantReason`/`requesterEmailFound` を追加 |
| craftsman_id=null の古い助っ人募集 | 管理画面でアンバー警告として一覧表示 |

---

## ⚠️ 残るリスク・未完了

| 項目 | 状況 |
|---|---|
| `craftsman_id=null` の旧助っ人募集 | 管理画面で警告表示中。通知は送れない（設計上の限界） |
| レビュー DB 保存 | UIのみ・Supabase 保存なし |
| お問い合わせ・通報 | UIあり・Supabase 保存なし |
| Stripe 決済 | 未着手（手数料 UI のみ） |
| 職人ツール（利益管理・現場メモ） | ローカルstateのみ・DB保存なし |

---

## Supabase テーブル

| テーブル | 用途 |
|---|---|
| `estimate_requests` | 依頼者からの工事依頼 |
| `job_applications` | 職人からの応募 |
| `craftsmen` | 職人プロフィール |
| `help_requests` | 助っ人募集 |
| `help_applications` | 助っ人応募 |
| `admin_notification_settings` | 管理者通知のオン/オフ設定（singleton id=1） |
| `reviews` | レビュー（テーブルはあるが UI 保存は未実装） |
| `billing_events` | 課金イベント（将来のStripe連携用） |
| `referrals` | 紹介コード管理 |

---

## メール送信（2026-05-16 確認済み）

| 用途 | FROM | 手段 |
|---|---|---|
| お客様受付確認 | `noreply@promatch-app.jp` | Supabase Edge Function |
| 職人新着案件通知 | `noreply@promatch-app.jp` | Supabase Edge Function |
| 管理者通知（全般） | `noreply@promatch-app.jp` | Vercel API Route |
| 助っ人応募通知（管理者・募集主） | `noreply@promatch-app.jp` | Vercel API Route |
| 助っ人承認通知（応募者） | `noreply@promatch-app.jp` | Vercel API Route |

> `onboarding@resend.dev` は**絶対に本番で使わない**（Resend アカウントオーナー宛にしか届かない）

---

## ⚠️ Legacy API 呼び出し（Supabase 直接統合前の旧 REST API）

以下のページは Supabase 直接統合前の REST API（`/api/estimates/*`）を呼んでいます。
これらの serverless function は root `api/` に存在しないため、**本番では動作しません**（既知・放置中）。

| ファイル | ルート | 呼び出し | 状態 |
|---|---|---|---|
| `CustomerDashboard.tsx` | `/customer` | `api.get('/estimates/my')` | ❌ 本番不動作 |
| `NewEstimate.tsx` | `/customer/estimate/new` | `api.post('/estimates')` | ❌ 本番不動作 |
| `EstimateDetail.tsx` | `/customer/estimate/:id` | `api.get/post/put('/estimates/:id/*')` | ❌ 本番不動作 |
| `ReviewEstimate.tsx` | `/craftsman/estimate/:id` | `api.put('/estimates/:id/confirm')` など | ❌ 本番不動作 |
| `CraftsmanDashboard.tsx` | (未登録) | `api.get('/estimates/craftsman')` | 🗑️ App.tsx に未登録のデッドファイル |

**対処方針：** 将来 Supabase client 直接統合に移行する。それまでは `check-api-routes.mjs` の `LEGACY_ROUTES` に登録済みで、デプロイチェックからは除外されています。
