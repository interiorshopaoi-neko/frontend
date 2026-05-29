import { useNavigate } from 'react-router-dom';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. 取得する情報',
    body: '本サービスでは以下の情報を取得します。①表示名・氏名（任意）、②メールアドレス（認証・通知用）、③職人プロフィール情報（工種・対応エリア・経歴・写真等）、④投稿した動画・写真、⑤依頼案件の内容・写真・動画、⑥端末情報・IPアドレス・アクセスログ、⑦改善報告フォームへの入力内容・スクリーンショット・ブラウザ情報。',
  },
  {
    title: '2. 利用目的',
    body: '取得した情報は以下の目的に使用します。①依頼者と職人のマッチング支援、②成約後の連絡先開示、③本人確認・不正防止、④通知メールの送信、⑤サービスの品質向上・改善、⑥利用規約違反への対応。上記以外の目的には使用しません。',
  },
  {
    title: '3. 連絡先の開示について',
    body: '成約時に依頼者・職人間で開示される連絡先は、登録されたメールアドレスのみです。電話番号・住所・LINE ID等は本サービスを通じて開示されません。現在の試験運用中は連絡先確認を無料で提供しています。',
  },
  {
    title: '4. 第三者提供',
    body: '取得した情報は、以下の場合を除き第三者に提供・販売しません。①マッチング成立時に相手方への連絡先開示（本人同意の範囲内）、②法令に基づく開示要求がある場合、③ユーザーの同意がある場合。',
  },
  {
    title: '5. 利用する外部サービス',
    body: '本サービスは以下の外部サービスを利用しています。①Supabase（データベース・認証・ストレージ）、②Vercel（サーバー・API実行環境）、③Resend（メール送信）、④Stripe（決済処理・正式版で利用予定）。各サービスのプライバシーポリシーも合わせてご確認ください。',
  },
  {
    title: '6. 動画・写真のアップロードについて',
    body: 'アップロードする動画・写真には、個人情報（氏名・顔・住所・表札・郵便物・車両ナンバー・免許証等）が映り込まないようご注意ください。アップロードされたファイルはマッチング・見積もり目的にのみ使用し、第三者への転用・販売は行いません。',
  },
  {
    title: '7. 情報の管理',
    body: '取得した情報は適切に管理し、不正アクセス・漏洩・紛失の防止に努めます。ただし完全な安全を保証するものではありません。',
  },
  {
    title: '8. 開示・削除依頼',
    body: '自身の個人情報の開示・訂正・削除をご希望の場合は、サポートページよりご連絡ください。本人確認後、法令の範囲内で対応します。',
  },
  {
    title: '9. お問い合わせ窓口',
    body: 'プライバシーポリシーに関するお問い合わせは、サポートページよりご連絡ください。メール: interior.shop.aoi@gmail.com',
  },
  {
    title: '10. プライバシーポリシーの改定',
    body: '本ポリシーは必要に応じて改定する場合があります。重要な変更がある場合は、サービス内でお知らせします。',
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
