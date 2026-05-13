import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Job = {
  id: string;
  created_at: string;
  area: string | null;
  work_type: string | null;
  contact_method: string | null;
  status: string | null;
  video_url: string | null;
  room_type: string | null;
  size_note: string | null;
  timing: string | null;
  site_condition: string | null;
  desire_type: string | null;
  memo: string | null;
  // optional extended fields (gracefully handled if absent)
  distance_km?: number | null;
  has_photo?: boolean | null;
  has_drawing?: boolean | null;
  urgency_level?: number | null;
  photo_url?: string | null;
};

type ApplyState = 'idle' | 'loading' | 'done' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Derived scores (computed locally so no DB schema change required)
// ─────────────────────────────────────────────────────────────────────────────

function difficultyScore(job: Job): number {
  let score = 2;
  if (job.work_type === '床工事') score = 4;
  else if (job.work_type === 'クロス張り替え') score = 3;
  else if (job.work_type === 'クロス補修') score = 2;
  else if (job.work_type === 'その他相談') score = 1;

  if (job.site_condition?.includes('ひどい') || job.site_condition?.includes('損傷')) score += 1;
  if (job.size_note?.includes('10畳') || job.size_note?.includes('12畳') || job.size_note?.includes('LDK')) score += 1;
  return Math.min(5, Math.max(1, score));
}

function priorityScore(job: Job): number {
  let score = 2;
  if (job.timing === '急ぎ') score = 5;
  else if (job.timing === '1週間以内') score = 4;
  else if (job.timing === '今月中') score = 3;
  if (job.video_url) score = Math.min(5, score + 1);
  return score;
}

function isUrgentTiming(timing: string | null): boolean {
  return timing === '急ぎ' || timing === '1週間以内';
}

function sortKey(job: Job): number {
  const urgent = isUrgentTiming(job.timing) ? 10000 : 0;
  const video  = job.video_url ? 1000 : 0;
  const dist   = job.distance_km != null ? -job.distance_km * 10 : -500;
  return urgent + video + dist;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const WORK_ICON: Record<string, string> = {
  'クロス張り替え': '🧱',
  'クロス補修':     '🔧',
  '床工事':         '🪵',
  'その他相談':     '💬',
};

const TIMING_CONFIG: Record<string, { label: string; cls: string; urgent: boolean }> = {
  '急ぎ':       { label: '⚡ 急ぎ',       cls: 'bg-red-500 text-white',          urgent: true  },
  '1週間以内':  { label: '🔔 1週間以内',  cls: 'bg-orange-500 text-white',        urgent: true  },
  '今月中':     { label: '📅 今月中',     cls: 'bg-amber-100 text-amber-700',     urgent: false },
  '相談したい': { label: '💭 相談',       cls: 'bg-slate-100 text-slate-500',     urgent: false },
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function formatElapsed(iso: string): string {
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 1)  return `${Math.floor(h * 60)}分前`;
  if (h < 24) return `${Math.floor(h)}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreDots — 難易度・優先度の●●●○○ 表示
// ─────────────────────────────────────────────────────────────────────────────

function ScoreDots({ score, max = 5, color }: { score: number; max?: number; color: string }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full ${i < score ? color : 'bg-slate-200'}`}
        />
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoModal
// ─────────────────────────────────────────────────────────────────────────────

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          閉じる
        </button>
        <video
          src={url}
          controls autoPlay playsInline preload="metadata"
          className="w-full rounded-2xl bg-black shadow-2xl"
          style={{ maxHeight: '75vh' }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ApplyButton
// ─────────────────────────────────────────────────────────────────────────────

function ApplyButton({ jobId, alreadyApplied }: { jobId: string; alreadyApplied: boolean }) {
  const [state, setState] = useState<ApplyState>(alreadyApplied ? 'done' : 'idle');

  const handleApply = useCallback(async () => {
    if (state !== 'idle') return;
    setState('loading');
    try {
      const storedUser = localStorage.getItem('user');
      const craftsmanId = storedUser ? JSON.parse(storedUser).id : null;
      const { error } = await supabase.from('job_applications').insert({
        estimate_request_id: jobId,
        craftsman_id: craftsmanId,
        status: 'applied',
      });
      if (error) throw error;
      setState('done');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [jobId, state]);

  if (state === 'done') {
    return (
      <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-bold">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
        応募済み
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold">
        送信エラー。再度お試しください
      </div>
    );
  }

  return (
    <button
      onClick={handleApply}
      disabled={state === 'loading'}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-extrabold shadow-sm shadow-blue-200 transition-all disabled:opacity-60"
    >
      {state === 'loading' ? (
        <>
          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          送信中...
        </>
      ) : (
        <>
          対応できます
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JobCard — 3秒判断カード
// ─────────────────────────────────────────────────────────────────────────────

function JobCard({
  job,
  appliedIds,
  onPlayVideo,
}: {
  job: Job;
  appliedIds: Set<string>;
  onPlayVideo: (url: string) => void;
}) {
  const [memoOpen, setMemoOpen] = useState(false);
  const icon     = job.work_type ? (WORK_ICON[job.work_type] ?? '🏠') : '🏠';
  const timing   = job.timing ? TIMING_CONFIG[job.timing] : null;
  const urgent   = isUrgentTiming(job.timing);
  const diff     = difficultyScore(job);
  const prio     = priorityScore(job);
  const hasVideo = !!job.video_url;
  const hasPhoto = job.has_photo ?? !!job.photo_url;
  const hasDrawing = job.has_drawing ?? false;

  return (
    <div className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
      urgent ? 'border-orange-300 shadow-orange-100' : 'border-slate-200'
    }`}>

      {/* 急ぎバナー */}
      {urgent && (
        <div className={`px-4 py-1.5 text-xs font-extrabold tracking-wide flex items-center gap-1.5 ${
          job.timing === '急ぎ'
            ? 'bg-red-500 text-white'
            : 'bg-orange-500 text-white'
        }`}>
          {job.timing === '急ぎ' ? (
            <>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              今すぐ対応できる職人を探しています
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              1週間以内に対応できる方を募集中
            </>
          )}
        </div>
      )}

      <div className="p-4">

        {/* ── 1行目：アイコン・工事内容・距離・経過時間 ── */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl border ${
            urgent ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-100'
          }`}>
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[15px] font-extrabold text-slate-900 leading-snug">
                {job.work_type || '施工内容未定'}
              </span>
              {hasVideo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 flex-shrink-0">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  動画あり
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                {job.area || 'エリア未記入'}
              </span>
              {job.distance_km != null && (
                <span className="font-semibold text-blue-600">
                  📍 {job.distance_km < 1 ? `${Math.round(job.distance_km * 1000)}m` : `${job.distance_km.toFixed(1)}km`}
                </span>
              )}
              <span className="ml-auto text-[10px] text-slate-300">{formatElapsed(job.created_at)}</span>
            </div>
          </div>
        </div>

        {/* ── 2行目：3つのキー情報 ── */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {/* 希望時期 */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2 text-center min-w-0">
            <p className="text-[8px] font-bold text-slate-400 mb-1">希望時期</p>
            {timing ? (
              <span className={`inline-block text-[10px] font-extrabold leading-tight px-1.5 py-0.5 rounded-lg ${timing.cls}`}>
                {timing.urgent ? (job.timing === '急ぎ' ? '⚡ 急ぎ' : '🔔 1週間') : (job.timing === '今月中' ? '📅 今月中' : '💭 相談')}
              </span>
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>

          {/* 部屋サイズ */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2 text-center min-w-0">
            <p className="text-[8px] font-bold text-slate-400 mb-1">部屋サイズ</p>
            <p className="text-[12px] font-extrabold text-slate-700 leading-none truncate">
              {job.size_note || '—'}
            </p>
          </div>

          {/* 汚れ・傷レベル */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2 text-center min-w-0">
            <p className="text-[8px] font-bold text-slate-400 mb-1">状態</p>
            <p className="text-[10px] font-bold text-slate-600 leading-tight line-clamp-2">
              {job.site_condition || '—'}
            </p>
          </div>
        </div>

        {/* ── 3行目：難易度・優先度スコア ── */}
        <div className="flex items-center gap-3 mb-3 px-1 flex-wrap">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-[10px] font-bold text-slate-400 shrink-0">難易度</span>
            <ScoreDots score={diff} color="bg-slate-400" />
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-[10px] font-bold text-slate-400 shrink-0">優先度</span>
            <ScoreDots score={prio} color="bg-blue-500" />
          </div>
          {/* メディアバッジ */}
          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
            <MediaBadge active={hasVideo} label="動画" />
            <MediaBadge active={hasPhoto} label="写真" />
            <MediaBadge active={hasDrawing} label="図面" />
          </div>
        </div>

        {/* ── 判断メモ ── */}
        {job.memo && (
          <div className="mb-3">
            <button
              onClick={() => setMemoOpen(v => !v)}
              className="w-full text-left rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5 flex items-start gap-2 transition-colors hover:bg-blue-100/60"
            >
              <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-blue-600 mb-0.5">判断メモ</p>
                <p className={`text-xs text-slate-600 leading-relaxed ${memoOpen ? '' : 'line-clamp-2'}`}>
                  {job.memo}
                </p>
              </div>
              <svg className={`w-3.5 h-3.5 text-blue-400 flex-shrink-0 transition-transform mt-0.5 ${memoOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── アクションエリア ── */}
        <div className="flex items-center gap-2">
          {/* 動画ボタン */}
          {hasVideo && (
            <button
              onClick={() => onPlayVideo(job.video_url!)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all active:scale-95"
            >
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              動画
            </button>
          )}

          {/* 対応できますボタン */}
          <div className="flex-1">
            <ApplyButton jobId={job.id} alreadyApplied={appliedIds.has(job.id)} />
          </div>
        </div>

        {/* 受付番号 */}
        <p className="mt-2 text-right text-[9px] text-slate-200 font-mono select-none">
          #{String(job.id).slice(0, 8)}
        </p>
      </div>
    </div>
  );
}

function MediaBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border ${
      active
        ? 'bg-blue-50 text-blue-600 border-blue-200'
        : 'bg-slate-50 text-slate-300 border-slate-100'
    }`}>
      {active ? '✓' : '✗'} {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo data
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_JOBS: Job[] = [
  {
    id: 'demo-0001-0000-0000-000000000001',
    created_at: new Date(Date.now() - 1_800_000).toISOString(),
    area: '渋谷区恵比寿',
    work_type: 'クロス張り替え',
    contact_method: 'LINE',
    status: 'new',
    video_url: 'https://sample.com/demo.mp4',
    room_type: 'リビング',
    size_note: '8畳',
    timing: '急ぎ',
    site_condition: '汚れひどい',
    desire_type: 'できるだけ費用を抑えたい',
    memo: '引越し前に急ぎで仕上げたい。壁全体がくすんでいて一部に傷もあります。できれば今週中にお願いしたいです。',
    distance_km: 1.2,
    has_photo: true,
  },
  {
    id: 'demo-0002-0000-0000-000000000002',
    created_at: new Date(Date.now() - 7_200_000).toISOString(),
    area: '目黒区自由が丘',
    work_type: '床工事',
    contact_method: 'メール',
    status: 'new',
    video_url: null,
    room_type: '洋室',
    size_note: '6畳',
    timing: '1週間以内',
    site_condition: '傷あり・部分的',
    desire_type: '見た目をきれいにしたい',
    memo: null,
    distance_km: 3.5,
    has_photo: false,
  },
  {
    id: 'demo-0003-0000-0000-000000000003',
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    area: '品川区大崎',
    work_type: 'クロス補修',
    contact_method: '電話',
    status: 'new',
    video_url: 'https://sample.com/demo2.mp4',
    room_type: '寝室',
    size_note: '4.5畳',
    timing: '今月中',
    site_condition: '部分的な傷',
    desire_type: '提案してほしい（よく分からない）',
    memo: '子供が壁を傷つけてしまいました。部分補修か全体張り替えか相談したいです。',
    distance_km: null,
    has_photo: true,
    has_drawing: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main: ProJobs
// ─────────────────────────────────────────────────────────────────────────────

export default function ProJobs() {
  const [jobs,      setJobs]      = useState<Job[]>([]);
  const [isDemo,    setIsDemo]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [errMsg,    setErrMsg]    = useState<string | null>(null);
  const [videoUrl,  setVideoUrl]  = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [workFilter, setWorkFilter] = useState<string>('all');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('estimate_requests')
        .select(
          'id, created_at, area, work_type, contact_method, status, video_url, room_type, size_note, timing, site_condition, desire_type, memo'
        )
        .eq('status', 'new')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ProJobs] fetch error:', error);
        setErrMsg('案件の取得に失敗しました。時間をおいて再度お試しください。');
      } else if (!data || data.length === 0) {
        setJobs(DEMO_JOBS);
        setIsDemo(true);
      } else {
        setJobs(data);
      }
      setLoading(false);
    })();
  }, []);

  // 既存の応募IDを取得
  useEffect(() => {
    (async () => {
      const storedUser = localStorage.getItem('user');
      const craftsmanId = storedUser ? JSON.parse(storedUser).id : null;
      if (!craftsmanId) return;
      const { data } = await supabase
        .from('job_applications')
        .select('estimate_request_id')
        .eq('craftsman_id', craftsmanId);
      if (data) {
        setAppliedIds(new Set(data.map((r: { estimate_request_id: string }) => r.estimate_request_id)));
      }
    })();
  }, []);

  const workTypes = useMemo(() => {
    const set = new Set(jobs.map(j => j.work_type).filter(Boolean) as string[]);
    return Array.from(set);
  }, [jobs]);

  const displayJobs = useMemo(() => {
    let list = workFilter === 'all' ? jobs : jobs.filter(j => j.work_type === workFilter);
    if (showUrgentOnly) list = list.filter(j => isUrgentTiming(j.timing));
    return [...list].sort((a, b) => sortKey(b) - sortKey(a));
  }, [jobs, workFilter, showUrgentOnly]);

  const urgentCount = jobs.filter(j => isUrgentTiming(j.timing)).length;
  const videoCount  = jobs.filter(j => j.video_url).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-200">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <div>
              <span className="text-sm font-extrabold text-slate-900 leading-none">案件ボード</span>
              {!loading && !errMsg && (
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                  {jobs.length}件の新規案件
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {urgentCount > 0 && (
              <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold whitespace-nowrap animate-pulse">
                ⚡{urgentCount}件
              </span>
            )}
            {videoCount > 0 && (
              <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 whitespace-nowrap">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                動画{videoCount}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-24">

        {/* ── デモバナー ── */}
        {isDemo && (
          <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5">
            <span className="text-amber-500 text-base leading-none mt-0.5">📋</span>
            <div>
              <p className="text-xs font-bold text-amber-700">デモ表示中</p>
              <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed">
                案件が0件のためサンプルを表示しています。実際の案件が登録されると自動的に切り替わります。
              </p>
            </div>
          </div>
        )}

        {/* ── ヒーローバナー ── */}
        <div className="mb-5 rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-5 shadow-md shadow-blue-200">
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Craftsman Board</p>
          <h1 className="text-lg font-extrabold text-white mb-1 leading-tight">
            近くの案件をすぐ確認・応募
          </h1>
          <p className="text-xs text-blue-100 leading-relaxed">
            動画・写真で現場を事前確認。3秒で判断して「対応できます」を押すだけ。
          </p>
        </div>

        {/* ── フィルターバー ── */}
        {!loading && !errMsg && (
          <div className="space-y-2 mb-5">
            {/* 急ぎトグル */}
            {urgentCount > 0 && (
              <button
                onClick={() => setShowUrgentOnly(v => !v)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  showUrgentOnly
                    ? 'bg-red-500 text-white border-red-500 shadow-sm'
                    : 'bg-white text-red-500 border-red-200 hover:bg-red-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  今日・明日対応の急ぎ案件のみ表示
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                  showUrgentOnly ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                }`}>
                  {urgentCount}件
                </span>
              </button>
            )}

            {/* 施工内容フィルタ */}
            {workTypes.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                <FilterChip
                  label={`すべて（${jobs.length}）`}
                  active={workFilter === 'all'}
                  onClick={() => setWorkFilter('all')}
                />
                {workTypes.map(wt => (
                  <FilterChip
                    key={wt}
                    label={`${WORK_ICON[wt] ?? ''} ${wt}（${jobs.filter(j => j.work_type === wt).length}）`}
                    active={workFilter === wt}
                    onClick={() => setWorkFilter(wt)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ソート説明 ── */}
        {!loading && !errMsg && displayJobs.length > 0 && (
          <p className="mb-3 text-[10px] text-slate-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
            </svg>
            急ぎ順・動画あり優先・距離近い順で表示
          </p>
        )}

        {/* ── ローディング ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">案件を読み込み中...</p>
          </div>
        )}

        {/* ── エラー ── */}
        {errMsg && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-5 text-center">
            <p className="text-2xl mb-2">😞</p>
            <p className="text-sm font-bold text-red-600">{errMsg}</p>
          </div>
        )}

        {/* ── 案件なし ── */}
        {!loading && !errMsg && displayJobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <span className="text-5xl">📭</span>
            <p className="text-base font-bold text-slate-700">
              {showUrgentOnly ? '急ぎ案件は現在ありません' : '現在、新規案件はありません'}
            </p>
            <p className="text-sm text-slate-400">新しい依頼が届き次第、こちらに表示されます</p>
            {showUrgentOnly && (
              <button
                onClick={() => setShowUrgentOnly(false)}
                className="mt-2 text-sm text-blue-600 font-semibold underline"
              >
                すべての案件を見る
              </button>
            )}
          </div>
        )}

        {/* ── 案件カード一覧 ── */}
        {!loading && !errMsg && displayJobs.length > 0 && (
          <div className="space-y-4">
            {displayJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                appliedIds={appliedIds}
                onPlayVideo={setVideoUrl}
              />
            ))}
          </div>
        )}

        {/* ── フッター ── */}
        {!loading && !errMsg && (
          <p className="mt-10 text-center text-xs text-slate-300 leading-relaxed">
            表示しているのは新規受付中の案件のみです。<br />
            お客様の連絡先は管理者を通じてご案内します。
          </p>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
        active
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
      }`}
    >
      {label}
    </button>
  );
}
