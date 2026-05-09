import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Video, Sparkles } from 'lucide-react';
import type { User, Role } from '../../types';
import api from '../../utils/api';

interface Props {
  onLogin: (token: string, user: User) => void;
}

export default function Register({ onLogin }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  // If came from landing page estimate CTA, send new customers straight to the flow
  const fromLanding = (location.state as any)?.fromLanding === true;
  // 職人LP（/for-pros · /pro-signup）から来た場合は role を 'craftsman' で初期選択し、
  // 登録完了後は /craftsman/jobs（動画で探す画面）に遷移する。
  const fromProLp        = (location.state as any)?.fromProLp === true;
  const stateDefaultRole = (location.state as any)?.defaultRole as Role | undefined;
  const initialRole: Role = stateDefaultRole === 'craftsman' ? 'craftsman' : 'customer';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  void api; // 本番API差し替えに備えて import を維持

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // TODO: 本番APIに差し替える
      // const { data } = await api.post('/auth/register', { name, email, password, role });
      // onLogin(data.token, data.user);
      console.log('[mock] register success', { name, email, role });
      const mockUser = { id: 0, name, email, role } as import('../../types').User;
      onLogin('mock-token', mockUser);
      if (role === 'customer' && fromLanding) {
        navigate('/customer/estimate/flow');
      } else if (role === 'craftsman' && fromProLp) {
        // 職人LP起点の登録は、約束した「ショート動画で案件を探す」体験へ直接送る
        navigate('/craftsman/jobs');
      } else {
        navigate(role === 'customer' ? '/customer' : '/craftsman');
      }
    } catch (err: any) {
      console.error('[mock] register error', err);
      // TODO: 本番実装時に有効化
      // setError(err.response?.data?.error ?? '登録に失敗しました');
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
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            ログイン
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-7 pb-20">
        {/* イントロ */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 mb-3">
            <Sparkles size={11} />
            <span className="text-[10px] font-bold tracking-wide">PRO MATCH</span>
          </div>
          <h1 className="text-[22px] font-black text-slate-900 leading-snug mb-1">
            新規登録
          </h1>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            30秒で完了 / クレジットカード不要 / 営業電話なし
          </p>
        </div>

        {/* カード */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          {/* ロール選択 */}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            登録のタイプ
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setRole('customer')}
              aria-pressed={role === 'customer'}
              className={`py-3.5 rounded-xl border-2 text-[13px] font-black transition-all ${
                role === 'customer'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              お客様
            </button>
            <button
              type="button"
              onClick={() => setRole('craftsman')}
              aria-pressed={role === 'craftsman'}
              className={`py-3.5 rounded-xl border-2 text-[13px] font-black transition-all ${
                role === 'craftsman'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              職人
            </button>
          </div>

          {/* role依存バナー */}
          {role === 'craftsman' ? (
            <div className="mb-5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-3 text-white shadow-md shadow-blue-600/30 flex items-start gap-2.5">
              <Video size={17} className="flex-shrink-0 mt-0.5" strokeWidth={2.4} />
              <div>
                <p className="text-[12.5px] font-black leading-tight">
                  あと30秒で、ショート動画案件を見られます
                </p>
                <p className="text-[10.5px] text-blue-100 leading-relaxed mt-0.5">
                  最初の2成約は手数料0円 / 応募はずっと無料 / 営業電話なし
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-5 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex items-start gap-2.5">
              <CheckCircle2 size={17} className="text-indigo-600 flex-shrink-0 mt-0.5" strokeWidth={2.4} />
              <div>
                <p className="text-[12.5px] font-black text-indigo-900 leading-tight">
                  30秒で内装見積もりを依頼できます
                </p>
                <p className="text-[10.5px] text-indigo-700 leading-relaxed mt-0.5">
                  動画を撮るだけ。職人から直接見積もりが届きます。
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">お名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-slate-50/50"
                placeholder="山田 太郎"
              />
            </div>
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
                minLength={6}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-slate-50/50"
                placeholder="6文字以上"
              />
            </div>

            {/* TODO: 本番実装時に有効化 */}
            {/* {error && (
              <p className="text-rose-500 text-[12px] bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">{error}</p>
            )} */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1.5 py-3.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 active:scale-[0.99] text-white font-black text-[14px] transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {loading
                ? '登録中…'
                : role === 'craftsman'
                  ? '無料で動画案件を見始める'
                  : '無料で見積もりを始める'}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] text-slate-500 mt-5">
          すでにアカウントをお持ちの方は{' '}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            ログイン
          </Link>
        </p>

        <p className="text-center text-[10px] text-slate-400 mt-3 leading-relaxed">
          登録すると <Link to="/terms" className="underline">利用規約</Link>
          {' '}・{' '}
          <Link to="/privacy" className="underline">プライバシー</Link>
          {' '}に同意したものとみなされます
        </p>

        {/* 警告抑止のため未使用警告を出さない場所で error を no-op で参照 */}
        <span className="hidden">{error ? error : ''}</span>
      </main>
    </div>
  );
}
