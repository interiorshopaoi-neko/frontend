import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import BottomNav from '../../components/BottomNav';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileForm = {
  shop_name: string;
  full_name: string;
  email: string;
  service_area: string;
  radius_km: number;
  work_types: string[];
  specialty: string;
  available_weekdays: string[];
  notification_enabled: boolean;
  profile_image_url: string;
  age: string;
  experience_years: string;
  bio: string;
  available_time: string;
  has_car: boolean;
  has_tools: boolean;
  public_profile_enabled: boolean;
};

const DEFAULT_FORM: ProfileForm = {
  shop_name: '',
  full_name: '',
  email: '',
  service_area: '',
  radius_km: 20,
  work_types: [],
  specialty: '',
  available_weekdays: [],
  notification_enabled: true,
  profile_image_url: '',
  age: '',
  experience_years: '',
  bio: '',
  available_time: '',
  has_car: false,
  has_tools: false,
  public_profile_enabled: true,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const WORK_TYPE_OPTIONS  = ['クロス', '床', 'CF', '補修', 'その他'] as const;
const RADIUS_OPTIONS     = [10, 20, 30, 50] as const;
const WEEKDAYS           = ['月', '火', '水', '木', '金', '土', '日'] as const;
const TIME_OPTIONS       = ['午前', '午後', '夜間可', '終日', '応相談'] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserId(): string {
  const stored = localStorage.getItem('user');
  if (stored) return String(JSON.parse(stored).id);
  let guestId = localStorage.getItem('craftsman_guest_id');
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem('craftsman_guest_id', guestId);
  }
  return guestId;
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(v => v !== item) : [...arr, item];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">{children}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  );
}

function BoolToggle({
  label, sub, enabled, onChange,
}: { label: string; sub: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`flex items-center justify-between w-full rounded-xl border px-4 py-3 transition ${
        enabled ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="text-left">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </div>
      <div className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CraftsmanProfile() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState<ProfileForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const userId = getUserId();

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .rpc('get_my_craftsman_profile', { p_user_id: userId });
      const data = rows?.[0] ?? null;

      if (data) {
        setForm({
          shop_name:            data.shop_name           ?? '',
          full_name:            data.full_name           ?? '',
          email:                data.email               ?? '',
          service_area:         data.service_area        ?? '',
          radius_km:            data.radius_km           ?? 20,
          work_types:           data.work_types          ?? [],
          specialty:            data.specialty           ?? '',
          available_weekdays:   data.available_weekdays  ?? [],
          notification_enabled: data.notification_enabled ?? true,
          profile_image_url:    data.profile_image_url   ?? '',
          age:                  data.age != null ? String(data.age) : '',
          experience_years:     data.experience_years != null ? String(data.experience_years) : '',
          bio:                  data.bio                 ?? '',
          available_time:       data.available_time      ?? '',
          has_car:              data.has_car             ?? false,
          has_tools:            data.has_tools           ?? false,
          public_profile_enabled: data.public_profile_enabled ?? true,
        });
      }
      setLoading(false);
    })();
  }, [userId]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const { error: upsertError } = await supabase
      .rpc('upsert_craftsman_profile', {
        p_user_id:                userId,
        p_email:                  form.email || null,
        p_shop_name:              form.shop_name,
        p_full_name:              form.full_name,
        p_service_area:           form.service_area,
        p_radius_km:              form.radius_km,
        p_work_types:             form.work_types,
        p_specialty:              form.specialty,
        p_available_weekdays:     form.available_weekdays,
        p_notification_enabled:   form.notification_enabled,
        p_profile_image_url:      form.profile_image_url || null,
        p_age:                    form.age !== '' ? Number(form.age) : null,
        p_experience_years:       form.experience_years !== '' ? Number(form.experience_years) : null,
        p_bio:                    form.bio || null,
        p_available_time:         form.available_time || null,
        p_has_car:                form.has_car,
        p_has_tools:              form.has_tools,
        p_public_profile_enabled: form.public_profile_enabled,
      });

    setSaving(false);

    if (upsertError) {
      setError('保存に失敗しました。Supabase の craftsmen テーブルが作成済みか確認してください。');
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const avatarLetter = (form.shop_name || form.full_name || '?').charAt(0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-none">職人プロフィール</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">案件マッチングに使われます</p>
            </div>
          </div>
          <a href="/craftsman/jobs" className="text-xs text-blue-600 font-semibold hover:underline">
            ← 案件一覧
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-36">

        {/* エラーバナー */}
        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-semibold">
            {error}
          </div>
        )}

        {/* 保存成功バナー */}
        {saved && (
          <div className="mb-4 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2 text-sm text-green-700 font-semibold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            プロフィールを保存しました
          </div>
        )}

        {/* 公開プロフィールへのリンク */}
        {form.public_profile_enabled && (
          <a
            href={`/craftsman/profile/${userId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-center justify-between bg-blue-600 text-white rounded-2xl px-4 py-3 shadow-sm shadow-blue-200 hover:bg-blue-700 transition"
          >
            <div>
              <p className="text-sm font-extrabold">公開プロフィールを確認する</p>
              <p className="text-[11px] text-blue-200 mt-0.5">依頼者・他の職人から見える画面</p>
            </div>
            <svg className="w-4 h-4 text-blue-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
          </a>
        )}

        {/* 実績エリア */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">実績・評価</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] text-slate-400">成約実績</p>
              <p className="text-lg font-extrabold text-slate-900 leading-tight">0件</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] text-slate-400">レビュー</p>
              <p className="text-sm font-bold text-slate-500 leading-tight mt-0.5">まだありません</p>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-blue-600 font-semibold">
            💡 実績が増えると案件に選ばれやすくなります
          </p>
          <a
            href="/craftsman/applications"
            className="mt-2 inline-block text-xs text-slate-400 underline hover:text-slate-600"
          >
            応募状況を確認する →
          </a>
        </div>

        {/* ── 基本情報 ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-1 mb-4">

          <Field label="屋号 / 名前">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">屋号（任意）</label>
                <input
                  type="text"
                  value={form.shop_name}
                  onChange={e => set('shop_name', e.target.value)}
                  placeholder="〇〇内装"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">担当者名</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  placeholder="山田 太郎"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </Field>

          <div className="border-t border-slate-100 my-4" />

          <Field label="対応エリア">
            <input
              type="text"
              value={form.service_area}
              onChange={e => set('service_area', e.target.value)}
              placeholder="例：渋谷区・目黒区・品川区"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </Field>

          <Field label="対応半径">
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map(km => (
                <button
                  key={km}
                  onClick={() => set('radius_km', km)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-extrabold border transition ${
                    form.radius_km === km
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {km}km
                </button>
              ))}
            </div>
          </Field>

          <div className="border-t border-slate-100 my-4" />

          <Field label="対応可能工事（複数選択可）">
            <div className="flex flex-wrap gap-2">
              {WORK_TYPE_OPTIONS.map(wt => {
                const active = form.work_types.includes(wt);
                return (
                  <button
                    key={wt}
                    onClick={() => set('work_types', toggle(form.work_types, wt))}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {wt}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="得意案件（自由記述）">
            <textarea
              value={form.specialty}
              onChange={e => set('specialty', e.target.value)}
              placeholder="例：賃貸の原状回復が得意。1日で複数部屋対応可。"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </Field>

          <div className="border-t border-slate-100 my-4" />

          <Field label="空き日（対応しやすい曜日）">
            <div className="flex gap-2 flex-wrap">
              {WEEKDAYS.map(day => {
                const active = form.available_weekdays.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => set('available_weekdays', toggle(form.available_weekdays, day))}
                    className={`w-11 h-11 rounded-full text-sm font-extrabold border transition ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              選択した曜日の近場案件を優先的にご案内します
            </p>
          </Field>

          <div className="border-t border-slate-100 my-4" />

          <Field label="通知設定">
            <BoolToggle
              label="新着案件の通知を受け取る"
              sub="対応エリアに案件が届いたとき通知"
              enabled={form.notification_enabled}
              onChange={v => set('notification_enabled', v)}
            />
            {form.notification_enabled && (
              <div className="mt-3">
                <label className="text-[11px] text-slate-400 font-semibold">
                  通知先メールアドレス（任意）
                </label>
                <input
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="example@gmail.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  新着案件の通知メールを受け取るアドレスです。未入力の場合は通知されません。
                </p>
              </div>
            )}
          </Field>
        </div>

        {/* ── 自己紹介・公開情報 ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-1 mb-4">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4">
            自己紹介・公開プロフィール
          </p>

          {/* プロフィール写真プレビュー */}
          <Field label="プロフィール写真">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {form.profile_image_url ? (
                  <img
                    src={form.profile_image_url}
                    alt="プロフィール写真"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-2xl font-extrabold text-slate-400">{avatarLetter}</span>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="url"
                  value={form.profile_image_url}
                  onChange={e => set('profile_image_url', e.target.value)}
                  placeholder="https://... 画像URL"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  ※ 正式版ではカメラロールから直接アップロード予定
                </p>
              </div>
            </div>
          </Field>

          <div className="border-t border-slate-100 my-4" />

          {/* 年齢 / 内装歴 */}
          <Field label="基本スペック">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">年齢</label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.age}
                    onChange={e => set('age', e.target.value)}
                    placeholder="35"
                    min={18}
                    max={80}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="text-sm text-slate-500 flex-shrink-0">歳</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">内装歴</label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.experience_years}
                    onChange={e => set('experience_years', e.target.value)}
                    placeholder="10"
                    min={0}
                    max={60}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="text-sm text-slate-500 flex-shrink-0">年</span>
                </div>
              </div>
            </div>
          </Field>

          <div className="border-t border-slate-100 my-4" />

          <Field label="一言プロフィール">
            <textarea
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              placeholder="例：群馬県内で10年以上クロス工事を専門に行っています。急ぎの原状回復もお任せください。"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </Field>

          <div className="border-t border-slate-100 my-4" />

          <Field label="対応できる時間帯">
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => set('available_time', form.available_time === t ? '' : t)}
                  className={`px-4 py-2 rounded-full text-sm font-bold border transition ${
                    form.available_time === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <div className="border-t border-slate-100 my-4" />

          {/* 車あり / 道具あり */}
          <Field label="装備・設備">
            <div className="flex flex-col gap-3">
              <BoolToggle
                label="🚗 車あり"
                sub="現場への移動手段がある"
                enabled={form.has_car}
                onChange={v => set('has_car', v)}
              />
              <BoolToggle
                label="🔧 道具あり"
                sub="専用工具・道具一式を持参できる"
                enabled={form.has_tools}
                onChange={v => set('has_tools', v)}
              />
            </div>
          </Field>

          <div className="border-t border-slate-100 my-4" />

          <Field label="プロフィール公開設定">
            <BoolToggle
              label="公開プロフィールを有効にする"
              sub="依頼者や他の職人がプロフィールを見られます"
              enabled={form.public_profile_enabled}
              onChange={v => set('public_profile_enabled', v)}
            />
            {form.public_profile_enabled && (
              <p className="mt-2 text-[11px] text-blue-600 font-semibold">
                ✓ 公開中 — 電話・住所などの個人情報は表示されません
              </p>
            )}
          </Field>
        </div>

        {/* サポート */}
        <div className="mt-2 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3.5">
          <p className="text-xs font-bold text-slate-600 mb-2.5">サポート</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {[
              { label: 'よくある質問', href: '/faq' },
              { label: 'お問い合わせ', href: '/support' },
              { label: '通報する',     href: '/support?type=report' },
              { label: '利用規約',     href: '/terms' },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="text-xs text-blue-600 hover:underline font-medium">
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* 職人ツールへの導線 */}
        <div className="mt-2 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-700">🔧 職人ツール</p>
            <p className="text-[11px] text-slate-400 mt-0.5">利益管理・簡単見積・現場メモを使えます</p>
          </div>
          <button
            onClick={() => navigate('/tools')}
            className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm shadow-blue-200 transition active:scale-95"
          >
            ツールを開く
          </button>
        </div>

        {/* 保存ボタン（固定フッター） */}
        <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-20">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3.5 font-extrabold text-base shadow-sm shadow-blue-200 transition active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  保存中...
                </span>
              ) : (
                'プロフィールを保存する'
              )}
            </button>
            <p className="mt-1.5 text-center text-[11px] text-slate-400">
              個人情報は成約後まで依頼主には開示されません
            </p>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
