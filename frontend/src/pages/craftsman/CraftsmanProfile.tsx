import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import BottomNav from '../../components/BottomNav';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileForm = {
  shop_name: string;
  full_name: string;
  service_area: string;
  radius_km: number;
  work_types: string[];
  specialty: string;
  available_weekdays: string[];
  notification_enabled: boolean;
};

const DEFAULT_FORM: ProfileForm = {
  shop_name: '',
  full_name: '',
  service_area: '',
  radius_km: 20,
  work_types: [],
  specialty: '',
  available_weekdays: [],
  notification_enabled: true,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const WORK_TYPE_OPTIONS = ['クロス', '床', 'CF', '補修', 'その他'] as const;
const RADIUS_OPTIONS    = [10, 20, 30, 50] as const;
const WEEKDAYS          = ['月', '火', '水', '木', '金', '土', '日'] as const;

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CraftsmanProfile() {
  const [form,    setForm]    = useState<ProfileForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const userId = getUserId();

  // 既存プロフィール読み込み
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('craftsmen')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setForm({
          shop_name:           data.shop_name           ?? '',
          full_name:           data.full_name           ?? '',
          service_area:        data.service_area        ?? '',
          radius_km:           data.radius_km           ?? 20,
          work_types:          data.work_types          ?? [],
          specialty:           data.specialty           ?? '',
          available_weekdays:  data.available_weekdays  ?? [],
          notification_enabled: data.notification_enabled ?? true,
        });
      }
      setLoading(false);
    })();
  }, [userId]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const { error: upsertError } = await supabase
      .from('craftsmen')
      .upsert(
        {
          user_id:              userId,
          shop_name:            form.shop_name,
          full_name:            form.full_name,
          service_area:         form.service_area,
          radius_km:            form.radius_km,
          work_types:           form.work_types,
          specialty:            form.specialty,
          available_weekdays:   form.available_weekdays,
          notification_enabled: form.notification_enabled,
          updated_at:           new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-1">

          {/* 屋号 / 名前 */}
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

          {/* 対応エリア */}
          <Field label="対応エリア">
            <input
              type="text"
              value={form.service_area}
              onChange={e => set('service_area', e.target.value)}
              placeholder="例：渋谷区・目黒区・品川区"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </Field>

          {/* 対応半径 */}
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

          {/* 対応可能工事 */}
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

          {/* 得意案件 */}
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

          {/* 空き日（曜日） */}
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

          {/* 通知希望 */}
          <Field label="通知設定">
            <button
              onClick={() => set('notification_enabled', !form.notification_enabled)}
              className={`flex items-center justify-between w-full rounded-xl border px-4 py-3 transition ${
                form.notification_enabled
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">新着案件の通知を受け取る</p>
                <p className="text-xs text-slate-500 mt-0.5">対応エリアに案件が届いたとき通知</p>
              </div>
              {/* トグルスイッチ */}
              <div className={`relative w-12 h-6 rounded-full transition-colors ${
                form.notification_enabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.notification_enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </div>
            </button>
          </Field>
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
