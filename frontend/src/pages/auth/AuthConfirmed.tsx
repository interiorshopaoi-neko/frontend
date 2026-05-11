import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Role } from '../../types';

/**
 * /auth/confirmed
 *
 * 確認メールのリンクをクリックした後のランディングページ。
 * Supabase v2 は URL の token_hash を自動的に処理し、
 * onAuthStateChange で SIGNED_IN を発火する。
 * role が取得できれば役割別の導線へ、取得できなければ /login へ案内する。
 *
 * 触らないファイル: useAuth.ts / Login.tsx / supabase.ts
 */
export default function AuthConfirmed() {
  const navigate = useNavigate();
  // ready: INITIAL_SESSION か SIGNED_IN のどちらかを受信したら true
  const [ready, setReady] = useState(false);
  const [role,  setRole]  = useState<Role | null>(null);

  useEffect(() => {
    // Supabase v2 は subscribe 直後に INITIAL_SESSION を発火する。
    // token_hash が URL にある場合はその後 SIGNED_IN が続く。
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata as { role?: string };
        const r = meta?.role;
        setRole(r === 'craftsman' || r === 'customer' ? r : null);
      }
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // role 別の遷移先
  const dest =
    role === 'craftsman' ? '/craftsman/jobs' :
    role === 'customer'  ? '/corporate'      :
    '/login';

  // role 別の CTA ラベル
  const ctaLabel =
    role === 'craftsman' ? '動画案件を見る →'    :
    role === 'customer'  ? '見積もりを始める →'  :
    'ログインして続ける →';

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
        メールアドレスを確認しました
      </h1>
      <p className="text-[13.5px] text-slate-500 mb-8 text-center leading-relaxed">
        PRO MATCHへようこそ。<br />
        アカウントの準備が整いました。
      </p>

      {/* CTA ボタン */}
      <button
        onClick={() => navigate(dest)}
        disabled={!ready}
        className="w-full max-w-xs py-3.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600
                   hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40
                   text-white font-black text-[14px] shadow-lg shadow-blue-600/25
                   transition-all active:scale-[0.98]"
      >
        {ready ? ctaLabel : '確認中…'}
      </button>

      {/* ログイン済みで別アカウントに切り替えたい場合のフォールバック */}
      {ready && role && (
        <button
          onClick={() => navigate('/login')}
          className="mt-4 text-[11.5px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          別のアカウントでログイン
        </button>
      )}

      {/* フッター */}
      <p className="absolute bottom-6 text-[10px] text-slate-300">
        © 2026 PRO MATCH
      </p>
    </div>
  );
}
