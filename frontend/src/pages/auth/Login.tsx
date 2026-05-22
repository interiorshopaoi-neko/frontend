import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';

import type { User, Role } from '../../types';
import api from '../../utils/api';
import { supabase } from '../../lib/supabase';

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
    mockHighBg: 'bg-blue-600',
    mockItems: [
      { text: '📹 動画で見積もり依頼', sub: '完全無料 · 30秒で完了', hi: true },
      { text: '職人から見積もりが届く', sub: '¥32,000〜', hi: false },
      { text: '日程調整 → 工事完了', sub: '連絡先は成約後に開示', hi: false },
    ],
  },
  craftsman: {
    label: '職人さん',
    tagline: '近場の案件を動画で確認。\nスキマ時間にガッツリ稼ごう。',
    btnCls: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
    toggleActiveCls: 'bg-amber-500 text-white',
    mockGrad: 'from-amber-500 to-orange-600',
    mockHighBg: 'bg-amber-500',
    mockItems: [
      { text: '▶ 動画あり · 太田市 4.8km', sub: '想定手取り ¥30,000', hi: true },
      { text: 'クロス張替え · 伊勢崎市', sub: '¥28,000 · 12km', hi: false },
      { text: '床CF · 前橋市 7km', sub: '¥22,000', hi: false },
    ],
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function Login({ onLogin }: Props) {
  const location    = useLocation();
  const defaultRole = (location.state as any)?.defaultRole as Role | undefined;
  const from        = (location.state as any)?.from as string | undefined;
  const [searchParams] = useSearchParams();
  const queryRole   = searchParams.get('role') as Role | null;
  const confirmed   = searchParams.get('confirmed') === '1';

  const [role,     setRole]     = useState<'customer' | 'craftsman'>(
    queryRole === 'craftsman' || defaultRole === 'craftsman' ? 'craftsman' : 'customer',
  );
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [forgotMode,   setForgotMode]   = useState(false);
  const [forgotSent,   setForgotSent]   = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();

  const cfg = ROLE_CFG[role];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      onLogin(data.token, data.user);
      navigate(from ?? (data.user.role === 'customer' ? '/customer' : '/craftsman/jobs'));
    } catch (err: any) {
      const reason = err.response?.data?.reason as string | undefined;
      const userMessage: Record<string, string> = {
        invalid_credentials:  'メールアドレスまたはパスワードを確認してください。',
        email_not_confirmed:  'メール確認が完了していません。登録時に届いたメールのリンクをクリックしてください。',
        missing_user:         '認証に問題が発生しました。時間をおいて再度お試しください。',
        supabase_auth_error:  '認証サービスでエラーが発生しました。時間をおいて再度お試しください。',
        server_error:         'サーバーでエラーが発生しました。時間をおいて再度お試しください。',
      };
      console.error('[Login] auth error', { reason, status: err.response?.status });
      setError(
        (reason && userMessage[reason])
          ?? err.response?.data?.error
          ?? 'ログインに失敗しました。メール・パスワードを確認してください。'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('メールアドレスを入力してください'); return; }
    setError('');
    setForgotLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://promatch-app.jp/reset-password',
      });
      if (resetError) throw resetError;
      setForgotSent(true);
    } catch (err: any) {
      setError(err?.message ?? 'パスワードリセットメールの送信に失敗しました');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900">

      {/* ─── 戻るリンク ─── */}
      <div className="flex-shrink-0 px-5 pt-5">
        <Link
          to={role === 'craftsman' ? '/for-pros' : '/'}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white/90 transition-colors py-2 pr-2"
        >
          ← {role === 'craftsman' ? '職人ページへ戻る' : 'お客様トップページへ戻る'}
        </Link>
      </div>

      {/* ─── Top: ブランディング + ロール切替 + 疑似フォンモック ─── */}
      <div className="flex-shrink-0 px-6 pt-4 pb-8 text-center">

        {/* ロゴ */}
        <div className="flex items-center justify-center gap-2.5 mb-7">
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
        <p className="text-white/75 text-sm leading-relaxed mb-2 whitespace-pre-line">
          {cfg.tagline}
        </p>

        {/* ロール別補足ヒント */}
        {role === 'customer' ? (
          <p className="text-blue-300/80 text-xs leading-relaxed mb-5">
            ※ はじめての見積もり依頼はログイン不要です
          </p>
        ) : (
          <p className="text-amber-300/70 text-xs leading-relaxed mb-5">
            ※ 案件確認・応募・連絡先確認にはログインが必要です
          </p>
        )}

        {/* ── 疑似フォンモック ── */}
        <div className="mx-auto w-52 rounded-[1.75rem] border-2 border-white/10 bg-slate-800/70 backdrop-blur-sm shadow-2xl overflow-hidden">
          {/* ノッチ */}
          <div className="flex justify-center pt-2.5 pb-2">
            <div className="w-14 h-1.5 bg-slate-700/80 rounded-full" />
          </div>
          {/* コンテンツ */}
          <div className="px-3 pb-4 space-y-2">
            {cfg.mockItems.map((item, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2.5 ${
                  item.hi
                    ? `bg-gradient-to-r ${cfg.mockGrad}`
                    : 'bg-slate-700/50'
                }`}
              >
                <p className={`text-[11px] font-bold leading-snug ${item.hi ? 'text-white' : 'text-slate-200'}`}>
                  {item.text}
                </p>
                <p className={`text-[9px] mt-0.5 ${item.hi ? 'text-white/65' : 'text-slate-400'}`}>
                  {item.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Bottom: フォームカード ─── */}
      <div className="flex-1 bg-white rounded-t-[2rem] shadow-[0_-8px_40px_rgba(0,0,0,0.25)] px-6 pt-8 pb-10">
        {confirmed && (
          <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <span className="text-emerald-500 text-base mt-0.5">✓</span>
            <div>
              <p className="text-sm font-bold text-emerald-800">メール認証が完了しました</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {role === 'craftsman'
                  ? '職人アカウントでログインしてください。'
                  : 'ログインしてサービスを始めましょう。'}
              </p>
            </div>
          </div>
        )}
        <h2 className="text-xl font-extrabold text-slate-900 mb-6">ログイン</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-slate-50 placeholder:text-slate-300"
              placeholder="••••••••"
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
                ログイン中...
              </span>
            ) : 'ログイン →'}
          </button>
        </form>

        {/* パスワードをお忘れですか */}
        <div className="mt-3 text-center">
          {!forgotMode && !forgotSent && (
            <button
              type="button"
              onClick={() => { setForgotMode(true); setError(''); }}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              パスワードをお忘れですか？
            </button>
          )}
          {forgotMode && !forgotSent && (
            <form onSubmit={handleForgotPassword} className="mt-3 space-y-2">
              <p className="text-xs text-slate-500 mb-1">登録メールアドレスにリセットリンクを送信します</p>
              {error && (
                <p className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
              >
                {forgotLoading ? '送信中...' : 'リセットメールを送信'}
              </button>
              <button
                type="button"
                onClick={() => { setForgotMode(false); setError(''); }}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                キャンセル
              </button>
            </form>
          )}
          {forgotSent && (
            <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mt-2">
              パスワードリセットメールを送信しました。受信ボックスをご確認ください。
            </p>
          )}
        </div>

        <div className="mt-6 text-center space-y-2">
          {/* お客様: ログイン不要の直接依頼導線 */}
          {role === 'customer' && (
            <div className="mb-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <p className="text-xs text-slate-500 mb-1.5">
                ログインすると依頼履歴の確認・再依頼ができます。
              </p>
              <Link to="/corporate" className="text-sm font-bold text-blue-600 hover:underline">
                ログインせずに見積もり依頼する →
              </Link>
            </div>
          )}
          {/* 職人: 登録が必要な理由を明示 */}
          {role === 'craftsman' && (
            <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2 mb-1">
              登録無料・応募無料。成約時のみ手数料がかかります。
            </p>
          )}
          <p className="text-sm text-slate-400">
            アカウントをお持ちでない方は{' '}
            <Link
              to="/register"
              state={{ defaultRole: role }}
              className="text-blue-600 font-bold hover:underline"
            >
              新規登録
            </Link>
          </p>
          <p className="text-xs text-slate-300">
            登録無料 · 成約時のみ手数料
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
            <a href="/privacy" className="text-[11px] text-slate-300 hover:text-slate-500 transition-colors">プライバシーポリシー</a>
            <a href="/terms"   className="text-[11px] text-slate-300 hover:text-slate-500 transition-colors">利用規約</a>
          </div>
        </div>
      </div>
    </div>
  );
}
