import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ApplySuccessModal from '../../components/ApplySuccessModal';
import ApplyConfirmModal from '../../components/ApplyConfirmModal';
import type { Job } from './CraftsmanJobsPage';

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

  const [dragX,      setDragX]      = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const urgency         = urgencyConfig(job);
  const revenue         = estimateRevenue(job);
  const swipeProgress   = Math.min(1, Math.max(0, dragX / 130));
  const showSlotWarning = job.urgency === 'today' || job.urgency === 'tomorrow';
  const showFirstCome   = job.has_video || job.has_photos;

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
        onApply();
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

      {/* トップバー：緊急度 + カウンター */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold shadow-lg backdrop-blur-sm ${urgency.cls}`}>
          {urgency.text}
        </span>
        <span className="text-white/50 text-xs font-mono bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
          {idx + 1} / {total}
        </span>
      </div>

      {/* センター：希少性バッジ + 想定売上 */}
      {/* pb-40 でスマホ時のみ justify-center の基準を上方にずらし、ボトム区画との重なりを防ぐ */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none gap-4 pb-40 sm:pb-0">
        {(showSlotWarning || showFirstCome) && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
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
            </div>
            {job.urgency === 'today' && (
              <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                本日中に決まります
              </span>
            )}
            {job.urgency === 'tomorrow' && (
              <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                今日中に決めたい
              </span>
            )}
          </div>
        )}

        <div className="text-center bg-black/40 backdrop-blur-xl rounded-3xl px-10 py-6 border border-white/10 shadow-2xl">
          <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.15em] mb-1">
            想定売上目安
          </p>
          <p
            className="text-white font-extrabold leading-none tabular-nums"
            style={{ fontSize: 'clamp(2.8rem, 11vw, 4.5rem)', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
          >
            {revenue}
          </p>
        </div>
      </div>

      {/* ボトム：案件情報 + 補助ボタン */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 z-10">
        <h2 className="text-white text-xl font-extrabold leading-tight drop-shadow-lg mb-1">
          {job.work_type || '内装工事'}
        </h2>
        <div className="flex items-center gap-3 text-sm mb-3 flex-wrap">
          <span className="text-white/70 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            {job.city || 'エリア未設定'}
          </span>
          {job.distance_km != null && (
            <span className="text-blue-300 font-bold">約{job.distance_km}km</span>
          )}
          {job.room_size && <span className="text-white/60">📐 {job.room_size}</span>}
          {job.has_photos && <span className="text-white/60">📷 写真あり</span>}
          {job.has_floor_plan && <span className="text-white/60">📋 図面あり</span>}
        </div>

        {/* 補助ボタン */}
        <div className="flex gap-2.5">
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
            onClick={!applied && !submitting ? onApply : undefined}
            disabled={applied || submitting}
            className={`rounded-2xl py-3.5 text-sm font-extrabold shadow-lg transition active:scale-[0.98] ${
              idx < total - 1 ? 'flex-[2]' : 'flex-1'
            } ${applied ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60'}`}
          >
            {applied ? '✓ 応募済み' : submitting ? '送信中...' : '今すぐ行けます'}
          </button>
        </div>

        {!applied && (
          <p className="mt-3 text-center text-[11px] text-white/35 flex items-center justify-center gap-1.5">
            <span>→ 右スワイプで即応募</span>
            {idx < total - 1 && <><span>·</span><span>↑ 上スワイプでスキップ</span></>}
          </p>
        )}
        <p className="mt-1 text-center text-[11px] text-white/30">現在は無料で利用できます</p>
      </div>
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
  const [confirmJob,      setConfirmJob]      = useState<Job | null>(null);
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
      {/* 応募前確認モーダル */}
      {confirmJob && (
        <ApplyConfirmModal
          job={confirmJob}
          onCancel={() => setConfirmJob(null)}
          onConfirm={() => {
            const job = confirmJob;
            setConfirmJob(null);
            applyJob(job);
          }}
        />
      )}

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
            onApply={() => setConfirmJob(job)}
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
