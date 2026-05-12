# PRO MATCH — 現在の実装状況

> 最終更新：2026年5月12日

---

## ✅ 実装済み

### お客様側
| ページ | ルート | 説明 |
|---|---|---|
| トップページ | `/` | 動画ファーストLP。BottomNav(subtle)あり |
| 動画フォーム依頼 | `/corporate` | マルチステップ7ステップ依頼フォーム（動画・写真・複数部屋対応） |
| 受付完了メール | `send-customer-email` Edge Function | `noreply@promatch-app.jp` から送信。request_id付きリンク2本含む（応募確認・追加情報）|
| 追加情報入力 | `/request/:id/extra-info` | 依頼送信後の任意情報（家具・駐車・材料等）。meta JSONB 保存 |
| 見積もりフロー | `/customer/estimate/flow` | 旧フロー（残存） |
| レビューページ | `/request/:id/review` | 星評価・確認チェックリスト（デモのみ・DB保存なし） |

### 職人側
| ページ | ルート | 説明 |
|---|---|---|
| 案件一覧 | `/craftsman/jobs` | 動画タブ優先・想定売上/手取り表示・部屋数/追加情報バッジ |
| 応募ページ | `/craftsman/apply/:id` | 概算金額入力・手数料プレビュー・部屋情報/追加情報セクション表示 |
| 応募管理 | `/craftsman/dashboard` | ステータス管理・手数料notice・レビュー待ちバナー |
| プロフィール | `/craftsman/profile` | 編集画面・職人ツール導線・サポートカード |
| 公開プロフィール | `/craftsman/profile/:userId` | 閲覧専用・通報リンク |
| 応援募集 | `/craftsman/help` | 職人同士の応援募集フォーム |
| 応援一覧 | `/craftsman/help-list` | 応援案件一覧・参加ボタン・通報リンク |
| 職人ツール | `/tools` | 利益管理・簡単見積計算（ローカルstateのみ） |

### 管理者側
| ページ | ルート | 説明 |
|---|---|---|
| 管理ダッシュボード | `/admin/dashboard` | 依頼・職人・応募データ取得・分析。部屋数/追加情報列あり |
| 依頼一覧 | `/admin/requests` | 依頼一覧 |
| 旧管理 | `/admin` | 旧AdminDashboard（残存） |

### 静的ページ
| ページ | ルート |
|---|---|
| FAQ | `/faq` |
| お問い合わせ・通報 | `/support` |
| 利用規約 | `/terms` |
| プライバシーポリシー | `/privacy` |
| 特定商取引法 | `/legal` |
| 料金ポリシー（旧） | `/policy` |
| 職人登録 | `/pro-signup` |

### コンポーネント・ライブラリ
- `BottomNav`：4タブ固定（案件・管理・応援・マイページ）
- `serviceFee.ts`：`calculateServiceFee()` / `formatFee()`
- SVGロゴ：`/public/logo-full.svg`・`/public/logo-icon.svg`（家+再生ボタン）
- 型定義：`RoomInfo` / `JobMeta` / `ExtraInfo`（`CraftsmanJobsPage.tsx` / `RequestExtraInfoPage.tsx` からexport）

---

## 🚧 部分実装（動くが不完全）

| 機能 | 状況 |
|---|---|
| レビュー | UIあり（`/request/:id/review`）。DB保存なし。デモ送信のみ |
| FAQ | 静的コンテンツのみ。AIサポートなし |
| お問い合わせ・通報 | UIあり。`console.log`のみ。Supabase保存なし |
| 管理分析 | `/admin/dashboard`に基本分析カードあり。精度は低 |
| 応援手数料 | UI文言のみ（「正式版で¥300予定」）。決済未実装 |

---

## ❌ 未実装

| 機能 | 備考 |
|---|---|
| AI見積 | `/tools` 内に「準備中」カードあり |
| 本格チャット | 未着手 |
| Stripe決済 | 未着手。現在は手数料の表示のみ |
| AI FAQ / AIサポート | FaqPage下部に「追加予定」の文言のみ |
| 本格レビュー保存 | Supabase保存なし |
| 自動マッチング | 未着手 |
| プッシュ通知 | 未着手 |
| 職人の実績・レベル制度 | 未着手 |

---

## Supabase テーブル（参照のみ）

| テーブル | 用途 |
|---|---|
| `estimate_requests` | 依頼者からの工事依頼 |
| `job_applications` | 職人からの応募（price・service_fee・status） |
| `craftsmen` | 職人プロフィール |

> **原則：Supabaseのスキーマ変更はしない**

---

## メール送信の現在状態（2026-05-12確認済み）

### Resendドメイン検証
| ドメイン | 状態 |
|---|---|
| `promatch-app.jp` | ✅ **verified済み** |
| `onboarding@resend.dev` | テスト用。Resend登録メール(`interior.shop.aoi@gmail.com`)宛のみ可。本番不可 |

### 送信元アドレス
| ファイル | FROM | 状態 |
|---|---|---|
| `supabase/functions/send-customer-email` | `Deno.env.get('FROM_EMAIL')` → `noreply@promatch-app.jp` | ✅ verified・本番稼働中 |
| `supabase/functions/send-craftsman-notification` | `Deno.env.get('FROM_EMAIL')` → `noreply@promatch-app.jp` | ✅ verified・本番稼働中 |
| `api/notify.ts`（Vercel）| `PRO MATCH 管理 <noreply@promatch-app.jp>` | ✅ verified・管理者通知用 |

### Supabase シークレット（`send-customer-email` / `send-craftsman-notification` 共有）
| シークレット名 | 値 | 最終更新 |
|---|---|---|
| `FROM_EMAIL` | `noreply@promatch-app.jp` | 2026-05-12（v16 deploy時） |
| `RESEND_API_KEY` | Resend APIキー（masked） | 2026-05-07 |
| `SITE_URL` | `https://promatch-app.jp` | 設定済み |

### Edge Function バージョン
| 関数 | バージョン | 更新日時(UTC) |
|---|---|---|
| `send-customer-email` | v16 | 2026-05-12 |
| `send-craftsman-notification` | v6 | 2026-05-09 |

### 実装済み機能（2026-05-12）
- ✅ `send-customer-email` に `request_id` ベースのリンク2本追加
  - `📋 応募状況を確認する → /request/:id/applications`
  - `✏️ 追加情報を入力する → /request/:id/extra-info`
- ✅ `CorporateRequest.tsx` が `request_id` を Edge Function に渡すよう修正（フロントデプロイ済み）
- ✅ `api/notify.ts` の FROM を `onboarding@resend.dev` → `noreply@promatch-app.jp` に変更・管理画面URL修正

### ⚠️ 注意事項
- `onboarding@resend.dev` は絶対に本番で使わない。Resendのテスト送信者で制限あり
- `noreply@promatch-app.jp` ならどのアドレス宛でも送信可能（verified済みのため）
