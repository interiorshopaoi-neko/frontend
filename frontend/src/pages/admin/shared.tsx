import { useState }          from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Session }       from '@supabase/supabase-js';
import { supabase }           from '../../lib/supabase';
import LogoutConfirmModal     from '../../components/LogoutConfirmModal';

// ── Admin role ガード ─────────────────────────────────────────────────────────
// app_metadata.role（サーバーサイド設定・改ざん不可）を優先し、
// user_metadata.role（旧設定との互換）もフォールバックで確認する。
export function isAdminRole(session: Session | null): boolean {
  if (!session) return false;
  const u = session.user;
  return (
    u.app_metadata?.role === 'admin' ||
    u.user_metadata?.role === 'admin'
  );
}

// ── 権限なし画面 ──────────────────────────────────────────────────────────────
export function AdminUnauthorized() {
  const handleLogout = () => supabase.auth.signOut();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-red-100 items-center justify-center mb-4">
          <span className="text-2xl">🚫</span>
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-1">管理者権限がありません</h1>
        <p className="text-sm text-slate-500 mb-6">
          このページは管理者専用です。<br />
          別のアカウントでログインしてください。
        </p>
        <button
          onClick={handleLogout}
          className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition active:scale-95 text-sm"
        >
          ログアウトして戻る
        </button>
      </div>
    </div>
  );
}

// ── AdminLogin ────────────────────────────────────────────────────────────────

export function AdminLogin() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errMsg,   setErrMsg]   = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrMsg(`[${error.name ?? 'AuthError'}] ${error.message}`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-slate-900 items-center justify-center mb-4">
            <span className="text-white text-xl">🔑</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">管理画面</h1>
          <p className="text-sm text-slate-400 mt-1">ログインしてください</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">メールアドレス</label>
            <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">パスワード</label>
            <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"/>
          </div>
          <button type="submit" disabled={loading}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-700 active:scale-95'}`}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
          {errMsg && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <pre className="text-xs text-red-500 whitespace-pre-wrap break-all">{errMsg}</pre>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ── AdminNav ──────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { to: '/admin/dashboard',     label: 'ダッシュボード' },
  { to: '/admin/requests',      label: '案件一覧' },
  { to: '/admin/help-requests', label: '助っ人管理' },
  { to: '/admin',               label: '分析' },
] as const;

export function AdminNav({ email }: { email?: string }) {
  const { pathname } = useLocation();
  const [showLogout, setShowLogout] = useState(false);

  return (
    <>
      <nav className="bg-slate-900 text-white px-5 py-2 flex items-center gap-1 text-[11px] font-semibold sticky top-0 z-40">
        <span className="text-slate-500 font-bold mr-3 shrink-0">PRO MATCH 管理</span>
        {NAV_LINKS.map(({ to, label }) => (
          <Link key={to} to={to}
            className={`px-2.5 py-1.5 rounded-lg transition-colors shrink-0 ${
              pathname === to ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}>
            {label}
          </Link>
        ))}
        {email && <span className="hidden sm:block text-slate-500 ml-2 shrink-0">{email}</span>}
        <button
          onClick={() => setShowLogout(true)}
          className="ml-auto px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
        >
          ログアウト
        </button>
      </nav>
      {showLogout && (
        <LogoutConfirmModal
          onConfirm={() => { setShowLogout(false); supabase.auth.signOut(); }}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </>
  );
}
