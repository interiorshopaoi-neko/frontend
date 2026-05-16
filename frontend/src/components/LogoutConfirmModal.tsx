// ログアウト確認モーダル
// 誤タップ防止のため、ログアウト前に確認ダイアログを表示する

type Props = {
  onConfirm: () => void;
  onCancel:  () => void;
};

export default function LogoutConfirmModal({ onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-5"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-extrabold text-slate-900 mb-2">ログアウトしますか？</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          現在の画面からログアウトします。<br />
          もう一度ログインすれば再開できます。
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm
                       hover:bg-slate-200 transition active:scale-[0.98]"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm
                       transition active:scale-[0.98]"
          >
            ログアウトする
          </button>
        </div>
      </div>
    </div>
  );
}
