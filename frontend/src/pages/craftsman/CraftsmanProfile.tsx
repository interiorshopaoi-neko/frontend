import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import BottomNav from '../../components/BottomNav';
import { useAuth } from '../../hooks/useAuth';
import { compressImage } from '../../utils/imageUtils';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkItem = {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

type ProfileForm = {
  shop_name: string;
  full_name: string;
  email: string;
  service_area: string;
  radius_km: number;
  supported_prefectures: string[];
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
  supported_prefectures: [],
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
const REGION_PREFECTURES: { region: string; prefs: string[] }[] = [
  { region: '北海道', prefs: ['北海道'] },
  { region: '東北',   prefs: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { region: '関東',   prefs: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
  { region: '中部',   prefs: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'] },
  { region: '関西',   prefs: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  { region: '中国',   prefs: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  { region: '四国',   prefs: ['徳島県', '香川県', '愛媛県', '高知県'] },
  { region: '九州',   prefs: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
];
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
  const { logout } = useAuth();
  const [showLogout,         setShowLogout]         = useState(false);
  const [form,               setForm]               = useState<ProfileForm>(DEFAULT_FORM);
  const [loading,            setLoading]            = useState(true);
  const [saving,             setSaving]             = useState(false);
  const [saved,              setSaved]              = useState(false);
  const [error,              setError]              = useState<string | null>(null);
  const [contractedCount,    setContractedCount]    = useState(0);
  const [reviewPendingCount, setReviewPendingCount] = useState(0);
  const [works,             setWorks]             = useState<WorkItem[]>([]);
  const [avatarUploading,   setAvatarUploading]   = useState(false);
  const [avatarError,       setAvatarError]       = useState<string | null>(null);
  const [worksUploading,    setWorksUploading]    = useState(false);
  const [worksError,        setWorksError]        = useState<string | null>(null);
  const [openRegions,       setOpenRegions]       = useState<Set<string>>(new Set(['関東', '中部']));
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const worksInputRef  = useRef<HTMLInputElement>(null);
  const userId = getUserId();

  useEffect(() => {
    (async () => {
      const [{ data: rows }, { data: apps }] = await Promise.all([
        supabase.rpc('get_my_craftsman_profile', { p_user_id: userId }),
        supabase
          .from('job_applications')
          .select('is_contracted, review_requested_at, reviewed_at')
          .eq('craftsman_id', userId),
      ]);
      const data = rows?.[0] ?? null;

      if (apps) {
        const appRows = apps as Array<{ is_contracted: boolean | null; review_requested_at: string | null; reviewed_at: string | null }>;
        setContractedCount(appRows.filter(a => a.is_contracted).length);
        setReviewPendingCount(
          appRows.filter(a => a.is_contracted && a.review_requested_at && !a.reviewed_at).length,
        );
      }

      if (data) {
        setForm({
          shop_name:            data.shop_name           ?? '',
          full_name:            data.full_name           ?? '',
          email:                data.email               ?? '',
          service_area:         data.service_area        ?? '',
          radius_km:            data.radius_km           ?? 20,
          supported_prefectures: (data as any).supported_prefectures ?? [],
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

  // ── 施工事例ロード ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('craftsman_works')
        .select('id, image_url, caption, sort_order')
        .eq('craftsman_id', userId)
        .order('sort_order', { ascending: true })
        .limit(4);
      if (data) setWorks(data as WorkItem[]);
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
        p_supported_prefectures:  form.supported_prefectures,
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

    // referred_by 保存（初回のみ・自己紹介防止はRPC側で実施）— fire-and-forget
    const storedRef = localStorage.getItem('promatch_referral_code');
    if (storedRef && /^PROM-[A-Z0-9]{4}$/i.test(storedRef)) {
      void (async () => {
        try {
          await supabase.rpc('save_referred_by', {
            p_user_id:    userId,
            p_referred_by: storedRef.toUpperCase(),
          });
          localStorage.removeItem('promatch_referral_code');
        } catch { /* fire-and-forget */ }
      })();
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── アバターアップロード ──────────────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const compressed = await compressImage(file, 800, 0.85);
      const ext  = compressed.type.includes('webp') ? 'webp' : 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('craftsman-avatars')
        .upload(path, compressed, { upsert: true, contentType: compressed.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from('craftsman-avatars')
        .getPublicUrl(path);
      const newUrl = `${publicUrl}?v=${Date.now()}`;
      set('profile_image_url', newUrl);
      // DB に即時反映（fire-and-forget）
      void supabase.rpc('upsert_craftsman_profile', {
        p_user_id:                userId,
        p_email:                  form.email || null,
        p_shop_name:              form.shop_name,
        p_full_name:              form.full_name,
        p_service_area:           form.service_area,
        p_radius_km:              form.radius_km,
        p_supported_prefectures:  form.supported_prefectures,
        p_work_types:             form.work_types,
        p_specialty:              form.specialty,
        p_available_weekdays:     form.available_weekdays,
        p_notification_enabled:   form.notification_enabled,
        p_profile_image_url:      newUrl,
        p_age:                    form.age !== '' ? Number(form.age) : null,
        p_experience_years:       form.experience_years !== '' ? Number(form.experience_years) : null,
        p_bio:                    form.bio || null,
        p_available_time:         form.available_time || null,
        p_has_car:                form.has_car,
        p_has_tools:              form.has_tools,
        p_public_profile_enabled: form.public_profile_enabled,
      });
    } catch (err: unknown) {
      console.error(err);
      setAvatarError('アップロードに失敗しました。もう一度お試しください。');
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── 施工事例アップロード ──────────────────────────────────────────────────────
  async function handleWorksChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (works.length >= 4) {
      setWorksError('施工事例は最大4枚までです。削除してから追加してください。');
      return;
    }
    setWorksUploading(true);
    setWorksError(null);
    try {
      const compressed = await compressImage(file, 1600, 0.82);
      const ext  = compressed.type.includes('webp') ? 'webp' : 'jpg';
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('craftsman-works')
        .upload(path, compressed, { contentType: compressed.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from('craftsman-works')
        .getPublicUrl(path);
      const { data: row, error: dbErr } = await supabase
        .from('craftsman_works')
        .insert({ craftsman_id: userId, image_url: publicUrl, sort_order: works.length })
        .select('id, image_url, caption, sort_order')
        .single();
      if (dbErr) throw dbErr;
      setWorks(prev => [...prev, row as WorkItem]);
    } catch (err: unknown) {
      console.error(err);
      // DBトリガーエラー（4枚制限）を検知
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('施工事例は最大4枚') || msg.includes('P0001')) {
        setWorksError('施工事例は最大4枚までです。削除してから追加してください。');
      } else {
        setWorksError('アップロードに失敗しました。もう一度お試しください。');
      }
    } finally {
      setWorksUploading(false);
    }
  }

  // ── 施工事例削除 ──────────────────────────────────────────────────────────────
  async function handleWorkDelete(workId: string) {
    const work = works.find(w => w.id === workId);
    if (!work) return;
    // Optimistic update
    setWorks(prev => prev.filter(w => w.id !== workId));
    // DB delete
    await supabase.from('craftsman_works').delete().eq('id', workId);
    // Storage delete (best-effort)
    const marker = '/object/public/craftsman-works/';
    const idx = work.image_url.indexOf(marker);
    if (idx >= 0) {
      const storagePath = work.image_url.slice(idx + marker.length).split('?')[0];
      void supabase.storage.from('craftsman-works').remove([storagePath]);
    }
  }

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
          <div className="flex items-center gap-2">
            <a href="/craftsman/jobs" className="text-xs text-blue-600 font-semibold hover:underline">
              ← 案件一覧
            </a>
            <button
              onClick={() => setShowLogout(true)}
              className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition"
            >
              ログアウト
            </button>
            {showLogout && (
              <LogoutConfirmModal
                onConfirm={() => { setShowLogout(false); logout(); localStorage.clear(); navigate('/login'); }}
                onCancel={() => setShowLogout(false)}
              />
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-36">

        {/* エラーバナー */}
        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-semibold">
            {error}
          </div>
        )}

        {/* 保存成功バナー（ページ内・スクロール位置に依存しない固定トースト） */}

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
              <p className="text-lg font-extrabold text-slate-900 leading-tight">{contractedCount}件</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] text-slate-400">レビュー待ち</p>
              {reviewPendingCount > 0 ? (
                <p className="text-lg font-extrabold text-amber-500 leading-tight">{reviewPendingCount}件</p>
              ) : (
                <p className="text-sm font-bold text-slate-400 leading-tight mt-0.5">なし</p>
              )}
            </div>
          </div>
          {reviewPendingCount > 0 && (
            <div className="mt-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs font-bold text-amber-700">
                ⭐ {reviewPendingCount}件のレビューが待っています —
                <a href="/craftsman/applications" className="underline ml-1">応募管理から確認 →</a>
              </p>
            </div>
          )}
          <p className={`text-xs text-blue-600 font-semibold ${reviewPendingCount > 0 ? 'mt-2' : 'mt-2.5'}`}>
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

          <Field label="対応都道府県（複数選択可）">
            <div className="space-y-1">
              {REGION_PREFECTURES.map(({ region, prefs }) => {
                const isOpen    = openRegions.has(region);
                const selected  = prefs.filter(p => form.supported_prefectures.includes(p));
                const toggleRegion = () =>
                  setOpenRegions(prev => {
                    const next = new Set(prev);
                    next.has(region) ? next.delete(region) : next.add(region);
                    return next;
                  });
                return (
                  <div key={region} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={toggleRegion}
                      className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700">{region}</span>
                        {selected.length > 0 && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 leading-none">
                            {selected.length}
                          </span>
                        )}
                      </div>
                      <svg
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-3 py-2.5 flex flex-wrap gap-1.5 bg-white">
                        {prefs.map(pref => {
                          const active = form.supported_prefectures.includes(pref);
                          return (
                            <button
                              key={pref}
                              type="button"
                              onClick={() => set('supported_prefectures', toggle(form.supported_prefectures, pref))}
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                                active
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                              }`}
                            >
                              {pref}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              選択した都道府県の案件が通知対象になります
            </p>
          </Field>

          <Field label="拠点エリア（市区町村・任意）">
            <input
              type="text"
              value={form.service_area}
              onChange={e => set('service_area', e.target.value)}
              placeholder="例：群馬県太田市"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              より詳細な拠点情報として保存されます（公開プロフィールに表示）
            </p>
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

          {/* プロフィール写真 */}
          <Field label="プロフィール写真">
            <div className="flex items-center gap-4">
              {/* タップで画像選択 */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="relative w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 active:opacity-75 disabled:opacity-60 transition"
              >
                {form.profile_image_url ? (
                  <img
                    src={form.profile_image_url}
                    alt="プロフィール写真"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-3xl font-extrabold text-slate-400">{avatarLetter}</span>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 flex items-center justify-center py-1">
                  {avatarUploading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="text-[9px] font-bold text-white">変更</span>
                  )}
                </div>
              </button>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-700 mb-1.5">📷 顔写真があると安心感UP ⬆️</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ✅ スマホで撮影OK<br />
                  ✅ 写真は自動で軽量化されます<br />
                  ✅ そのままスマホ写真を選んでOK
                </p>
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {avatarError && (
              <p className="mt-2 text-xs text-red-600 font-semibold bg-red-50 rounded-xl px-3 py-2">
                {avatarError}
              </p>
            )}
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

        {/* ── 施工事例 ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            施工事例
          </p>
          <p className="text-[11px] text-slate-400 mb-3">最大4枚 · 依頼者の参考になります</p>

          {/* ヒントバナー */}
          <div className="mb-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
            <p className="text-xs font-bold text-amber-700">
              💡 施工前後・得意な工事を載せると依頼が増えやすくなります
            </p>
            <p className="text-[11px] text-amber-600 mt-1">
              ✅ そのままスマホ写真を選んでOK　·　写真は自動で軽量化されます
            </p>
          </div>

          {/* グリッド */}
          <div className="grid grid-cols-2 gap-2">
            {works.map(work => (
              <div
                key={work.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
              >
                <img
                  src={work.image_url}
                  alt="施工事例"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => handleWorkDelete(work.id)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center active:opacity-70 transition"
                  aria-label="削除"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}

            {works.length < 4 && (
              <button
                type="button"
                onClick={() => worksInputRef.current?.click()}
                disabled={worksUploading}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 transition active:opacity-70 disabled:opacity-50"
              >
                {worksUploading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                    <span className="text-[11px] text-slate-400">処理中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                    <span className="text-[11px] text-slate-400 font-semibold">写真を追加</span>
                    <span className="text-[10px] text-slate-300">{works.length}/4</span>
                  </>
                )}
              </button>
            )}
          </div>

          <input
            ref={worksInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleWorksChange}
          />

          {worksError && (
            <p className="mt-2 text-xs text-red-600 font-semibold bg-red-50 rounded-xl px-3 py-2">
              {worksError}
            </p>
          )}
        </div>

        {/* サポート */}
        <div className="mt-2 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3.5">
          <p className="text-xs font-bold text-slate-600 mb-2.5">サポート</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {[
              { label: 'よくある質問', href: '/faq' },
              { label: 'お問い合わせ', href: '/support' },
              { label: '不適切・外部誘導を報告', href: '/support?type=report' },
              { label: '利用規約',     href: '/terms' },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="text-xs text-blue-600 hover:underline font-medium">
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* ログアウト */}
        <div className="mt-2 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-600">ログアウト</p>
            <p className="text-[11px] text-slate-400 mt-0.5">このデバイスからアカウントを切り替えます</p>
          </div>
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            className="flex-shrink-0 bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-600 text-xs font-bold px-3.5 py-2 rounded-xl transition active:scale-95"
          >
            ログアウト
          </button>
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

      {/* 保存成功トースト（画面下部固定） */}
      {saved && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg shadow-green-900/20 pointer-events-none">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          プロフィールを保存しました
        </div>
      )}
    </div>
  );
}
