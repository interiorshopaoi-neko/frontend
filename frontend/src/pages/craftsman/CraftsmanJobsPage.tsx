import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import JobsListView from './JobsListView';
import JobsSwipeView from './JobsSwipeView';
import BottomNav from '../../components/BottomNav';
import JobsLockedPreview from '../../components/JobsLockedPreview';
import { FEE_TABLE } from '../../constants/fees';

// ─── Job type（子コンポーネントで import して使う）────────────────────────────

export type RoomInfo = {
  name: string;
  workType: string;
  size: string;
  condition?: string[];
  materialPref?: string;
};

export type RoomAdditionalEntry = {
  roomName:         string;
  workType?:        string;
  productNumber?:   string;
  note?:            string;
  photos?:          string[];
  videoUrl?:        string;
  addedByCustomer?: boolean;
};

export type JobMeta = {
  rooms?: RoomInfo[];
  roomMedia?: Array<{ roomId: string; roomName: string; videos: string[]; images: string[] }>;
  roomAdditionalInfo?: Record<string, RoomAdditionalEntry>;
  extraInfo?: {
    productNumber?: string;
    productUrl?: string;
    accentPreference?: string;
    softSokibariPreference?: string;
    note?: string;
    images?: string[];
  };
  extra_info?: {
    furniture?: string;
    parking?: string;
    material?: string[];
    condition?: string[];
    timing?: string;
    memo?: string;
  };
  thumbnail_url?: string;
  wallpaper_preference?: string;
  wallpaper_accent_preferences?: string[];
};

export type Job = {
  id: string;
  work_type?: string;
  area?: string;   // DB column name (estimate_requests.area)
  city?: string;   // legacy alias kept for DEMO_JOBS compat
  room_size?: string;
  damage_level?: 'low' | 'middle' | 'high';
  urgency?: 'today' | 'tomorrow' | 'soon' | 'normal';
  preferred_date?: string;
  distance_km?: number;
  has_video?: boolean;
  has_photos?: boolean;
  has_floor_plan?: boolean;
  customer_note?: string;
  video_url?: string;
  created_at?: string;
  meta?: JobMeta | null;
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_JOBS: Job[] = [
  {
    id: 'demo-1',
    work_type: 'クロス張替え',
    city: '太田市',
    room_size: '6畳',
    damage_level: 'low',
    urgency: 'today',
    preferred_date: '今日〜明日',
    distance_km: 4.8,
    has_video: true,
    has_photos: true,
    has_floor_plan: false,
    customer_note: '壁一面に汚れあり。退去後の原状回復。',
    video_url: undefined,
  },
  {
    id: 'demo-2',
    work_type: '床補修',
    city: '伊勢崎市',
    room_size: '8畳',
    damage_level: 'middle',
    urgency: 'soon',
    preferred_date: '3日以内',
    distance_km: 12.3,
    has_video: true,
    has_photos: true,
    has_floor_plan: true,
    customer_note: 'クッションフロアの一部めくれ。',
    video_url: undefined,
  },
  {
    id: 'demo-3',
    work_type: 'クロス補修',
    city: '前橋市',
    room_size: '4.5畳',
    damage_level: 'low',
    urgency: 'normal',
    preferred_date: '来週以降',
    distance_km: 7.1,
    has_video: false,
    has_photos: true,
    has_floor_plan: false,
    customer_note: '天井に染みあり。部分補修希望。',
  },
];

// ─── タブ定義 ─────────────────────────────────────────────────────────────────

type Tab = 'list' | 'video';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'list',  label: '一覧',       icon: '📋' },
  { key: 'video', label: '動画で探す', icon: '▶' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CraftsmanJobsPage() {
  const [jobs,         setJobs]         = useState<Job[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<Tab>('video');
  const [showFeeModal, setShowFeeModal] = useState(false);
  const closeFeeModal = useCallback(() => setShowFeeModal(false), []);
  const [isDemo,     setIsDemo]     = useState(false);
  // 同期的に初期化してフラッシュなしに未認証を検出
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return !!stored && !!JSON.parse(stored).id;
    } catch { return false; }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      setIsLoggedIn(!!stored && !!JSON.parse(stored).id);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // 未認証ならSupabaseアクセス不要
    if (!isLoggedIn) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('estimate_requests')
        .select('*')
        .neq('status', 'hidden')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setJobs(DEMO_JOBS);
        setIsDemo(true);
      } else {
        setJobs(data as Job[]);
      }
      setLoading(false);
    })();
  }, [isLoggedIn]);

  // 未認証 → ロックプレビューのみ（全案件フックは宣言済み）
  if (!isLoggedIn) return <JobsLockedPreview />;

  const videoCount = jobs.filter((j) => j.has_video || j.video_url).length;

  return (
    <div className="flex flex-col bg-slate-50" style={{ height: '100dvh' }}>

      {/* ── ヘッダー ── */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 pt-4 pb-0">
        <div className="max-w-3xl mx-auto">
          {isDemo && (
            <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2">
              <span className="text-amber-500 text-xs">📋</span>
              <p className="text-xs text-amber-700 font-semibold">
                デモ表示中 — 実際の案件が登録されると切り替わります
              </p>
            </div>
          )}
          {!isLoggedIn && !loading && (
            <div className="mb-3 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 flex items-center justify-between gap-2">
              <p className="text-xs text-blue-700 font-semibold">
                🔒 応募するには職人登録が必要です
              </p>
              <a
                href="/register"
                className="flex-shrink-0 text-xs font-extrabold text-white bg-blue-600 rounded-lg px-2.5 py-1 hover:bg-blue-700 transition"
              >
                無料登録
              </a>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">職人向け案件</p>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                空き日に入れる近場の仕事
              </h1>
            </div>
            <div className="flex flex-col items-end gap-1">
              {!loading && (
                <>
                  <p className="text-[11px] text-slate-400">{jobs.length}件の案件</p>
                  {videoCount > 0 && (
                    <p className="text-[11px] font-bold text-blue-600">動画 {videoCount}件</p>
                  )}
                </>
              )}
              <button
                onClick={() => setShowFeeModal(true)}
                className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition whitespace-nowrap"
              >
                手数料について
              </button>
            </div>
          </div>

          {/* タブ */}
          <div className="flex gap-1">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
                  tab === key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="text-base leading-none">{icon}</span>
                {label}
                {key === 'video' && videoCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 leading-none">
                    {videoCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── コンテンツ ── */}
      <div className="flex-1 overflow-hidden">
        {tab === 'list' ? (
          <JobsListView jobs={jobs} loading={loading} isLoggedIn={isLoggedIn} />
        ) : (
          <JobsSwipeView jobs={jobs} isLoggedIn={isLoggedIn} />
        )}
      </div>

      <BottomNav variant="flex" />

      {/* ── 手数料モーダル（ヘッダーボタンから両タブで開く） ── */}
      {showFeeModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={closeFeeModal}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-base font-extrabold text-slate-800">💡 職人向け手数料について</h2>
              <button onClick={closeFeeModal} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
              <ul className="space-y-2">
                {[
                  '応募しただけでは料金は発生しません。',
                  'お客様と成約した場合のみ、成約時点の概算金額に応じて手数料が確定します。',
                  '工事後に金額が増減しても、原則として再計算は行いません。',
                  '工事代金は依頼者と職人が直接やり取りし、PRO MATCHは工事代金を預かりません。',
                ].map(text => (
                  <li key={text} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                    <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
                    {text}
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-extrabold text-slate-700 mb-2">手数料の目安</p>
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  {FEE_TABLE.map(({ label, feeLabel }, i) => (
                    <div
                      key={label}
                      className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                    >
                      <span className="text-sm text-slate-600">{label}</span>
                      <span className="text-sm font-extrabold text-slate-800">{feeLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                ※ 応募は無料です。手数料は成約時のみ発生します。
              </p>
              <button
                onClick={closeFeeModal}
                className="mt-3 w-full py-3 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 transition active:scale-95"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
