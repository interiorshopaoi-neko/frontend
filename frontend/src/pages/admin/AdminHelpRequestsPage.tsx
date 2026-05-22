// ================================================================
// AdminHelpRequestsPage — 助っ人募集の管理画面
//
// Route: /admin/help-requests
// 管理者のみアクセス可。
// 助っ人募集の一覧・応募数・ステータス変更（募集中/終了/非表示/再表示）。
// ================================================================

import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { AdminLogin, AdminNav, AdminUnauthorized, isAdminRole } from './shared';

// ─── Types ────────────────────────────────────────────────────────────────────

type HelpRequest = {
  id: string;
  work_date: string;
  area: string;
  work_type: string;
  people_needed: number;
  daily_rate: number;
  comment: string | null;
  craftsman_id: string | null;
  start_time: string | null;
  end_time: string | null;
  has_parking: boolean | null;
  notes: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  status: string | null;
  expires_at: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  recruiting: '募集中',
  closed:     '募集終了',
  completed:  '完了',
  hidden:     '非表示',
};
const STATUS_STYLE: Record<string, string> = {
  recruiting: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed:     'bg-slate-100 text-slate-500 border-slate-200',
  completed:  'bg-blue-50 text-blue-600 border-blue-200',
  hidden:     'bg-slate-100 text-slate-300 border-slate-100',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    month: '2-digit', day: '2-digit', weekday: 'short',
  });
}

function formatCreated(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isExpired(req: HelpRequest): boolean {
  if (req.expires_at) return new Date(req.expires_at) < new Date();
  return daysUntil(req.work_date) < 0;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg">
        {msg}
      </div>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  title, desc, confirmLabel, isDanger,
  onConfirm, onCancel,
}: {
  title: string; desc: string; confirmLabel?: string; isDanger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className={`px-6 pt-5 pb-4 ${isDanger ? 'border-l-4 border-red-500' : 'border-l-4 border-amber-400'}`}>
          <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
        </div>
        <div className="flex gap-2 px-6 pb-5">
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {confirmLabel ?? '実行する'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main list component ──────────────────────────────────────────────────────

function HelpAdminList({ session }: { session: Session }) {
  const [requests,     setRequests]     = useState<HelpRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [errMsg,       setErrMsg]       = useState<string | null>(null);
  const [appCountMap,  setAppCountMap]  = useState<Record<string, number>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showHidden,   setShowHidden]   = useState(false);
  const [toast,        setToast]        = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string; desc: string; confirmLabel?: string; isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('help_requests')
        .select('*')
        .order('work_date', { ascending: true });

      if (error) {
        setErrMsg(`[SupabaseError] ${error.message}`);
        setLoading(false);
        return;
      }
      setRequests((data ?? []) as HelpRequest[]);

      // 応募数を集計
      if (data && data.length > 0) {
        const ids = (data as HelpRequest[]).map(r => r.id);
        const { data: apps } = await supabase
          .from('help_applications')
          .select('request_id')
          .in('request_id', ids);
        if (apps) {
          const counts: Record<string, number> = {};
          for (const a of apps as Array<{ request_id: string }>) {
            counts[a.request_id] = (counts[a.request_id] ?? 0) + 1;
          }
          setAppCountMap(counts);
        }
      }
      setLoading(false);
    })();
  }, []);

  const updateStatus = async (id: string, next: string) => {
    const { error } = await supabase
      .from('help_requests')
      .update({ status: next })
      .eq('id', id);
    if (error) { showToast('更新に失敗しました'); return; }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: next } : r));
    showToast('更新しました');
  };

  const confirmAndUpdate = (
    id: string, next: string,
    title: string, desc: string,
    opts?: { confirmLabel?: string; isDanger?: boolean },
  ) => {
    setConfirmModal({
      title, desc,
      confirmLabel: opts?.confirmLabel,
      isDanger: opts?.isDanger,
      onConfirm: async () => {
        setConfirmModal(null);
        await updateStatus(id, next);
      },
    });
  };

  const displayRows = requests
    .filter(r => showHidden ? true : r.status !== 'hidden')
    .filter(r => filterStatus === 'all' || r.status === filterStatus);

  const counts = {
    recruiting: requests.filter(r => r.status === 'recruiting').length,
    closed:     requests.filter(r => r.status === 'closed').length,
    completed:  requests.filter(r => r.status === 'completed').length,
    hidden:     requests.filter(r => r.status === 'hidden').length,
    expired:    requests.filter(r => r.status !== 'hidden' && isExpired(r)).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast msg={toast} />}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          desc={confirmModal.desc}
          confirmLabel={confirmModal.confirmLabel}
          isDanger={confirmModal.isDanger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      <AdminNav email={session.user.email} />

      <div className="max-w-3xl mx-auto px-5 pt-6 pb-24">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">管理者メニュー</p>
            <h1 className="text-xl font-extrabold text-slate-900">助っ人募集 管理</h1>
          </div>
          {!loading && (
            <div className="text-right text-xs text-slate-400 space-y-0.5">
              <p>全 {requests.length}件</p>
              {counts.expired > 0 && (
                <p className="text-orange-600 font-bold">期限切れ {counts.expired}件</p>
              )}
            </div>
          )}
        </div>

        {/* サマリーカード */}
        {!loading && !errMsg && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {[
              { key: 'recruiting', label: '募集中',   color: 'emerald' },
              { key: 'closed',     label: '終了',     color: 'slate' },
              { key: 'completed',  label: '完了',     color: 'blue' },
              { key: 'hidden',     label: '非表示',   color: 'slate' },
            ].map(({ key, label, color }) => (
              <div key={key} className={`rounded-xl bg-white border border-slate-200 px-4 py-3 text-center`}>
                <p className={`text-2xl font-extrabold text-${color}-600`}>
                  {counts[key as keyof typeof counts]}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* フィルターバー */}
        {!loading && !errMsg && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {([
              { value: 'all',        label: 'すべて' },
              { value: 'recruiting', label: '募集中' },
              { value: 'closed',     label: '終了' },
              { value: 'completed',  label: '完了' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterStatus(value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filterStatus === value
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {label}
                {value !== 'all' && (
                  <span className="ml-1 opacity-60">
                    {counts[value as keyof typeof counts]}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowHidden(v => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                showHidden
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
              }`}
            >
              {showHidden ? '👁 非表示も表示中' : '非表示を含む'}
              {counts.hidden > 0 && <span className="ml-1 opacity-60">{counts.hidden}</span>}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <p className="text-sm text-slate-400 animate-pulse">読み込み中...</p>
          </div>
        )}
        {errMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-600 mb-2">取得エラー</p>
            <pre className="text-xs text-red-500 whitespace-pre-wrap break-all">{errMsg}</pre>
          </div>
        )}

        {!loading && !errMsg && displayRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-3xl">📭</p>
            <p className="text-sm text-slate-400">
              {filterStatus === 'all' ? '助っ人募集はありません' : 'この条件の募集はありません'}
            </p>
          </div>
        )}

        {/* カード一覧 */}
        {!loading && !errMsg && (
          <div className="space-y-3">
            {displayRows.map(req => {
              const days = daysUntil(req.work_date);
              const expired = isExpired(req);
              const appCount = appCountMap[req.id] ?? 0;
              const isHidden = req.status === 'hidden';

              return (
                <div
                  key={req.id}
                  className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${
                    isHidden
                      ? 'opacity-50 border-slate-200'
                      : expired && req.status === 'recruiting'
                      ? 'border-orange-300'
                      : 'border-slate-200'
                  }`}
                >
                  {/* ステータスストリップ */}
                  <div className={`flex items-center gap-2 px-5 py-2 text-[11px] font-semibold ${
                    isHidden
                      ? 'bg-slate-50 text-slate-300 border-b border-slate-100'
                      : expired && req.status === 'recruiting'
                      ? 'bg-orange-50 text-orange-700 border-b border-orange-100'
                      : 'bg-white border-b border-slate-50'
                  }`}>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                      STATUS_STYLE[req.status ?? 'recruiting'] ?? STATUS_STYLE.recruiting
                    }`}>
                      {STATUS_LABEL[req.status ?? 'recruiting'] ?? req.status}
                    </span>
                    {expired && req.status === 'recruiting' && (
                      <span className="text-orange-600 font-extrabold">⏰ 期限切れ</span>
                    )}
                    {!expired && days >= 0 && req.status === 'recruiting' && (
                      <span>{days === 0 ? '今日' : days === 1 ? '明日' : `${days}日後`}</span>
                    )}
                    <span className={`ml-auto font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      appCount === 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      応募 {appCount}件
                    </span>
                  </div>

                  {/* 本文 */}
                  <div className="px-5 pt-3 pb-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 truncate">{req.work_type}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          📍 {req.area} — {formatDate(req.work_date)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-slate-800">¥{req.daily_rate.toLocaleString()}/日</p>
                        <p className="text-[11px] text-slate-400">{req.people_needed}人募集</p>
                      </div>
                    </div>

                    {/* 時間・駐車場 */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-400">
                      {req.start_time && (
                        <span>🕗 {req.start_time}{req.end_time ? ` 〜 ${req.end_time}` : ''}</span>
                      )}
                      {req.has_parking != null && (
                        <span>{req.has_parking ? '🚗 駐車場あり' : '🚗 駐車場なし'}</span>
                      )}
                      {req.expires_at && (
                        <span>⏰ {new Date(req.expires_at).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}まで</span>
                      )}
                    </div>

                    {req.comment && (
                      <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed border border-slate-100 line-clamp-2">
                        📝 {req.comment}
                      </p>
                    )}

                    <p className="text-[10px] text-slate-300">投稿: {formatCreated(req.created_at)}</p>
                  </div>

                  {/* アクションバー */}
                  <div className="flex flex-wrap gap-2 px-5 py-3 border-t border-slate-50 bg-slate-50/60">
                    {req.status === 'recruiting' && (
                      <button
                        onClick={() => confirmAndUpdate(
                          req.id, 'closed',
                          '募集を終了しますか？',
                          'この助っ人募集を「募集終了」にします。職人側では終了表示になります。',
                          { confirmLabel: '募集終了にする' },
                        )}
                        className="text-xs font-semibold text-amber-700 bg-white hover:bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        募集終了
                      </button>
                    )}
                    {req.status === 'closed' && (
                      <button
                        onClick={() => updateStatus(req.id, 'recruiting')}
                        className="text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        募集再開
                      </button>
                    )}
                    {req.status !== 'hidden' ? (
                      <button
                        onClick={() => confirmAndUpdate(
                          req.id, 'hidden',
                          '助っ人募集を非表示にしますか？',
                          '職人側の一覧から非表示になります。管理画面では引き続き確認できます。',
                          { confirmLabel: '非表示にする', isDanger: true },
                        )}
                        className="text-xs font-semibold text-slate-400 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        非表示
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(req.id, 'recruiting')}
                        className="text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        再表示
                      </button>
                    )}
                    <span className="ml-auto text-[10px] text-slate-300 self-center">ID: {req.id.slice(0, 8)}…</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root: auth guard ─────────────────────────────────────────────────────────

export default function AdminHelpRequestsPage() {
  const [session,   setSession]   = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400 animate-pulse">確認中...</p>
      </div>
    );
  }
  if (!session) return <AdminLogin />;
  if (!isAdminRole(session)) return <AdminUnauthorized />;
  return <HelpAdminList session={session} />;
}
