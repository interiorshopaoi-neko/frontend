# PRO MATCH — システム構成

> 最終更新：2026年5月17日（Phase61 時点）

---

## PRO MATCH の本質

> **「動画を送るだけで、職人が現場をリモートで理解できる」**

内装工事（壁紙・床CF）は「現場の状態」が見積もり精度に直結する。
テキストで「6畳・クロス張替え」と書いても、損傷度・既存素材・形状は伝わらない。
動画30秒があれば、職人はその場に来なくても判断できる。
これが PRO MATCH の差別化ポイント。

---

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | Vite + React + TypeScript（strict）+ Tailwind CSS |
| バックエンド（DB・Auth・RLS） | Supabase（PostgreSQL + PostgREST + Auth） |
| サーバーレス API | Vercel API Routes（`root api/` ディレクトリのみ。`frontend/api/` は Phase60 で削除済み） |
| メール送信 | Resend（`noreply@promatch-app.jp` で verified済み） |
| Edge Functions | Supabase Edge Functions（Deno ランタイム） |
| ホスティング | Vercel（`https://promatch-app.jp`） |

---

## ディレクトリ構成

```
/（worktree root）
├── frontend/
│   ├── api/                   ← Vercel API Routes（Node.js / TypeScript）
│   │   ├── notify.ts              管理者へのアドホック通知
│   │   ├── notify-application.ts  見積もり応募通知
│   │   ├── notify-contracted.ts   成約通知
│   │   ├── notify-helper-application.ts  助っ人応募通知
│   │   ├── notify-helper-approved.ts     助っ人承認通知
│   │   ├── notify-signup.ts       職人登録通知
│   │   ├── notify-review-*.ts     レビュー関連通知
│   │   ├── check-billing.ts       課金チェック
│   │   ├── auth/                  認証補助系
│   │   └── notifications/         通知補助系
│   ├── src/
│   │   ├── components/            共通UIコンポーネント
│   │   │   ├── BottomNav.tsx
│   │   │   ├── LogoutConfirmModal.tsx  ← Phase52追加
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── admin/             管理者ページ群
│   │   │   ├── craftsman/         職人ページ群
│   │   │   ├── customer/          お客様ページ群
│   │   │   ├── auth/              認証ページ群
│   │   │   └── corporate/         法人依頼フォーム
│   │   ├── hooks/
│   │   │   └── useAuth.ts         認証状態管理（localStorage）
│   │   └── lib/
│   │       └── supabase.ts        Supabase client
│   └── public/
│       ├── logo-full.svg
│       └── logo-icon.svg
└── supabase/
    ├── functions/
    │   ├── send-customer-email/         お客様受付確認メール
    │   └── send-craftsman-notification/ 職人新着案件メール
    └── migrations/                      DBスキーマ履歴
```

---

## 画面構成（ルート一覧）

### お客様（認証不要）
- `/` — トップ LP
- `/corporate` — 動画フォーム依頼（7ステップ）
- `/request/:id/extra-info` — 追加情報入力
- `/request/:id/review` — レビュー（UIのみ）

### 職人（認証必須）
- `/craftsman/jobs` — 案件一覧（未認証時は `JobsLockedPreview` を表示）
- `/craftsman/apply/:id` — 応募
- `/craftsman/dashboard` — 応募管理
- `/craftsman/profile` — 自分のプロフィール編集
- `/craftsman/profile/:userId` — 他者プロフィール閲覧
- `/craftsman/help` — 助っ人募集投稿
- `/craftsman/help-list` — 助っ人一覧
- `/tools` — 職人ツール（利益管理・簡易見積）

### 管理者
- `/admin/dashboard` — メイン管理画面
- `/admin/requests` — 依頼一覧

### 認証
- `/pro-signup` — 職人登録
- `/auth/login` — ログイン
- `/auth/verify` — メール確認待ち
- `/reset-password` — パスワードリセット

---

## 認証の二重構造

PRO MATCH は Supabase Auth と独自 localStorage Auth を**並列**で運用している。

```
Supabase Auth
  → メール確認・パスワードリセット・セッション管理
  → anon / authenticated role の切り替え

localStorage Auth（useAuth.ts）
  → token・user を localStorage に保存
  → フロントの「ログイン済み」判定に使用

※ useAuth.ts は大改造禁止（既存 flow との互換性維持のため）
```

---

## データの流れ

### 見積もり依頼フロー
```
お客様 → /corporate（動画・写真をアップロード）
  ↓
Supabase Storage（動画・写真保存）
  ↓
estimate_requests テーブルに保存
  ↓
Supabase Edge Function: send-customer-email（お客様へ受付確認）
Supabase Edge Function: send-craftsman-notification（職人へ通知）
  ↓
Vercel API: notify.ts（管理者へ通知）
```

### 助っ人募集フロー
```
職人A → /craftsman/help（募集投稿）
  ↓
help_requests テーブルに保存（craftsman_id = 職人A の user_id）
  ↓
職人B → /craftsman/help-list（応募）
  ↓
help_applications テーブルに保存
  ↓
Vercel API: notify-helper-application.ts（管理者・職人A へ通知）
  ↓
職人A が承認 → help_applications.status = 'approved'
  ↓
Vercel API: notify-helper-approved.ts（職人B へ承認通知・職人A の連絡先を開示）
```

---

## Supabase Edge Functions の役割

| 関数名 | 役割 | 送信元 |
|---|---|---|
| `send-customer-email` | 見積もり依頼のお客様受付確認メール | `noreply@promatch-app.jp` |
| `send-craftsman-notification` | 新着案件の職人一斉通知 | `noreply@promatch-app.jp` |

> Vercel API Routes と Edge Functions は**役割が異なる**。
> Edge Functions はトリガー系（DB変化→送信）に向いており、
> Vercel API Routes はフロントからの明示的な呼び出しで使用する。

---

## Vercel API Routes の役割

| ファイル | 役割 |
|---|---|
| `notify.ts` | アドホックな管理者通知 |
| `notify-application.ts` | 職人が見積もり応募した際の通知 |
| `notify-contracted.ts` | 成約通知 |
| `notify-helper-application.ts` | 助っ人募集への応募通知（管理者・募集主） |
| `notify-helper-approved.ts` | 助っ人応募の承認通知（応募者へ連絡先開示） |
| `notify-signup.ts` | 職人登録通知 |
| `check-billing.ts` | 課金チェック |

---

## Resend 設定

| 項目 | 値 |
|---|---|
| 検証済みドメイン | `promatch-app.jp` |
| 送信元（職人・お客様宛） | `PRO MATCH <noreply@promatch-app.jp>` |
| 送信元（管理者宛） | `PRO MATCH <noreply@promatch-app.jp>` |
| テスト用（使用禁止） | `onboarding@resend.dev`（アカウントオーナー宛のみ有効） |
