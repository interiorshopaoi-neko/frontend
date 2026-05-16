import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import BottomNav from '../../components/BottomNav';
import { useAuth } from '../../hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardRow = {
  id: string;
  estimate_request_id: string;
  status: string | null;
  price: number | null;
  message: string | null;
  is_contracted: boolean | null;
  contracted_at: string | null;
  review_requested_at: string | null;
  reviewed_at: string | null;
  service_fee: number | null;
  created_at: string;
  estimate_requests: { work_type: string | null; area: string | null } | null;
};

type StatusLabel =
  | '全て'
  | '応募中'
  | '金額入力済み'
  | '依頼者確認中'
  | '成約済み'
  | '工事完了'
  | '見送り';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Exclude<StatusLabel, '全て'>,
  { bg: string; text: string; dot: string; icon: string }
> = {
  '応募中':       { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    icon: '📤' },
  '金額入力済み': { bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  icon: '💰' },
  '依頼者確認中': { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   icon: '🔍' },
  '成約済み':     { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500',   icon: '🤝' },
  '工事完了':     { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: '✅' },
  '見送り':       { bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400',   icon: '🚫' },
};

const FILTER_TABS: StatusLabel[] = [
  '全て', '応募中', '金額入力済み', '依頼者確認中', '成約済み', '工事完了', '見送り',
];

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO: DashboardRow[] = [
  {
    id: 'demo-d1',
    estimate_request_id: 'demo-1',
    status: null, price: null, message: null,
    is_contracted: false, contracted_at: null, review_requested_at: null, reviewed_at: null,
    service_fee: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    estimate_requests: { work_type: 'クロス張替え', area: '太田市' },
  },
  {
    id: 'demo-d2',
    estimate_request_id: 'demo-2',
    status: null, price: 45000, message: '午前中スタート希望です',
    is_contracted: false, contracted_at: null, review_requested_at: null, reviewed_at: null,
    service_fee: 2000,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    estimate_requests: { work_type: '床CF張替え', area: '伊勢崎市' },
  },
  {
    id: 'demo-d3',
    estimate_request_id: 'demo-3',
    status: null, price: 28000, message: null,
    is_contracted: false, contracted_at: null,
    review_requested_at: new Date(Date.now() - 86400000).toISOString(),
    reviewed_at: null,
    service_fee: 1000,
    created_at: new Date(Date.now() - 345600000).toISOString(),
    estimate_requests: { work_type: 'クロス補修', area: '前橋市' },
  },
  {
    id: 'demo-d4',
    estimate_request_id: 'demo-4',
    status: null, price: 28000, message: null,
    is_contracted: true, contracted_at: new Date(Date.now() - 432000000).toISOString(),
    review_requested_at: null, reviewed_at: null,
    service_fee: 1000,
    created_at: new Date(Date.now() - 518400000).toISOString(),
    estimate_requests: { work_type: '床補修', area: '高崎市' },
  },
  {
    id: 'demo-d5',
    estimate_request_id: 'demo-5',
    status: null, price: 95000, message: null,
    is_contracted: true,
    contracted_at: new Date(Date.now() - 864000000).toISOString(),
    review_requested_at: new Date(Date.now() - 518400000).toISOString(),
    reviewed_at: new Date(Date.now() - 259200000).toISOString(),
    service_fee: 3000,
    created_at: new Date(Date.now() - 950400000).toISOString(),
    estimate_requests: { work_type: 'クロス全面張替え', area: '桐生市' },
  },
  {
    id: 'demo-d6',
    estimate_request_id: 'demo-6',
    status: 'rejected', price: null, message: null,
    is_contracted: false, contracted_at: null, review_requested_at: null, reviewed_at: null,
    service_fee: null,
    created_at: new Date(Date.now() - 691200000).toISOString(),
    estimate_requests: { work_type: '補修工事', area: '沼田市' },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserId(): string {
  const stored = localStorage.getItem('user');
  if (stored) return String(JSON.parse(stored).id);
  return localStorage.getItem('craftsman_guest_id') ?? '';
}

function deriveStatus(app: DashboardRow): Exclude<StatusLabel, '全て'> {
  if (app.reviewed_at)            return '工事完了';
  if (app.review_requested_at)    return '依頼者確認中';
  if (app.is_contracted)          return '成約済み';
  if (app.status === 'rejected')  return '見送り';
  if (app.price != null)          return '金額入力済み';
  return '応募中';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ label }: { label: Exclude<StatusLabel, '全て'> }) {
  const cfg = STATUS_CONFIG[label];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  );
}

function SummaryCard({ icon, value, label, accent }: {
  icon: string; value: number; label: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${accent ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-200'} shadow-sm`}>
      <p className="text-base">{icon}</p>
      <p className={`text-xl font-extrabold leading-tight ${accent ? 'text-blue-700' : 'text-slate-900'}`}>{value}</p>
      <p className={`text-[11px] mt-0.5 ${accent ? 'text-blue-500' : 'text-slate-400'}`}>{label}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

async function ensureCraftsmanProfile(userId: string, userName: string, userEmail: string) {
  const { error } = await supabase
    .from('craftsmen')
    .upsert(
      {
        user_id: userId,
        full_name: userName,
        email: userEmail,
        free_credits_remaining: 2,
        referral_bonus_credits: 0,
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );
  if (error) console.warn('[ensureCraftsmanProfile] error:', error);
}

export default function CraftsmanDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [apps,        setApps]        = useState<DashboardRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [isDemo,      setIsDemo]      = useState(false);
  const [filter,      setFilter]      = useState<StatusLabel>('全て');
  const [reporting,   setReporting]   = useState<string | null>(null); // appId
  const [freeCredits,  setFreeCredits]  = useState<{ remaining: number; bonus: number } | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  // localStorage の user.id を優先し、なければ useAuth の user.id を使う
  const userId = getUserId() || (user?.id ?? '');

  const handleLogout = () => {
    logout();
    localStorage.clear();
    navigate('/login');
  };

  // 工事完了報告: SECURITY DEFINER RPC で review_requested_at を設定し、依頼者にレビュー依頼メールを送る
  // 注意: sb_publishable キー環境では .from().update() が hanging するため RPC 経由を使用
  async function handleCompleteReport(appId: string, estimateRequestId: string) {
    if (reporting) return; // 二重送信防止
    setReporting(appId);
    const now = new Date().toISOString();

    const { error } = await supabase.rpc('report_work_complete', { p_application_id: appId });

    setReporting(null);

    if (error) {
      console.error('[handleCompleteReport] RPC error:', error);
      alert('更新に失敗しました。もう一度お試しください。');
      return;
    }

    // ローカルステートを楽観的更新（再フェッチなし）
    setApps(prev => prev.map(a =>
      a.id === appId ? { ...a, review_requested_at: now } : a
    ));

    // 依頼者へレビュー依頼メール — fire-and-forget
    fetch('/api/notify-review-request', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ request_id: estimateRequestId, application_id: appId }),
    }).catch(err => console.warn('[notify-review-request] fire-and-forget error:', err));
  }

  // 無料枠残数 + 紹介コード取得
  useEffect(() => {
    if (!userId) return;
    supabase
      .rpc('get_my_free_credits', { p_user_id: userId })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) setFreeCredits({ remaining: row.free_credits_remaining ?? 0, bonus: row.referral_bonus_credits ?? 0 });
      })
      .catch(() => { /* 表示しない */ });
    void (async () => {
      try {
        const { data } = await supabase.rpc('get_my_referral_code', { p_user_id: userId });
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.referral_code) setReferralCode(row.referral_code);
      } catch { /* 表示しない */ }
    })();
  }, [userId]);

  useEffect(() => {
    (async () => {
      if (!userId) {
        // DEV + ?demo=1 のみ DEMO 許可。本番は /login へ
        if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === '1') {
          setApps(DEMO); setIsDemo(true); setLoading(false); return;
        }
        navigate('/login');
        return;
      }

      // Step 1: job_applications（FK制約なしのためJOIN不可 → 別クエリでマージ）
      const { data: appData, error: appError } = await supabase
        .from('job_applications')
        .select('*')
        .eq('craftsman_id', userId)
        .order('created_at', { ascending: false });

      if (appError || !appData || appData.length === 0) {
        if (appError) console.error('[CraftsmanDashboardPage] fetch error:', appError);
        // craftsmen テーブルに row が存在しない可能性があるため自動生成を試みる
        if (user?.id) {
          await ensureCraftsmanProfile(user.id, user.name ?? '', user.email ?? '');
        }
        // 0件は空状態。DEMO には落ちない（security/P1）
        setLoading(false);
        return;
      }

      // Step 2: estimate_requests を一括取得してマージ
      const requestIds = [...new Set(appData.map((a: any) => a.estimate_request_id))];
      const { data: reqData } = await supabase
        .from('estimate_requests')
        .select('id, work_type, area')
        .in('id', requestIds);

      const reqMap = new Map((reqData ?? []).map((r: any) => [String(r.id), r]));

      const merged = appData.map((a: any) => ({
        ...a,
        estimate_requests: reqMap.get(String(a.estimate_request_id)) ?? null,
      }));

      setApps(merged as DashboardRow[]);
      setLoading(false);
    })();
  }, [userId]);

  // ローディング中は白画面にならないようスピナーを表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const withStatus = apps.map(a => ({ ...a, _status: deriveStatus(a) }));

  // 成約済みを最上部に優先表示（職人が選ばれたことをすぐ分かるように）
  const sortedWithStatus = [...withStatus].sort((a, b) => {
    const priority = (s: StatusLabel) =>
      s === '成約済み' ? 0 : s === '依頼者確認中' ? 1 : s === '金額入力済み' ? 2 : s === '応募中' ? 3 : 4;
    return priority(a._status) - priority(b._status);
  });

  const filtered = filter === '全て'
    ? sortedWithStatus
    : sortedWithStatus.filter(a => a._status === filter);

  const counts = {
    active:    withStatus.filter(a => a._status === '応募中' || a._status === '金額入力済み' || a._status === '依頼者確認中').length,
    contracted: withStatus.filter(a => a._status === '成約済み').length,
    done:       withStatus.filter(a => a._status === '工事完了').length,
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
                <line x1="9" y1="16" x2="13" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-none">案件管理</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">応募・進行中・完了の一覧</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/craftsman/jobs" className="text-xs text-blue-600 font-semibold hover:underline">
              案件を探す →
            </a>
            <button
              onClick={handleLogout}
              className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto pb-24">

        {/* デモバナー */}
        {isDemo && (
          <div className="mx-4 mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2">
            <span className="text-amber-500 text-xs">📋</span>
            <p className="text-xs text-amber-700 font-semibold">
              デモ表示中 — ログイン後に実際の応募状況が表示されます
            </p>
          </div>
        )}

        {/* 無料枠残数バナー */}
        {freeCredits !== null && (() => {
          const total = freeCredits.remaining + freeCredits.bonus;
          return (
            <>
              <div className={`mx-4 mt-4 rounded-xl px-3 py-2.5 flex items-center justify-between ${
                total > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100 border border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{total > 0 ? '🎁' : '🔒'}</span>
                  <div>
                    <p className={`text-xs font-bold ${total > 0 ? 'text-emerald-800' : 'text-slate-600'}`}>
                      {total > 0 ? `無料連絡先確認 残り ${total} 件` : '無料枠を使い切りました'}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${total > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {total > 0
                        ? freeCredits.bonus > 0
                          ? `初回${freeCredits.remaining}件 + 紹介ボーナス${freeCredits.bonus}件`
                          : '成約案件の応募状況ページから確認できます'
                        : '正式版では決済後に連絡先を確認できます'}
                    </p>
                  </div>
                </div>
                {total > 0 && (
                  <span className="text-xl font-extrabold text-emerald-600">{total}</span>
                )}
              </div>

              {/* 残数警告: あと1件以下 */}
              {total === 1 && (
                <div className="mx-4 mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2">
                  <span className="text-amber-500 text-xs">⚠</span>
                  <p className="text-xs text-amber-700 font-semibold">あと1件で無料枠が終了します</p>
                </div>
              )}
            </>
          );
        })()}

        {/* 紹介で無料枠を増やす */}
        {referralCode && (() => {
          const shareUrl = `https://promatch-app.jp/craftsman?ref=${referralCode}`;
          const shareText = `動画で案件を見れる内装マッチング。\n\n無料で2件まで\n連絡先確認できます。\n\n紹介で無料枠も増やせます。\n\n${shareUrl}`;
          const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
          return (
            <div className="mx-4 mt-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
              <p className="text-xs font-extrabold text-blue-800 mb-1">🎁 紹介で無料枠を増やせます</p>
              <p className="text-[11px] text-blue-600 leading-relaxed mb-3">
                友達が登録して案件応募すると<br />無料連絡先確認が <strong>+1件</strong>
              </p>
              <a
                href={lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#06C755] text-white text-sm font-bold py-2.5 hover:opacity-90 transition-opacity"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINEで紹介する
              </a>
            </div>
          );
        })()}

        {/* 手数料ルールnotice */}
        <div className="mx-4 mt-4 rounded-xl bg-slate-100 px-3 py-2.5 space-y-0.5">
          <p className="text-[11px] text-slate-500">・サービス利用料は成約時点の概算金額を基準に確定します</p>
          <p className="text-[11px] text-slate-500">・工事代金は依頼者と直接やり取りします。PRO MATCHは工事代金をお預かりしません</p>
          <p className="text-[11px] text-slate-500">・成約後の外部誘導・虚偽申告が確認された場合、アカウント制限の対象となる場合があります</p>
        </div>

        {/* サマリー */}
        <div className="grid grid-cols-3 gap-3 px-4 pt-4">
          <SummaryCard icon="📤" value={counts.active}     label="進行中" accent />
          <SummaryCard icon="🤝" value={counts.contracted} label="成約済み" />
          <SummaryCard icon="✅" value={counts.done}       label="工事完了" />
        </div>

        {/* ステータスフィルター */}
        <div className="mt-4 px-4 overflow-x-auto">
          <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
            {FILTER_TABS.map(tab => {
              const count = tab === '全て'
                ? apps.length
                : withStatus.filter(a => a._status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border whitespace-nowrap transition ${
                    filter === tab
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {tab}
                  {count > 0 && (
                    <span className={`rounded-full text-[10px] font-extrabold px-1.5 py-0.5 leading-none ${
                      filter === tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* カード一覧 */}
        <div className="px-4 mt-4 space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center gap-3">
              <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">読み込み中...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm font-bold text-slate-700">
                {filter === '全て' ? 'まだ応募した案件がありません' : `「${filter}」の案件はありません`}
              </p>
              {filter === '全て' && (
                <a
                  href="/craftsman/jobs"
                  className="mt-4 inline-block bg-blue-600 text-white rounded-2xl px-6 py-2.5 text-sm font-extrabold"
                >
                  案件を探す
                </a>
              )}
            </div>
          ) : (
            filtered.map(app => {
              const workType = app.estimate_requests?.work_type ?? '内装工事';
              const city     = app.estimate_requests?.area ?? 'エリア未設定';
              const isSensitive = app._status === '成約済み' || app._status === '工事完了';

              return (
                <article key={app.id} className={`bg-white rounded-3xl shadow-sm overflow-hidden ${
                  app._status === '成約済み'
                    ? 'border-2 border-green-400 ring-2 ring-green-100'
                    : 'border border-slate-200'
                }`}>

                  {/* ★ 成約トップバナー — 職人向けに「選ばれた」を最大強調 */}
                  {app._status === '成約済み' && (
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3.5">
                      <p className="text-white font-extrabold text-sm leading-snug">
                        🎉 依頼者があなたを選びました！
                      </p>
                      <p className="text-green-100 text-[11px] mt-1 leading-relaxed">
                        「詳細を見る」から依頼者のメールアドレスを確認し、連絡してください。
                      </p>
                      <p className="text-green-200 text-[10px] mt-0.5">
                        ※ 無料枠を1件使用して連絡先を開示します
                      </p>
                    </div>
                  )}

                  {/* カードヘッダー */}
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge label={app._status} />
                        </div>
                        <h2 className="text-base font-extrabold text-slate-900 leading-snug truncate">
                          {workType}
                        </h2>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                          {city}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-400 flex-shrink-0 mt-0.5">
                        {formatDate(app.created_at)} 依頼
                      </p>
                    </div>

                    {/* 金額・手数料グリッド */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] text-slate-400 font-bold">概算金額</p>
                        <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                          {app.price != null ? `¥${app.price.toLocaleString()}` : '未入力'}
                        </p>
                      </div>
                      <div className={`rounded-xl px-3 py-2 ${app.service_fee ? 'bg-amber-50' : 'bg-slate-50'}`}>
                        <p className="text-[10px] text-slate-400 font-bold">成立時手数料</p>
                        <p className={`text-sm font-extrabold mt-0.5 ${app.service_fee ? 'text-amber-700' : 'text-slate-400'}`}>
                          {app.service_fee != null ? `¥${app.service_fee.toLocaleString()}` : '—'}
                        </p>
                      </div>
                    </div>

                    {/* メッセージ */}
                    {app.message && (
                      <p className="mt-2 text-xs text-slate-600 bg-blue-50 rounded-xl px-3 py-2 leading-relaxed">
                        💬 {app.message}
                      </p>
                    )}
                  </div>

                  {/* 成約情報バナー */}
                  {isSensitive && (
                    <div className="border-t border-slate-100 bg-green-50 px-4 py-3">
                      {app._status === '工事完了' ? (
                        <p className="text-[11px] text-green-700 font-bold">✅ 工事完了 — 実績として記録されました</p>
                      ) : (
                        <>
                          <p className="text-[11px] text-green-700 font-bold mb-1.5">🤝 成約済み</p>
                          <ul className="space-y-0.5">
                            <li className="text-[11px] text-green-800 leading-relaxed">📧 まずはメールで日程・詳細を調整してください</li>
                            <li className="text-[11px] text-slate-500 leading-relaxed">🔒 電話番号・LINEは表示されません</li>
                            <li className="text-[11px] text-slate-500 leading-relaxed">⭐ 工事完了後にレビュー依頼へ進めます</li>
                          </ul>
                        </>
                      )}
                    </div>
                  )}

                  {/* 工事完了報告ボタン */}
                  {app._status === '成約済み' && (
                    <div className="border-t border-green-100 bg-green-50 px-4 py-3">
                      <button
                        onClick={() => handleCompleteReport(app.id, app.estimate_request_id)}
                        disabled={reporting === app.id}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-xs font-extrabold transition active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        {reporting === app.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            送信中...
                          </>
                        ) : '✅ 工事完了を報告する'}
                      </button>
                      <p className="text-[10px] text-slate-400 text-center mt-1.5">
                        押すと依頼者にレビュー依頼メールが届きます
                      </p>
                    </div>
                  )}

                  {/* レビュー待ちバナー */}
                  {app._status === '依頼者確認中' && app.review_requested_at && !app.reviewed_at && (
                    <div className="border-t border-amber-100 bg-amber-50 px-4 py-2.5 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-amber-700 font-bold">⭐ 依頼者がレビューを入力できます</p>
                      <button
                        onClick={() => navigate(`/request/${app.estimate_request_id}/review`)}
                        className="text-[11px] text-blue-600 font-bold underline"
                      >
                        レビュー画面
                      </button>
                    </div>
                  )}

                  {/* アクションボタン */}
                  <div className="border-t border-slate-100 px-4 py-3 flex gap-2">
                    <button
                      onClick={() => navigate(`/craftsman/apply/${app.estimate_request_id}`, {
                        state: { readOnly: true }
                      })}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-xs font-extrabold transition active:scale-95"
                    >
                      詳細を見る
                    </button>
                    <button
                      onClick={() => navigate(`/craftsman/profile/${userId}`)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-xs font-bold transition active:scale-95"
                    >
                      マイプロフィール
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {apps.length > 0 && (
          <p className="mt-6 text-center text-xs text-slate-400 px-4 leading-relaxed">
            🔒 依頼者の個人情報（電話・住所など）は成約後のやりとりでのみ開示されます
          </p>
        )}

        {/* 利益記録への導線 */}
        <div className="mt-5 mx-0 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-700">工事後は利益を記録しましょう</p>
            <p className="text-[11px] text-slate-400 mt-0.5">売上・材料費・利益を現場ごとに管理</p>
          </div>
          <button
            onClick={() => navigate('/tools')}
            className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm shadow-blue-200 transition active:scale-95"
          >
            利益を記録する
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
