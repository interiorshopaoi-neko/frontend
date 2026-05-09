-- ============================================================
-- craftsmen テーブル作成
-- 既存コード (CraftsmanProfile.tsx) と完全互換
-- email カラムを追加（通知メール用）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.craftsmen (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                text        NOT NULL UNIQUE,   -- LocalStorage UUID or auth UID
  email                  text,                          -- 新着案件通知先メールアドレス
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

-- ─── RLS ──────────────────────────────────────────────────
ALTER TABLE public.craftsmen ENABLE ROW LEVEL SECURITY;

-- anon: INSERT 許可（誰でもプロフィール登録可能）
-- ※ user_id の UUID はクライアント生成。UUID の推測耐性でセキュリティを担保。
CREATE POLICY "craftsmen_anon_insert"
  ON public.craftsmen
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- anon: SELECT 許可（アプリ側で必ず .eq('user_id', userId) を付けて呼ぶ）
CREATE POLICY "craftsmen_anon_select"
  ON public.craftsmen
  FOR SELECT
  TO anon
  USING (true);

-- anon: UPDATE 許可（アプリ側で必ず .eq('user_id', userId) を付けて呼ぶ）
CREATE POLICY "craftsmen_anon_update"
  ON public.craftsmen
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE は開放しない（ポリシーなし = ブロック）

-- authenticated（管理者）: 全件 SELECT 可能
-- ※ /admin/* 画面で職人一覧・通知メール送信に使用
CREATE POLICY "craftsmen_auth_select_all"
  ON public.craftsmen
  FOR SELECT
  TO authenticated
  USING (true);

-- ─── 確認クエリ（実行後に結果を見る用） ─────────────────
-- SELECT id, user_id, email, shop_name, notification_enabled, created_at
-- FROM public.craftsmen
-- ORDER BY created_at DESC
-- LIMIT 20;
