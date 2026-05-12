# PRO MATCH — 現在の正解（CURRENT STATE）

> 最終更新: 2026-05-12 / HEAD: `aec1ef7` (fix: allow anon to update job_applications for customer contract flow)
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
| 職人側の工事完了報告 | `CraftsmanDashboardPage.tsx` の成約済みカードに「工事完了を報告する」ボタン → `review_requested_at = now()` を更新 | `bdd3f4e` |
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

### その他修正済み（2026-05-12）

- `estimate_requests.city` → `area` 不一致: 全 9 ファイル修正済み（`adcfcc5`）
- 動画フィルタ: `job.has_video || !!job.video_url` で実 DB の `video_url` を正しく参照（`5b311c0`）
- status='done' 案件を職人一覧から除外（`63dce09`）
- 顧客側レビュー画面への導線（成約後 → 工事完了報告後 → レビュー投稿）追加（`34802db`）

### 未実装（次フェーズ）

- 工事完了報告 → レビュー送信 → profile 反映の実データ E2E
- DEMO fallback の分離（実案件 0 件時の挙動整理）
- 職人プロフィールへのレビュー表示（avg_rating / review_count / top_tags）
- 職人→お客様 / 職人→職人 レビュー
- billing_events テーブル / 手数料回収 (Stripe)
- 無料枠カウント / 紹介制度
- 成約後の連絡先開示通知メール
- メール内リンク改善（マジックリンク等）

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

---

## 12. 主要 commit 履歴（直近の修正経緯）

| commit | 件名 | 何を直したか |
|---|---|---|
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
