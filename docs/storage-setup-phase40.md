# Phase 40: Storage Setup — プロフィール画像・施工事例

## 概要

職人プロフィールに以下を追加：
- **プロフィール写真** (`craftsman-avatars` bucket)
- **施工事例画像** (`craftsman-works` bucket + `craftsman_works` table)

フロント側で自動圧縮・WebP変換・EXIF削除を実施するため、**手動操作は DB/Storage のセットアップのみ**。

---

## Step 1: Supabase Storage Bucket ポリシー設定

> ダッシュボード → Storage → craftsman-avatars → Policies → Add Policy

### craftsman-avatars（プロフィール写真）

Supabase Dashboard の SQL Editor で以下を実行：

```sql
-- craftsman-avatars: 公開読み取り
CREATE POLICY "public read craftsman-avatars"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'craftsman-avatars');

-- craftsman-avatars: アップロード（upsert）
CREATE POLICY "anon upload craftsman-avatars"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'craftsman-avatars');

-- craftsman-avatars: 上書き
CREATE POLICY "anon update craftsman-avatars"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'craftsman-avatars');

-- craftsman-avatars: 削除
CREATE POLICY "anon delete craftsman-avatars"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'craftsman-avatars');
```

### craftsman-works（施工事例）

```sql
-- craftsman-works: 公開読み取り
CREATE POLICY "public read craftsman-works"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'craftsman-works');

-- craftsman-works: アップロード
CREATE POLICY "anon upload craftsman-works"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'craftsman-works');

-- craftsman-works: 削除
CREATE POLICY "anon delete craftsman-works"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'craftsman-works');
```

---

## Step 2: craftsman_works テーブル作成

SQL Editor で以下を実行：

```sql
-- craftsman_works テーブル
CREATE TABLE IF NOT EXISTS public.craftsman_works (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  craftsman_id text        NOT NULL,
  image_url    text        NOT NULL,
  caption      text,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS craftsman_works_craftsman_id_idx
  ON public.craftsman_works (craftsman_id);

-- RLS 有効化
ALTER TABLE public.craftsman_works ENABLE ROW LEVEL SECURITY;

-- 公開プロフィール用 SELECT（誰でも閲覧可）
CREATE POLICY "public read craftsman_works"
  ON public.craftsman_works FOR SELECT TO anon
  USING (true);

-- anon 書き込み（アプリ側で craftsman_id を管理）
CREATE POLICY "anon insert craftsman_works"
  ON public.craftsman_works FOR INSERT TO anon
  WITH CHECK (true);

-- anon 削除
CREATE POLICY "anon delete craftsman_works"
  ON public.craftsman_works FOR DELETE TO anon
  USING (true);
```

---

## Storage 使用量見積もり

### プロフィール画像（craftsman-avatars）
- 1枚あたり: 約 100〜200 KB（800px・WebP・quality 0.85）
- 1,000職人: **最大 200 MB**

### 施工事例（craftsman-works）
- 1枚あたり: 約 150〜350 KB（1600px・WebP・quality 0.82）
- 1職人 × 4枚: 最大 1.4 MB
- 1,000職人: **最大 1.4 GB**

### 合計（1,000職人）
| 区分 | 想定容量 |
|------|----------|
| craftsman-avatars | 〜200 MB |
| craftsman-works | 〜1.4 GB |
| **合計** | **〜1.6 GB** |

### Supabase 無料枠（Free tier）
| リソース | 無料枠 | 1,000職人時 |
|---------|--------|------------|
| Storage | 1 GB | ❌ 超過（1.6 GB） |
| DB rows | 500 MB | ✅ 余裕（small table） |
| Bandwidth | 2 GB/月 | ⚠️ 要監視 |

**推奨**: 500職人まで無料枠内。それ以降は Pro プラン（$25/月、Storage 100 GB）へ移行。

---

## 後で危険になる箇所

1. **Storage ポリシーが甘い**  
   `WITH CHECK (true)` で誰でもアップロード可能。悪意あるユーザーが他人の craftsman_id で大量アップロード可能。  
   → **Supabase Auth 導入後に `auth.uid()::text = craftsman_id` で制限すること**

2. **Storage 容量が予算超過**  
   1枚 350KB × 4 × 1,000職人 = 1.4 GB（無料枠 1 GB 超過）  
   → Pro プランまたは Cloudflare R2 への移行を検討

3. **古いアバター画像が残る**  
   職人が何度もアバターを変更すると `?v=xxx` が変わるが storage には古いファイルが残る  
   → 定期的な storage cleanup スクリプトを用意すること

4. **CDN キャッシュが効かない場合あり**  
   `?v=timestamp` のクエリパラメータでキャッシュバスターを付与しているため、プレビューは更新されるが CDN キャッシュが無効化される  
   → 長期的には Storage Transform (Supabase) や imgproxy を活用

---

## 次にやるべき信用強化施策

| 優先度 | 施策 |
|--------|------|
| ★★★ | **本人確認バッジ**（身分証 or 事業者登録証の提出） |
| ★★★ | **レビュー数の増加施策**（依頼完了後の自動メール送信） |
| ★★☆ | **施工事例キャプション入力**（工事種別・場所など） |
| ★★☆ | **動画施工事例**（30秒以内の施工動画） |
| ★☆☆ | **資格・免許登録**（内装業者登録証、組合加入など） |
| ★☆☆ | **マップ表示**（職人の拠点エリアをマップで可視化） |
