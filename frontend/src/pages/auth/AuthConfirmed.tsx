import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * /auth/confirmed
 *
 * 確認メールのリンクをクリックした後のランディングページ。
 * Supabase v2 は URL の token_hash を自動的に処理し、
 * onAuthStateChange で SIGNED_IN を発火する。
 *
 * カスタム auth (localStorage token) が必要な職人/顧客ページへは
 * 直遷移しない。必ず /login に誘導して再ログインを促す。
 *
 * 触らないファイル: useAuth.ts / Login.tsx / supabase.ts
 */
export default function AuthConfirmed() {
  const navigate = useNavigate();
  // ready: INITIAL_SESSION か SIGNED_IN のどちらかを受信したら true
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Supabase v2 は subscribe 直後に INITIAL_SESSION を発火する。
    // token_hash が URL にある場合はその後 SIGNED_IN が続く。
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ready になったらカウントダウン開始
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [ready]);

  // カウントダウンが 0 以下になったら /login へ自動遷移。
  // pendingRole がある場合は古いセッションをクリアし、role クエリ付きで誘導する。
  // 別端末でリンクを開いた場合は pendingRole が存在しないため通常の /login へ。
  useEffect(() => {
    if (countdown > 0) return;
    try {
      const pendingRole = localStorage.getItem('pendingRole');
      if (pendingRole) {
        localStorage.removeItem('pendingRole');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate(`/login?role=${encodeURIComponent(pendingRole)}&confirmed=1`);
        return;
      }
    } catch {}
    navigate('/login');
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center px-5">
      {/* ロゴ */}
      <img
        src="/logo-full.png"
        alt="PRO MATCH"
        className="h-7 object-contain mb-10"
      />

      {/* チェックアイコン */}
      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
        <CheckCircle2 size={34} className="text-emerald-500" strokeWidth={2} />
      </div>

      {/* メインメッセージ */}
      <h1 className="text-[22px] font-black text-slate-900 mb-2 text-center leading-snug">
        メール認証が完了しました
      </h1>
      <p className="text-[13.5px] text-slate-500 mb-3 text-center leading-relaxed">
        PRO MATCHへようこそ。<br />
        ログインしてサービスを始めましょう。
      </p>

      {/* カウントダウン表示 */}
      {ready && (
        <p className="text-[12px] text-slate-400 mb-6 text-center">
          {countdown > 0 ? `${countdown}秒後に自動でログインページへ移動します` : 'ログインページへ移動中...'}
        </p>
      )}

      {/* CTA ボタン */}
      <button
        onClick={() => navigate('/login')}
        disabled={!ready}
        className="w-full max-w-xs py-3.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600
                   hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40
                   text-white font-black text-[14px] shadow-lg shadow-blue-600/25
                   transition-all active:scale-[0.98]"
      >
        {ready ? 'ログインページへ →' : '確認中…'}
      </button>

      {/* フッター */}
      <p className="absolute bottom-6 text-[10px] text-slate-300">
        © 2026 PRO MATCH
      </p>
    </div>
  );
}
