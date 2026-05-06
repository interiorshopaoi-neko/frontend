import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, MessageSquare, PhoneCall, Hammer } from 'lucide-react';

const NEXT_STEPS = [
  {
    icon: Clock,
    title: '職人が内容を確認',
    desc: '動画・写真を確認した職人が概算金額を提示します（通常1〜2営業日）',
  },
  {
    icon: MessageSquare,
    title: '職人から連絡',
    desc: '条件が合えば、職人から直接ご連絡があります',
  },
  {
    icon: PhoneCall,
    title: '成約・連絡先の開示',
    desc: '成約後に職人の詳細な連絡先をご確認いただけます',
  },
  {
    icon: Hammer,
    title: '工事・直接お支払い',
    desc: '工事代金は職人へ直接お支払いください。PRO MATCHは工事代金をお預かりしません',
  },
] as const;

export default function CompletePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-5 pt-12 pb-24">

        {/* Logo */}
        <div className="mb-10">
          <img src="/logo-full.svg" alt="PRO MATCH" className="h-8 object-contain" />
        </div>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-5">
            <CheckCircle size={32} className="text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 leading-snug">
            見積もり依頼を<br />受け付けました
          </h1>
          <p className="text-sm text-slate-500 mt-3 leading-relaxed">
            ご依頼ありがとうございます。<br />
            内容を確認のうえ、職人候補をご紹介します。
          </p>
        </div>

        {/* 無料バナー */}
        <div className="mb-8 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-center">
          <p className="text-sm font-bold text-emerald-800">
            見積もり・相談・職人選びは完全無料
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            工事代金は職人へ直接お支払い。PRO MATCHはお預かりしません。
          </p>
        </div>

        {/* Next steps */}
        <div className="space-y-3 mb-10">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">
            この後の流れ
          </p>
          {NEXT_STEPS.map(({ icon: Icon, title, desc }, i) => (
            <div key={i} className="flex gap-4 items-start bg-white border border-slate-100 rounded-2xl px-4 py-4 shadow-sm">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center">
                <Icon size={17} className="text-slate-500" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400">STEP {i + 1}</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/')}
          className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-base transition-all shadow-sm"
        >
          トップへ戻る
        </button>

        <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
          ご不明な点は
          <a href="/support" className="text-slate-600 font-semibold hover:underline ml-0.5">
            お問い合わせ
          </a>
          ください
        </p>
      </div>
    </div>
  );
}
