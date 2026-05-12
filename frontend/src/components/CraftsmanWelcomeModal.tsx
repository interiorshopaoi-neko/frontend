import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Video,
  Send,
  Mail,
  ArrowRight,
  X,
} from 'lucide-react';

interface Props {
  /** モーダルを閉じる（dismiss記録は親で担当） */
  onClose: () => void;
}

/**
 * 職人登録直後の初回ウェルカムモーダル。
 * - CraftsmanJobsPage がマウント時に「state.justRegistered=true && localStorage.craftsman_welcomed=null」
 *   のときだけ open する。それ以外（既存職人、ブックマーク経由、お客様）には絶対に出ない。
 * - 「今すぐ案件を見る」「通知設定をする」「× / 背景 / ESC」のいずれでも onClose が呼ばれ、
 *   親が localStorage.craftsman_welcomed = ISO日時 を記録する。
 */
export default function CraftsmanWelcomeModal({ onClose }: Props) {
  const navigate = useNavigate();

  // ESCキーで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 背面のスクロール抑止
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const goProfile = () => {
    onClose();
    navigate('/craftsman/profile#notification');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      {/* 背景オーバーレイ（クリックで閉じる） */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
      />

      {/* モーダル本体（ボトムシート風） */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-[slideUp_0.28s_cubic-bezier(0.22,1,0.36,1)]">
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* 上部装飾（青グラデのアクセント帯） */}
        <div className="relative h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 overflow-hidden">
          <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/15" />
          <div className="pointer-events-none absolute -left-4 -bottom-6 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-3 py-1">
              <Sparkles size={13} className="text-white" />
              <span className="text-[11px] font-black tracking-widest text-white">WELCOME</span>
            </span>
          </div>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* 本文 */}
        <div className="px-6 pt-5 pb-7">
          <h2
            id="welcome-title"
            className="text-[20px] font-black text-slate-900 leading-snug mb-2"
          >
            ようこそ、<span className="text-blue-600">PRO MATCH</span>へ
          </h2>
          <p className="text-[12.5px] text-slate-600 leading-relaxed mb-5">
            まずはショート動画で案件を見てみましょう。<br />
            応募だけでは料金は発生しません。<br />
            <span className="font-bold text-slate-800">最初の2成約は手数料0円</span>です。
          </p>

          {/* 3ステップ */}
          <ol className="space-y-2.5 mb-6">
            {[
              { icon: Video, label: 'ショート動画で案件を見る',  desc: '近場の案件・想定売上・距離が一目で分かります' },
              { icon: Send,  label: '気になる案件に応募する',     desc: '応募はずっと無料。成約時のみ手数料が発生' },
              { icon: Mail,  label: '通知メールを設定する',       desc: '新着案件をいち早く受け取れます' },
            ].map(({ icon: Icon, label, desc }, i) => (
              <li key={label} className="flex items-start gap-3">
                <div className="relative flex-shrink-0 w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Icon size={15} className="text-blue-600" strokeWidth={2.4} />
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                    {i + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[13px] font-extrabold text-slate-900 leading-tight">{label}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* CTA */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-black text-[14px] transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            今すぐ案件を見る
            <ArrowRight size={15} />
          </button>
          <button
            type="button"
            onClick={goProfile}
            className="w-full mt-2 py-3 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-bold text-[13px] border border-slate-200 transition flex items-center justify-center gap-1.5"
          >
            <Mail size={14} className="text-slate-500" />
            通知設定をする
          </button>

          <p className="text-center text-[11px] text-slate-400 mt-3 leading-relaxed">
            あとからプロフィールを整えることもできます。
          </p>
        </div>
      </div>
    </div>
  );
}
