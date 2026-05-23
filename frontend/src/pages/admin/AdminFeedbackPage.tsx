import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AdminNav, AdminLogin, AdminUnauthorized, isAdminRole } from './shared';

// ── Types ─────────────────────────────────────────────────────────────────────

type FeedbackStatus = 'new' | 'reviewing' | 'done';

type Meta = {
  pathname?:    string;
  userAgent?:   string;
  viewport?:    { width?: number; height?: number };
  submittedAt?: string;
};

type FeedbackReport = {
  id:             string;
  created_at:     string;
  category:       string;
  message:        string;
  contact_email:  string | null;
  page_url:       string | null;
  user_role:      string | null;
  user_id:        string | null;
  status:         FeedbackStatus;
  admin_note:     string | null;
  screenshot_url: string | null;
  meta:           Meta;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<FeedbackStatus, { label: string; cls: string }> = {
  new:       { label: '未対応',   cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  reviewing: { label: '確認中',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  done:      { label: '対応済み', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

type StatusFilter = 'all' | FeedbackStatus;
const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: '全て'   },
  { key: 'new',       label: '未対応' },
  { key: 'reviewing', label: '確認中' },
  { key: 'done',      label: '対応済み' },
];

function formatDate(s: string): string {
  return new Date(s).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── 通知トグル ────────────────────────────────────────────────────────────────

function NotificationToggle() {
  const [enabled,  setEnabled]  = useState<boolean | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    fetch('/api/admin-feedback?settings=1')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => { setEnabled(d.feedbackEmailEnabled ?? true); })
      .catch(() => setEnabled(true))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    if (enabled === null) return;
    setSaving(true);
    const next = !enabled;
    try {
      await fetch('/api/admin-feedback?settings=1', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ feedbackEmailEnabled: next }),
      });
      setEnabled(next);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return null;

  return (
    <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-3 mb-5">
      <div>
        <p className="text-xs font-bold text-slate-700">改善報告メール通知</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {enabled ? 'ONのとき、報告が届くたびに運営者へメールを送信します' : 'OFF のとき、DB保存のみ（メール通知なし）'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${
          enabled ? 'bg-blue-600' : 'bg-slate-300'
        } ${saving ? 'opacity-50' : ''}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}

// ── Row component ─────────────────────────────────────────────────────────────

function FeedbackRow({
  report,
  onStatusChange,
  onNoteChange,
}: {
  report: FeedbackReport;
  onStatusChange: (id: string, status: FeedbackStatus) => Promise<void>;
  onNoteChange:   (id: string, note: string) => Promise<void>;
}) {
  const [note,       setNote]       = useState(report.admin_note ?? '');
  const [savingNote, setSavingNote] = useState(false);
  const [open,       setOpen]       = useState(false);

  const status = STATUS_LABELS[report.status];

  const handleNoteBlur = async () => {
    if (note === (report.admin_note ?? '')) return;
    setSavingNote(true);
    await onNoteChange(report.id, note);
    setSavingNote(false);
  };

  const meta: Meta = report.meta ?? {};

  return (
    <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition ${
      report.status === 'done' ? 'opacity-60' : ''
    }`}>
      {/* ヘッダー行 */}
      <div
        className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.cls}`}>
              {status.label}
            </span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {report.category}
            </span>
            {report.user_role && (
              <span className="text-[10px] text-slate-400">{report.user_role}</span>
            )}
            {report.screenshot_url && (
              <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full border border-blue-100">
                📎 スクショ
              </span>
            )}
            <span className="text-[10px] text-slate-300 ml-auto shrink-0">
              {formatDate(report.created_at)}
            </span>
          </div>
          <p className="text-sm text-slate-800 leading-snug line-clamp-2 pr-2">
            {report.message}
          </p>
          {report.page_url && (
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{report.page_url}</p>
          )}
        </div>
        <span className="text-slate-300 text-sm flex-shrink-0 mt-1">
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* 詳細（展開時） */}
      {open && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50">

          {/* 内容（全文） */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">内容</p>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-white rounded-xl border border-slate-100 px-3 py-2.5">
              {report.message}
            </p>
          </div>

          {/* スクショ */}
          {report.screenshot_url && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">スクリーンショット</p>
              <a href={report.screenshot_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={report.screenshot_url}
                  alt="スクリーンショット"
                  className="w-full max-h-64 object-contain rounded-xl border border-slate-200 bg-white hover:opacity-90 transition"
                />
              </a>
            </div>
          )}

          {/* メタ情報 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-bold text-slate-400">連絡先: </span>
              <span className="text-slate-700">
                {report.contact_email
                  ? <a href={`mailto:${report.contact_email}`} className="text-blue-600 underline">{report.contact_email}</a>
                  : '（なし）'}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-400">ページ: </span>
              <span className="text-slate-700 break-all">{report.page_url ?? '（なし）'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400">利用者種別: </span>
              <span className="text-slate-700">{report.user_role ?? '不明'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400">ユーザーID: </span>
              <span className="text-slate-700 font-mono text-[10px]">{report.user_id ?? '（なし）'}</span>
            </div>
            {meta.pathname && (
              <div>
                <span className="font-bold text-slate-400">パス: </span>
                <span className="text-slate-700 break-all">{meta.pathname}</span>
              </div>
            )}
            {meta.viewport && (
              <div>
                <span className="font-bold text-slate-400">Viewport: </span>
                <span className="text-slate-700">{meta.viewport.width}×{meta.viewport.height}</span>
              </div>
            )}
            {meta.userAgent && (
              <div className="sm:col-span-2">
                <span className="font-bold text-slate-400">UA: </span>
                <span className="text-slate-500 break-all text-[10px]">{meta.userAgent}</span>
              </div>
            )}
            {meta.submittedAt && (
              <div>
                <span className="font-bold text-slate-400">送信日時: </span>
                <span className="text-slate-700">{formatDate(meta.submittedAt)}</span>
              </div>
            )}
          </div>

          {/* ステータス変更 */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">ステータス</p>
            <div className="flex gap-2 flex-wrap">
              {(['new', 'reviewing', 'done'] as FeedbackStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => onStatusChange(report.id, s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition active:scale-95 ${
                    report.status === s
                      ? STATUS_LABELS[s].cls
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {STATUS_LABELS[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* 管理メモ */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
              管理メモ{savingNote && <span className="ml-2 font-normal text-slate-300">保存中...</span>}
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={handleNoteBlur}
              rows={2}
              placeholder="対応メモ・対応結果など"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminFeedbackPage() {
  const navigate = useNavigate();

  const [session,  setSession]  = useState<import('@supabase/supabase-js').Session | null>(null);
  const [authDone, setAuthDone] = useState(false);

  const [reports,  setReports]  = useState<FeedbackReport[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<StatusFilter>('all');
  const [error,    setError]    = useState('');

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthDone(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── データ取得 ────────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = filter !== 'all' ? `?status=${encodeURIComponent(filter)}` : '';
      const r  = await fetch(`/api/admin-feedback${qs}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: FeedbackReport[] = await r.json();
      setReports(data);
    } catch (e) {
      setError('取得に失敗しました: ' + String(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── ステータス更新 ────────────────────────────────────────────────────────
  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    const r = await fetch('/api/admin-feedback', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, status }),
    });
    if (r.ok) {
      setReports(prev => prev.map(rp => rp.id === id ? { ...rp, status } : rp));
    }
  };

  // ── 管理メモ更新 ──────────────────────────────────────────────────────────
  const handleNoteChange = async (id: string, adminNote: string) => {
    await fetch('/api/admin-feedback', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, adminNote }),
    });
    setReports(prev => prev.map(rp => rp.id === id ? { ...rp, admin_note: adminNote || null } : rp));
  };

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!authDone) return null;
  if (!session)  return <AdminLogin />;
  if (!isAdminRole(session)) return <AdminUnauthorized />;

  const counts: Partial<Record<StatusFilter, number>> = { all: reports.length };
  for (const r of reports) counts[r.status] = (counts[r.status] ?? 0) + 1;

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav email={session.user.email} />

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ページタイトル */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">不具合・改善報告</h1>
            <p className="text-xs text-slate-400 mt-0.5">利用者からのフィードバック一覧</p>
          </div>
          <button
            onClick={fetchReports}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            更新
          </button>
        </div>

        {/* 通知ON/OFF */}
        <NotificationToggle />

        {/* フィルター */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border whitespace-nowrap transition ${
                filter === key
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {label}
              {counts[key] !== undefined && (
                <span className={`rounded-full text-[10px] font-extrabold px-1.5 py-0.5 leading-none ${
                  filter === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* エラー */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 一覧 */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">読み込み中...</div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-bold text-slate-600">
              {filter === 'all' ? '報告はまだありません' : `${FILTER_OPTIONS.find(f => f.key === filter)?.label}の報告はありません`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <FeedbackRow
                key={report.id}
                report={report}
                onStatusChange={handleStatusChange}
                onNoteChange={handleNoteChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
