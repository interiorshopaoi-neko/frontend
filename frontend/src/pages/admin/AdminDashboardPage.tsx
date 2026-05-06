import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateServiceFee } from '../../lib/serviceFee';

// ─── Types ────────────────────────────────────────────────────────────────────

type Request = {
  id: string;
  created_at: string;
  work_type: string | null;
  city: string | null;
  status: string | null;
  has_video: boolean | null;
  has_photos: boolean | null;
  urgency: string | null;
};

type Craftsman = {
  id: string;
  created_at: string;
  shop_name: string | null;
  full_name: string | null;
  service_area: string | null;
  work_types: string[] | null;
  experience_years: number | null;
};

type Application = {
  id: string;
  created_at: string;
  estimate_request_id: string;
  craftsman_id: string | null;
  status: string | null;
  price: number | null;
  service_fee: number | null;
  estimate_requests?: { work_type: string | null; city: string | null } | null;
};

// ─── Demo fallback data ───────────────────────────────────────────────────────

const DEMO_REQUESTS: Request[] = [
  { id: 'r1', created_at: new Date().toISOString(), work_type: 'クロス張替え', city: '大阪市北区', status: 'open', has_video: true, has_photos: true, urgency: 'soon' },
  { id: 'r2', created_at: new Date().toISOString(), work_type: 'クッションフロア', city: '大阪市住吉区', status: 'open', has_video: false, has_photos: true, urgency: 'today' },
  { id: 'r3', created_at: new Date(Date.now() - 86400000).toISOString(), work_type: '床張替え', city: '堺市堺区', status: 'matched', has_video: true, has_photos: false, urgency: 'tomorrow' },
  { id: 'r4', created_at: new Date(Date.now() - 172800000).toISOString(), work_type: 'クロス張替え', city: '大阪市北区', status: 'open', has_video: false, has_photos: false, urgency: null },
  { id: 'r5', created_at: new Date(Date.now() - 259200000).toISOString(), work_type: '補修', city: '堺市東区', status: 'open', has_video: true, has_photos: true, urgency: 'soon' },
];

const DEMO_CRAFTSMEN: Craftsman[] = [
  { id: 'c1', created_at: new Date(Date.now() - 86400000 * 10).toISOString(), shop_name: '内装の田中', full_name: '田中一郎', service_area: '大阪市全域', work_types: ['クロス', 'CF'], experience_years: 12 },
  { id: 'c2', created_at: new Date(Date.now() - 86400000 * 5).toISOString(), shop_name: '山本内装', full_name: '山本花子', service_area: '堺市・大阪市南部', work_types: ['クロス', '床'], experience_years: 7 },
  { id: 'c3', created_at: new Date(Date.now() - 86400000 * 2).toISOString(), shop_name: null, full_name: '鈴木健太', service_area: '大阪市北区', work_types: ['補修'], experience_years: 3 },
];

const DEMO_APPLICATIONS: Application[] = [
  { id: 'a1', created_at: new Date().toISOString(), estimate_request_id: 'r1', craftsman_id: 'c1', status: 'available', price: 45000, service_fee: 1500, estimate_requests: { work_type: 'クロス張替え', city: '大阪市北区' } },
  { id: 'a2', created_at: new Date().toISOString(), estimate_request_id: 'r1', craftsman_id: 'c2', status: 'available', price: 38000, service_fee: 1500, estimate_requests: { work_type: 'クロス張替え', city: '大阪市北区' } },
  { id: 'a3', created_at: new Date(Date.now() - 86400000).toISOString(), estimate_request_id: 'r3', craftsman_id: 'c1', status: 'matched', price: 72000, service_fee: 1500, estimate_requests: { work_type: '床張替え', city: '堺市堺区' } },
];

// ─── Analysis functions ───────────────────────────────────────────────────────

function calculateVideoRate(requests: Request[]): number {
  if (!requests.length) return 0;
  return Math.round((requests.filter(r => r.has_video).length / requests.length) * 100);
}

function calculateExpectedRevenue(applications: Application[]): number {
  return applications.reduce((sum, a) => {
    const fee = a.service_fee ?? calculateServiceFee(a.price ?? 0);
    return sum + fee;
  }, 0);
}

function calculateAverageApplicationPrice(applications: Application[]): number {
  const priced = applications.filter(a => a.price != null && a.price > 0);
  if (!priced.length) return 0;
  return Math.round(priced.reduce((s, a) => s + (a.price ?? 0), 0) / priced.length);
}

function calculateTopArea(requests: Request[]): string {
  const count: Record<string, number> = {};
  requests.forEach(r => { if (r.city) count[r.city] = (count[r.city] ?? 0) + 1; });
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? '—';
}

function calculateLowResponseRequests(requests: Request[], applications: Application[]): Request[] {
  const appCount: Record<string, number> = {};
  applications.forEach(a => { appCount[a.estimate_request_id] = (appCount[a.estimate_request_id] ?? 0) + 1; });
  return requests.filter(r => (appCount[r.id] ?? 0) === 0 && r.status === 'open');
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm px-5 py-4">
      <p className="text-xs font-bold text-slate-400 mb-1">{label}</p>
      <p className="text-3xl font-extrabold text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-3">{children}</h2>;
}

function statusBadge(status: string | null) {
  const map: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    matched: 'bg-green-100 text-green-700',
    closed: 'bg-slate-100 text-slate-500',
    available: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-600',
  };
  const cls = map[status ?? ''] ?? 'bg-slate-100 text-slate-500';
  return <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{status ?? '—'}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [craftsmen, setCraftsmen] = useState<Craftsman[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: reqs }, { data: crafts }, { data: apps }] = await Promise.all([
          supabase.from('estimate_requests').select('id,created_at,work_type,city,status,has_video,has_photos,urgency').order('created_at', { ascending: false }).limit(100),
          supabase.from('craftsmen').select('id,created_at,shop_name,full_name,service_area,work_types,experience_years').order('created_at', { ascending: false }).limit(100),
          supabase.from('job_applications').select('id,created_at,estimate_request_id,craftsman_id,status,price,service_fee,estimate_requests(work_type,city)').order('created_at', { ascending: false }).limit(200),
        ]);

        const hasData = (reqs?.length ?? 0) + (crafts?.length ?? 0) + (apps?.length ?? 0) > 0;
        if (hasData) {
          setRequests(reqs ?? []);
          setCraftsmen(crafts ?? []);
          setApplications((apps ?? []) as Application[]);
        } else {
          setRequests(DEMO_REQUESTS);
          setCraftsmen(DEMO_CRAFTSMEN);
          setApplications(DEMO_APPLICATIONS);
          setIsDemo(true);
        }
      } catch {
        setRequests(DEMO_REQUESTS);
        setCraftsmen(DEMO_CRAFTSMEN);
        setApplications(DEMO_APPLICATIONS);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Derived metrics ────────────────────────────────────────────────────────
  const todayRequests = requests.filter(r => r.created_at.startsWith(today));
  const matchedApps = applications.filter(a => a.status === 'matched');
  const expectedRevenue = calculateExpectedRevenue(matchedApps.length ? matchedApps : applications);
  const videoRate = calculateVideoRate(requests);
  const avgPrice = calculateAverageApplicationPrice(applications);
  const topArea = calculateTopArea(requests);
  const lowResponseReqs = calculateLowResponseRequests(requests, applications);

  const appCountByRequest: Record<string, number> = {};
  applications.forEach(a => { appCountByRequest[a.estimate_request_id] = (appCountByRequest[a.estimate_request_id] ?? 0) + 1; });

  const insufficientData = requests.length < 3 && craftsmen.length < 2;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo-full.svg" alt="PRO MATCH" className="h-7 object-contain" />
          <span className="text-xs font-bold text-slate-400 border border-slate-200 rounded-full px-2.5 py-0.5">管理画面</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/requests" className="text-xs font-bold text-blue-600 hover:underline">依頼管理 →</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">

        {/* Security notice */}
        <p className="text-[11px] text-slate-400 text-center">
          ⚠️ この管理画面は運営者専用です。公開前に認証制御を追加してください。
        </p>

        {/* Demo badge */}
        {isDemo && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-bold text-amber-700">
            📋 デモモード — Supabase にデータがないため、サンプルデータを表示しています
          </div>
        )}

        {/* KPI cards */}
        <section>
          <SectionTitle>サマリー</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="見積もり依頼数" value={requests.length} sub="累計" />
            <StatCard label="職人登録数" value={craftsmen.length} sub="累計" />
            <StatCard label="応募数" value={applications.length} sub="累計" />
            <StatCard label="成約見込み" value={matchedApps.length} sub="matched" />
            <StatCard label="見込み手数料" value={`¥${expectedRevenue.toLocaleString()}`} sub="成約分" />
            <StatCard label="今日の新規依頼" value={todayRequests.length} sub={today} />
          </div>
        </section>

        {/* Analysis cards */}
        <section>
          <SectionTitle>簡易分析</SectionTitle>
          {insufficientData && !isDemo ? (
            <div className="rounded-2xl bg-slate-100 px-5 py-6 text-center text-sm text-slate-500">
              まだ十分なデータがありません。依頼・応募・成約が増えると分析精度が上がります。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm px-5 py-4">
                <p className="text-xs font-bold text-slate-400 mb-1">動画あり案件の割合</p>
                <p className="text-3xl font-extrabold text-blue-600">{videoRate}%</p>
                <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${videoRate}%` }} />
                </div>
              </div>
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm px-5 py-4">
                <p className="text-xs font-bold text-slate-400 mb-1">応募が最も多いエリア</p>
                <p className="text-xl font-extrabold text-slate-900 leading-tight">{topArea}</p>
                <p className="text-xs text-slate-400 mt-1">依頼数ベース</p>
              </div>
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm px-5 py-4">
                <p className="text-xs font-bold text-slate-400 mb-1">平均概算金額</p>
                <p className="text-3xl font-extrabold text-slate-900">¥{avgPrice.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">応募ベース</p>
              </div>
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm px-5 py-4">
                <p className="text-xs font-bold text-slate-400 mb-1">応募がない案件数</p>
                <p className="text-3xl font-extrabold text-red-500">{lowResponseReqs.length}</p>
                <p className="text-xs text-slate-400 mt-1">open かつ応募0件</p>
              </div>
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm px-5 py-4">
                <p className="text-xs font-bold text-slate-400 mb-1">見込み手数料合計</p>
                <p className="text-3xl font-extrabold text-emerald-600">¥{calculateExpectedRevenue(applications).toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">全応募ベース</p>
              </div>
              <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm px-5 py-4">
                <p className="text-xs font-bold text-slate-400 mb-1">職人不足エリア</p>
                <p className="text-sm font-extrabold text-slate-900 leading-tight">
                  {lowResponseReqs.length > 0
                    ? [...new Set(lowResponseReqs.map(r => r.city).filter(Boolean))].slice(0, 3).join('、') || '—'
                    : '現時点で問題なし'}
                </p>
                <p className="text-xs text-slate-400 mt-1">応募0件案件のエリア</p>
              </div>
            </div>
          )}
        </section>

        {/* Requests table */}
        <section>
          <SectionTitle>依頼一覧（直近{requests.length}件）</SectionTitle>
          <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['工事内容', 'エリア', '動画', '応募数', 'ステータス', '日時'].map(h => (
                      <th key={h} className="text-left text-[11px] font-bold text-slate-400 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 20).map(r => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-slate-800">{r.work_type || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.city || '—'}</td>
                      <td className="px-4 py-3">
                        {r.has_video
                          ? <span className="text-blue-600 font-bold text-xs">▶ あり</span>
                          : <span className="text-slate-300 text-xs">なし</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-slate-100 text-slate-700 font-extrabold text-xs px-2 py-0.5 rounded-full">
                          {appCountByRequest[r.id] ?? 0}件
                        </span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(r.status)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{r.created_at.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Craftsmen table */}
        <section>
          <SectionTitle>職人一覧（{craftsmen.length}名）</SectionTitle>
          <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['屋号 / 名前', '対応エリア', '内装歴', '対応工事', '登録日'].map(h => (
                      <th key={h} className="text-left text-[11px] font-bold text-slate-400 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {craftsmen.map(c => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {c.shop_name || c.full_name || '—'}
                        {c.shop_name && c.full_name && (
                          <span className="block text-xs text-slate-400 font-normal">{c.full_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{c.service_area || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {c.experience_years != null ? `${c.experience_years}年` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(c.work_types ?? []).slice(0, 3).map(wt => (
                            <span key={wt} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{wt}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{c.created_at.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Applications table */}
        <section>
          <SectionTitle>応募一覧（直近{applications.length}件）</SectionTitle>
          <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['案件名', 'エリア', '概算金額', 'サービス料', '手取り目安', 'ステータス', '日時'].map(h => (
                      <th key={h} className="text-left text-[11px] font-bold text-slate-400 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.slice(0, 30).map(a => {
                    const price = a.price ?? 0;
                    const fee = a.service_fee ?? calculateServiceFee(price);
                    const takeHome = price - fee;
                    return (
                      <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {a.estimate_requests?.work_type || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {a.estimate_requests?.city || '—'}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-slate-900">
                          {price > 0 ? `¥${price.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {fee > 0 ? `¥${fee.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-emerald-600">
                          {takeHome > 0 ? `¥${takeHome.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3">{statusBadge(a.status)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{a.created_at.slice(0, 10)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p className="text-center text-[11px] text-slate-300 pb-6">
          PRO MATCH 管理画面 · データ取得: estimate_requests / craftsmen / job_applications
        </p>
      </div>
    </div>
  );
}
