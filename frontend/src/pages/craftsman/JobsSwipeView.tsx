import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ApplySuccessModal from '../../components/ApplySuccessModal';
import ConfirmApplyModal from '../../components/ConfirmApplyModal';
import { calculateServiceFee } from '../../lib/serviceFee';
import { getFreshness, FRESHNESS_CLASS } from '../../lib/freshness';
import type { Job } from './CraftsmanJobsPage';

function estimateRevenueNum(job: Job): number {
  const type  = (job.work_type ?? '').toLowerCase();
  const size  = job.room_size ?? '';
  let base = 32000;
  if (type.includes('cf') || type.includes('クッションフロア')) base = 24000;
  else if (type.includes('補修'))  base = 16000;
  else if (type.includes('床'))    base = 34000;
  else if (type.includes('クロス')) base = 32000;
  const m = size.match(/(\d+)/);
  const tatami  = m ? parseInt(m[1]) : 6;
  const sizeMul = tatami >= 10 ? 1.5 : tatami >= 8 ? 1.25 : tatami >= 6 ? 1.0 : 0.8;
  const dmgMul  = job.damage_level === 'high' ? 1.3 : job.damage_level === 'middle' ? 1.1 : 1.0;
  return Math.round((base * sizeMul * dmgMul) / 1000) * 1000;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function estimateRevenue(job: Job): string {
  const base =
    job.work_type === '床補修' || job.work_type === '床工事' ? 30000
    : job.work_type?.includes('クロス') ? 20000
    : 15000;
  const factor =
    job.room_size?.includes('12') ? 2.0
    : job.room_size?.includes('10') ? 1.6
    : job.room_size?.includes('8') ? 1.3
    : 1.0;
  const min = Math.round((base * factor) / 1000) * 1000;
  const max = Math.round((min * 1.5) / 1000) * 1000;
  return `¥${Math.round(min / 10000)}〜${Math.round(max / 10000)}万`;
}

function urgencyConfig(job: Job): { text: string; cls: string } {
  if (job.urgency === 'today')    return { text: '⚡ 今日希望',  cls: 'bg-red-500 text-white' };
  if (job.urgency === 'tomorrow') return { text: '🔔 明日まで',  cls: 'bg-orange-500 text-white' };
  if (job.urgency === 'soon')     return { text: '📅 数日以内',  cls: 'bg-amber-400 text-white' };
  return                                  { text: '💭 急ぎなし',  cls: 'bg-slate-600/80 text-white' };
}

// ─── SwipeSlide ───────────────────────────────────────────────────────────────

type SlideProps = {
  job: Job;
  idx: number;
  total: number;
  applied: boolean;
  submitting: boolean;
  onApply: () => void;
};

function SwipeSlide({ job, idx, total, applied, submitting, onApply }: SlideProps) {
  const slideRef    = useRef<HTMLElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const touchStart  = useRef<{ x: number; y: number } | null>(null);
  const dragXRef    = useRef(0);

  const [dragX,       setDragX]       = useState(0);
  const [isDragging,  setIsDragging]  = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const urgency    = urgencyConfig(job);
  const revenue    = estimateRevenue(job);
  const revNum     = estimateRevenueNum(job);
  const feeNum     = calculateServiceFee(revNum);
  const takeNum    = revNum - feeNum;
  const swipeProgress   = Math.min(1, Math.max(0, dragX / 130));
  const showSlotWarning = job.urgency === 'today' || job.urgency === 'tomorrow';
  const showFirstCome   = job.has_video || job.has_photos;
  const freshness       = job.created_at ? getFreshness(job.created_at) : null;
  const isStale         = freshness?.status === 'urgent';

  // 非passive touchリスナーで水平ドラッグを確実に検知
  useEffect(() => {
    const el = slideRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };

    const onMove = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const t  = e.touches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      if (Math.abs(dx) > Math.abs(dy) && dx > 0) {
        e.preventDefault();
        dragXRef.current = dx;
        setIsDragging(true);
        setDragX(dx);
      }
    };

    const onEnd = () => {
      if (dragXRef.current > 90 && !applied && !submitting) {
        setShowConfirm(true);
      }
      dragXRef.current = 0;
      setDragX(0);
      setIsDragging(false);
      touchStart.current = null;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, submitting]);

  // IntersectionObserver で動画を自動再生
  useEffect(() => {
    const video = videoRef.current;
    const slide = slideRef.current;
    if (!video || !slide) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else { video.pause(); video.currentTime = 0; }
      },
      { threshold: 0.7 },
    );
    observer.observe(slide);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={slideRef}
      style={{
        height: '100%',
        scrollSnapAlign: 'start',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        transform: `translateX(${isDragging ? dragX : 0}px)`,
        transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        willChange: 'transform',
      }}
    >
      {/* 動画 / プレースホルダー */}
      {job.video_url ? (
        <video
          ref={videoRef}
          src={job.video_url}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline muted loop preload="metadata"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black flex items-center justify-center">
          <span className="text-9xl opacity-10 select-none">🎬</span>
        </div>
      )}

      {/* グラデーションマスク */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 35%, transparent 50%, rgba(0,0,0,0.85) 100%)' }}
      />

      {/* 右スワイプ中のグリーンオーバーレイ */}
      {swipeProgress > 0 && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none"
          style={{ background: `rgba(34,197,94,${swipeProgress * 0.75})` }}
        >
          <div
            className="text-white text-center"
            style={{ opacity: swipeProgress, transform: `scale(${0.6 + swipeProgress * 0.4})` }}
          >
            <div className="text-8xl font-extrabold leading-none mb-2">✓</div>
            <p className="text-2xl font-extrabold drop-shadow-lg">今すぐ行けます！</p>
          </div>
        </div>
      )}

      {/* 応募済み状態オーバーレイ */}
      {applied && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="bg-green-500 rounded-3xl px-8 py-5 text-white text-center shadow-2xl">
            <div className="text-4xl mb-1">✓</div>
            <p className="text-lg font-extrabold">応募済み</p>
          </div>
        </div>
      )}

      {/* ── コンテンツ（縦積みレイアウト・overlap なし）── */}
      <div className="absolute inset-0 z-10 flex flex-col">

        {/* 1. 上部：緊急バッジ群 + カウンター */}
        <div className="flex-shrink-0 flex items-start justify-between gap-2 px-4 pt-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold shadow-lg backdrop-blur-sm ${urgency.cls}`}>
              {urgency.text}
            </span>
            {showSlotWarning && (
              <span className="bg-red-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-xl animate-pulse">
                🔥 残り1枠
              </span>
            )}
            {showFirstCome && (
              <span className="bg-orange-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-xl">
                ⚡ 早い人優先
              </span>
            )}
            {job.urgency === 'today' && (
              <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
                本日中に決まります
              </span>
            )}
            {job.urgency === 'tomorrow' && (
              <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
                今日中に決めたい
              </span>
            )}
          </div>
          <span className="flex-shrink-0 text-white/50 text-xs font-mono bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {idx + 1} / {total}
          </span>
        </div>

        {/* 2. 中央：金額 + 工事内容 + エリア・距離 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="text-center bg-black/40 backdrop-blur-xl rounded-3xl px-8 py-5 border border-white/10 shadow-2xl w-full max-w-xs">
            <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.15em] mb-1">
              想定売上目安
            </p>
            <p
              className="text-white font-extrabold leading-none tabular-nums"
              style={{ fontSize: 'clamp(2.6rem, 10vw, 4rem)', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
            >
              {revenue}
            </p>
          </div>
          <div className="text-center">
            <h2 className="text-white text-xl font-extrabold leading-tight drop-shadow-lg mb-1">
              {job.work_type || '内装工事'}
            </h2>
            <p className="text-white/70 text-sm flex items-center justify-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                {job.city || 'エリア未設定'}
              </span>
              {job.distance_km != null && (
                <span className="text-blue-300 font-bold">約{job.distance_km}km</span>
              )}
            </p>
          </div>
        </div>

        {/* 3. 下部：情報チップ群 */}
        <div className="flex-shrink-0 px-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {job.room_size && <span className="text-white/70 text-xs">📐 {job.room_size}</span>}
            {job.has_photos && <span className="text-white/60 text-xs">📷 写真あり</span>}
            {job.has_floor_plan && <span className="text-white/60 text-xs">📋 図面あり</span>}
            {job.created_at && (() => {
              const f = getFreshness(job.created_at);
              return (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${FRESHNESS_CLASS[f.status]}`}>
                  {f.label}
                </span>
              );
            })()}
          </div>
          {freshness?.status === 'warning' && (
            <div className="flex gap-1.5 flex-wrap animate-pulse">
              <span className="bg-amber-500/70 backdrop-blur-sm text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                ⚡ 早い人優先
              </span>
              <span className="bg-amber-500/70 backdrop-blur-sm text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                📅 本日中に決まる可能性
              </span>
            </div>
          )}
          {isStale && (
            <div className="rounded-xl bg-orange-500/20 backdrop-blur-sm border border-orange-400/30 px-3 py-2 flex items-center gap-2">
              <span className="text-orange-300 text-sm flex-shrink-0">⚠️</span>
              <p className="text-[11px] text-orange-200 font-bold leading-snug">
                継続確認待ち：返答が遅れる場合があります
              </p>
            </div>
          )}
        </div>

        {/* 4. 最下部：CTAボタン */}
        <div
          className="flex-shrink-0 px-4"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-2.5 mb-2">
            {idx < total - 1 && (
              <button
                className="flex-1 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 py-3.5 text-white/80 text-sm font-bold transition active:scale-[0.97]"
                onClick={() => {
                  const container = slideRef.current?.closest('[data-swipe-container]') as HTMLElement | null;
                  container?.scrollBy({ top: container.clientHeight, behavior: 'smooth' });
                }}
              >
                スキップ ↑
              </button>
            )}
            <button
              onClick={!applied && !submitting ? () => setShowConfirm(true) : undefined}
              disabled={applied || submitting}
              className={`rounded-2xl py-3.5 text-sm font-extrabold transition active:scale-[0.98] ${
                idx < total - 1 ? 'flex-[2]' : 'flex-1'
              } ${
                applied
                  ? 'bg-green-500 text-white shadow-lg'
                  : isStale
                  ? 'bg-slate-500/80 hover:bg-slate-500 text-white shadow-md disabled:opacity-60'
                  : freshness?.status === 'warning'
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/40 disabled:opacity-60'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg disabled:opacity-60'
              }`}
            >
              {applied ? '✓ 応募済み' : submitting ? '送信中...' : isStale ? '確認中・応募する' : '今すぐ行けます'}
            </button>
          </div>
          {!applied && (
            <p className="text-center text-[11px] text-white/35 flex items-center justify-center gap-1.5">
              <span>→ 右スワイプで即応募</span>
              {idx < total - 1 && <><span>·</span><span>↑ 上スワイプでスキップ</span></>}
            </p>
          )}
          <p className="mt-1 text-center text-[11px] text-white/30">現在は無料で利用できます</p>
        </div>

      </div>

      {/* 応募確認モーダル */}
      {showConfirm && (
        <ConfirmApplyModal
          workType={job.work_type ?? ''}
          city={job.city ?? ''}
          revenue={revNum}
          fee={feeNum}
          takeHome={takeNum}
          submitting={submitting}
          onConfirm={() => { onApply(); setShowConfirm(false); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </section>
  );
}

// ─── Main: JobsSwipeView ──────────────────────────────────────────────────────

type Props = { jobs: Job[] };

export default function JobsSwipeView({ jobs }: Props) {
  const navigate = useNavigate();
  const videoJobs = jobs.filter(j => j.has_video || j.video_url);

  const [appliedIds,      setAppliedIds]      = useState<Set<string>>(new Set());
  const [submittingId,    setSubmittingId]    = useState<string | null>(null);
  const [currentIdx,      setCurrentIdx]      = useState(0);
  const [modalOpen,       setModalOpen]       = useState(false);
  const [lastAppliedJob,  setLastAppliedJob]  = useState<Job | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // スクロール位置を追跡
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const idx = Math.round(container.scrollTop / container.clientHeight);
      setCurrentIdx(idx);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const applyJob = useCallback(async (job: Job) => {
    if (appliedIds.has(job.id) || submittingId) return;
    setSubmittingId(job.id);

    const storedUser = localStorage.getItem('user');
    const craftsmanId = storedUser ? JSON.parse(storedUser).id : null;

    const { error } = await supabase.from('job_applications').insert({
      estimate_request_id: job.id,
      craftsman_id: craftsmanId,
      status: 'available',
      message: '今すぐ行けます',
    });

    setSubmittingId(null);

    if (error) {
      alert('送信に失敗しました。もう一度お試しください。');
      return;
    }

    setAppliedIds(prev => new Set([...prev, job.id]));
    setLastAppliedJob(job);
    setModalOpen(true);
  }, [appliedIds, submittingId]);

  if (videoJobs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-4 px-6 text-center">
        <span className="text-5xl">🎬</span>
        <p className="text-lg font-bold">動画付き案件がありません</p>
        <p className="text-sm text-slate-400">動画を添付した依頼が届くとここに表示されます</p>
      </div>
    );
  }

  return (
    <>
      {/* 応募完了モーダル */}
      {modalOpen && (
        <ApplySuccessModal
          onClose={() => setModalOpen(false)}
          onInputAmount={() => {
            setModalOpen(false);
            if (lastAppliedJob) {
              navigate(`/craftsman/apply/${lastAppliedJob.id}`, { state: { job: lastAppliedJob } });
            }
          }}
        />
      )}

      {/* スワイプコンテナ */}
      <div
        ref={containerRef}
        data-swipe-container
        className="h-full overflow-y-scroll bg-black"
        style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {videoJobs.map((job, idx) => (
          <SwipeSlide
            key={job.id}
            job={job}
            idx={idx}
            total={videoJobs.length}
            applied={appliedIds.has(job.id)}
            submitting={submittingId === job.id}
            onApply={() => applyJob(job)}
          />
        ))}
      </div>

      {/* 右端インジケーター */}
      {videoJobs.length > 1 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 pointer-events-none z-10">
          {videoJobs.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentIdx ? 'w-1.5 h-6 bg-white' : 'w-1 h-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
