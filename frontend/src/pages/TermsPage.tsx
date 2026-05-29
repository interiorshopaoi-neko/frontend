import { useNavigate } from 'react-router-dom';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '第1条 サービスの性質',
    body: 'PRO MATCH（以下「本サービス」）は、内装工事の依頼者と職人をつなぐマッチング支援プラットフォームです。本サービスは工事会社ではなく、情報提供およびマッチング機会の提供を行うものです。工事契約は依頼者と職人の間で直接成立し、PRO MATCHは工事契約の当事者にはなりません。',
  },
  {
    title: '第2条 工事内容・契約・支払い・品質の確認',
    body: '工事内容・施工範囲・料金・日程・材料・品質等はすべて依頼者と職人が直接確認・合意してください。PRO MATCHは工事条件の適正性、施工品質、支払い履行を保証しません。成約後のトラブルは当事者間で解決してください。',
  },
  {
    title: '第3条 サービス利用料',
    body: '依頼者のご利用は無料です。職人側のサービス利用料は、工事が成約した時点で発生します。利用料は成約時点の概算金額を基準に確定し、その後の金額変動による再計算は原則行いません。',
  },
  {
    title: '第4条 試験運用について',
    body: '本サービスは現在試験運用中です。予告なく仕様変更・機能追加・機能停止・サービス終了する場合があります。試験運用中に蓄積したデータについても、正式版移行時に引き継げない場合があります。あらかじめご了承ください。',
  },
  {
    title: '第5条 禁止事項',
    body: '以下の行為を禁止します。①成約前の外部誘導（SNS・他サービスへの誘導）、②虚偽情報・誇大表現の提供、③不正な方法によるサービス利用・システム妨害、④他のユーザーへの不当な圧力・迷惑行為、⑤反社会的勢力・暴力団等に関係する者の利用、⑥法令違反行為、⑦その他運営が不適切と判断する行為。',
  },
  {
    title: '第6条 投稿コンテンツ（動画・写真）の注意',
    body: '動画・写真をアップロードする際は、個人情報（氏名・顔・住所・表札・郵便物・車両ナンバー・免許証等）が映り込まないようご注意ください。運営は利用規約に違反する投稿を削除できます。また必要に応じて利用を制限できます。',
  },
  {
    title: '第7条 アカウント制限・停止',
    body: '禁止事項への違反が確認された場合、または運営が不適切と判断した場合、事前通知なくアカウントの制限・停止・削除を行う場合があります。',
  },
  {
    title: '第8条 免責事項',
    body: 'PRO MATCHは、以下について一切の責任を負いません。①工事品質・施工内容・完成物に関するトラブル、②支払い・請求・金銭トラブル、③日程変更・工事遅延・キャンセル、④事故・怪我・賠償、⑤本サービスの不具合・通知遅延・データ消失、⑥マッチングの不成立、⑦試験運用中の仕様変更・サービス停止。',
  },
  {
    title: '第9条 レビューについて',
    body: 'レビューの投稿は任意です。投稿されたレビューは職人プロフィールに表示される場合があります。虚偽・誹謗中傷・不正なレビューは禁止します。運営は不適切なレビューを削除できます。',
  },
  {
    title: '第10条 規約の変更',
    body: '本規約は必要に応じて変更する場合があります。重要な変更がある場合は、サービス内またはメールでお知らせします。変更後も本サービスを利用し続けた場合、変更後の規約に同意したものとみなします。',
  },
  {
    title: '第11条 準拠法・管轄裁判所',
    body: '本規約の解釈および適用は日本法に準拠します。本サービスに関して生じる紛争については、運営者所在地を管轄する裁判所を第一審の専属合意管轄裁判所とします。',
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
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs font-bold text-amber-800">⚠ 現在試験運用中</p>
          <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
            本サービスは試験運用中です。予告なく仕様変更・停止する場合があります。
          </p>
        </div>

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
