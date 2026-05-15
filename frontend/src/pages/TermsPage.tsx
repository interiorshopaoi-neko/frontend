import { useNavigate } from 'react-router-dom';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. サービスの性質',
    body: 'PRO MATCHは、内装工事の依頼者と職人をつなぐマッチングプラットフォームです。工事契約は依頼者と職人の間で直接成立します。PRO MATCHは工事契約の当事者ではありません。',
  },
  {
    title: '2. 工事代金の取り扱い',
    body: '工事代金は依頼者と職人が直接やり取りします。PRO MATCHは工事代金を預かりません。支払い方法・タイミングは当事者間でご相談ください。',
  },
  {
    title: '3. サービス利用料',
    body: 'お客様のご利用は無料です。職人側のサービス利用料は、工事が成約した時点で発生します。利用料は成約時点の概算金額を基準に確定し、その後の金額変動による再計算は原則行いません。',
  },
  {
    title: '4. 禁止事項',
    body: '成約前の外部誘導（SNS・他サービスへの誘導など）、虚偽の申告・情報の提供、不正な方法によるサービス利用、他のユーザーへの不適切な行為、PRO MATCHのシステム・運営を妨害する行為を禁止します。',
  },
  {
    title: '5. アカウント制限',
    body: '外部誘導・虚偽申告などの禁止事項が確認された場合、事前の通知なくアカウントを制限または停止する場合があります。',
  },
  {
    title: '6. 免責事項',
    body: 'PRO MATCHは、工事の品質・施工内容・トラブルについて責任を負いません。当サービスはマッチングの機会を提供するものであり、成約・工事の完了を保証するものではありません。工事に関する問題は依頼者と職人の間で解決してください。',
  },
  {
    title: '7. レビューの投稿について',
    body: 'レビューの投稿は任意です。投稿されたレビューは職人プロフィールに表示され、他の依頼者の参考になります。虚偽・誹謗中傷・不正なレビューの投稿は禁止します。運営は不適切なレビューを削除する場合があります。',
  },
  {
    title: '8. 変更',
    body: '本規約は、必要に応じて変更する場合があります。重要な変更がある場合は、サービス内でお知らせします。',
  },
];

export default function TermsPage() {
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
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">利用規約</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Terms of Service</p>
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
          <p className="text-[11px] text-slate-500">ご不明点は<button onClick={() => navigate('/support')} className="text-blue-600 font-bold underline">お問い合わせ</button>ください</p>
        </div>
      </div>
    </div>
  );
}
