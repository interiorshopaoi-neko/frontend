import { useEffect } from 'react';

type Props = {
  onClose: () => void;
  onInputAmount?: () => void;
};

export default function ApplySuccessModal({ onClose, onInputAmount }: Props) {
  // ESC キーで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* アニメーション定義 */}
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);   opacity: 1; }
          }
        `}</style>

        {/* ヘッダー */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 pt-8 pb-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-white">対応可能として送信しました</h2>
          <p className="text-green-100 text-sm mt-1">依頼主に通知が届きます</p>
        </div>

        {/* ステップ説明 */}
        <div className="px-6 pt-5 pb-2">
          <div className="bg-blue-50 rounded-2xl px-4 py-4 space-y-2.5">
            <p className="text-xs font-extrabold text-blue-700 mb-1">📋 次のステップ</p>
            {[
              { icon: '✅', text: '依頼主に応募通知が届きました' },
              { icon: '🔒', text: 'まだ個人情報は開示されません' },
              { icon: '💴', text: '概算金額を入力すると調整が進みます' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <span className="text-base leading-none mt-0.5 flex-shrink-0">{icon}</span>
                <p className="text-sm text-slate-700 leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ボタン */}
        <div className="px-6 pb-6 pt-4 space-y-2.5">
          <button
            onClick={onInputAmount ?? onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3.5 font-extrabold text-base shadow-sm shadow-blue-200 transition active:scale-[0.98]"
          >
            概算金額を入力する →
          </button>
          <button
            onClick={onClose}
            className="w-full text-slate-400 text-sm py-2.5 font-medium hover:text-slate-600 transition"
          >
            あとで入力する
          </button>
        </div>
      </div>
    </div>
  );
}
