import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateServiceFee } from '../../lib/serviceFee';
import { getFreshness, FRESHNESS_CLASS } from '../../lib/freshness';
import type { Job } from './CraftsmanJobsPage';

// ─── Revenue estimator ────────────────────────────────────────────────────────

function estimateRevenue(job: Job): number {
  const type   = (job.work_type ?? '').toLowerCase();
  const damage = job.damage_level;
  const size   = job.room_size ?? '';

  let base = 32000;
  if (type.includes('cf') || type.includes('クッションフロア')) base = 24000;
  else if (type.includes('補修'))                              base = 16000;
  else if (type.includes('床'))                               base = 34000;
  else if (type.includes('クロス'))                           base = 32000;

  const m = size.match(/(\d+)/);
  const tatami = m ? parseInt(m[1]) : 6;
  const sizeMul = tatami >= 10 ? 1.5 : tatami >= 8 ? 1.25 : tatami >= 6 ? 1.0 : 0.8;
  const damageMul = damage === 'high' ? 1.3 : damage === 'middle' ? 1.1 : 1.0;

  return Math.round((base * sizeMul * damageMul) / 1000) * 1000;
}

function getPriority(job: Job) {
  let score = 0;
  if (job.urgency === 'today')        score += 3;
  if (job.urgency === 'tomorrow')     score += 2;
  if (job.has_video)                  score += 2;
  if ((job.distance_km ?? 999) <= 10) score += 2;
  if (job.has_photos)                 score += 1;
  return Math.min(5, score);
}

function fmt(n: number) { return `¥${n.toLocaleString()}`; }

// ─── 情報充足度ドット ─────────────────────────────────────────────────────────

function InfoDots({ job }: { job: Job }) {
  const items = [
    { filled: !!job.has_video,      label: '動画' },
    { filled: !!job.has_photos,     label: '写真' },
    { filled: !!job.has_floor_plan, label: '図面' },
    { filled: !!job.customer_note,  label: 'メモ' },
  ];
  const count = items.filter(i => i.filled).length;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-slate-400 font-bold">情報充足度</span>
      <div className="flex items-center gap-0.5">
        {items.map((item, i) => (
          <span
            key={i}
            title={item.label}
            className={`inline-block w-2 h-2 rounded-full ${item.filled ? 'bg-blue-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <span className="text-[10px] text-slate-400">{count}/4</span>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = { jobs: Job[]; loading: boolean };

// ─── Component ───────────────────────────────────────────────────────────────

export default function JobsListView({ jobs, loading }: Props) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'today' | 'video'>('all');

  const sortedJobs = useMemo(() => {
    return jobs
      .filter(job => {
        if (filter === 'today') return job.urgency === 'today' || job.urgency === 'tomorrow';
        if (filter === 'video') return job.has_video;
        return true;
      })
      .sort((a, b) => {
        const vp = Number(b.has_video) - Number(a.has_video);
        if (vp !== 0) return vp;
        return getPriority(b) - getPriority(a);
      });
  }, [jobs, filter]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-4 py-4">
      <div className="mx-auto max-w-3xl">

        {/* 収益モデル説明 */}
        <div className="mb-3 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] text-slate-500 leading-relaxed space-y-0.5">
          <p>・工事代金は依頼者と直接やり取りします</p>
          <p>・PRO MATCHは工事代金をお預かりしません</p>
          <p>・成約後に連絡先が開示されます</p>
        </div>

        {/* フィルター */}
        <div className="mb-4 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-2.5 grid grid-cols-3 gap-2">
          {(['all', 'today', 'video'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl py-2 text-sm font-bold transition ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {f === 'all' ? '全て' : f === 'today' ? '今日・明日' : '動画あり'}
            </button>
          ))}
        </div>

        {/* ローディング / 空 */}
        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-400 text-sm shadow-sm">
            読み込み中...
          </div>
        ) : sortedJobs.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-bold text-slate-700">該当する案件がありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedJobs.map(job => {
              const revenue  = estimateRevenue(job);
              const fee      = calculateServiceFee(revenue);
              const takHome  = revenue - fee;
              const freshness = job.created_at ? getFreshness(job.created_at) : null;
              const isStale   = freshness?.status === 'urgent';
              const isToday   = job.urgency === 'today';
              const isTomorrow = job.urgency === 'tomorrow';
              const isSoon    = job.urgency === 'soon';

              return (
                <article key={job.id} className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-sm overflow-hidden">

                  {/* ── 上部ゾーン：3秒判断エリア ── */}
                  <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">

                    {/* 左：工種 + エリア + バッジ群 */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-extrabold text-slate-900 leading-tight mb-1">
                        {job.work_type || '内装工事'}
                      </h2>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span>{job.city || 'エリア未設定'}</span>
                        {job.distance_km != null && (
                          <span className="text-blue-600 font-bold">· {job.distance_km}km</span>
                        )}
                      </p>
                      {/* バッジ群 */}
                      <div className="flex flex-wrap gap-1">
                        {freshness && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${FRESHNESS_CLASS[freshness.status]}`}>
                            {freshness.label}
                          </span>
                        )}
                        {isToday && (
                          <span className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                            🔥 今日
                          </span>
                        )}
                        {isTomorrow && (
                          <span className="bg-orange-400 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            ⏰ 明日まで
                          </span>
                        )}
                        {isSoon && !isToday && !isTomorrow && (
                          <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            数日以内
                          </span>
                        )}
                        {job.has_video && (
                          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ▶ 動画
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 右：手取り目安（大） */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[10px] text-slate-400 font-bold leading-none mb-1">手取り目安</p>
                      <p className="text-[1.6rem] font-extrabold text-slate-900 leading-none tracking-tight">
                        {fmt(takHome)}
                      </p>
                    </div>
                  </div>

                  {/* ── 収支ストリップ ── */}
                  <div className="mx-4 mb-3 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5 flex items-center justify-between gap-1">
                    <div className="text-center flex-1">
                      <p className="text-[9px] text-blue-400 font-bold mb-0.5">想定売上</p>
                      <p className="text-sm font-extrabold text-blue-700">{fmt(revenue)}</p>
                    </div>
                    <span className="text-blue-200 text-sm font-bold">→</span>
                    <div className="text-center flex-1">
                      <p className="text-[9px] text-blue-400 font-bold mb-0.5">サービス料</p>
                      <p className="text-sm font-bold text-blue-500">−{fmt(fee)}</p>
                    </div>
                    <span className="text-blue-200 text-sm font-bold">→</span>
                    <div className="text-center flex-1">
                      <p className="text-[9px] text-emerald-600 font-bold mb-0.5">手取り</p>
                      <p className="text-sm font-extrabold text-emerald-600">{fmt(takHome)}</p>
                    </div>
                  </div>

                  {/* ── 中央：チップ + 情報充足度 ── */}
                  <div className="px-4 mb-3 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {job.room_size && (
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                          📐 {job.room_size}
                        </span>
                      )}
                      {job.has_photos && (
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                          📷 写真あり
                        </span>
                      )}
                      {job.has_floor_plan && (
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                          📋 図面あり
                        </span>
                      )}
                      {job.damage_level && (
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                          損傷: {job.damage_level === 'low' ? '軽め' : job.damage_level === 'middle' ? '普通' : '重め'}
                        </span>
                      )}
                    </div>
                    <InfoDots job={job} />
                  </div>

                  {/* ── 鮮度アクション促進 ── */}
                  {freshness?.status === 'warning' && (
                    <div className="px-4 mb-3 flex gap-1.5 flex-wrap">
                      <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
                        ⚡ 早い人優先
                      </span>
                      <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
                        📅 本日中に決まる可能性
                      </span>
                    </div>
                  )}

                  {/* ── 継続確認待ち警告 ── */}
                  {isStale && (
                    <div className="mx-4 mb-3 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 flex items-center gap-2">
                      <span className="text-orange-500 text-sm flex-shrink-0">⚠️</span>
                      <p className="text-[11px] text-orange-700 font-bold leading-snug">
                        継続確認待ち：依頼者の意向を確認中です。応募は可能ですが、返答が遅れる場合があります。
                      </p>
                    </div>
                  )}

                  {/* ── 依頼メモ ── */}
                  {job.customer_note && (
                    <div className="mx-4 mb-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-slate-400 font-bold mb-1">依頼メモ</p>
                      <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                        {job.customer_note}
                      </p>
                    </div>
                  )}

                  {/* ── アクション ── */}
                  <div className="border-t border-slate-100 px-4 py-3 flex gap-2">
                    <button
                      onClick={() => navigate(`/craftsman/apply/${job.id}`, { state: { job } })}
                      className="flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition active:scale-95"
                    >
                      詳しく見る
                    </button>
                    <button
                      onClick={() => navigate(`/craftsman/apply/${job.id}`, { state: { job } })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold transition active:scale-[0.98] shadow-sm ${
                        isStale
                          ? 'bg-slate-400 hover:bg-slate-500 text-white shadow-slate-200'
                          : freshness?.status === 'warning'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-300 shadow-md'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                      }`}
                    >
                      {isStale ? '確認中・応募する →' : '✓ 対応できます →'}
                    </button>
                  </div>

                  <p className="pb-3 text-center text-[10px] text-slate-400">
                    応募無料 · 手数料は工事成立時のみ
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
