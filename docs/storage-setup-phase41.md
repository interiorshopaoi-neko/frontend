# Phase 41: Storage・RLS 本番設定（完了済み）

## 概要

Phase 40 で実装したフロントエンドに対し、Supabase 本番環境の
Storage バケット・テーブル・RLS ポリシーを安全に設定した。

**実行日**: 2026-05-15  
**Project ref**: `lboskhjidbqxwrenwjdr`

---

## 実行したSQL（全量・冪等）

```sql
-- ════════════════════════════════════════════════════════════════
-- [1] Storage Buckets 作成
-- ════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('craftsman-avatars', 'craftsman-avatars', true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp']),
  ('craftsman-works',   'craftsman-works',   true, 10485760,
   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ════════════════════════════════════════════════════════════════
-- [2] SECURITY DEFINER 関数
--     anon から craftsmen テーブルを直接 SELECT させずに
--     craftsman_id の実在確認だけを安全に行う
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.craftsman_exists(p_user_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.craftsmen WHERE user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.craftsman_exists(text) TO anon;

-- ════════════════════════════════════════════════════════════════
-- [3] Storage policies: craftsman-avatars
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "public read craftsman-avatars"      ON storage.objects;
DROP POLICY IF EXISTS "anon upload craftsman-avatars"      ON storage.objects;
DROP POLICY IF EXISTS "anon update craftsman-avatars"      ON storage.objects;
DROP POLICY IF EXISTS "anon delete craftsman-avatars"      ON storage.objects;
DROP POLICY IF EXISTS "craftsman upload craftsman-avatars" ON storage.objects;
DROP POLICY IF EXISTS "craftsman update craftsman-avatars" ON storage.objects;
DROP POLICY IF EXISTS "craftsman delete craftsman-avatars" ON storage.objects;

-- 公開読み取り
CREATE POLICY "public read craftsman-avatars"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'craftsman-avatars');

-- アップロード: path[0] が実在する craftsman_id であること
CREATE POLICY "craftsman upload craftsman-avatars"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'craftsman-avatars'
    AND public.craftsman_exists(split_part(name, '/', 1))
  );

-- 上書き（upsert:true 対応）
CREATE POLICY "craftsman update craftsman-avatars"
  ON storage.objects FOR UPDATE TO anon
  USING (
    bucket_id = 'craftsman-avatars'
    AND public.craftsman_exists(split_part(name, '/', 1))
  )
  WITH CHECK (
    bucket_id = 'craftsman-avatars'
    AND public.craftsman_exists(split_part(name, '/', 1))
  );

-- 削除
CREATE POLICY "craftsman delete craftsman-avatars"
  ON storage.objects FOR DELETE TO anon
  USING (
    bucket_id = 'craftsman-avatars'
    AND public.craftsman_exists(split_part(name, '/', 1))
  );

-- ════════════════════════════════════════════════════════════════
-- [4] Storage policies: craftsman-works
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "public read craftsman-works"      ON storage.objects;
DROP POLICY IF EXISTS "anon upload craftsman-works"      ON storage.objects;
DROP POLICY IF EXISTS "anon delete craftsman-works"      ON storage.objects;
DROP POLICY IF EXISTS "craftsman upload craftsman-works" ON storage.objects;
DROP POLICY IF EXISTS "craftsman delete craftsman-works" ON storage.objects;

CREATE POLICY "public read craftsman-works"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'craftsman-works');

CREATE POLICY "craftsman upload craftsman-works"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'craftsman-works'
    AND public.craftsman_exists(split_part(name, '/', 1))
  );

CREATE POLICY "craftsman delete craftsman-works"
  ON storage.objects FOR DELETE TO anon
  USING (
    bucket_id = 'craftsman-works'
    AND public.craftsman_exists(split_part(name, '/', 1))
  );

-- ════════════════════════════════════════════════════════════════
-- [5] craftsman_works テーブル
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.craftsman_works (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  craftsman_id text        NOT NULL
                           REFERENCES public.craftsmen(user_id) ON DELETE CASCADE,
  image_url    text        NOT NULL,
  caption      text,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS craftsman_works_craftsman_id_idx
  ON public.craftsman_works (craftsman_id);

-- ════════════════════════════════════════════════════════════════
-- [6] RLS on craftsman_works
-- ════════════════════════════════════════════════════════════════
ALTER TABLE public.craftsman_works ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read craftsman_works"      ON public.craftsman_works;
DROP POLICY IF EXISTS "anon insert craftsman_works"      ON public.craftsman_works;
DROP POLICY IF EXISTS "anon delete craftsman_works"      ON public.craftsman_works;
DROP POLICY IF EXISTS "craftsman insert craftsman_works" ON public.craftsman_works;
DROP POLICY IF EXISTS "craftsman delete craftsman_works" ON public.craftsman_works;

-- SELECT: 誰でも閲覧可（公開プロフィール用）
CREATE POLICY "public read craftsman_works"
  ON public.craftsman_works FOR SELECT TO anon
  USING (true);

-- INSERT: craftsman_id が craftsmen に実在すること（FK + RLS の二重ガード）
-- ※ WITH CHECK(true) は使わない
CREATE POLICY "craftsman insert craftsman_works"
  ON public.craftsman_works FOR INSERT TO anon
  WITH CHECK (public.craftsman_exists(craftsman_id));

-- DELETE: 同上
CREATE POLICY "craftsman delete craftsman_works"
  ON public.craftsman_works FOR DELETE TO anon
  USING (public.craftsman_exists(craftsman_id));
```

---

## なぜ安全か

### craftsman_exists() SECURITY DEFINER の効果

`craftsmen` テーブルには anon の SELECT ポリシーがない（`authenticated` のみ）。
直接 `EXISTS (SELECT 1 FROM craftsmen ...)` を RLS に書いても anon では常に false になる。

`SECURITY DEFINER` 関数にすることで：
- 関数内では superuser 権限でクエリを実行
- anon に `craftsmen` の全カラムを公開しない
- 返り値は boolean のみ — 最小情報開示

### Phase 40 との比較

| 項目 | Phase 40（甘い版） | Phase 41（修正版） |
|------|-------------------|--------------------|
| Storage INSERT guard | `WITH CHECK (true)` | `craftsman_exists(path[0])` |
| Storage UPDATE guard | `WITH CHECK (true)` | `craftsman_exists(path[0])` |
| Storage DELETE guard | `USING (true)` | `craftsman_exists(path[0])` |
| craftsman_works INSERT | `WITH CHECK (true)` | `craftsman_exists(craftsman_id)` |
| craftsman_works DELETE | `USING (true)` | `craftsman_exists(craftsman_id)` |

---

## 実証テスト結果（全6ケース）

| テスト | 期待値 | 実測値 |
|--------|--------|--------|
| 偽UUID → craftsman-avatars upload | 403 Blocked | ✅ 403 |
| 実UUID → craftsman-avatars upload | 200 OK | ✅ 200 |
| 偽UUID → craftsman-works upload | 403 Blocked | ✅ 403 |
| 実UUID → craftsman-works upload | 200 OK | ✅ 200 |
| 偽UUID → craftsman_works INSERT | 401 Blocked | ✅ 401 |
| 実UUID → craftsman_works INSERT | 201 Created | ✅ 201 |

---

## 戻し方（ロールバック手順）

```sql
-- Storage buckets の削除（中身ごと削除される）
DELETE FROM storage.buckets WHERE id IN ('craftsman-avatars', 'craftsman-works');

-- craftsman_works テーブルの削除
DROP TABLE IF EXISTS public.craftsman_works;

-- craftsman_exists 関数の削除
DROP FUNCTION IF EXISTS public.craftsman_exists(text);
```

---

## 残留リスクと SNS 公開前に必要なこと

### ⚠️ 残留リスク（現在のカスタムAuth構成の限界）

1. **他人の craftsman_id を使った偽装挿入**
   - 攻撃者が公開プロフィールURLから他の `craftsman_id` を取得し、偽の施工事例を挿入できる
   - `craftsman_exists()` は「実在するか」しかチェックできず「自分のIDか」は確認できない
   - **完全解決**: Supabase Auth 移行後に `auth.uid()::text = craftsman_id` に変更

2. **古いアバター画像の蓄積**
   - `?v=timestamp` のキャッシュバスターにより旧ファイルは Storage に残り続ける
   - 定期的な cleanup スクリプトを用意すること

3. **Storage 容量（1,000職人時 〜1.6 GB）**
   - Supabase 無料枠 1GB を超える → Pro プラン（$25/月）または Cloudflare R2 を検討

### SNS 公開前に対応すべきこと（優先度順）

| 優先度 | 対応 |
|--------|------|
| ★★★ | Supabase Auth 移行で `auth.uid()` による真の所有者確認 |
| ★★★ | craftsman_works の件数上限をDBトリガーで強制（現状はフロントのみ） |
| ★★☆ | 古いアバター cleanup Lambda / Edge Function |
| ★★☆ | Storage 使用量モニタリングアラート |
| ★☆☆ | CDN キャッシュ戦略（imgproxy または Supabase Transform） |
