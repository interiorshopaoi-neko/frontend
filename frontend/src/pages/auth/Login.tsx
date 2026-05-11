import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { User, Role } from '../../types';
import { supabase } from '../../lib/supabase';

interface Props {
  onLogin: (token: string, user: User) => void;
}

export default function Login({ onLogin }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  // 職人LP (/for-pros) からのログインは state に { fromProLp, defaultRole: 'craftsman' }
  // を載せて遷移してくる。user_metadata と localStorage が両方空のときに
  // 暗黙 customer に倒れて /corporate に飛ばないよう、ヒントとして読み取る。
  const fromProLp  = (location.state as any)?.fromProLp === true;
  const stateRole  = (location.state as any)?.defaultRole;
  const stateRoleNormalized: Role | null =
    stateRole === 'craftsman' || stateRole === 'customer' ? stateRole : null;

  // 「新規登録」へ遷移する際、職人LP由来の意図 (fromProLp / defaultRole) を
  // Register.tsx に引き継ぐ。state が空の通常ログイン経路では undefined にして
  // これまで通り「お客様」初期選択を維持する。
  const registerNavState =
    fromProLp || stateRoleNormalized
      ? {
          fromProLp,
          defaultRole:
            stateRoleNormalized ?? (fromProLp ? ('craftsman' as Role) : undefined),
        }
      : undefined;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data.session || !data.user) {
        setError(authError?.message ?? 'ログインに失敗しました');
        return;
      }

      // role 解決の優先順位:
      //   1. supabase user_metadata.role (admin / craftsman / customer のいずれか)
      //   2. localStorage.user.role (前回ログインの値、customer/craftsman のみ)
      //   3. location.state.defaultRole (LP 経由のヒント)
      //   4. location.state.fromProLp === true なら craftsman
      //   5. それ以外 customer
      // admin は P1 (user_metadata) でのみ昇格できる。fallback / state ヒントでは
      // admin に倒れない（運営権限の意図しない昇格を防ぐ）。
      const meta = (data.user.user_metadata ?? {}) as { name?: unknown; role?: unknown };
      const fallbackRaw = (() => {
        try { return JSON.parse(localStorage.getItem('user') ?? 'null'); } catch { return null; }
      })();
      const role: Role =
        meta.role === 'craftsman' || meta.role === 'customer' || meta.role === 'admin'
          ? meta.role
          : (fallbackRaw?.role === 'craftsman' || fallbackRaw?.role === 'customer')
            ? fallbackRaw.role
            : (stateRoleNormalized
              ?? (fromProLp ? 'craftsman' : 'customer'));

      const userData: User = {
        id: data.user.id,
        name: typeof meta.name === 'string' ? meta.name : (fallbackRaw?.name ?? ''),
        email: data.user.email ?? email,
        role,
      };

      const navigateTarget =
        userData.role === 'admin'     ? '/admin/dashboard' :
        userData.role === 'craftsman' ? '/craftsman' :
                                        '/customer';

      onLogin(data.session.access_token, userData);
      navigate(navigateTarget);
    } catch (err: any) {
      setError(err?.message ?? 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')} aria-label="PRO MATCH トップへ">
            <img src="/logo-full.png" alt="PRO MATCH" className="h-7 object-contain" />
          </button>
          <button
            onClick={() =>
              registerNavState
                ? navigate('/register', { state: registerNavState })
                : navigate('/register')
            }
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            新規登録
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-9 pb-20">
        {/* イントロ */}
        <div className="mb-6">
          <h1 className="text-[22px] font-black text-slate-900 leading-snug mb-1">
            ログイン
          </h1>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            おかえりなさい。続きから始めましょう。
          </p>
        </div>

        {/* カード */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <div className="mb-4 rounded-xl bg-emerald-50/60 border border-emerald-100 px-3.5 py-2.5 flex items-start gap-2">
            <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={2.4} />
            <p className="text-[11px] text-emerald-800 leading-relaxed font-semibold">
              安全な通信で保護されています
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-slate-50/50"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-slate-50/50"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-rose-600 text-[12px] bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1.5 py-3.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 active:scale-[0.99] text-white font-black text-[14px] transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {loading ? 'ログイン中…' : 'ログインして続ける'}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] text-slate-500 mt-5">
          まだアカウントをお持ちでない方は{' '}
          <Link to="/register" state={registerNavState} className="text-blue-600 font-bold hover:underline">
            新規登録
          </Link>
        </p>
      </main>
    </div>
  );
}
