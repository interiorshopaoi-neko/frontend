import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import type { User, Role } from '../../types';
import api from '../../utils/api';

interface Props {
  onLogin: (token: string, user: User) => void;
}

// ── ロール別設定 ──────────────────────────────────────────────────────────────

const ROLE_CFG = {
  customer: {
    label: 'お客様',
    tagline: '動画を送るだけ。職人が即確認。\n30秒で見積もり依頼が完了。',
    btnCls: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
    toggleActiveCls: 'bg-blue-600 text-white',
    mockGrad: 'from-blue-600 to-blue-800',
    perks: ['📹 動画撮影 30秒で依頼完了', '💬 複数職人から相見積もり', '🔒 連絡先は成約後のみ開示'],
  },
  craftsman: {
    label: '職人さん',
    tagline: '近場の案件を動画で確認。\nスキマ時間にガッツリ稼ごう。',
    btnCls: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
    toggleActiveCls: 'bg-amber-500 text-white',
    mockGrad: 'from-amber-500 to-orange-600',
    perks: ['🎬 案件動画で現場を事前確認', '📍 近場の案件をスワイプで応募', '🎁 初回2件は連絡先開示無料'],
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function Register({ onLogin }: Props) {
  const location    = useLocation();
  const defaultRole = (location.state as any)?.defaultRole as Role | undefined;
  const fromLanding = (location.state as any)?.fromLanding === true;

  const [role,     setRole]     = useState<'customer' | 'craftsman'>(
    defaultRole === 'craftsman' ? 'craftsman' : 'customer',
  );
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const cfg = ROLE_CFG[role];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password, role });
      if (data.requiresConfirmation) {
        alert(data.message ?? '確認メールを送信しました。メールをご確認ください。');
        setLoading(false);
        return;
      }
      onLogin(data.token, data.user);
      if (role === 'customer' && fromLanding) {
        navigate('/customer/estimate/flow');
      } else {
        navigate(role === 'customer' ? '/customer' : '/craftsman/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error ?? '登録に失敗しました。入力内容を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900">

      {/* ─── Top: ブランディング + ロール切替 ─── */}
      <div className="flex-shrink-0 px-6 pt-10 pb-6 text-center">

        {/* ロゴ */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-900/60">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span className="text-2xl font-extrabold text-white tracking-tight">PRO MATCH</span>
        </div>

        {/* ロール切替 */}
        <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 mb-5 shadow-inner">
          {(['customer', 'craftsman'] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => { setRole(r); setError(''); }}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                role === r
                  ? ROLE_CFG[r].toggleActiveCls + ' shadow-md'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {ROLE_CFG[r].label}
            </button>
          ))}
        </div>

        {/* タグライン */}
        <p className="text-white/75 text-sm leading-relaxed mb-5 whitespace-pre-line">
          {cfg.tagline}
        </p>

        {/* 特典リスト */}
        <div className="mx-auto max-w-xs space-y-2">
          {cfg.perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-white/8 rounded-xl px-3 py-2.5">
              <span className="text-sm">{perk.slice(0, 2)}</span>
              <p className="text-[12px] text-white/80 font-medium text-left">{perk.slice(2).trim()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Bottom: フォームカード ─── */}
      <div className="flex-1 bg-white rounded-t-[2rem] shadow-[0_-8px_40px_rgba(0,0,0,0.25)] px-6 pt-8 pb-10">
        <h2 className="text-xl font-extrabold text-slate-900 mb-6">
          {role === 'customer' ? '無料で見積もり依頼' : '職人登録（無料）'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 tracking-wide uppercase">
              {role === 'customer' ? 'お名前' : '屋号 / お名前'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-slate-50 placeholder:text-slate-300"
              placeholder={role === 'customer' ? '山田 太郎' : '山田内装'}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 tracking-wide uppercase">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-slate-50 placeholder:text-slate-300"
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 tracking-wide uppercase">
              パスワード（6文字以上）
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-slate-50 placeholder:text-slate-300"
              placeholder="6文字以上"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${cfg.btnCls} disabled:opacity-50 text-white font-extrabold py-4 rounded-2xl shadow-sm transition-all active:scale-[0.98]`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                登録中...
              </span>
            ) : (role === 'customer' ? '無料で依頼を始める →' : '職人登録する →')}
          </button>
        </form>

        <div className="mt-5 text-center space-y-1.5">
          <p className="text-sm text-slate-400">
            すでにアカウントをお持ちの方は{' '}
            <Link
              to="/login"
              state={{ defaultRole: role }}
              className="text-blue-600 font-bold hover:underline"
            >
              ログイン
            </Link>
          </p>
          <p className="text-xs text-slate-300">
            登録無料 · 成約時のみ手数料
          </p>
        </div>
      </div>
    </div>
  );
}
