import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * /reset-password
 *
 * Supabase パスワードリカバリーメールのリンクをクリックした後のランディングページ。
 * Supabase v2 SDK が URL の token_hash（type=recovery）を自動処理し、
 * onAuthStateChange で PASSWORD_RECOVERY を発火する。
 * 発火後に新パスワード入力フォームを表示し、updateUser で更新する。
 *
 * 触らないファイル: useAuth.ts / supabase.ts / Login.tsx 以外
 */

type Phase = 'loading' | 'form' | 'success' | 'expired';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [phase,    setPhase]    = useState<Phase>('loading');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    // Supabase v2: URL の token_hash を自動処理 → PASSWORD_RECOVERY 発火
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setPhase('form');
      }
    });

    // フォールバック: 8秒以内に PASSWORD_RECOVERY が来なければリンク無効と判断
    const timer = setTimeout(() => {
      setPhase(p => p === 'loading' ? 'expired' : p);
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // 成功後は 3 秒後に /login へ自動遷移
  useEffect(() => {
    if (phase !== 'success') return;
    const t = setTimeout(() => navigate('/login', { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [phase, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }
    if (password !== confirm) {
      setError('パスワードが一致しません');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      // 更新後はセッションを破棄して再ログインを促す
      await supabase.auth.signOut();
      setPhase('success');
    } catch (err: any) {
      setError(err?.message ?? 'パスワードの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center px-5">
      {/* ロゴ */}
      <img
        src="/logo-full.png"
        alt="PRO MATCH"
        className="h-7 object-contain mb-10"
      />

      {/* ── loading ── */}
      {phase === 'loading' && (
        <>
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-5 animate-pulse">
            <KeyRound size={28} className="text-slate-400" strokeWidth={1.8} />
          </div>
          <p className="text-[13.5px] text-slate-500 text-center">リンクを確認中…</p>
        </>
      )}

      {/* ── expired ── */}
      {phase === 'expired' && (
        <>
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-5">
            <AlertCircle size={28} className="text-rose-400" strokeWidth={1.8} />
          </div>
          <h1 className="text-[18px] font-black text-slate-900 mb-2 text-center">
            リンクが無効または期限切れです
          </h1>
          <p className="text-[12.5px] text-slate-500 mb-7 text-center leading-relaxed">
            パスワードリセットメールを再送してください。
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-700 transition-colors"
          >
            ログイン画面へ戻る
          </button>
        </>
      )}

      {/* ── form ── */}
      {phase === 'form' && (
        <>
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-5">
            <KeyRound size={28} className="text-blue-500" strokeWidth={1.8} />
          </div>
          <h1 className="text-[21px] font-black text-slate-900 mb-1.5 text-center">
            新しいパスワードを設定
          </h1>
          <p className="text-[13px] text-slate-500 mb-7 text-center leading-relaxed">
            6文字以上のパスワードを入力してください。
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                新しいパスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[13.5px]
                           focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                           bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                確認用パスワード
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[13.5px]
                           focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                           bg-slate-50/50"
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
              className="w-full py-3.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600
                         hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40
                         text-white font-black text-[14px] shadow-lg shadow-blue-600/25
                         transition-all active:scale-[0.98]"
            >
              {loading ? '更新中…' : 'パスワードを更新する'}
            </button>
          </form>
        </>
      )}

      {/* ── success ── */}
      {phase === 'success' && (
        <>
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
            <CheckCircle2 size={30} className="text-emerald-500" strokeWidth={2} />
          </div>
          <h1 className="text-[21px] font-black text-slate-900 mb-2 text-center">
            パスワードを更新しました
          </h1>
          <p className="text-[13px] text-slate-500 mb-7 text-center leading-relaxed">
            新しいパスワードでログインしてください。<br />
            3秒後に自動で移動します。
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="px-6 py-3 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-700 transition-colors"
          >
            ログイン画面へ
          </button>
        </>
      )}

      <p className="absolute bottom-6 text-[10px] text-slate-300">
        © 2026 PRO MATCH
      </p>
    </div>
  );
}
