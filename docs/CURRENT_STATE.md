# PRO MATCH — 現在の正解（CURRENT STATE）

> 最終更新: 2026-05-11 / HEAD: `308e297` (fix: restrict admin pages to admin role)
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
| `/corporate` | 依頼フォーム (CorporateRequest) |
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

## 4. 重要方針

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

## 5. 旧 UI の扱い

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

## 6. 今後触る時の注意点

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

## 7. 主要 commit 履歴（直近の修正経緯）

| commit | 件名 | 何を直したか |
|---|---|---|
| `308e297` | fix: restrict admin pages to admin role | /admin/* guard を role==='admin' 限定に |
| `21e3535` | fix: support admin role for operator login | Role 型に 'admin' 追加、Login.tsx で admin → /admin/dashboard |
| `72a8458` | fix: always render register page regardless of session | /register route を常時表示化 |
| `ed6c2c0` | fix: preserve pro signup intent when switching to register | Login.tsx → /register 遷移で state 引き継ぎ |
| `e8c2715` | fix: always allow explicit login flow | /login route を常時表示化（job ログイン済み user の即 redirect を撤去） |
| `08aa009` | fix: preserve craftsman intent from pro login | ProSignupPage → /login で state 渡し、Login.tsx 5 段階 role 解決 |
| `069b0b3` | fix: always show homepage at root | `/` を HomePage 固定（logged-in customer redirect 撤去） |
| `266125a` | feat: Phase UI-3-A | /craftsman を /craftsman/jobs へ redirect |
| `e26216b` | fix: customer landing redirects to corporate flow | /customer を /corporate へ redirect |
