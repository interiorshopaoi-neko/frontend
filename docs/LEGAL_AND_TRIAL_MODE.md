# PRO MATCH — 試験運用モードと法的対応の記録

> 最終更新：2026年5月24日

---

## 現在の状態

### 試験運用モード：**ON**

`frontend/src/pages/craftsman/CraftsmanDashboardPage.tsx` の先頭に以下の定数があります：

```ts
const TRIAL_FREE_ACCESS = true;
```

---

## 試験運用中の挙動

| 項目 | 状態 |
|---|---|
| 決済（Stripe Checkout） | **スキップ** — `handlePaidConfirm` は呼ばれない |
| 無料枠消費（`unlock_contact` RPC） | **スキップ** — `handleFreeConfirm` は呼ばれない |
| `free_credits_remaining` の消費 | **なし** |
| `referral_bonus_credits` の消費 | **なし** |
| 連絡先の開示 | **できる**（`api/trial-get-contact.ts` 経由） |
| 紹介コード表示・シェア | **維持** |
| 紹介成功時の特典付与 | **維持**（`referral_bonus_credits` が増える処理は残っている） |

---

## 試験運用バナー文言

連絡先開示確認モーダルに以下を表示：

```
現在は試験運用中のため、連絡先確認は無料です
正式版では一部機能が有料になる予定です
```

ボタン文言：「無料で連絡先を見る」

---

## セキュリティ上の注意（試験運用中）

`api/trial-get-contact.ts` は `contact_disclosures` テーブルに記録を残さないため、**誰がいつ連絡先を閲覧したかの監査ログが残りません**。

- 正式版切替時に `TRIAL_FREE_ACCESS = false` に戻すと、このエンドポイントは呼ばれなくなります
- エンドポイント自体を削除しなくても安全ですが、正式版では `unlock_contact` RPC 経由（`handleFreeConfirm` / `handlePaidConfirm`）のみが使われます

---

## 紹介制度の状態

| 項目 | 状態 |
|---|---|
| 紹介コード表示 | ✅ 維持 |
| 紹介コードのシェア | ✅ 維持 |
| `referred_by` 保存 | ✅ 維持 |
| 紹介成功時の特典付与 | ✅ 維持（DB側の `referral_bonus_credits += 2` は動く） |
| 紹介説明文 | 変更済み：「正式版でも使える特典枠が増えます」 |

---

## 利用規約・プライバシーポリシー

| ページ | ルート | 状態 |
|---|---|---|
| 利用規約 | `/terms` | ✅ 11条まで強化済み（試験運用・免責・準拠法・管轄裁判所含む） |
| プライバシーポリシー | `/privacy` | ✅ 10条に強化済み（外部サービス・連絡先開示・問い合わせ先含む） |

---

## 職人プロフィールの同意チェック

- プロフィール保存ボタンの直前にチェックボックスを追加
- 未チェックの場合は保存ボタンが `disabled` になり、エラー表示
- 同意時に `craftsmen.agreed_to_terms = true` / `agreed_to_terms_at = now` を記録（fire-and-forget）

**⚠️ DB migration が必要：**

```sql
ALTER TABLE public.craftsmen
  ADD COLUMN IF NOT EXISTS agreed_to_terms    boolean     NOT NULL DEFAULT false;
ALTER TABLE public.craftsmen
  ADD COLUMN IF NOT EXISTS agreed_to_terms_at timestamptz;
```

→ `supabase/migrations/20260524_craftsmen_terms_consent.sql` を SQL Editor で実行

---

## フッターリンク

`HomePage.tsx` のフッターに以下が含まれるようになりました：
- プライバシーポリシー
- 利用規約
- 料金ポリシー
- お問い合わせ
- **改善報告（新追加）**
- 職人の方はこちら

---

## 本番課金再開時に戻す手順

1. `CraftsmanDashboardPage.tsx` の `const TRIAL_FREE_ACCESS = true;` → `false` に変更
2. Vercel 環境変数で `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CONTACT_UNLOCK` が本番値になっているか確認
3. デプロイして動作確認（Stripe テストカードで決済テスト）

---

## ⚠️ 正式運用前に専門家確認推奨

- 利用規約・プライバシーポリシーの内容は一般的な形式で作成していますが、**法的な適正性の確認は弁護士等の専門家に依頼することを強く推奨します**
- 特に：免責条項の有効性、消費者契約法との整合性、個人情報保護法への対応、管轄裁判所の指定
