import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type HelpRequest = {
  id: string;
  work_date: string;
  area: string;
  work_type: string;
  people_needed: number;
  daily_rate: number;
  comment: string;
  created_at: string;
};

const DEMO: HelpRequest[] = [
  {
    id: 'demo-1',
    work_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    area: '太田市',
    work_type: 'クロス張替え（2LDK原状回復）',
    people_needed: 2,
    daily_rate: 18000,
    comment: '道具は貸し出せます。昼飯付きです。',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    work_date: new Date(Date.now() + 172800000).toISOString().slice(0, 10),
    area: '伊勢崎市',
    work_type: '床CF張替え',
    people_needed: 1,
    daily_rate: 15000,
    comment: '半日で終わる量です。午前スタート希望。',
    created_at: new Date().toISOString(),
  },
];

const DEMO_APP_COUNTS: Record<string, number> = {
  'demo-1': 2,
  'demo-2': 1,
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${m}/${day}（${weekdays[d.getDay()]}）`;
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function HelpListPage() {
  const [requests,   setRequests]   = useState<HelpRequest[]>([]);
  const [appCounts,  setAppCounts]  = useState<Record<string, number>>({});
  const [loading,    setLoading]    = useState(true);
  const [isDemo,     setIsDemo]     = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('help_requests')
        .select('*')
        .order('work_date', { ascending: true });

      if (error || !data || data.length === 0) {
        setRequests(DEMO);
        setAppCounts(DEMO_APP_COUNTS);
        setIsDemo(true);
      } else {
        setRequests(data as HelpRequest[]);
        // 応募数を集計
        const ids = (data as HelpRequest[]).map(r => r.id);
        const { data: apps } = await supabase
          .from('help_applications')
          .select('request_id')
          .in('request_id', ids);
        if (apps) {
          const counts: Record<string, number> = {};
          for (const a of apps) counts[a.request_id] = (counts[a.request_id] ?? 0) + 1;
          setAppCounts(counts);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function handleApply(req: HelpRequest) {
    if (appliedIds.has(req.id)) return;
    setApplyingId(req.id);

    const { error } = await supabase.from('help_applications').insert({
      request_id: req.id,
      message: '行けます',
    });

    setApplyingId(null);

    if (error) {
      alert('送信に失敗しました。もう一度お試しください。');
      return;
    }

    setAppliedIds(prev => new Set([...prev, req.id]));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-none">助っ人募集一覧</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">空き日に入れる仕事を探す</p>
            </div>
          </div>
          <a href="/craftsman/help" className="text-xs text-orange-500 font-extrabold hover:underline">
            ＋ 募集する
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-10">
        {isDemo && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2">
            <span className="text-amber-500 text-xs">📋</span>
            <p className="text-xs text-amber-700 font-semibold">
              デモ表示中 — 実際の募集が登録されると切り替わります
            </p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm border border-slate-200">
            読み込み中...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm border border-slate-200">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-bold text-slate-700 mb-4">募集中の案件はありません</p>
            <a
              href="/craftsman/help"
              className="inline-block bg-orange-500 text-white rounded-2xl px-6 py-2.5 text-sm font-extrabold"
            >
              最初に募集する
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => {
              const applied    = appliedIds.has(req.id);
              const appCount   = appCounts[req.id] ?? 0;
              const days       = daysUntil(req.work_date);
              const isToday    = days === 0;
              const isSoon     = days <= 2 && !isToday;
              const isLastSlot = req.people_needed === 1;

              return (
                <article key={req.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* ヘッダー */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500 font-extrabold text-sm">📅 {formatDate(req.work_date)}</span>
                    </div>
                    <span className="bg-orange-100 text-orange-700 text-xs font-extrabold px-2.5 py-1 rounded-full">
                      {req.people_needed}名募集
                    </span>
                  </div>

                  <div className="p-4">
                    {/* バッジ行 */}
                    {(isToday || isLastSlot || isSoon || appCount > 0) && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {isToday && (
                          <span className="bg-red-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full animate-pulse">
                            🔥 今日の募集
                          </span>
                        )}
                        {isLastSlot && (
                          <span className="bg-red-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full animate-pulse">
                            🔥 残り1枠
                          </span>
                        )}
                        {isSoon && (
                          <span className="bg-orange-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
                            ⚡ 早い人優先
                          </span>
                        )}
                        {appCount > 0 && (
                          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                            👀 現在{appCount}人が検討中
                          </span>
                        )}
                      </div>
                    )}

                    <h2 className="text-base font-extrabold text-slate-900 mb-1">{req.work_type}</h2>
                    <p className="text-sm text-slate-500 mb-3 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      {req.area}
                    </p>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">日当</p>
                        <p className="text-xl font-extrabold text-slate-900">
                          ¥{req.daily_rate.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-400">/ 日</p>
                    </div>

                    {req.comment && (
                      <p className="text-sm text-slate-600 bg-blue-50 rounded-xl px-3 py-2.5 mb-4 leading-relaxed">
                        💬 {req.comment}
                      </p>
                    )}

                    <button
                      onClick={() => handleApply(req)}
                      disabled={applied || applyingId === req.id}
                      className={`w-full rounded-2xl py-3 text-sm font-extrabold shadow-sm transition active:scale-[0.99] disabled:opacity-60 ${
                        applied
                          ? 'bg-green-500 text-white'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      {applied
                        ? '✓ 応募済み'
                        : applyingId === req.id
                        ? '送信中...'
                        : '行けます！'}
                    </button>
                    <p className="mt-1.5 text-center text-xs text-slate-400">現在は無料で利用できます</p>
                    <p className="mt-0.5 text-center text-xs text-slate-400">正式版では参加時300円を予定しています</p>
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
