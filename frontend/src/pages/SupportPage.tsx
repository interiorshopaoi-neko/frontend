import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const TYPES = ['質問', '不具合', '通報', 'その他'] as const;
type SupportType = typeof TYPES[number];

const REPORT_REASONS = ['外部誘導', '無断キャンセル', '虚偽申告', '危険行為', '不適切な言動'];

export default function SupportPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isReport = params.get('type') === 'report';

  const [name,     setName]     = useState('');
  const [contact,  setContact]  = useState('');
  const [type,     setType]     = useState<SupportType>(isReport ? '通報' : '質問');
  const [reason,   setReason]   = useState('');
  const [body,     setBody]     = useState('');
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!body.trim()) { setError('内容を入力してください'); return; }
    // デモ送信（DB保存なし）
    console.log('[SupportPage] submit', { name, contact, type, reason, body });
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 max-w-sm w-full text-center overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 px-6 pt-8 pb-6">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-extrabold text-white">送信しました</h2>
          </div>
          <div className="px-6 py-5 space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed">
              お問い合わせありがとうございます。<br />
              内容を確認のうえ、必要に応じてご連絡いたします。
            </p>
            <button onClick={() => navigate(-1)} className="w-full bg-blue-600 text-white rounded-2xl py-3.5 font-extrabold text-sm shadow-sm shadow-blue-200 transition active:scale-[0.99]">
              戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 p-1 -ml-1 rounded-xl transition" aria-label="戻る">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">お問い合わせ</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">{isReport ? '問題を報告する' : 'ご質問・ご要望'}</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="bg-white rounded-2xl ring-1 ring-slate-200 p-5 space-y-4">

            {/* 名前 */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">お名前<span className="ml-1 text-slate-400 font-normal">（任意）</span></label>
              <input
                type="text"
                placeholder="例: 田中 太郎"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* 連絡先 */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">メールアドレス<span className="ml-1 text-slate-400 font-normal">（任意）</span></label>
              <input
                type="text"
                placeholder="例: example@mail.com"
                value={contact}
                onChange={e => setContact(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* 種別 */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">種別<span className="ml-1 text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition ${
                      type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 通報の場合：理由選択 */}
            {type === '通報' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">報告の理由</label>
                <div className="flex flex-wrap gap-2">
                  {REPORT_REASONS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(prev => prev === r ? '' : r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                        reason === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 内容 */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">内容<span className="ml-1 text-red-500">*</span></label>
              <textarea
                rows={4}
                placeholder={type === '通報' ? '状況をできるだけ詳しく教えてください' : 'お気軽にご記入ください'}
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none transition"
              />
            </div>
          </section>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-2xl py-4 text-base font-extrabold shadow-sm shadow-blue-200 transition active:scale-[0.99]"
          >
            送信する
          </button>

          <p className="text-center text-[11px] text-slate-400">
            緊急の場合や返信が必要な場合は、連絡先をご記入ください。
          </p>
        </form>
      </div>
    </div>
  );
}
