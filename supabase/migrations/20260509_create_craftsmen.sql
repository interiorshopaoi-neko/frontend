-- ================================================================
-- craftsmen テーブル作成 v2（セキュアRLS設計）
-- 既存コード (CraftsmanProfile.tsx) との互換性を保ちつつ
-- anon による全件読み取り・全件書き換えを防ぐ設計
--
-- 変更点（旧設計からの差分）:
--   × anon SELECT USING(true)  → 削除（全件列挙を防ぐ）
--   × anon UPDATE USING(true)  → 削除（他職人の行書き換えを防ぐ）
--   ○ anon は SECURITY DEFINER 関数経由でのみ読み書き可
--   ○ authenticated（管理者）は直接全件 SELECT 可
--
-- アプリ側で必要な変更（SQLとセットで適用する）:
--   CraftsmanProfile.tsx      : SELECT → rpc('get_my_craftsman_profile')
--                               UPSERT → rpc('upsert_craftsman_profile')
--   CraftsmanPublicProfile.tsx: SELECT → rpc('get_craftsman_public_profile')
--   RequestApplicationsPage   : SELECT → rpc('get_craftsmen_by_ids')
--   AdminDashboardPage.tsx    : 変更不要（authenticated で直接 SELECT 可）
-- ================================================================

-- ─── テーブル ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.craftsmen (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                text        NOT NULL UNIQUE,   -- LocalStorage UUID
  email                  text,                          -- 通知先メールアドレス（個人情報）
  shop_name              text,
  full_name              text,
  service_area           text,
  radius_km              int         DEFAULT 20,
  work_types             text[]      DEFAULT '{}',
  specialty              text,
  available_weekdays     text[]      DEFAULT '{}',
  notification_enabled   boolean     DEFAULT true,
  profile_image_url      text,
  age                    int,
  experience_years       int,
  bio                    text,
  available_time         text,
  has_car                boolean     DEFAULT false,
  has_tools              boolean     DEFAULT false,
  public_profile_enabled boolean     DEFAULT false,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

-- ─── RLS 有効化 ───────────────────────────────────────────────────
ALTER TABLE public.craftsmen ENABLE ROW LEVEL SECURITY;

-- ─── anon: INSERT のみ許可 ────────────────────────────────────────
-- ・UUID v4 形式バリデーション付き（ランダム文字列の直接注入を防ぐ）
-- ・SELECT / UPDATE / DELETE は全ブロック → SECURITY DEFINER 関数経由
CREATE POLICY "craftsmen_anon_insert"
  ON public.craftsmen
  FOR INSERT TO anon
  WITH CHECK (
    user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

-- anon SELECT : ポリシーなし → ブロック
-- anon UPDATE : ポリシーなし → ブロック
-- anon DELETE : ポリシーなし → ブロック

-- ─── authenticated（管理者）: 全件 SELECT ─────────────────────────
-- /admin/* 画面で Supabase Auth ログイン後に使用
-- AdminDashboardPage / AdminRequests / 通知メール送信元（将来）
CREATE POLICY "craftsmen_auth_select_all"
  ON public.craftsmen
  FOR SELECT TO authenticated
  USING (true);


-- ================================================================
-- SECURITY DEFINER 関数群
-- ・SECURITY DEFINER = テーブルオーナー権限でRLSをバイパス
-- ・anon は必ずこれらの関数を経由してテーブルにアクセスする
-- ・SET search_path = public でスキーマ検索順を固定（セキュリティベスト）
-- ================================================================

-- ─── 1. 自分のプロフィール取得（email 含む全カラム）──────────────
-- 対象: CraftsmanProfile.tsx の SELECT
-- 呼び出し例:
--   const { data } = await supabase
--     .rpc('get_my_craftsman_profile', { p_user_id: userId })
--   const row = data?.[0] ?? null;
-- セキュリティ注記:
--   user_id を知っている人なら誰でも呼べる。ただし UUID(128bit乱数)の
--   推測は事実上不可能。自分の user_id は localStorage にしか存在しない。
CREATE OR REPLACE FUNCTION public.get_my_craftsman_profile(p_user_id text)
RETURNS TABLE (
  id                     uuid,
  user_id                text,
  email                  text,
  shop_name              text,
  full_name              text,
  service_area           text,
  radius_km              int,
  work_types             text[],
  specialty              text,
  available_weekdays     text[],
  notification_enabled   boolean,
  profile_image_url      text,
  age                    int,
  experience_years       int,
  bio                    text,
  available_time         text,
  has_car                boolean,
  has_tools              boolean,
  public_profile_enabled boolean,
  created_at             timestamptz,
  updated_at             timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT
    c.id, c.user_id, c.email,
    c.shop_name, c.full_name, c.service_area, c.radius_km,
    c.work_types, c.specialty, c.available_weekdays,
    c.notification_enabled, c.profile_image_url,
    c.age, c.experience_years, c.bio, c.available_time,
    c.has_car, c.has_tools, c.public_profile_enabled,
    c.created_at, c.updated_at
  FROM public.craftsmen c
  WHERE c.user_id = p_user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_craftsman_profile(text) TO anon, authenticated;

-- ─── 2. プロフィール保存（INSERT / UPDATE）───────────────────────
-- 対象: CraftsmanProfile.tsx の upsert
-- 呼び出し例:
--   const { error } = await supabase.rpc('upsert_craftsman_profile', {
--     p_user_id: userId, p_email: form.email, p_shop_name: form.shop_name, ...
--   })
-- セキュリティ注記:
--   user_id を知る第三者が他人の行を書き換えられる点は残存リスク。
--   ただし UUID 推測困難 + 書き換えの動機が低いため現状許容。
--   完全対策には Supabase Auth 導入が必要。
CREATE OR REPLACE FUNCTION public.upsert_craftsman_profile(
  p_user_id                text,
  p_email                  text,
  p_shop_name              text,
  p_full_name              text,
  p_service_area           text,
  p_radius_km              int,
  p_work_types             text[],
  p_specialty              text,
  p_available_weekdays     text[],
  p_notification_enabled   boolean,
  p_profile_image_url      text,
  p_age                    int,
  p_experience_years       int,
  p_bio                    text,
  p_available_time         text,
  p_has_car                boolean,
  p_has_tools              boolean,
  p_public_profile_enabled boolean
)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.craftsmen (
    user_id, email, shop_name, full_name, service_area, radius_km,
    work_types, specialty, available_weekdays, notification_enabled,
    profile_image_url, age, experience_years, bio, available_time,
    has_car, has_tools, public_profile_enabled, updated_at
  ) VALUES (
    p_user_id, p_email, p_shop_name, p_full_name, p_service_area, p_radius_km,
    p_work_types, p_specialty, p_available_weekdays, p_notification_enabled,
    p_profile_image_url, p_age, p_experience_years, p_bio, p_available_time,
    p_has_car, p_has_tools, p_public_profile_enabled, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email                  = EXCLUDED.email,
    shop_name              = EXCLUDED.shop_name,
    full_name              = EXCLUDED.full_name,
    service_area           = EXCLUDED.service_area,
    radius_km              = EXCLUDED.radius_km,
    work_types             = EXCLUDED.work_types,
    specialty              = EXCLUDED.specialty,
    available_weekdays     = EXCLUDED.available_weekdays,
    notification_enabled   = EXCLUDED.notification_enabled,
    profile_image_url      = EXCLUDED.profile_image_url,
    age                    = EXCLUDED.age,
    experience_years       = EXCLUDED.experience_years,
    bio                    = EXCLUDED.bio,
    available_time         = EXCLUDED.available_time,
    has_car                = EXCLUDED.has_car,
    has_tools              = EXCLUDED.has_tools,
    public_profile_enabled = EXCLUDED.public_profile_enabled,
    updated_at             = now();
$$;

GRANT EXECUTE ON FUNCTION public.upsert_craftsman_profile(
  text, text, text, text, text, int, text[], text, text[],
  boolean, text, int, int, text, text, boolean, boolean, boolean
) TO anon, authenticated;

-- ─── 3. 公開プロフィール取得（単一・email なし）──────────────────
-- 対象: CraftsmanPublicProfile.tsx
-- 呼び出し例:
--   const { data } = await supabase
--     .rpc('get_craftsman_public_profile', { p_user_id: userId })
--   const profile = data?.[0] ?? null;
CREATE OR REPLACE FUNCTION public.get_craftsman_public_profile(p_user_id text)
RETURNS TABLE (
  user_id                text,
  shop_name              text,
  full_name              text,
  service_area           text,
  radius_km              int,
  work_types             text[],
  specialty              text,
  available_weekdays     text[],
  profile_image_url      text,
  age                    int,
  experience_years       int,
  bio                    text,
  available_time         text,
  has_car                boolean,
  has_tools              boolean,
  public_profile_enabled boolean
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT
    c.user_id, c.shop_name, c.full_name, c.service_area, c.radius_km,
    c.work_types, c.specialty, c.available_weekdays, c.profile_image_url,
    c.age, c.experience_years, c.bio, c.available_time,
    c.has_car, c.has_tools, c.public_profile_enabled
  FROM public.craftsmen c
  WHERE c.user_id = p_user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_craftsman_public_profile(text) TO anon, authenticated;

-- ─── 4. 複数職人の公開情報取得（email なし）──────────────────────
-- 対象: RequestApplicationsPage.tsx の .in('user_id', craftsmanIds)
-- 呼び出し例:
--   const { data } = await supabase
--     .rpc('get_craftsmen_by_ids', { p_user_ids: craftsmanIds })
CREATE OR REPLACE FUNCTION public.get_craftsmen_by_ids(p_user_ids text[])
RETURNS TABLE (
  user_id          text,
  shop_name        text,
  full_name        text,
  experience_years int,
  work_types       text[],
  has_car          boolean,
  has_tools        boolean,
  bio              text,
  profile_image_url text
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT
    c.user_id, c.shop_name, c.full_name, c.experience_years,
    c.work_types, c.has_car, c.has_tools, c.bio, c.profile_image_url
  FROM public.craftsmen c
  WHERE c.user_id = ANY(p_user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_craftsmen_by_ids(text[]) TO anon, authenticated;


-- ================================================================
-- ★ 動作確認用クエリ（実行後に SQL Editor で試す）
-- ================================================================
-- テーブル確認:
-- SELECT * FROM public.craftsmen LIMIT 5;
--
-- 関数テスト（user_id は登録後に置き換え）:
-- SELECT * FROM get_my_craftsman_profile('your-uuid-here');
-- SELECT * FROM get_craftsman_public_profile('your-uuid-here');
-- SELECT * FROM get_craftsmen_by_ids(ARRAY['uuid1', 'uuid2']);
-- ================================================================
