import { useEffect } from 'react';

type Props = {
  workType: string;
  city: string;
  revenue: number;
  fee: number;
  takeHome: number;
  submitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmApplyModal({
  workType, city, revenue, fee, takeHome, submitting, onConfirm, onCancel,
}: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);   opacity: 1; }
          }
        `}</style>

        {/* ヘッダー */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-extrabold text-slate-900">応募内容を確認</h2>
          <p className="text-sm text-slate-400 mt-0.5">内容を確認して応募してください</p>
        </div>

        {/* 案件情報 */}
        <div className="px-6 pt-4 pb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-slate-400 font-bold mb-0.5">工事内容</p>
              <p className="text-sm font-bold text-slate-800 leading-snug">{workType || '内装工事'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-slate-400 font-bold mb-0.5">エリア</p>
              <p className="text-sm font-bold text-slate-800 leading-snug">{city || '未設定'}</p>
            </div>
          </div>

          {/* 収益カード */}
          <div className="rounded-2xl bg-blue-600 text-white px-4 py-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-blue-200">概算金額</p>
              <p className="text-base font-extrabold">¥{revenue.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-sm text-blue-300">サービス料</p>
              <p className="text-sm text-blue-200">−¥{fee.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between pt-2.5 border-t border-white/20">
              <p className="text-sm text-blue-200 font-bold">手取り目安</p>
              <p className="text-xl font-extrabold text-emerald-300">¥{takeHome.toLocaleString()}</p>
            </div>
          </div>

          {/* 安心メッセージ */}
          <div className="space-y-1.5">
            {[
              '応募だけでは料金は発生しません',
              '成約時に手数料が確定します',
            ].map(text => (
              <div key={text} className="flex items-center gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-extrabold flex items-center justify-center">✓</span>
                <p className="text-xs text-slate-600 font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ボタン */}
        <div className="px-6 pb-8 pt-3 space-y-2">
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3.5 font-extrabold text-base shadow-sm shadow-blue-200 transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? '送信中...' : 'この内容で応募する'}
          </button>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="w-full text-slate-400 text-sm py-2.5 font-medium hover:text-slate-600 transition disabled:opacity-40"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
