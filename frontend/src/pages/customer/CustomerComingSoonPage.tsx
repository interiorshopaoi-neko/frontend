import { useNavigate } from 'react-router-dom';

export default function CustomerComingSoonPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* アイコン */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-800">お客様専用ページは準備中です</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            見積もり依頼は、現在こちらのフォームから受け付けています
          </p>
        </div>

        {/* カード */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
          <button
            onClick={() => navigate('/corporate')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition active:scale-95 text-sm"
          >
            見積もり依頼へ進む
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full text-slate-400 hover:text-slate-600 font-medium py-2 text-sm transition"
          >
            トップページへ戻る
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
          ログイン不要・住所入力不要・しつこい営業なし
        </p>
      </div>
    </div>
  );
}
