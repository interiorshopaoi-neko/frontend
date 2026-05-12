import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import JobsListView from './JobsListView';
import JobsSwipeView from './JobsSwipeView';
import BottomNav from '../../components/BottomNav';
import CraftsmanWelcomeModal from '../../components/CraftsmanWelcomeModal';

// ─── WelcomeModal 再表示防止キー（ユーザー別）────────────────────────────────
// localStorage.user は useAuth が書く {id, name, email, role} の JSON 文字列。
// useState lazy initializer は同期実行のため Supabase の非同期 session は使えないが、
// localStorage からは同期で user.id を取得できる。
function getStoredUserId(): string | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as { id?: string }).id ?? null : null;
  } catch { return null; }
}
function welcomeKey(userId: string | null): string {
  return userId ? `craftsman_welcomed_${userId}` : 'craftsman_welcomed';
}

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
  area?: string;
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
  /** DEMOデータ用: 「他N人が検討中」表示。実DBには存在しないため optional */
  viewer_count?: number;
};

// ─── Demo data ────────────────────────────────────────────────────────────────
// 過疎感を消すため、初期表示時に「他の職人も動いている」雰囲気を出す。
// created_at は読み込み時から相対計算するため毎回「○分前」が新鮮に見える。

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const DEMO_JOBS: Job[] = [
  {
    id: 'demo-1',
    work_type: 'クロス張替え',
    area: '太田市',
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
    created_at: minutesAgo(2),       // 2分前
    viewer_count: 3,
  },
  {
    id: 'demo-2',
    work_type: '床補修',
    area: '伊勢崎市',
    room_size: '8畳',
    damage_level: 'middle',
    urgency: 'tomorrow',
    preferred_date: '明日',
    distance_km: 6.5,
    has_video: true,
    has_photos: true,
    has_floor_plan: true,
    customer_note: 'クッションフロアの一部めくれ。',
    video_url: undefined,
    created_at: minutesAgo(5),       // 5分前
    viewer_count: 5,
  },
  {
    id: 'demo-3',
    work_type: 'クロス補修',
    area: '前橋市',
    room_size: '4.5畳',
    damage_level: 'low',
    urgency: 'today',
    preferred_date: '今日',
    distance_km: 7.1,
    has_video: true,
    has_photos: true,
    has_floor_plan: false,
    customer_note: '天井に染みあり。部分補修希望。',
    created_at: minutesAgo(0.4),     // たった今
    viewer_count: 2,
  },
  {
    id: 'demo-4',
    work_type: 'クロス張替え',
    area: '高崎市',
    room_size: '10畳',
    damage_level: 'high',
    urgency: 'soon',
    preferred_date: '3日以内',
    distance_km: 9.3,
    has_video: true,
    has_photos: true,
    has_floor_plan: false,
    customer_note: '退去後の原状回復。広めの部屋。',
    created_at: minutesAgo(12),      // 12分前
    viewer_count: 4,
  },
  {
    id: 'demo-5',
    work_type: '床工事',
    area: '桐生市',
    room_size: '12畳',
    damage_level: 'middle',
    urgency: 'normal',
    preferred_date: '来週中',
    distance_km: 14.2,
    has_video: false,
    has_photos: true,
    customer_note: 'リビングの全面張替え。',
    created_at: minutesAgo(60),      // 1時間前
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
  // realJobs は実 estimate_requests 取得結果のみを保持する（DEMO_JOBS は混ぜない）。
  // 描画用の jobs / isDemo は下の useMemo で realJobs から派生させ、
  // 「実案件 0 件のときだけ DEMO_JOBS を表示」「1 件以上あれば demo を完全非表示」
  // の規則を 1 箇所で表現する。これにより demo と実データが混ざる状態を作れない。
  const [realJobs, setRealJobs] = useState<Job[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>('video');

  // ── 登録直後だけ表示するウェルカムモーダル（PR1の justRegistered 経路） ──
  // useState の lazy initializer でマウント時に1度だけ評価する。re-render
  // しても再判定されないため、モーダルを閉じた後に「既存職人」状態に戻っても
  // 同セッションで再表示されない。
  const location = useLocation();
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    const justRegistered = (location.state as any)?.justRegistered === true;
    const alreadyWelcomed = typeof window !== 'undefined'
      && localStorage.getItem(welcomeKey(getStoredUserId())) !== null;
    return justRegistered && !alreadyWelcomed;
  });
  const dismissWelcome = useCallback(() => {
    try {
      localStorage.setItem(welcomeKey(getStoredUserId()), new Date().toISOString());
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

      // error / 取得失敗は「実案件 0 件」と等価に扱う（既存の demo フォールバック動作と整合）。
      if (error || !data) {
        setRealJobs([]);
      } else {
        setRealJobs(data as Job[]);
      }
      setLoading(false);
    })();
  }, []);

  // ── demo / real 切替の単一の真実 ────────────────────────────────────────
  // hasRealJobs ? realJobs : DEMO_JOBS。両者が混ざることはない。
  const hasRealJobs = realJobs.length > 0;
  const jobs        = hasRealJobs ? realJobs : DEMO_JOBS;
  const isDemo      = !loading && !hasRealJobs;
  const videoCount  = jobs.filter((j) => j.has_video || j.video_url).length;

  return (
    <div className="flex flex-col bg-slate-50" style={{ height: '100dvh' }}>

      {/* ── LIVEバー（過疎感を消すための「動いてる感」演出） ── */}
      <div className="flex-shrink-0 bg-slate-900 text-white px-4 py-1.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-black tracking-[0.18em] text-emerald-400">LIVE</span>
          {/* Phase5: realJobs 有無を一瞥で示す状態バッジ。デザインは LIVE バー全体の
              「過疎感を消す」目的を壊さないよう、テキスト1要素・ピル形・小サイズ。 */}
          {!loading && (hasRealJobs
            ? <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">リアル案件</span>
            : <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/30">DEMO表示中</span>
          )}
        </div>
        <p className="text-[11px] text-white/85 font-semibold">
          本日 <span className="font-black text-white">12件</span>の動画案件が公開されています
        </p>
      </div>

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
