import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import JobsListView from './JobsListView';
import JobsSwipeView from './JobsSwipeView';
import BottomNav from '../../components/BottomNav';
import CraftsmanWelcomeModal from '../../components/CraftsmanWelcomeModal';

// ─── Job type（子コンポーネントで import して使う）────────────────────────────

export type RoomInfo = {
  name: string;
  workType: string;
  size: string;
  condition?: string[];
};

export type JobMeta = {
  rooms?: RoomInfo[];
  extra_info?: {
    furniture?: string;
    parking?: string;
    material?: string[];
    condition?: string[];
    timing?: string;
    memo?: string;
  };
};

export type Job = {
  id: string;
  work_type?: string;
  city?: string;
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
  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>('video');
  const [isDemo,  setIsDemo]  = useState(false);

  // ── 登録直後だけ表示するウェルカムモーダル（PR1の justRegistered 経路） ──
  // useState の lazy initializer でマウント時に1度だけ評価する。re-render
  // しても再判定されないため、モーダルを閉じた後に「既存職人」状態に戻っても
  // 同セッションで再表示されない。
  const location = useLocation();
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    const justRegistered = (location.state as any)?.justRegistered === true;
    const alreadyWelcomed = typeof window !== 'undefined'
      && localStorage.getItem('craftsman_welcomed') !== null;
    return justRegistered && !alreadyWelcomed;
  });
  const dismissWelcome = useCallback(() => {
    try {
      localStorage.setItem('craftsman_welcomed', new Date().toISOString());
    } catch { /* localStorage unavailable */ }
    setShowWelcome(false);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('estimate_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setJobs(DEMO_JOBS);
        setIsDemo(true);
      } else {
        setJobs(data as Job[]);
      }
      setLoading(false);
    })();
  }, []);

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

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">職人向け案件</p>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                空き日に入れる近場の仕事
              </h1>
            </div>
            {!loading && (
              <div className="text-right">
                <p className="text-[11px] text-slate-400">{jobs.length}件の案件</p>
                {videoCount > 0 && (
                  <p className="text-[11px] font-bold text-blue-600">動画 {videoCount}件</p>
                )}
              </div>
            )}
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
          <JobsListView jobs={jobs} loading={loading} />
        ) : (
          <JobsSwipeView jobs={jobs} />
        )}
      </div>

      <BottomNav variant="flex" />

      {/* 登録直後の初回ウェルカム（既存職人・直接URL訪問では出ない） */}
      {showWelcome && <CraftsmanWelcomeModal onClose={dismissWelcome} />}
    </div>
  );
}
