# PRO MATCH — 現在の実装状況

> 最終更新：2026年5月

---

## ✅ 実装済み

### お客様側
| ページ | ルート | 説明 |
|---|---|---|
| トップページ | `/` | 動画ファーストLP。BottomNav(subtle)あり |
| 動画フォーム依頼 | `/corporate` | マルチステップ依頼フォーム（動画・写真対応） |
| 見積もりフロー | `/customer/estimate/flow` | 旧フロー（残存） |
| レビューページ | `/request/:id/review` | 星評価・確認チェックリスト（デモのみ・DB保存なし） |

### 職人側
| ページ | ルート | 説明 |
|---|---|---|
| 案件一覧 | `/craftsman/jobs` | 動画タブ優先・想定売上/手取り表示 |
| 応募ページ | `/craftsman/apply/:id` | 概算金額入力・手数料プレビュー・手数料ルール表示 |
| 応募管理 | `/craftsman/dashboard` | ステータス管理・手数料notice・レビュー待ちバナー |
| プロフィール | `/craftsman/profile` | 編集画面・職人ツール導線・サポートカード |
| 公開プロフィール | `/craftsman/profile/:userId` | 閲覧専用・通報リンク |
| 応援募集 | `/craftsman/help` | 職人同士の応援募集フォーム |
| 応援一覧 | `/craftsman/help-list` | 応援案件一覧・参加ボタン・通報リンク |
| 職人ツール | `/tools` | 利益管理・簡単見積計算（ローカルstateのみ） |

### 管理者側
| ページ | ルート | 説明 |
|---|---|---|
| 管理ダッシュボード | `/admin/dashboard` | Supabaseから依頼・職人・応募データ取得・分析 |
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
