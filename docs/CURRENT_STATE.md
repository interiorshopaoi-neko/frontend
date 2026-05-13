# PRO MATCH — 現在の正解（CURRENT STATE）

> 最終更新: 2026-05-13 / HEAD: `4205d91` (feat(billing-ux): 連絡先開示導線整合・無料枠残数UI追加)
> bundle: `index-Qk7G5tit.js` / Vercel: promatch-app.jp
>
> このドキュメントは ChatGPT / Claude Code が古い前提で作業しないための「現時点の唯一の正解」。
> ここに書かれている挙動は **本番に live** している。実装と乖離したら本ファイルを更新する。

---

## 1. 本番 URL

- **本番**: `https://promatch-app.jp` （Vercel host / Xserver DNS）
- Vercel プロジェクト: `interiorshopaoi-9816s-projects/frontend`
- alias: `frontend-alpha-gray-75.vercel.app`, `www.promatch-app.jp`
- 通知メール宛先: 環境変数経由（Vercel Resend SDK 経由の `/api/notify*.ts`）

---

## 2. 現在の主導線（routing source of truth）

App.tsx の Route 定義が真実。**ロール別に何を見せるか**を以下にまとめる。

### 共通（誰でも）
| path | 表示 |
|---|---|
| `/` | HomePage 固定。**ログイン状態によらず HomePage**（069b0b3） |
| `/for-pros` `/pro-signup` | 職人 LP (ProSignupPage) |
| `/login` | Login.tsx **常時表示**（e8c2715 — ログイン済みでも redirect しない） |
| `/register` | Register.tsx **常時表示**（72a8458 — ログイン済みでも redirect しない） |
| `/auth/confirmed` | メール確認リンク後のランディング。Supabase token_hash を処理し role 別に遷移（af2bc54） |
| `/reset-password` | パスワードリセット入力画面（Supabase recovery token 処理） |
| `/corporate` | 依頼フォーム (CorporateRequest)。送信成功後に `/request/:id/extra-info` および `/request/:id/applications` へのボタンを表示（07d715b） |
| `/request/:id/applications` | お客様向け応募確認・職人選定。成約後に職人のメールアドレス（のみ）を開示（d5dd890） |
| `/request/:id/review` | お客様向けレビュー送信。`insert_customer_review()` RPC 経由で `reviews` INSERT + `reviewed_at` 更新（0da6a52） |
| `/faq` `/support` `/terms` `/privacy` `/legal` `/policy` | 静的ページ |
| `/craftsman/jobs` | 未ログイン → JobsLockedPreview（県+想定売上のみ）/ craftsman → CraftsmanJobsPage |
| `/pro/jobs` | 同上（旧 path） |

### customer ログイン済み
| path | 結果 |
|---|---|
| `/customer` | → `/corporate` redirect（e26216b） |
| `/corporate` | 依頼フォーム |
| その他 catch-all | role='customer' → `/corporate` |

### craftsman ログイン済み
| path | 結果 |
|---|---|
| `/craftsman` | → `/craftsman/jobs` redirect（266125a） |
| `/craftsman/jobs` | CraftsmanJobsPage（フル UI） |
| `/craftsman/dashboard` `/craftsman/profile` `/craftsman/help` `/craftsman/help-list` `/craftsman/apply/:id` `/craftsman/applications` | 職人 UI |
| その他 catch-all | role='craftsman' → `/craftsman` |

### admin ログイン済み（運営）
| path | 結果 |
|---|---|
| `/admin` `/admin/dashboard` `/admin/requests` | role==='admin' のみ表示、それ以外は `/` へ redirect（308e297） |
| ログイン後の navigate target | `/admin/dashboard`（21e3535 で Login.tsx に分岐追加） |

---

## 3. role 定義

`frontend/src/types/index.ts`:
```ts
export type Role = 'customer' | 'craftsman' | 'admin';
```

- **admin は `user_metadata.role='admin'` でのみ昇格**（Supabase Dashboard で手動設定）
- localStorage / state ヒント / fromProLp では admin に倒れない（運営権限の意図しない昇格を防止）

### Login.tsx の 5 段階 role 解決
1. `user_metadata.role` が `'admin' / 'craftsman' / 'customer'`
2. `localStorage.user.role` が `'craftsman' / 'customer'`（admin は受容しない）
3. `location.state.defaultRole`
4. `location.state.fromProLp === true` → `'craftsman'`
5. else → `'customer'`

### navigate target
```
admin     → /admin/dashboard
craftsman → /craftsman  (App.tsx で /craftsman/jobs)
customer  → /customer   (App.tsx で /corporate)
```

### admin 認可（/admin/* gate）
各 Admin ページの最終 guard:
```tsx
if (!authReady) return <loading />;
if (!session) return <AdminLogin />;
if (session.user.user_metadata?.role !== 'admin') return <Navigate to="/" replace />;
return <AdminContent />;
```

---

## 4. 認証・メール設定（Supabase Auth）

### SMTP 設定
- **送信元**: `noreply@promatch-app.jp`（表示名: PRO MATCH）
- **SMTP プロバイダ**: Resend（Supabase Auth カスタム SMTP として設定）
- Supabase Dashboard → Authentication → Settings → SMTP で確認可能

### メールテンプレート（PRO MATCH 専用 HTML）
| テンプレート | 状態 |
|---|---|
| 確認メール（Confirm signup） | PRO MATCH 専用 HTML 実装済み。デフォルト Supabase テンプレートは使用していない |
| パスワードリセット（Reset Password） | PRO MATCH 専用 HTML 実装済み |
| その他（Magic Link 等） | Supabase デフォルト |

### /auth/confirmed 実装（af2bc54）
- 確認メールリンク後のランディングページ
- Supabase v2 の `onAuthStateChange` で INITIAL_SESSION / SIGNED_IN を受信
- role 判定後に遷移先を決定:
  - craftsman → `/craftsman/jobs`（`state: { justRegistered: true }` を付与）
  - customer → `/corporate`
  - 不明 → `/login`
- **`justRegistered: true`** を state に付与する実装は `AuthConfirmed.tsx` が担う（af2bc54）

### /reset-password 実装済み
- Supabase recovery token を URL から処理し、新パスワード入力フォームを表示

### admin アカウント復旧方法
1. Supabase Dashboard → Authentication → Users → 該当ユーザー選択
2. **User Metadata** に `{ "role": "admin" }` を追加保存
3. コード変更不要（admin 判定は `user_metadata.role === 'admin'` のみ）
4. 復旧後は `/login` → 自動的に `/admin/dashboard` へ navigate

---

## 5. 職人 WelcomeModal 導線

### 概要
- 職人が**新規登録後、初回だけ**表示されるウェルカムモーダル
- `CraftsmanJobsPage` が `location.state.justRegistered === true` かつ localStorage キーが未記録のとき表示
- 本番動作確認済み（2026-05-12）

### 表示トリガー経路（2通り）
| 経路 | 実装ファイル | commit |
|---|---|---|
| `/register` で直接登録（Email 確認 OFF 環境） | `Register.tsx` → `/craftsman/jobs` navigate に `justRegistered: true` | `6b8168b` |
| 確認メールリンク経由（本番・Email 確認 ON） | `AuthConfirmed.tsx` → `/craftsman/jobs` navigate に `justRegistered: true` | `af2bc54` |

### localStorage キー管理（28d6646）
```
craftsman_welcomed_${userId}   ← ユーザー別（現行）
craftsman_welcomed              ← フォールバック（user.id 取得不可の場合のみ）
```
- **同じブラウザ・別職人アカウント** → 別キー → それぞれ初回1回表示される ✅
- **同一職人・2回目以降** → キー存在 → 表示されない ✅
- 旧キー `craftsman_welcomed`（suffix なし）は localStorage に残置のみ（削除不要）

### 「通知設定をする」CTA（ca70913）
- クリック → `/craftsman/profile#notification` へ遷移
- `CraftsmanProfile.tsx` の通知設定セクションに `id="notification"` 付与済み → ページ内スクロールで直接到達

---

## 6. 本線フロー（依頼 → 応募 → 成約 → 完了 → レビュー）

### 現在の実装状態（2026-05-12 時点）

| ステップ | 実装 | commit |
|---|---|---|
| 依頼送信 | `CorporateRequest.tsx` で `create_estimate_request` RPC を呼び出し | — |
| 送信後に応募確認画面へ進む | 送信成功画面に「職人の応募を確認する」ボタン → `/request/:id/applications` | `07d715b` |
| 応募確認・職人選定 | `RequestApplicationsPage.tsx`。`job_applications.is_contracted = true` で成約 | — |
| 成約後の連絡先開示 | **メールアドレスのみ**開示。電話番号・LINE は表示しない | `d5dd890` |
| 職人側の工事完了報告 | `CraftsmanDashboardPage` の成約済みカードに「✅ 工事完了を報告する」ボタン。`report_work_complete(uuid)` SECURITY DEFINER RPC で `review_requested_at = now()` を更新。fire-and-forget で `/api/notify-review-request` を呼び出し依頼者へレビュー依頼メール送信 | `1573a7d` / `1314925` |
| お客様レビュー送信 | `ReviewPage.tsx` で送信 → `insert_customer_review()` RPC 経由で `reviews` INSERT + `reviewed_at` 更新。タグ選択 UI あり | `0da6a52` |
| ステータス遷移 | `deriveStatus()` が `is_contracted` / `review_requested_at` / `reviewed_at` を参照して自動判定 | — |

### 連絡先開示の設計方針

- **開示対象: メールアドレスのみ**（電話番号・LINE は表示しない）
- お客様側: `get_my_craftsman_profile(craftsman_id)` で職人のメールを取得（DB 変更なし）
- 職人側: `estimate_requests.contact_value` が `@` を含む場合のみ表示
- デモモード（`isDemo: true`）では開示 UI を非表示
- 将来 billing_events / Stripe を挟む場合は「開示ボタンの onClick」が差し込みポイント

### reviews テーブル（0da6a52 / 2f75f9e）

| 項目 | 内容 |
|---|---|
| テーブル | `public.reviews`（12 カラム: id, job_application_id, review_type, reviewer_type, reviewer_id, target_type, target_id, rating, tags, comment, would_use_again, created_at） |
| RLS | anon 直接アクセス禁止。authenticated（管理者）のみ直接 SELECT 可 |
| UNIQUE 制約 | `(job_application_id, reviewer_type)` — 重複投稿防止 |
| 書き込み関数 | `insert_customer_review(p_application_id, p_reviewer_id, p_rating, p_tags, p_comment, p_would_use_again)` SECURITY DEFINER |
| 関数の保証 | ① is_contracted=true 確認 ② reviewer_id UUID 形式検証 ③ reviews INSERT ④ reviewed_at 更新 |
| 現在対応 | **お客様→職人のみ**（review_type='customer_to_craftsman'） |
| 未対応 | 職人→お客様 / 職人→職人 は将来実装 |

### job_applications スキーマ補完（2f75f9e）

本番 DB に欠落していた列を `ADD COLUMN IF NOT EXISTS` で追加済み:
`is_contracted (boolean DEFAULT false)` / `contracted_at` / `review_requested_at` / `reviewed_at` / `service_fee`

### RLS 現状（2026-05-12 確認済み）

| テーブル | anon | authenticated |
|---|---|---|
| `estimate_requests` | SELECT ✅ INSERT ✅ | SELECT ✅ UPDATE ✅ |
| `job_applications` | SELECT ✅ INSERT ✅ UPDATE ✅ | SELECT ✅ INSERT ✅ UPDATE ✅ |
| `reviews` | 直接アクセス禁止 | SELECT ✅（管理者のみ） |

関連 migration:
- `20260512_fix_job_applications_rls.sql` — job_applications SELECT/UPDATE(authenticated) + SELECT(anon) 追加
- `20260513_fix_rls_p0.sql` — job_applications INSERT(authenticated) + estimate_requests SELECT(anon) 追加
- `20260513_fix_anon_update_job_applications.sql` — job_applications UPDATE(anon) 追加

### E2E 実データ確認済み（2026-05-12）

以下を実 DB（production）で検証:

| 操作 | 結果 |
|---|---|
| anon → `estimate_requests` SELECT | ✅ 26 件取得 |
| authenticated → `job_applications` INSERT | ✅ HTTP 201 |
| anon → `job_applications` SELECT | ✅ 実データ表示（DEMO fallback なし） |
| anon → `job_applications` UPDATE `is_contracted=true` | ✅ HTTP 200、DB 反映確認 |
| 職人応募 → 顧客確認 → 成約 フル導線 | ✅ 実データで通過 |

### CraftsmanDashboardPage PGRST200 修正（722e622）

**問題**: `select('*, estimate_requests(work_type,...)')` が PostgREST embedded join を試みて PGRST200 を throw していた。原因は `job_applications.estimate_request_id (text)` と `estimate_requests.id (bigint)` の型不一致により FK が存在しないため。結果、常に DEMO fallback に落ちていた。

**修正**: embedded join を 2-step fetch に置き換え:
1. `job_applications` を単独取得（join なし）
2. `estimate_request_id` を数値化 → `estimate_requests.in('id', numericIds)` で個別取得
3. インメモリでマージして `DashboardRow` に整形

**実DB確認**: test user `1e19e2b2` / estimate_request `66` で両クエリがエラーなく通ることを確認。PGRST200 は発生しない。

### メール通知・導線修正（ea4c5c9 / 2dd4bc9）

| 修正内容 | 実装 |
|---|---|
| 依頼受付メールに応募確認リンク追加 | `send-customer-email` に `request_id` を追加。メール本文に「応募状況を確認する」`/request/:id/applications` ボタンと「追加情報を入力する」`/request/:id/extra-info` ボタンを挿入 |
| `contact_value` の `mailto:` 除去 | `CorporateRequest.tsx` と `send-customer-email` 両方で `sanitizeEmail()` を適用 |
| 職人応募時に依頼者へ通知メール送信 | `notify-application.ts` が Supabase REST で `contact_value` を取得し、`noreply@promatch-app.jp` から依頼者へ応募通知メールを送信 |
| CraftsmanApplyPage 経由でも通知 | `handleSubmit` 成功後に `/api/notify-application` を fire-and-forget で呼び出し |
| 管理者通知は維持 | `onboarding@resend.dev` → `ADMIN_TO` への通知は変更なし |

**テスト結果（本番エンドポイント）**: `adminOk: true, customerOk: true` ✅  
**Supabase Function**: `send-customer-email` デプロイ済み  
**Vercel**: デプロイ Ready 確認済み

### メールデザイン統一（2026-05-13）

| メール | 対象ファイル | commit |
|---|---|---|
| 応募通知メール（依頼者へ） | `api/notify-application.ts` | `aee9372` |
| 受付完了メール（依頼者へ） | `supabase/functions/send-customer-email/index.ts` | `6580a0d` |
| 成約通知メール（職人へ） | `api/notify-contracted.ts` | `ba59afe` → `fa42335` |

**共通デザイン仕様（全メール統一済み）**:
- ヘッダー: flat `#1e40af` + `PRO MATCH` ラベル + タイトル
- CTA ボタン化: 「応募状況を確認する →」（青）/ 「追加情報を入力する」（グレー）
- 安心ポイント: `#eff6ff` カード（5項目）
- 生 URL・罫線（`─────`）廃止
- `promatch-app.jp` 以外の URL なし
- プレーンテキスト版フォールバック (`text:` パラメータ) 追加
- `esc()` / `escHtml()` による XSS エスケープ適用
- `send-customer-email`: `request_id` なし時は CTA 非表示
- 送信元: `noreply@promatch-app.jp` 維持

**実送信テスト結果（2026-05-13 本番）**:
- `notify-application`: `{"ok":true,"adminOk":true,"customerOk":true}` ✅
- `send-customer-email`: `{"ok":true,"id":"13fc874b-..."}` ✅

### 職人案件ページ UX 修正（e30f426）

- デフォルトタブ `'video'` → `'list'`（実案件がすぐ見える）
- LIVEバー「本日12件」固定 → `jobs.length` 件の動的表示
- 売上表記「想定売上」→「参考目安」＋免責テキスト追加
- loading/empty 文言から「動画」を削除

### /corporate 前回依頼バナー（1d2124d）

- 依頼送信成功時に `promatch_last_request_id` / `promatch_last_request_at` を localStorage に保存（try/catch — 送信成功に影響しない）
- Step 1 先頭で `lastRequestId` があるときだけインジゴバナーを表示
- バナーに「応募状況を確認する → `/request/:id/applications`」「追加情報を入力する → `/request/:id/extra-info`」リンク

### 本番 DEMO fallback 分離（7eb498c）

PROD では DB エラー・0件時に DEMO を自動表示しない。DEV のみ DEMO fallback を許容する。

| ページ | 旧（常に DEMO） | 新 |
|---|---|---|
| CraftsmanDashboardPage: fetch error | → DEMO | PROD: ⚠️エラーカード / DEV: DEMO |
| CraftsmanDashboardPage: userId なし | → DEMO | PROD: 空状態 / DEV: DEMO |
| CraftsmanDashboardPage: 0件 | → DEMO | 常に空状態 |
| RequestApplicationsPage: fetch error / reqData なし | → DEMO | PROD: ⚠️エラー画面 / DEV: DEMO |
| CraftsmanJobsPage: fetch error | 0件扱い→DEMO | PROD: ⚠️エラー画面 / DEV: DEMO |
| CraftsmanJobsPage: 0件 | → DEMO | PROD: 空状態 / DEV: DEMO |

実装: 各ファイルに `fetchError` state を追加。`import.meta.env.DEV` で分岐。build 成功 `index-BW_vjj1-.js`。

**残っている DEMO fallback（未対応）**: `JobsSwipeView` 内の demo-id 応募（UI のみ成功扱い / DB 保存なし設計は意図的）

### 動画 E2E 検証結果（1e81c96）

**検証日: 2026-05-12**

| 項目 | 結果 |
|---|---|
| Storage バケット `estimate-videos` | ✅ 公開アクセス可（HTTP 200） |
| `estimate_requests.video_url` カラム | ✅ 存在。実案件 id=8 に動画 URL あり（クロス張り替え・神奈川県） |
| 動画ファイル直接アクセス | ✅ `video/quicktime` 38MB、`Content-Type` 正常 |
| video_url ベース判定 | ✅ `j.has_video \|\| j.video_url` — 実 DB には `has_video` カラムなし、`video_url` で正しく動作 |
| video_url=null でのクラッシュ | ✅ なし（SwipeSlide は `job.video_url` の有無でプレースホルダー切替） |
| video フィルター（一覧） | ✅ `!!job.video_url` で動画案件のみ抽出 |
| SwipeView 動画再生 | ✅ `<video src={job.video_url} playsInline muted loop>` / IntersectionObserver で viewport 時に自動再生 |

**修正内容（1e81c96）**:
- `JobsSwipeView.showFirstCome` に `!!job.video_url` を追加（実案件で `has_video` 未定義のため）
- `JobsListView` 動画フィルター空状態を「動画つき案件はありません」＋「全案件を表示する」CTA に改善

### RequestApplicationsPage フロー状態バナー（1e81c96）

応募確認ページ上部に現在のフロー状態を示すバナーを追加。DEMO モード時は非表示。

| 状態 | 表示 |
|---|---|
| 応募 0件 | ⏳ 「職人からの応募を受付中です」 |
| 応募あり・未成約 | 👇 「応募が届きました。気になる職人を選んでください」 |
| 成約済み | 🤝 「成約済み — 職人とメールで日程を相談してください」 |
| 工事完了報告後 | ⭐ 「工事が完了しました。レビューを送りましょう」 |
| レビュー送信済み | ✅ 「すべて完了しました！ありがとうございました」 |

Chrome 実データ確認済み（id=66, 2件応募あり → `selecting` 状態バナー表示 ✅）

### CraftsmanApplicationsPage DEMO fallback 分離（1e81c96）

- fetch error → PROD: ⚠️エラーカード / DEV: DEMO
- userId なし → PROD: 空状態 / DEV: DEMO
- 0件 → 常に空状態（DEMO なし）

build 成功 `index-BRWVBYPn.js`

### その他修正済み（2026-05-12）

- `estimate_requests.city` → `area` 不一致: 全 9 ファイル修正済み（`adcfcc5`）
- 動画フィルタ: `job.has_video || !!job.video_url` で実 DB の `video_url` を正しく参照（`5b311c0`）
- status='done' 案件を職人一覧から除外（`63dce09`）
- 顧客側レビュー画面への導線（成約後 → 工事完了報告後 → レビュー投稿）追加（`34802db`）

### 工事完了報告 → レビュー依頼メール → レビュー投稿 導線（1573a7d / 1314925 / 2026-05-13）

**E2E 実データ確認済み（2026-05-13 本番 request_id=70）**

| ステップ | 実装 | DB 変化 |
|---|---|---|
| 職人が「✅ 工事完了を報告する」ボタンを押す | `handleCompleteReport()` → `supabase.rpc('report_work_complete', { p_application_id })` | `job_applications.review_requested_at = now()` |
| 依頼者へレビュー依頼メールを送る | `fetch('/api/notify-review-request', ...)` fire-and-forget | — |
| 依頼者の応募確認ページにレビューボタン表示 | `RequestApplicationsPage` の `app.review_requested_at` 非 null 時に「レビューを書く →」パネルを表示 | — |
| レビュー投稿 | `ReviewPage` → `insert_customer_review()` RPC | `reviews` INSERT + `job_applications.reviewed_at = now()` |
| 職人プロフィールに評価反映 | `get_craftsman_public_profile()` RPC が `reviews` から `AVG(rating)` / `COUNT` を集計 | — |

**`report_work_complete(uuid)` RPC（Supabase DB 適用済み）**:
```sql
CREATE OR REPLACE FUNCTION report_work_complete(p_application_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE job_applications SET review_requested_at = now()
  WHERE id = p_application_id AND is_contracted = true AND review_requested_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION report_work_complete(uuid) TO anon, authenticated;
```

**`get_craftsman_public_profile()` JOIN 修正（2026-05-13）**:
- 旧: `r.target_id = c.user_id`（`reviews.target_id` = `craftsmen.id` なのにミスマッチ）
- 新: `(r.target_id = c.user_id OR r.target_id = c.id::text)` 両方対応 + GROUP BY に `c.id` 追加
- 確認: `avg_rating: 5.0, review_count: 1` ✅

**`api/notify-review-request.ts` (Vercel serverless)**:
- Input: `{ request_id, application_id }`
- `estimate_requests` から `contact_value` / `work_type` / `area` を取得
- `contact_method === 'メール'` の場合のみ依頼者へ HTML レビュー依頼メール送信
- CTA: 「レビューを書く →」→ `https://promatch-app.jp/request/:id/review`
- 管理者へのプレーンテキスト通知も同時送信
- demo-prefix(`demo-*`)は自動スキップ
- 確認: `{"ok":true,"customerOk":true,"adminOk":true}` ✅

**`sp_publishable_*` キーの制約（判明）**:
- `supabase.from().update()` が hanging する（直接 REST PATCH が 401 を返す）
- 回避策: SECURITY DEFINER RPC 経由（`.rpc()` は動作する）

**Dashboard `deriveStatus()` の拡張**:
- `review_requested_at` 非 null → `'依頼者確認中'`（工事完了報告済みの状態）
- `is_contracted = true` のみ → `'成約済み'`

### 課金基盤 MVP — 連絡先開示 UI・無料枠管理（743c0b7 / 4205d91 / 2026-05-13）

#### 設計方針
- **連絡先開示は UI 経由のみ** — 成約通知メールに連絡先を記載しない。職人は案件管理画面の「連絡先を確認する」ボタンから取得する。
- **SECURITY DEFINER RPC** でアトミックにクレジット消費 + billing_event INSERT + 連絡先返却。RLS でテーブルへの直接アクセスを全拒否。
- **初回 2 件無料**。`free_credits_remaining` を FOR UPDATE ロックして競合防止。UNIQUE(application_id) で二重課金防止。

#### DB 変更（migration: `20260513_billing_events.sql`）

| 追加 | 内容 |
|---|---|
| `public.billing_events` テーブル | craftsman_id, application_id, event_type, is_free, free_reason, Stripe 予約列、RLS 全拒否 |
| `craftsmen.free_credits_remaining` | DEFAULT 2（新規登録時の無料枠） |
| `craftsmen.referral_bonus_credits` | DEFAULT 0（紹介ボーナス用） |
| `craftsmen.total_contacts_used` | DEFAULT 0（累計分析用） |
| `craftsmen.referred_by` | 紹介元 user_id（将来実装） |
| `claim_free_credit_and_get_contact(uuid, text)` RPC | SECURITY DEFINER — クレジット消費・billing_event INSERT・連絡先返却を 1 トランザクション |
| `get_my_free_credits(text)` RPC | SECURITY DEFINER STABLE — フロントの表示専用 |

#### API（`api/check-billing.ts`）

- `POST /api/check-billing` Body: `{ application_id: uuid, craftsman_id: text }`
- RPC を呼び出し、結果を以下のいずれかで返す:
  - `{ status: 'ok' \| 'already_unlocked', contact_method, contact_value, free_reason }`
  - `{ status: 'payment_required' }` — 無料枠なし（Stripe 未実装のため現在はここで止まる）
  - `{ status: 'not_contracted' }` / `{ status: 'error' }`
- demo-* ID はモック応答で即時 200 返却

#### フロントエンド変更

**`CraftsmanApplicationsPage.tsx`**:
- 成約済みカードに「連絡先を確認する」ボタン追加（`/api/check-billing` 呼び出し）
- `ContactState` 型 (`Map<string, ContactState>`) で各 application の開示状態をトラッキング
- 無料枠残数バナー（emerald 🎁 / slate 🔒）を page top に表示 — `get_my_free_credits` RPC から取得
- `payment_required` 時: 「現在は無料枠がありません」「正式版では決済後に確認できます」「お急ぎの場合は管理者までお問い合わせください」
- ボタン説明: 「確認時に無料枠を1件消費します · メールアドレスのみ開示」
- 楽観的 UI update: `ok` レスポンス時に freeCredits state をデクリメント（DB は authoritative、reload で再取得）

**`CraftsmanDashboardPage.tsx`**:
- `get_my_free_credits` RPC で無料枠残数を取得
- 手数料ルール上部に無料枠残数バナー（emerald 🎁 / slate 🔒）を追加

**`notify-contracted.ts`**（UX 整合修正）:
- HTML: 黄色ボックス（連絡先開示）→ 緑ボックス「連絡先確認の案内」に変更
  - 案件管理画面の「連絡先を確認する」ボタンで確認、初回2件まで無料 を案内
- Text 版: 「【連絡先の確認方法】」ブロック追加。メールアドレスを直接記載しない
- 安心ポイント: 「案件管理画面から「連絡先を確認する」で連絡先を取得してください」

#### E2E 実データ確認済み（2026-05-13 本番）

| ケース | 結果 |
|---|---|
| 無料枠あり → 「連絡先を確認する」クリック | ✅ メールアドレス開示、残数バナー即時デクリメント |
| DB 確認 (free_credits_remaining=1, total_contacts_used=1) | ✅ |
| リロード後残数確認 (残り 1 件) | ✅ |
| 2回目クリック (already_unlocked) | ✅ 再開示、残数変化なし |
| 無料枠 0 → クリック | ✅ payment_required パネル表示 |
| Dashboard 無料枠残数バナー | ✅ 「無料連絡先確認 残り 2 件」表示 |
| notify-contracted 送信テスト | ✅ `{ok:true, contractedOk:true, adminOk:true}` |

#### Stripe 未実装に関する現状

- `payment_required` 時はユーザーに「正式版では決済後に確認できます」と表示
- Stripe 決済フロー・`stripe_session_id` / `stripe_payment_intent_id` は `billing_events` に予約列として存在するが未使用
- 今後は「連絡先確認ボタンの onClick → `payment_required` → Stripe Payment Link」を差し込む

---

### 成約後ガイダンス UX・DEMO fallback 修正（fa42335 / 2026-05-13）

| 変更 | 内容 |
|---|---|
| `notify-contracted.ts` | CTA を「案件管理を開く →」に変更。安心ポイントを 4 項目に統一（不明点サポート追記） |
| `CraftsmanDashboardPage` DEMO guard | `!userId` / `appError or 0件` 時の DEMO 表示を `import.meta.env.DEV` 限定に制限（PROD で誤 DEMO 非表示） |
| `CraftsmanApplicationsPage` DEMO guard | 同上 |
| `HelpListPage` DEMO guard | error / 0件 時の DEMO を DEV 限定に |
| Dashboard 成約カード | 成約済みカードに 3 行ガイダンス追加: 📧 メール日程調整 / 🔒 電話番号・LINE 非表示 / ⭐ 工事完了後レビュー |
| RequestApplicationsPage 成約後 | ボタン名「✓ この職人に依頼中」に変更。成約カード下に同 3 行ガイダンスパネル追加 |

### 未実装（次フェーズ）

- 依頼一覧ページ（お客様が後から応募確認ページへ戻る手段）
- 応募数バッジ（依頼者が確認前に応募数を把握できる通知）
- DEMO fallback 残: `JobsSwipeView` 内 demo-id 応募（意図的設計のため変更不要）
- 職人→お客様 / 職人→職人 レビュー
- 手数料回収 (Stripe) — billing 基盤 MVP は実装済み。Stripe 決済は未実装
- 紹介制度 (+1 無料枠) — `referral_bonus_credits` カラムは追加済み、付与ロジックは未実装
- メールテンプレートのさらなる細部改善

### 未認証 /craftsman/jobs の設計方針（b15fe31 確定）

| 項目 | 方針 |
|---|---|
| 案件一覧の閲覧 | **未認証でも可**（PRO MATCH の魅力を伝える） |
| 応募ボタン（ListView） | 未ログイン時 → 「ログインして応募する →」に変更、クリックで /login |
| 応募ボタン（SwipeView） | 未ログイン時 → /login へリダイレクト（DB NULL INSERT 防止） |
| ヘッダーバナー | 未ログイン時のみ「🔒 応募するには職人登録が必要です」+ 「無料登録」ボタン表示 |
| /craftsman/apply/:id | 未ログイン時 → handleSubmit 内で /login へリダイレクト（P0 修正済み 1174e58） |
| JobsLockedPreview 全面化 | 今フェーズは見送り（案件の雰囲気を見せることで登録 CV 向上を優先） |

### notify-application 実装状態（b15fe31 確定）

| 項目 | 状態 |
|---|---|
| `api/notify-application.ts` | main に存在 ✅ |
| 依頼者通知 customerOk | Supabase REST → estimate_requests.contact_value 取得 → HTML メール ✅ |
| 管理者通知 adminOk | プレーンテキスト → ADMIN_TO ✅ |
| 環境変数参照 | SUPABASE_URL / SUPABASE_ANON_KEY 3段フォールバック ✅ |
| ハードコードなし | sb_publishable_* 使用なし ✅ |
| 送信元 | `noreply@promatch-app.jp` ✅ |
| HTML デザイン | カード型・CTA ボタン・安心ポイント ✅ |
| CraftsmanApplyPage 呼び出し | INSERT 成功後 fire-and-forget ✅（b15fe31） |
| 実送信テスト | `{"ok":true,"adminOk":true,"customerOk":true}` ✅ |

---

## 7. 本番想定フルE2E監査（2026-05-13）

**実施コミット範囲**: `1314925` → `7d251e9`  
**使用テストデータ**: estimate_request id=71（audit終了後削除済み）

### 通ったフロー（全PHASE）

| PHASE | ステップ | 結果 |
|---|---|---|
| PHASE 1 | `/corporate` 6STEP フォーム送信 | ✅ DB INSERT / 受付メール送信 |
| PHASE 2 | `/craftsman/jobs` 一覧表示・動画タブ | ✅ DEMO なし・実案件表示 |
| PHASE 2 | `/craftsman/apply/71` 応募送信 | ✅ job_applications INSERT (price=32000) |
| PHASE 3 | `/request/71/applications` 応募確認 | ✅ 1件表示・概算¥32,000・最安値バッジ |
| PHASE 3 | 「この職人に依頼する」成約 | ✅ is_contracted=true / contracted_at 設定 |
| PHASE 3 | 職人 dashboard 成約カード | ✅ 「成約済み」→「工事完了を報告する」ボタン表示 |
| PHASE 4 | 工事完了報告 | ✅ review_requested_at 設定 / 「依頼者確認中」ステータス遷移 |
| PHASE 4 | `/request/71/review` レビュー投稿 | ✅ reviews INSERT / reviewed_at 設定 |
| PHASE 4 | 職人プロフィール avg_rating 反映 | ✅ avg_rating=5.0 / review_count=2 |

### 修正したバグ（このセッション）

| severity | バグ | 修正 | commit |
|---|---|---|---|
| **P0** | `CraftsmanApplyPage`: 未ログインユーザーが `craftsman_id=null` で INSERT できる | 認証チェック追加 → `/login` リダイレクト | `1174e58` |
| **P1** | `/pro/jobs` 白画面: `job.id.slice()` — `estimate_requests.id` は integer | `String(job.id).slice(0,8)` に修正 | `7d251e9` |
| **P1** | `CorporateRequest`: localStorage setItem・前回依頼バナー・応募確認ボタンが欠落 | 3箇所を完全復元 | `b24a0cc` |

### コンソールエラー巡回結果

| ページ | エラー |
|---|---|
| `/corporate` | なし ✅ |
| `/craftsman/jobs` | なし ✅ |
| `/craftsman/dashboard` | なし ✅ |
| `/request/:id/review` | なし ✅ |
| `/pro/jobs` | ~~TypeError: e.id.slice is not a function~~ → `7d251e9` で修正済み |
| 全ページ共通 | `⚠️ 未翻訳テキスト検出` (多言語 legacy warning — 無視可) |

### DEMO 混入チェック

| ページ | 状態 |
|---|---|
| `/craftsman/jobs` | ✅ 実案件表示（31件）DEMO なし |
| `/craftsman/dashboard` | ✅ 実案件のみ（DEV 環境では DEMO フォールバックあり、PROD では非表示） |
| `/craftsman` (corporate管理側) | ⚠️ 「デモ表示中」バナーあり — これは設計通り（案件0件時のUI確認用）|

### テストデータクリーンアップ確認

- estimate_request id=71 → 削除済み ✅
- job_applications (estimate_request_id='71') → 削除済み ✅
- reviews (本日作成分 target_id=caa5c822-...) → 削除済み ✅

---

## 8. 事業・課金方針

> 詳細な「なぜそうしたか」は `docs/DECISIONS.md` を参照。ここでは **現在の決定事項** のみ記載。

| 方針 | 内容 |
|---|---|
| お客様は完全無料 | 依頼者側から一切費用を取らない |
| 手数料発生タイミング | **連絡先開示時点**で手数料対象（成約後に工事金額が変わっても再計算しない） |
| 初回2件無料 | 職人登録後、最初の2成約は手数料0円 |
| 紹介制度（構想） | 職人が別職人を紹介 → 紹介1件につき +1件 無料枠（未実装） |
| 工事代金の扱い | 職人とお客様が直接やり取り。PRO MATCH は預からない（金融業法対応） |
| 手数料回収手段 | 初期フェーズは **Stripe Payment Link** 想定（未実装） |
| 次フェーズ | 「職人紹介制度」と「手数料回収（Stripe）」 |

---

## 9. 重要方針

### コラボレーション原則
- **最小差分**: 既存導線を壊さない、必要なものだけ触る、リファクタ・抽象化は禁止
- **stash 保護**: `stash@{0}: wip: hold CustomerDashboard UI-2 experiment` は意図的保留中、勝手に pop しない
- **本番影響あるコマンド** (push, force, vercel promote 等): 必ず事前確認
- **commit 前に preview / tsc / build 検証**を通す。`bundle byte-for-byte 一致` で production 反映を確認

### 触らないリスト（恒久）
- Supabase / DB / RLS / 通知（別フェーズ）
- `/admin/*` の厳密 RLS 強化（current は frontend guard のみ）
- 既存 `role === 'customer'` / `role === 'craftsman'` 比較ロジック
- multilingual i18n（en/zh/ko/vi）— legacy remnants、warning は無視可
- **本番ユーザーへの Admin API password 変更**（下記 E2E ポリシー参照）

### 事業方針（PRO MATCH 職人集客戦略）
- **登録前一部公開**: JobsLockedPreview で県レベル+想定売上のみ表示
- **成果報酬**: 初 2 成約無料、紹介 +1 無料
- **応援マッチング**: 職人同士の助け合い（/craftsman/help）

---

## 10. 旧 UI の扱い

| ファイル | 状態 | 備考 |
|---|---|---|
| `CustomerDashboard.tsx` | **deprecated** | 旧 backend `api.get('/estimates/my')` 依存。MVP 主導線は `/corporate`。import は App.tsx に残るが `/customer` route は `/corporate` へ redirect |
| `CraftsmanDashboard.tsx` | **deprecated** | Layout 経由・BottomNav なし。`/craftsman` route から参照されない（`/craftsman/jobs` リダイレクト）。事実上 dead code |
| 旧 `/admin` | 現役 | `AdminDashboard.tsx` (デモ analytics)、新は `/admin/dashboard` |
| `BottomNav.tsx` | 現役 | 4 tabs (案件 `/craftsman/jobs`, 管理 `/craftsman/dashboard`, 応援 `/craftsman/help-list`, マイページ `/craftsman/profile`) |
| `Layout.tsx LangSwitcher` | legacy | 多言語切替の残骸、cleanup 候補 |

### 保留中 (stash@{0})
- **CustomerDashboard UI-2 experiment**: slate-* 配色 + gradient CTA + emerald accents の再デザイン（+54/-25 行）。要判断保留中。`git stash pop` する前にユーザー確認必須。

---

## 11. 今後触る時の注意点

### 運営アカウントを追加する
1. Supabase Dashboard → Authentication → Users → 該当ユーザー選択
2. **User Metadata** に `{ "role": "admin" }` を追加保存
3. コード変更は不要（21e3535 で受容済み）
4. 該当アカウントで `/login` → 自動的に `/admin/dashboard` へ navigate

### Login.tsx / Register.tsx の role 判定
- **P1 (user_metadata.role) を変更してはいけない** — admin を弾くと運営が入れなくなる
- 「fromProLp ヒントで admin にする」のような実装は禁止（昇格脆弱性）

### route 追加・変更
- App.tsx の `/login` `/register` の「常時表示」を **戻してはいけない**（e8c2715, 72a8458 で意図的に外した）
- `/` を HomePage 以外に倒してはいけない（069b0b3 — 「トップは常にトップページ」基本方針）

### admin RLS 強化（別フェーズ）
- 現在の `/admin/*` guard は **フロントエンドのみ**（session.user.user_metadata.role チェック）
- API レベル / RLS レベルの強化は未実装。ユーザーが DevTools で `localStorage` を書き換えれば admin 画面の DOM は見られる（ただし Supabase の RLS で実データは取れない設計が必要）
- 別フェーズで `/api/admin/*` を切り分け、Supabase RLS で `user_metadata.role='admin'` を必須にする

### 検証手順（必須）
- 修正後: `npx tsc -b --noEmit` の出力行数が **baseline 77** 以下を維持（新規エラー 0）
- `npx vite build` 成功
- preview で複数 role / ケース別動作確認
- production push 後: `vercel ls` で Ready 確認、`curl https://promatch-app.jp/?bust=$(date +%s)` で bundle hash 取得、ローカル `dist/assets/index-*.js` と **byte-for-byte 一致**を確認

### rollback 手順
1. **緊急 / 最速**: `vercel promote <1つ前の deployment URL>`（git は触らない、数十秒で alias 切替）
2. **きれいに巻き戻し**: `git push origin <previous_sha>:main --force-with-lease`
3. **履歴を残す**: `git revert <sha> && git push`

### E2E テストポリシー（2026-05-12 制定）

#### 本番アカウント（破壊的操作禁止）

| アカウント | 用途 | 禁止操作 |
|---|---|---|
| `interior.shop.aoi+craftsman@gmail.com` | 本番確認用・職人ロール | Admin API password 変更、削除、banned |
| `interior.shop.aoi+craftsman12@gmail.com` | 本番確認用・職人ロール | 同上 |
| `interior.shop.aoi@gmail.com` | 運営（craftsmen プロフィール所有者） | 同上 |
| `interior.shop.aoi+admin@gmail.com` / `+admin2@gmail.com` | 管理者 | 同上 |

**禁止事項（絶対）**:
- `PUT /auth/v1/admin/users/:id` で本番ユーザーのパスワードを変更しない
- Admin API で本番ユーザーの `email`, `user_metadata`, `app_metadata` を変更しない
- 本番ユーザーの削除・ban 操作をしない

> 背景: 2026-05-12 の E2E テスト中に `interior.shop.aoi+craftsman@gmail.com` のパスワードを  
> `e2etest_pass_2026` に Admin API で上書きした結果、本番ログインができなくなった。  
> 復旧には本人が `/login` → 「パスワードをお忘れですか？」→ リセットメール で対応が必要。

#### E2E 専用テストユーザー（使い捨て）

E2E / 結合テストで Supabase Auth ユーザーが必要な場合は以下の命名規則で作成し、テスト後に Admin API で削除する。

| role | メール例 |
|---|---|
| craftsman | `e2e-craftsman-YYYYMMDD@promatch-app.jp` |
| customer | `e2e-customer-YYYYMMDD@promatch-app.jp` |
| admin | `e2e-admin-YYYYMMDD@promatch-app.jp` |

**手順**:
1. `POST /auth/v1/admin/users` で作成（本番ユーザーとは別メール）
2. テスト実行
3. `DELETE /auth/v1/admin/users/:id` で削除
4. `job_applications` / `reviews` / `craftsmen` の残留テストデータも service_role で削除

#### テスト後クリーンアップ必須

テスト中に作成した実 DB データ（`job_applications`, `reviews`, `craftsmen` 行）は必ず service_role で削除する。本番ユーザーの job_applications は削除しない。

---

## 12. 主要 commit 履歴（直近の修正経緯）

| commit | 件名 | 何を直したか |
|---|---|---|
| `4205d91` | feat(billing-ux): 連絡先開示導線整合・無料枠残数UI追加 | CraftsmanApplicationsPage に無料枠残数バナー + payment_required UX改善。CraftsmanDashboardPage に残数バナー追加。notify-contracted から連絡先削除・UI誘導に変更 |
| `743c0b7` | feat(billing): 課金基盤MVP — 連絡先開示UIと無料枠管理 | billing_events migration + api/check-billing.ts + CraftsmanApplicationsPage「連絡先を確認する」ボタン + ContactPanel |
| `666d2c6` | docs: notify-application整合性・未認証jobs方針を CURRENT_STATE に記録 | CURRENT_STATE.md に notify-application 実装状態・未認証 jobs 方針を追記 |
| `b15fe31` | feat(P1): notify-application wire-up + 未認証jobs UX改善 | CraftsmanApplyPage に notify-application fire-and-forget 追加。CraftsmanJobsPage に isLoggedIn 検出・未登録バナー追加。JobsListView 未ログイン時ボタン文言変更 + /login 誘導。JobsSwipeView applyJob に auth guard 追加 |
| `7d251e9` | fix(ProJobs): id.slice crash — convert integer id to string | `estimate_requests.id` は integer なのに `.slice()` を直接呼び出して `/pro/jobs` が白画面クラッシュ。`String(job.id).slice(0,8)` に修正 |
| `1174e58` | fix(CraftsmanApplyPage): P0 auth guard — redirect to /login if not logged in | 未ログインで応募フォームを送信すると `craftsman_id=null` で INSERT されていた。`localStorage.user` チェックを追加し、未認証は `/login` へリダイレクト |
| `b24a0cc` | fix(CorporateRequest): restore localStorage setItem, prev-request banner, applications button | commit 5570c6c で3箇所が欠落。localStorage.setItem / 前回依頼バナー JSX / 「職人の応募を確認する」ボタンを復元 |
| `1314925` | fix: 工事完了報告を SECURITY DEFINER RPC 経由に変更 | `supabase.from().update()` が `sb_publishable_*` キーで hanging する問題を解決。`report_work_complete(uuid)` RPC 経由に変更。`get_craftsman_public_profile` JOIN 条件修正（target_id=craftsmen.id 対応） |
| `1573a7d` | feat: 工事完了報告→レビュー依頼メール→レビュー投稿 導線を実装 | `CraftsmanDashboardPage` に「工事完了を報告する」ボタン追加。`api/notify-review-request.ts` 新設（Resend でレビュー依頼 HTML メール）。`RequestApplicationsPage` に review_requested_at / reviewed_at 対応の3段パネル追加 |
| `fa42335` | UX: DEMOガード追加・成約後ガイダンス・メール4項目化 | Dashboard/Applications/HelpList DEMO を DEV 限定化。成約カードに日程調整・連絡先制限・レビュー案内追加。notify-contracted CTA 変更・安心ポイント 4 項目化 |
| `ba59afe` | feat: 成約通知メール（職人へ）API 新設 + wire-up | `api/notify-contracted.ts` 新設。`get_craftsman_email_for_contracted` SECURITY DEFINER RPC。RequestApplicationsPage で fire-and-forget 呼び出し |
| `6580a0d` | feat(email): 受付完了メールを応募通知メールと同トーンにリデザイン | `send-customer-email` を HTML カード型に。CTA ボタン2つ・安心ポイント Blue・text フォールバック追加。`esc()` XSS 対策。deploy + 実送信 OK |
| `aee9372` | feat(email): 依頼者応募通知メールを HTML カード型にリデザイン | `notify-application.ts` を HTML メール化。CTAボタン・安心ポイントカード・text フォールバック。`escHtml()` 追加 |
| `9d04bc3` | fix(api): notify-application の Supabase 認証キーを環境変数から読むよう修正 | `sb_publishable_*`（非JWT）のハードコードを廃止。`process.env.SUPABASE_ANON_KEY` → `VITE_SUPABASE_ANON_KEY` フォールバック順で読む。env 未設定時は即 500 |
| `1e81c96` | feat: video E2E fixes + flow status banner + DEMO fallback separation | SwipeView.showFirstCome に video_url 追加。ListViewの動画フィルター空状態改善。RequestApplicationsPage にフロー状態バナー追加。CraftsmanApplicationsPage DEMO 分離 |
| `7eb498c` | fix: separate error/empty/demo states in 3 craftsman pages | PROD での DEMO 自動表示を禁止。エラー時はエラー表示、0件は空状態。DEV のみ DEMO fallback |
| `1d2124d` | feat: show last-request banner on /corporate via localStorage | 依頼送信成功後に `promatch_last_request_id` を localStorage 保存。Step 1 先頭に前回依頼バナー表示 |
| `1e21925` | fix: remove demo hardcode from EstimateComplete and CorporateRequest | `newRequestId` が null の場合は extra-info / applications ボタンを非表示。demo-1 固定を削除 |
| `2dd4bc9` | fix: use verified domain sender for customer notification email | 依頼者通知メールの FROM を `noreply@promatch-app.jp` に変更。`onboarding@resend.dev` ではアカウント外アドレスに送れないため |
| `ea4c5c9` | feat: add customer email notifications for request and application | 受付メールに応募確認リンク追加。職人応募時に依頼者通知。CraftsmanApplyPage でも通知。`mailto:` サニタイズ |
| `e30f426` | fix: improve craftsman jobs page first-view UX | デフォルトタブ list 化。LIVEバー動的件数。売上「参考目安」表記 |
| `722e622` | fix: replace embedded join with 2-step fetch in CraftsmanDashboardPage | PGRST200（FK なし embedded join）を 2-step fetch に置き換え。職人ダッシュボードが常に DEMO になっていた P0 を修正 |
| `aec1ef7` | fix: allow anon to update job_applications for customer contract flow | `job_applications` に `anon UPDATE` ポリシー追加。顧客（anon）が成約操作できなかった P0 を修正 |
| `5b311c0` | fix: P0 RLS + P1 video filter for main flow | authenticated INSERT(job_applications) + anon SELECT(estimate_requests) 追加。video_url 判定で動画フィルタ修正 |
| `adcfcc5` | fix: use area for estimate request location display | `estimate_requests.city` → `area` 参照を全 9 ファイルで修正 |
| `63dce09` | fix: hide completed requests from craftsman jobs | `status='done'` の案件を職人案件一覧から除外 |
| `34802db` | feat: add review navigation from contract confirmation | 成約後 → レビュー画面への導線を `RequestApplicationsPage` に追加 |
| `2f75f9e` | fix: add missing job_applications columns and fix insert_customer_review | 本番 DB に欠落していた `is_contracted` 等 5 列を ADD COLUMN。`craftsman_id::text` キャスト修正 |
| `0da6a52` | feat: add reviews table and wire ReviewPage to persist review data | `reviews` テーブル + `insert_customer_review()` 関数作成。ReviewPage から RPC 経由で INSERT + タグ選択 UI 追加 |
| `72fa13c` | docs: update current state for main flow fixes | CURRENT_STATE.md 更新（本線フロー §6 追加） |
| `bdd3f4e` | feat: add completion report and review status flow | 職人が「工事完了を報告する」→ `review_requested_at` 更新。お客様レビュー送信で `reviewed_at` 更新（DB 保存実装） |
| `d5dd890` | feat: show matched email contacts after contract | 成約後にメールアドレスのみ開示（電話・LINE は表示しない）。お客様側・職人側の両ページに toggle UI 追加 |
| `07d715b` | feat: add applications CTA after request submission | 依頼送信成功画面に「職人の応募を確認する」ボタンを追加 → `/request/:id/applications` へ |
| `567d04e` | docs: update current state for auth and billing policy | docs/CURRENT_STATE.md を認証・メール・課金方針に合わせて更新 |
| `28d6646` | fix: scope craftsman welcome state per user | WelcomeModal の localStorage キーをユーザー別 `craftsman_welcomed_${userId}` に変更 |
| `ca70913` | feat: 通知設定ボタンを通知セクションへ直接スクロール | WelcomeModal「通知設定をする」→ `/craftsman/profile#notification`。CraftsmanProfile に `id="notification"` 追加 |
| `af2bc54` | fix: AuthConfirmed navigate with justRegistered state | メール確認経由の職人登録後に WelcomeModal が表示されなかった問題を修正 |
| `6b8168b` | fix: Register.tsx justRegistered state | `/register` 直接登録時も WelcomeModal が表示されなかった問題を修正 |
| `308e297` | fix: restrict admin pages to admin role | /admin/* guard を role==='admin' 限定に |
| `21e3535` | fix: support admin role for operator login | Role 型に 'admin' 追加、Login.tsx で admin → /admin/dashboard |
| `72a8458` | fix: always render register page regardless of session | /register route を常時表示化 |
| `ed6c2c0` | fix: preserve pro signup intent when switching to register | Login.tsx → /register 遷移で state 引き継ぎ |
| `e8c2715` | fix: always allow explicit login flow | /login route を常時表示化（job ログイン済み user の即 redirect を撤去） |
| `08aa009` | fix: preserve craftsman intent from pro login | ProSignupPage → /login で state 渡し、Login.tsx 5 段階 role 解決 |
| `069b0b3` | fix: always show homepage at root | `/` を HomePage 固定（logged-in customer redirect 撤去） |
| `266125a` | feat: Phase UI-3-A | /craftsman を /craftsman/jobs へ redirect |
| `e26216b` | fix: customer landing redirects to corporate flow | /customer を /corporate へ redirect |
| `e8cbee5` | fix(dashboard): 二段クエリでPGRST200回避・city→area全ページ修正 | job_applications↔estimate_requests FK不在 → 2ステップfetch。全craftsman/customerページのcity→area統一 |
| `31008c7` | fix(review): ReviewPage DB書き込み対応 | reviewed_at 更新実装（デモモードから脱却） |
| `4e62278` | fix(review): reviews テーブルへの書き込みを追加 | reviews INSERT + RLS INSERT ポリシー追加 |
| `e4606e8` | fix(profile): avg_rating/review_count をプロフィールUIに表示 | RPC返値の評価統計を Craftsman型に追加・UIに反映 |
| `549e4bf` | merge: STOP C E2E 修正を origin/main に統合 | 上記4コミット + 前セッション75コミットをマージ |
