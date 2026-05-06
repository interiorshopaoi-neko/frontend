import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FAQS: { q: string; a: string }[] = [
  {
    q: '見積もりは無料ですか？',
    a: 'はい、無料です。お客様は見積もり依頼・相談・職人選びまですべて無料でご利用いただけます。ログイン・登録も不要です。',
  },
  {
    q: '成約前に連絡先は見られますか？',
    a: '成約前は、住所・電話番号などの個人情報は表示されません。成約後に詳細な連絡先をご確認いただけます。お互いの安全を守るための仕組みです。',
  },
  {
    q: '工事代金は誰に支払いますか？',
    a: '工事代金は、依頼者と職人が直接やり取りします。PRO MATCHは工事代金を預かりません。',
  },
  {
    q: 'サービス利用料はいつ発生しますか？',
    a: '職人側のサービス利用料は、工事が成約した時点で発生します（概算金額を基準に確定）。お客様側は無料です。成約後に金額が増減しても、原則として再計算は行いません。',
  },
  {
    q: 'キャンセル時はどうなりますか？',
    a: '成約前のキャンセルは無料です。成約後のキャンセルは、依頼者と職人の間で直接ご相談ください。PRO MATCHはキャンセル料の預かり・返金は行いません。',
  },
  {
    q: 'PRO MATCHは工事代金を預かりますか？',
    a: 'いいえ、預かりません。工事代金は依頼者と職人が直接やり取りします。PRO MATCHはマッチングの場を提供するサービスです。',
  },
  {
    q: '応援機能の利用料は？',
    a: '現在は無料でご利用いただけます。正式版では、応援成立時に募集側・参加側それぞれ300円の利用料を予定しています。',
  },
  {
    q: '動画を送らないといけませんか？',
    a: 'いいえ、動画は任意です。ただし、動画があると職人がより正確な概算を出しやすくなります。写真のみでもご依頼いただけます。',
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-none">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 transition hover:bg-slate-50"
      >
        <span className="text-sm font-bold text-slate-800 leading-snug">{q}</span>
        <svg
          className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-slate-600 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
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
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">よくある質問</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">FAQ</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
          {FAQS.map((item, i) => <AccordionItem key={i} q={item.q} a={item.a} />)}
        </div>

        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center space-y-1">
          <p className="text-[11px] text-slate-500">解決しない場合はお問い合わせください</p>
          <button onClick={() => navigate('/support')} className="text-xs text-blue-600 font-bold underline">お問い合わせフォーム →</button>
        </div>

        <p className="text-center text-[11px] text-slate-400">今後AIサポートを追加予定です</p>
      </div>
    </div>
  );
}
