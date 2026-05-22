import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import BottomNav from '../../components/BottomNav';

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

type FreeCredits = { remaining: number; bonus: number } | null;

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO: ApplicationRow[] = [
  {
    // 成約済み（連絡先未開示）— 最上部に表示されるべきカード
    id: 'demo-a0',
    estimate_request_id: 'demo-0',
    status: 'available',
    price: 45000,
    message: 'よろしくお願いします',
    is_contracted: true,
    contracted_at: new Date(Date.now() - 3600000).toISOString(),
    review_requested_at: null,
    reviewed_at: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    estimate_requests: { work_type: 'クロス全面張替え', area: '前橋市' },
  },
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
    created_at: new Date(Date.now() - 172800000).toISOString(),
    estimate_requests: { work_type: 'クロス張替え', area: '太田市' },
  },
  {
    // レビュー待ち
    id: 'demo-a2',
    estimate_request_id: 'demo-2',
    status: 'available',
    price: 28000,
    message: '午前中スタート希望です',
    is_contracted: true,
    contracted_at: new Date(Date.now() - 604800000).toISOString(),
    review_requested_at: new Date(Date.now() - 86400000).toISOString(),
    reviewed_at: null,
    created_at: new Date(Date.now() - 691200000).toISOString(),
    estimate_requests: { work_type: '床CF張替え', area: '伊勢崎市' },
  },
];

// ─── Sort helper ──────────────────────────────────────────────────────────────

function sortApps(apps: ApplicationRow[]): ApplicationRow[] {
  const priority = (a: ApplicationRow): number => {
    if (a.is_contracted && !a.review_requested_at) return 0; // 成約中（TOP）
    if (a.review_requested_at && !a.reviewed_at)  return 1; // レビュー待ち
    if (a.reviewed_at)                             return 2; // 完了済み
    return 3;                                                // 応募中
  };
  return [...apps].sort((a, b) => priority(a) - priority(b));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ app }: { app: ApplicationRow }) {
  if (app.reviewed_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
        ✅ 工事完了・実績確定
      </span>
    );
  }
  if (app.review_requested_at && !app.reviewed_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
        ⭐ レビュー待ち
      </span>
    );
  }
  if (app.is_contracted && !app.review_requested_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
        🎉 成約済み
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
  estimateRequestId,
  state,
  freeCredits,
  onReveal,
  onCheckout,
}: {
  appId:             string;
  craftsmanId:       string;
  estimateRequestId: string;
  state:             ContactState;
  freeCredits:       FreeCredits;
  onReveal:          (appId: string, craftsmanId: string) => void;
  onCheckout:        (appId: string, craftsmanId: string, estimateRequestId: string) => void;
}) {
  const [copied,    setCopied]    = useState(false);
  const [contacted, setContacted] = useState(false);

  if (state.kind === 'unlocked') {
    const handleCopy = () => {
      navigator.clipboard.writeText(state.value).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };

    return (
      <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-4 space-y-3">
        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
          依頼者の連絡先
        </p>

        {/* Email display */}
        <div className="flex items-center gap-2 bg-white rounded-xl border border-emerald-200 px-3 py-2.5">
          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          <span className="text-base font-extrabold text-slate-900 break-all flex-1">
            {state.value}
          </span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 text-[11px] font-bold text-emerald-600 hover:text-emerald-800 transition"
          >
            {copied ? '✅ コピー済み' : 'コピー'}
          </button>
        </div>

        {/* mailto button */}
        <a
          href={`mailto:${state.value}`}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-sm font-extrabold transition active:scale-[0.98] shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          メールを送る
        </a>

        {/* 連絡済みチェック */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={contacted}
            onChange={e => setContacted(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 rounded"
          />
          <span className="text-xs font-bold text-slate-600">
            📬 連絡済みにする
          </span>
          {contacted && (
            <span className="text-[10px] text-emerald-600 font-bold">（確認済み）</span>
          )}
        </label>

        <p className="text-[10px] text-slate-400 leading-relaxed">
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
      <div className="border-t border-rose-100 bg-rose-50 px-4 py-4 space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-base leading-none mt-0.5">🔒</span>
          <div>
            <p className="text-xs font-extrabold text-rose-700 mb-0.5">
              無料枠がありません
            </p>
            <p className="text-[11px] text-rose-600 leading-relaxed">
              成約時のみサービス料がかかります。<br />
              紹介コードで無料枠を増やすこともできます。
            </p>
          </div>
        </div>
        <button
          onClick={() => onCheckout(appId, craftsmanId, estimateRequestId)}
          className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2.5 text-xs font-extrabold transition active:scale-[0.98] shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          決済して連絡先を見る
        </button>
        {/* 紹介コード誘導 */}
        <a
          href="/craftsman/dashboard"
          className="flex items-center gap-2 w-full rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 hover:bg-blue-100 transition-colors"
        >
          <span className="text-sm">🎁</span>
          <div>
            <p className="text-[11px] font-extrabold text-blue-700">紹介コードで無料枠+2件</p>
            <p className="text-[10px] text-blue-500">友人職人が登録すると自動で付与 → 管理画面へ</p>
          </div>
          <span className="text-blue-400 ml-auto text-xs">→</span>
        </a>
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

  // idle: 事前情報 + ボタン表示
  const totalCredits = freeCredits ? freeCredits.remaining + freeCredits.bonus : null;

  return (
    <div className="border-t border-slate-100 px-4 py-4 space-y-3">
      {/* 事前情報 */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3 space-y-1.5">
        {totalCredits !== null && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">無料枠残り</span>
            <span className="text-[11px] font-extrabold text-emerald-600">{totalCredits} 件</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">•</span>
          <span className="text-[11px] text-slate-600">今回1件消費します</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">•</span>
          <span className="text-[11px] text-slate-600">開示後は取り消せません</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">•</span>
          <span className="text-[11px] text-slate-600">成約時のみ手数料</span>
        </div>
      </div>

      <button
        onClick={() => onReveal(appId, craftsmanId)}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-xs font-extrabold transition active:scale-[0.98] shadow-sm shadow-blue-200"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
        連絡先を確認する
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CraftsmanApplicationsPage() {
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const paidSuccess  = searchParams.get('paid') === '1';
  const [apps,       setApps]       = useState<ApplicationRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [isDemo,     setIsDemo]     = useState(false);
  const [craftsmanId, setCraftsmanId] = useState<string | null>(null);

  // 無料枠残数
  const [freeCredits, setFreeCredits] = useState<FreeCredits>(null);

  // 連絡先開示の状態管理（application_id → ContactState）
  const [contactStates, setContactStates] =
    useState<Map<string, ContactState>>(new Map());

  // 工事完了ボタンのローディング状態
  const [reporting, setReporting] = useState<string | null>(null);

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
        // 未認証は /login へ。DEMO 表示しない
        navigate('/login');
        return;
      }

      // 無料枠残数を取得（失敗しても表示しないだけ）
      supabase
        .rpc('get_my_free_credits', { p_user_id: uid })
        .then(({ data }) => {
          const row = Array.isArray(data) ? data[0] : data;
          if (row) {
            setFreeCredits({
              remaining: row.free_credits_remaining ?? 0,
              bonus:     row.referral_bonus_credits  ?? 0,
            });
          }
        })
        .catch(() => { /* 表示しない */ });

      // FK制約なしのためJOIN不可 → 別クエリでマージ
      const { data: appData, error: appError } = await supabase
        .from('job_applications')
        .select('*')
        .eq('craftsman_id', uid)
        .order('created_at', { ascending: false });

      if (appError || !appData || appData.length === 0) {
        // 0件は空状態。エラーのみログ出力。DEMO に落ちない
        if (appError) console.error('[CraftsmanApplicationsPage] fetch error:', appError);
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
          // 新規開示 → 残数を楽観的更新（正は DB）
          setFreeCredits(prev => {
            if (!prev) return prev;
            if (prev.remaining > 0) return { ...prev, remaining: prev.remaining - 1 };
            if (prev.bonus > 0)     return { ...prev, bonus: prev.bonus - 1 };
            return prev;
          });
          // fallthrough
        case 'already_unlocked': // eslint-disable-line no-fallthrough
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

  // ── Stripe 決済ハンドラ ─────────────────────────────────────────────────────
  const handleCheckout = useCallback(async (
    appId: string,
    cId:   string,
    erqId: string,
  ) => {
    setContact(appId, { kind: 'loading' });
    try {
      const res  = await fetch('/api/create-checkout-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ craftsman_id: cId, estimate_request_id: erqId }),
      });
      const data = await res.json();
      if (data.already_unlocked) {
        // 既に開示済み（Webhook 処理済み） → 連絡先を再取得
        void handleReveal(appId, cId);
        return;
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setContact(appId, { kind: 'error', message: data.error ?? 'checkout_failed' });
    } catch (err) {
      console.error('[checkout] fetch error:', err);
      setContact(appId, { kind: 'error', message: 'fetch_failed' });
    }
  }, [handleReveal, setContact]);

  // ── 工事完了報告ハンドラ ────────────────────────────────────────────────────
  const handleReportComplete = useCallback(async (app: ApplicationRow) => {
    if (reporting === app.id) return;
    setReporting(app.id);

    try {
      const { error } = await supabase.rpc('report_work_complete', {
        p_application_id: app.id,
      });
      if (error) {
        console.error('[report_work_complete] error:', error);
        setReporting(null);
        return;
      }

      // 楽観的更新: review_requested_at をセット
      setApps(prev =>
        prev.map(a =>
          a.id === app.id
            ? { ...a, review_requested_at: new Date().toISOString() }
            : a
        )
      );

      // fire-and-forget: レビュー依頼通知
      fetch('/api/notify-review', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:           'request',
          request_id:     app.estimate_request_id,
          application_id: app.id,
        }),
      }).catch(() => { /* ignore */ });
    } catch (err) {
      console.error('[report_work_complete] fetch error:', err);
    } finally {
      setReporting(null);
    }
  }, [reporting]);

  const contractedCount = apps.filter(a => a.is_contracted).length;
  const reviewedCount   = apps.filter(a => a.reviewed_at).length;

  const sortedApps = sortApps(apps);

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

      <div className="max-w-2xl mx-auto px-4 py-5 pb-24 space-y-4">

        {paidSuccess && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-2">
            <span className="text-blue-500 text-base flex-shrink-0">✅</span>
            <div>
              <p className="text-xs font-extrabold text-blue-800">決済が完了しました</p>
              <p className="text-[10px] text-blue-600 mt-0.5">
                成約案件の「連絡先を確認する」でメールアドレスが表示されます
              </p>
            </div>
          </div>
        )}

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

        {/* 無料枠残数バナー */}
        {freeCredits !== null && (() => {
          const total = freeCredits.remaining + freeCredits.bonus;
          if (total > 0) {
            return (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎁</span>
                  <div>
                    <p className="text-xs font-extrabold text-emerald-800">無料連絡先確認 残り {total} 件</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">成約案件の「連絡先を確認する」で使えます</p>
                  </div>
                </div>
                <span className="text-2xl font-extrabold text-emerald-600">{total}</span>
              </div>
            );
          }
          return (
            <div className="rounded-2xl bg-slate-100 border border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔒</span>
                <div>
                  <p className="text-xs font-bold text-slate-600">無料枠を使い切りました</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">決済後に連絡先を確認できます</p>
                </div>
              </div>
              <a
                href="/craftsman/dashboard"
                className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700"
              >
                <span>🎁</span>
                <span>紹介コードで無料枠+2件 → 管理画面へ</span>
              </a>
            </div>
          );
        })()}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            読み込み中...
          </div>
        ) : sortedApps.length === 0 ? (
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
            {sortedApps.map(app => {
              const workType  = app.estimate_requests?.work_type ?? '内装工事';
              const city      = app.estimate_requests?.area ?? 'エリア未設定';
              const cState    = contactStates.get(app.id) ?? { kind: 'idle' };
              const isActiveContracted = app.is_contracted && !app.review_requested_at;

              return (
                <article
                  key={app.id}
                  className={[
                    'bg-white rounded-3xl border shadow-sm overflow-hidden',
                    isActiveContracted
                      ? 'border-emerald-300 ring-2 ring-emerald-400'
                      : 'border-slate-200',
                  ].join(' ')}
                >
                  {/* ── 成約バナー（フル幅）── */}
                  {isActiveContracted && (
                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3">
                      <p className="text-sm font-extrabold text-white leading-snug">
                        🎉 依頼者があなたを選びました！
                      </p>
                      <p className="text-[11px] text-emerald-100 mt-0.5">
                        まずはメールでご連絡ください
                      </p>
                    </div>
                  )}

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
                      estimateRequestId={app.estimate_request_id}
                      state={cState}
                      freeCredits={freeCredits}
                      onReveal={handleReveal}
                      onCheckout={handleCheckout}
                    />
                  )}

                  {/* ── レビュー待ちメッセージ ── */}
                  {app.review_requested_at && !app.reviewed_at && (
                    <div className="border-t border-amber-100 bg-amber-50 px-4 py-3">
                      <p className="text-xs text-amber-700 font-bold">
                        ⭐ 依頼者がレビューを入力できます — まもなく実績に反映されます
                      </p>
                    </div>
                  )}

                  {/* ── 完了・レビュー取得済みメッセージ ── */}
                  {app.reviewed_at && (
                    <div className="border-t border-green-100 bg-green-50 px-4 py-3">
                      <p className="text-xs text-green-700 font-bold">
                        ✅ 工事完了 · ⭐ レビュー取得済み — 実績として登録されました
                      </p>
                    </div>
                  )}

                  {/* ── 成約中: 工事完了報告ボタン ── */}
                  {isActiveContracted && (
                    <div className="border-t border-emerald-100 px-4 py-3">
                      <button
                        onClick={() => handleReportComplete(app)}
                        disabled={reporting === app.id}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-xs font-extrabold transition active:scale-[0.98] shadow-sm"
                      >
                        {reporting === app.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            送信中...
                          </>
                        ) : (
                          '✅ 工事完了を報告する'
                        )}
                      </button>
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
      <BottomNav />
    </div>
  );
}
