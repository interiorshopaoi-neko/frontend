import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type ApplicationRow = {
  id: string;
  estimate_request_id: string;
  status: string | null;
  price: number | null;
  message: string | null;
  is_contracted: boolean | null;
  contracted_at: string | null;
  review_requested_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  estimate_requests: { work_type: string | null; area: string | null } | null;
};

const DEMO: ApplicationRow[] = [
  {
    id: 'demo-a1',
    estimate_request_id: 'demo-1',
    status: 'available',
    price: 35000,
    message: null,
    is_contracted: false,
    contracted_at: null,
    review_requested_at: null,
    reviewed_at: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    estimate_requests: { work_type: 'クロス張替え', area: '太田市' },
  },
  {
    id: 'demo-a2',
    estimate_request_id: 'demo-2',
    status: 'available',
    price: 28000,
    message: '午前中スタート希望です',
    is_contracted: true,
    contracted_at: new Date(Date.now() - 172800000).toISOString(),
    review_requested_at: new Date(Date.now() - 86400000).toISOString(),
    reviewed_at: null,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    estimate_requests: { work_type: '床CF張替え', area: '伊勢崎市' },
  },
];

function StatusBadge({ app }: { app: ApplicationRow }) {
  if (app.reviewed_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
        ⭐ 実績確定
      </span>
    );
  }
  if (app.review_requested_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
        📝 レビュー待ち
      </span>
    );
  }
  if (app.is_contracted) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
        🤝 成約済み
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
      📤 応募中
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function CraftsmanApplicationsPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem('user');
      const craftsmanId = stored ? JSON.parse(stored).id : null;

      if (!craftsmanId) {
        setApps(DEMO);
        setIsDemo(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('job_applications')
        .select('*, estimate_requests(work_type, area)')
        .eq('craftsman_id', craftsmanId)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setApps(DEMO);
        setIsDemo(true);
      } else {
        setApps(data as ApplicationRow[]);
      }
      setLoading(false);
    })();
  }, []);

  const contractedCount = apps.filter(a => a.is_contracted).length;
  const reviewedCount   = apps.filter(a => a.reviewed_at).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="text-slate-400 hover:text-slate-700 p-1 -ml-1 rounded-xl transition"
              aria-label="戻る"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-none">応募状況</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">成約・レビューの管理</p>
            </div>
          </div>
          <a href="/craftsman/jobs" className="text-xs text-blue-600 font-semibold hover:underline">
            案件一覧
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-10 space-y-4">

        {isDemo && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2">
            <span className="text-amber-500 text-xs">📋</span>
            <p className="text-xs text-amber-700 font-semibold">デモ表示中 — ログイン後に実際の応募状況が表示されます</p>
          </div>
        )}

        {/* サマリー */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '応募数', value: apps.length, icon: '📤' },
            { label: '成約済み', value: contractedCount, icon: '🤝' },
            { label: 'レビュー', value: reviewedCount, icon: '⭐' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 text-center">
              <p className="text-lg">{icon}</p>
              <p className="text-xl font-extrabold text-slate-900 leading-tight">{value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            読み込み中...
          </div>
        ) : apps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-bold text-slate-700 mb-4">まだ応募した案件がありません</p>
            <a
              href="/craftsman/jobs"
              className="inline-block bg-blue-600 text-white rounded-2xl px-6 py-2.5 text-sm font-extrabold"
            >
              案件を見る
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map(app => {
              const workType = app.estimate_requests?.work_type ?? '内装工事';
              const city     = app.estimate_requests?.area ?? 'エリア未設定';
              return (
                <article key={app.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-[11px] text-slate-400">{formatDate(app.created_at)} 応募</p>
                        <h2 className="text-base font-extrabold text-slate-900 leading-tight mt-0.5">
                          {workType}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">{city}</p>
                      </div>
                      <StatusBadge app={app} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] text-slate-400">概算金額</p>
                        <p className="text-sm font-extrabold text-slate-900">
                          {app.price != null ? `¥${app.price.toLocaleString()}` : '未入力'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] text-slate-400">実績表示</p>
                        <p className="text-sm font-bold text-slate-600">
                          {app.reviewed_at ? '表示予定あり' : app.is_contracted ? '成約後に表示' : '応募中'}
                        </p>
                      </div>
                    </div>

                    {app.message && (
                      <p className="mt-2 text-xs text-slate-500 bg-blue-50 rounded-xl px-3 py-2 leading-relaxed">
                        💬 {app.message}
                      </p>
                    )}
                  </div>

                  {app.is_contracted && !app.reviewed_at && (
                    <div className="border-t border-slate-100 px-4 py-3 bg-amber-50">
                      <p className="text-xs text-amber-700 font-bold">
                        📝 施工完了後にレビューを受け取ると実績として表示されます
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 leading-relaxed px-4">
          成約報告・レビュー取得により案件に選ばれやすくなります
        </p>
      </div>
    </div>
  );
}
