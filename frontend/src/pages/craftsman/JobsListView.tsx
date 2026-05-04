import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Job } from './CraftsmanJobsPage';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDifficulty(job: Job) {
  const damage = job.damage_level === 'high' ? 3 : job.damage_level === 'middle' ? 2 : 1;
  const size = job.room_size?.includes('10') || job.room_size?.includes('12') ? 2 : 1;
  return Math.min(5, damage + size);
}

function getPriority(job: Job) {
  let score = 0;
  if (job.urgency === 'today') score += 3;
  if (job.urgency === 'tomorrow') score += 2;
  if (job.has_video) score += 2;
  if ((job.distance_km ?? 999) <= 10) score += 2;
  if (job.has_photos) score += 1;
  return Math.min(5, score);
}

function labelDamage(level?: string) {
  if (level === 'low') return '軽め';
  if (level === 'middle') return '普通';
  if (level === 'high') return '重め';
  return '未入力';
}

function labelUrgency(level?: string) {
  if (level === 'today') return '今日できる人希望';
  if (level === 'tomorrow') return '明日まで希望';
  if (level === 'soon') return '数日以内';
  return '急ぎではない';
}

function Stars({ value }: { value: number }) {
  return (
    <span className="text-sm tracking-tight">
      {'★'.repeat(value)}
      <span className="text-gray-300">{'★'.repeat(5 - value)}</span>
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  jobs: Job[];
  loading: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function JobsListView({ jobs, loading }: Props) {
  const navigate = useNavigate();
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [filter,     setFilter]     = useState<'all' | 'today' | 'video'>('all');

  const sortedJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        if (filter === 'today') return job.urgency === 'today' || job.urgency === 'tomorrow';
        if (filter === 'video') return job.has_video;
        return true;
      })
      .sort((a, b) => {
        const videoPriority = Number(b.has_video) - Number(a.has_video);
        if (videoPriority !== 0) return videoPriority;
        const urgentPriority = getPriority(b) - getPriority(a);
        if (urgentPriority !== 0) return urgentPriority;
        return (a.distance_km ?? 999) - (b.distance_km ?? 999);
      });
  }, [jobs, filter]);

  function handleApply(job: Job) {
    if (appliedIds.has(job.id)) return;
    setAppliedIds(prev => new Set([...prev, job.id]));
    navigate(`/craftsman/apply/${job.id}`, { state: { job } });
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-4 py-5">
      <div className="mx-auto max-w-3xl">
        {/* フィルター */}
        <section className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <div className="grid grid-cols-3 gap-2">
            {(['all', 'today', 'video'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {f === 'all' ? '全て' : f === 'today' ? '今日・明日' : '動画あり'}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
            案件を読み込み中...
          </div>
        ) : sortedJobs.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-bold text-slate-700">該当する案件がありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedJobs.map((job) => {
              const difficulty = getDifficulty(job);
              const priority = getPriority(job);
              const applied = appliedIds.has(job.id);

              return (
                <article
                  key={job.id}
                  className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
                >
                  <div className="border-b border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {job.has_video && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                              動画あり 優先
                            </span>
                          )}
                          {job.urgency === 'today' && (
                            <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white animate-pulse">
                              🔥 本日中に決まります
                            </span>
                          )}
                          {job.urgency === 'tomorrow' && (
                            <span className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white">
                              ⏰ 今日中に決めたい
                            </span>
                          )}
                          {job.urgency !== 'today' && job.urgency !== 'tomorrow' && (
                            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                              急ぎ
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">
                          {job.work_type || '内装工事'}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {job.city || 'エリア未設定'} ・ 約{job.distance_km ?? '-'}km
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-900 px-3 py-2 text-right text-white">
                        <p className="text-xs opacity-70">距離</p>
                        <p className="text-lg font-bold">{job.distance_km ?? '-'}km</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4">
                    <Info label="希望時期" value={job.preferred_date || labelUrgency(job.urgency)} />
                    <Info label="部屋サイズ" value={job.room_size || '未入力'} />
                    <Info label="汚れ・傷" value={labelDamage(job.damage_level)} />
                    <Info
                      label="資料"
                      value={
                        `${job.has_video ? '動画 ' : ''}${job.has_photos ? '写真 ' : ''}${job.has_floor_plan ? '図面' : ''}`.trim() || 'なし'
                      }
                    />
                  </div>

                  <div className="px-4 pb-4">
                    <div className="rounded-2xl bg-blue-50 p-3">
                      <p className="text-xs font-bold text-blue-700">3秒判断メモ</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">
                        {job.customer_note ||
                          '近場で判断しやすい案件です。動画・写真がある場合は優先的に確認してください。'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                    <div className="rounded-2xl border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">難易度</p>
                      <div className="mt-1"><Stars value={difficulty} /></div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">優先度</p>
                      <div className="mt-1"><Stars value={priority} /></div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 p-4">
                    <button
                      onClick={() => handleApply(job)}
                      disabled={applied}
                      className={`w-full rounded-2xl px-4 py-3 text-base font-bold shadow-sm transition active:scale-[0.99] disabled:opacity-60 ${
                        applied
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {applied ? '✓ 応募へ進みました' : '今すぐ行けます →'}
                    </button>
                    {!applied && (
                      <p className="mt-2 text-center text-xs text-slate-400">
                        次の画面で概算金額を入力します
                      </p>
                    )}
                    <p className="mt-1 text-center text-xs text-slate-400">現在は無料で利用できます</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

