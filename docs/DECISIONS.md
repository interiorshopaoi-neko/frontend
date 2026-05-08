# PRO MATCH — 意思決定ログ

> 「なぜそうしたか」を残すファイルです。
> 今後の実装判断で迷ったときに参照してください。

---

## チャット機能を後回しにした理由

**決定：本格チャットは未実装のまま**

- 現在の流れ「成約後に連絡先を開示 → 電話・メールで直接やりとり」で十分機能する
- チャット実装はDB設計・リアルタイム同期・通知など複雑さが大きい
- MVPとして「マッチング成立まで」を優先する
- 将来的にはSupabase Realtimeかサードパーティを検討

---

## 工事代金を預からない理由

**決定：PRO MATCHはエスクロー・一部預かりを行わない**

- 預かり設計には金融業法・資金移動業登録が必要になる可能性がある
- 依頼者と職人の直接やりとりで十分な信頼関係が成立する
- トラブル時の責任範囲が明確になる（PRO MATCHはマッチング仲介のみ）
- シンプルな設計でスピードを優先する

---

## BottomNavを増やさない理由

**決定：BottomNavは4タブ固定（案件・管理・応援・マイページ）**

- タブが増えるほどユーザーの認知負荷が上がる
- 新機能は「既存ページへのカードリンク」か「`/tools` への集約」で対応
- `/tools` はBottomNavには出さず、URLで直接アクセスするか、プロフィールからリンク
- 参考：App StoreのようなシンプルなナビゲーションをUX目標にしている

---

## 動画ファーストにした理由

**決定：テキストより動画・写真で状況を伝える設計を優先**

- 内装工事は「現場の状態」が見積もり精度に直結する
- テキストで「6畳・クロス張替え」と書いても、現場の損傷度・既存素材・形状が見えない
- 動画30秒があれば職人は判断できる
- 競合との差別化：動画ベースの依頼フローは他社にない

---

## `/tools` を「職人OS」として育てる理由

**決定：`/tools` を職人の日常業務ツールのハブにする**

- 職人は「案件探し」だけでなく「利益管理・見積・材料計算」も日常業務として行う
- これらをアプリ内で完結させることで、職人のDAU（日次アクティブ率）が上がる
- BottomNavに増やさず、プロフィールや管理画面からリンクする設計にすることで UXを損なわない

---

## 手数料を成約時点で確定する理由

**決定：工事後に金額が増減しても、原則再計算しない**

- 工事後の金額変動を追跡するには職人と依頼者双方の報告が必要で、虚偽の可能性がある
- 成約時点の概算金額でシンプルに確定することで、運営コストが下がる
- 職人は概算金額を正確に出すインセンティブが生まれる

---

## お客様を完全無料にした理由

**決定：依頼者側からは一切お金を取らない**

- 依頼者のハードルを下げることで、依頼数（＝職人への仕事量）が増える
- 「まず試してみる」が起きやすいLPになる（ログイン不要・登録不要）
- 収益は職人側の手数料のみに集約し、ビジネスモデルをシンプルにする

---

## ロゴを SVG に統一した理由

**決定：PNG ではなく SVG を使用（`/public/logo-full.svg`・`logo-icon.svg`）**

- PNGは透過処理が難しく、背景色が乗ったJPEGが混入していた
- SVGは透過・スケーリングが完全で、Retina対応も自動
- ビルドツール（Vite）との親和性が高い

---

## メール自動返信の実装方針

**決定：Supabase Edge Functions + Resend（REST API fetch）**

- お客様向け自動返信のみ（職人通知は将来実装）
- フロントから `supabase.functions.invoke` で非同期呼び出し
- メール送信失敗は依頼送信の成功に影響しない
- DB Webhook は使わない（MVP優先・デバッグのしやすさ）

### 必要な環境変数（Supabase Secrets に登録）

| 変数名 | 内容 | テスト時の値 |
|---|---|---|
| `RESEND_API_KEY` | Resend の API キー | resend.com で取得 |
| `FROM_EMAIL` | 送信元メールアドレス | `noreply@promatch-app.jp`（独自ドメイン設定後） |
| `SITE_URL`   | サイトの公開 URL（メール内ロゴ画像に使用） | `https://promatch-app.jp` |

### デプロイ手順

```bash
# 1. Supabase CLI をインストール（未インストールの場合）
brew install supabase/tap/supabase

# 2. ログイン
supabase login

# 3. プロジェクトと紐づけ（ルートディレクトリで実行）
supabase link --project-ref lboskhjidbqxwrenwjdr

# 4. シークレット登録
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set FROM_EMAIL=noreply@promatch.jp

# 5. Edge Function デプロイ
supabase functions deploy send-customer-email --no-verify-jwt
```

### 独自ドメインメール設定手順（Resend）

送信元を `noreply@promatch-app.jp` にするには、Resend のドメイン認証が必要。

```
1. resend.com → Domains → Add Domain
   ドメイン名: promatch-app.jp を入力

2. 表示される DNS レコードをドメイン管理画面（お名前.com 等）に追加
   - SPF  : TXT レコード
   - DKIM : TXT レコード（2件）
   - DMARC: TXT レコード（任意だが推奨）

3. Resend 側で「Verify」ボタンを押して認証完了を確認（伝播に最大48時間）

4. Supabase Secrets を更新
   supabase secrets set FROM_EMAIL=noreply@promatch-app.jp

5. Edge Function を再デプロイ
   supabase functions deploy send-customer-email --no-verify-jwt
```

**注意：** 認証完了前に独自ドメインで送信するとバウンスする。
認証完了まではフォールバック `noreply@promatch-app.jp` が env に未設定のままにしておき、
Resend ダッシュボードで送信テストを行ってから secrets を登録する。

### 将来の拡張

```
supabase/functions/
  send-customer-email/   ← 実装済み
  notify-craftsman/      ← 将来（職人へ案件通知）
  send-match-confirmed/  ← 将来（成約確定通知）
```

---

## デモfallbackを許容する理由

**決定：DB保存が難しい機能はローカルstateやconsole.logで代替OK**

- スピードを優先してUIを先に作り、バックエンドは後から接続する
- レビュー・お問い合わせ・通報など、UIが完成してから保存先を設計する
- 「動かないUI」より「動くデモUI」の方が判断・改善がしやすい
