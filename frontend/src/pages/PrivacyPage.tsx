import { useNavigate } from 'react-router-dom';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '取得する情報',
    body: 'お名前・連絡先（任意）、工事の依頼内容・写真・動画、アプリの利用状況（ページ閲覧・操作ログ）を取得します。住所・電話番号等の個人情報は成約後のみ当事者間で共有されます。',
  },
  {
    title: '利用目的',
    body: '依頼者と職人のマッチング、サービスの品質向上、不正利用の防止、サービスに関するご連絡のために使用します。',
  },
  {
    title: '第三者への提供',
    body: '取得した情報を、法令に基づく場合・ユーザーの同意がある場合を除き、第三者に提供・販売しません。成約後の連絡先開示は、マッチング成立の目的の範囲内での提供です。',
  },
  {
    title: 'Cookieの使用',
    body: 'サービスの利用状況把握のため、Cookieを使用する場合があります。ブラウザの設定でCookieを無効にすることができますが、一部機能が使えなくなる場合があります。',
  },
  {
    title: '情報の管理',
    body: '取得した情報は適切に管理し、不正アクセス・漏洩・紛失の防止に努めます。',
  },
  {
    title: 'お問い合わせ',
    body: '個人情報の取り扱いに関するお問い合わせは、サポートページよりご連絡ください。',
  },
];

export default function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 p-1 -ml-1 rounded-xl transition" aria-label="戻る">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">プライバシーポリシー</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Privacy Policy</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        <p className="text-[11px] text-slate-400 px-1">最終更新：2026年5月</p>

        <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden divide-y divide-slate-100">
          {SECTIONS.map(s => (
            <div key={s.title} className="px-5 py-4">
              <p className="text-sm font-extrabold text-slate-800 mb-1.5">{s.title}</p>
              <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
          <p className="text-[11px] text-slate-500">
            ご不明点は<button onClick={() => navigate('/support')} className="text-blue-600 font-bold underline">お問い合わせ</button>ください
          </p>
        </div>
      </div>
    </div>
  );
}
