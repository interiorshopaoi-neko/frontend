import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

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

type ContactState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'unlocked'; method: string; value: string }
  | { kind: 'non_email'; method: string | null }   // LINE/電話は非開示
  | { kind: 'payment_required' }
  | { kind: 'not_contracted' }
  | { kind: 'error'; message: string };

// ─── Demo data ────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── ContactPanel ─────────────────────────────────────────────────────────────
// 成約済みカードの下部に表示する連絡先確認パネル

function ContactPanel({
  appId,
  craftsmanId,
  state,
  onReveal,
}: {
  appId:       string;
  craftsmanId: string;
  state:       ContactState;
  onReveal:    (appId: string, craftsmanId: string) => void;
}) {
  if (state.kind === 'unlocked') {
    return (
      <div className="border-t border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1.5">
          依頼者の連絡先
        </p>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          <a
            href={`mailto:${state.value}`}
            className="text-sm font-extrabold text-blue-700 hover:underline break-all"
          >
            {state.value}
          </a>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
          ※ まずはメールで日程・詳細をご確認ください
        </p>
      </div>
    );
  }

  if (state.kind === 'non_email') {
    return (
      <div className="border-t border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-700 font-bold mb-0.5">
          📬 連絡先は{state.method ?? '非メール'}形式のため表示できません
        </p>
        <p className="text-[11px] text-amber-600 leading-relaxed">
          運営より依頼者へご連絡いたします。しばらくお待ちください。
        </p>
      </div>
    );
  }

  if (state.kind === 'payment_required') {
    return (
      <div className="border-t border-rose-100 bg-rose-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="text-base leading-none mt-0.5">🔒</span>
          <div>
            <p className="text-xs font-extrabold text-rose-700 mb-0.5">
              無料枠を使い切りました
            </p>
            <p className="text-[11px] text-rose-600 leading-relaxed">
              連絡先の確認には決済が必要です。<br />
              Stripe決済は近日対応予定です。
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === 'loading') {
    return (
      <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
        <p className="text-xs text-slate-500">確認中...</p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="border-t border-red-100 bg-red-50 px-4 py-3">
        <p className="text-xs text-red-600 font-bold">
          ⚠ エラーが発生しました。もう一度お試しください。
        </p>
      </div>
    );
  }

  if (state.kind === 'not_contracted') {
    return null; // 成約前は表示しない
  }

  // idle: ボタン表示
  return (
    <div className="border-t border-slate-100 px-4 py-3">
      <button
        onClick={() => onReveal(appId, craftsmanId)}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-xs font-extrabold transition active:scale-[0.98] shadow-sm shadow-blue-200"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
        連絡先を確認する
      </button>
      <p className="text-[10px] text-slate-400 text-center mt-1.5 leading-relaxed">
        初回2件まで無料 · メールアドレスのみ開示
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CraftsmanApplicationsPage() {
  const navigate     = useNavigate();
  const [apps,       setApps]       = useState<ApplicationRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [isDemo,     setIsDemo]     = useState(false);
  const [craftsmanId, setCraftsmanId] = useState<string | null>(null);

  // 連絡先開示の状態管理（application_id → ContactState）
  const [contactStates, setContactStates] =
    useState<Map<string, ContactState>>(new Map());

  const setContact = useCallback((appId: string, state: ContactState) => {
    setContactStates(prev => new Map(prev).set(appId, state));
  }, []);

  // ── データ取得 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem('user');
      const uid    = stored ? JSON.parse(stored).id : null;
      setCraftsmanId(uid);

      if (!uid) {
        if (import.meta.env.DEV) { setApps(DEMO); setIsDemo(true); }
        setLoading(false);
        return;
      }

      // FK制約なしのためJOIN不可 → 別クエリでマージ
      const { data: appData, error: appError } = await supabase
        .from('job_applications')
        .select('*')
        .eq('craftsman_id', uid)
        .order('created_at', { ascending: false });

      if (appError || !appData || appData.length === 0) {
        if (import.meta.env.DEV) { setApps(DEMO); setIsDemo(true); }
        setLoading(false);
        return;
      }

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

      setApps(merged as ApplicationRow[]);
      setLoading(false);
    })();
  }, []);

  // ── 連絡先確認ハンドラ ──────────────────────────────────────────────────────
  const handleReveal = useCallback(async (appId: string, cId: string) => {
    const current = contactStates.get(appId);
    // すでにロード中・開示済みなら何もしない
    if (current?.kind === 'loading' || current?.kind === 'unlocked') return;

    setContact(appId, { kind: 'loading' });

    try {
      const res  = await fetch('/api/check-billing', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ application_id: appId, craftsman_id: cId }),
      });
      const data = await res.json();

      switch (data.status) {
        case 'ok':
        case 'already_unlocked':
          if (data.non_email) {
            setContact(appId, { kind: 'non_email', method: data.contact_method });
          } else {
            setContact(appId, {
              kind:   'unlocked',
              method: data.contact_method,
              value:  data.contact_value,
            });
          }
          break;
        case 'payment_required':
          setContact(appId, { kind: 'payment_required' });
          break;
        case 'not_contracted':
          setContact(appId, { kind: 'not_contracted' });
          break;
        default:
          setContact(appId, { kind: 'error', message: data.message ?? 'unknown' });
      }
    } catch (err) {
      console.error('[check-billing] fetch error:', err);
      setContact(appId, { kind: 'error', message: 'fetch_failed' });
    }
  }, [contactStates, setContact]);

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
            <p className="text-xs text-amber-700 font-semibold">
              デモ表示中 — ログイン後に実際の応募状況が表示されます
            </p>
          </div>
        )}

        {/* サマリー */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '応募数',   value: apps.length,     icon: '📤' },
            { label: '成約済み', value: contractedCount,  icon: '🤝' },
            { label: 'レビュー', value: reviewedCount,    icon: '⭐' },
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
              const workType  = app.estimate_requests?.work_type ?? '内装工事';
              const city      = app.estimate_requests?.area ?? 'エリア未設定';
              const cState    = contactStates.get(app.id) ?? { kind: 'idle' };

              return (
                <article
                  key={app.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                >
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
                          {app.reviewed_at
                            ? '表示予定あり'
                            : app.is_contracted
                              ? '成約後に表示'
                              : '応募中'}
                        </p>
                      </div>
                    </div>

                    {app.message && (
                      <p className="mt-2 text-xs text-slate-500 bg-blue-50 rounded-xl px-3 py-2 leading-relaxed">
                        💬 {app.message}
                      </p>
                    )}
                  </div>

                  {/* ── 成約済み: 連絡先確認パネル ── */}
                  {app.is_contracted && craftsmanId && (
                    <ContactPanel
                      appId={app.id}
                      craftsmanId={craftsmanId}
                      state={cState}
                      onReveal={handleReveal}
                    />
                  )}

                  {/* ── 成約済み: レビュー案内（連絡先開示とは別）── */}
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
