# PRO MATCH — ルート一覧

> 全ルートの役割を1行で説明します。
> App.tsx の `<Routes>` に対応しています。

---

## お客様向け（認証なし）

| ルート | ファイル | 役割 |
|---|---|---|
| `/` | `HomePage.tsx` | 動画ファーストLP。依頼開始ボタン・フッターリンク |
| `/corporate` | `corporate/CorporateRequest.tsx` | マルチステップ依頼フォーム（動画・写真・エリア・連絡先） |
| `/customer/estimate/flow` | `customer/EstimateFlow.tsx` | 旧見積もりフロー（残存・未使用に近い） |
| `/request/:id/review` | `customer/ReviewPage.tsx` | 工事後レビュー（星評価・確認チェック。DB保存なし・デモ） |
| `/complete` | `CompletePage.tsx` | 依頼送信完了ページ |

---

## 職人向け（認証なし・URLで直接アクセス可）

| ルート | ファイル | 役割 |
|---|---|---|
| `/craftsman/jobs` | `craftsman/CraftsmanJobsPage.tsx` | 案件一覧（リスト表示・スワイプ表示の切り替え） |
| `/craftsman/apply/:id` | `craftsman/CraftsmanApplyPage.tsx` | 概算金額入力・手数料プレビュー・応募送信 |
| `/craftsman/dashboard` | `craftsman/CraftsmanDashboardPage.tsx` | 応募状況管理・ステータスフィルター |
| `/craftsman/applications` | `craftsman/CraftsmanApplicationsPage.tsx` | 応募済み案件の一覧（旧・要確認） |
| `/craftsman/profile` | `craftsman/CraftsmanProfile.tsx` | 職人プロフィール編集・サポートカード |
| `/craftsman/profile/:userId` | `craftsman/CraftsmanPublicProfile.tsx` | 職人の公開プロフィール（閲覧専用・通報リンクあり） |
| `/craftsman/help` | `craftsman/HelpRequestPage.tsx` | 職人同士の応援募集フォーム |
| `/craftsman/help-list` | `craftsman/HelpListPage.tsx` | 応援募集一覧・参加ボタン・通報リンク |
| `/tools` | `ToolsPage.tsx` | 職人ツール集（利益管理・簡単見積。BottomNavには非表示） |
| `/pro-signup` | `ProSignupPage.tsx` | 職人登録ページ |

---

## 認証が必要なルート（ログイン済みのみ）

| ルート | 役割 |
|---|---|
| `/customer` | お客様ダッシュボード（ログイン必須） |
| `/customer/estimate/new` | 新規見積もり作成（ログイン必須） |
| `/customer/estimate/:id` | 見積もり詳細（ログイン必須） |
| `/craftsman` | 職人ダッシュボード旧版（ログイン必須） |
| `/craftsman/estimate/:id` | 見積もりレビュー（ログイン必須 or demo） |
| `/request/:id/applications` | 依頼への応募一覧（お客様側） |
| `/request/:id/extra-info` | 依頼送信後の任意追加情報入力（家具・駐車・材料等。meta JSONB に保存） |

---

## 管理者向け

| ルート | ファイル | 役割 |
|---|---|---|
| `/admin/dashboard` | `admin/AdminDashboardPage.tsx` | Supabaseから取得した分析・一覧ダッシュボード |
| `/admin/requests` | `admin/AdminRequests.tsx` | 依頼一覧 |
| `/admin` | `AdminDashboard.tsx` | 旧管理画面（残存） |

---

## 静的・公開ページ

| ルート | ファイル | 役割 |
|---|---|---|
| `/faq` | `FaqPage.tsx` | よくある質問（アコーディオン形式） |
| `/support` | `SupportPage.tsx` | お問い合わせ・通報フォーム（`?type=report`で通報モード） |
| `/terms` | `TermsPage.tsx` | 利用規約（MVP版） |
| `/privacy` | `PrivacyPage.tsx` | プライバシーポリシー |
| `/legal` | `LegalPage.tsx` | 特定商取引法に基づく表記（一部placeholder） |
| `/policy` | `PolicyPage.tsx` | 旧料金・ポリシーページ（残存。要整理） |

---

## デモ・開発用

| ルート | ファイル | 役割 |
|---|---|---|
| `/demo` | `DemoLauncher.tsx` | デモ起動ランチャー |
| `/pro/jobs` | `pro/ProJobs.tsx` | 旧職人案件ボード（残存） |

---

## BottomNav タブ対応

```
案件      → /craftsman/jobs
管理      → /craftsman/dashboard
応援      → /craftsman/help-list
マイページ → /craftsman/profile
```

> `/tools` はBottomNavに表示しない。
> `/craftsman/profile` の「職人ツール」カードからリンク。

---

## 注意

- `/corporate` と `/craftsman/jobs` が現在のメイン導線
- 旧ページ（`/customer`・`/craftsman`・`/policy`・`/pro/jobs`）は残存しているが、積極的に使っていない
- `*`（ワイルドカード）はログイン状態に応じてリダイレクト
