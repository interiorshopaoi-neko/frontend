import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const PRICE_TABLE = [
  { step: '見積もり依頼',   who: 'お客様',   cost: '無料',          note: null },
  { step: '職人候補の確認', who: 'お客様',   cost: '無料',          note: null },
  { step: '予約確定',       who: 'お客様',   cost: '¥3,000',       note: '工事代金に充当' },
  { step: '工事代金',       who: 'お客様',   cost: '職人に直接支払い', note: null },
] as const;

const CANCEL_POLICIES = [
  {
    label: '前日までのキャンセル',
    badge: '全額返金',
    badgeCls: 'bg-emerald-100 text-emerald-700',
    desc: '予約確定金¥3,000を全額返金します（返金まで3〜5営業日）',
  },
  {
    label: '当日キャンセル（お客様都合）',
    badge: '返金なし',
    badgeCls: 'bg-rose-100 text-rose-700',
    desc: '職人の準備・移動が発生するため、返金はできません',
  },
  {
    label: '当日キャンセル（職人都合）',
    badge: '全額返金',
    badgeCls: 'bg-emerald-100 text-emerald-700',
    desc: '職人側の事情によるキャンセルは全額返金します',
  },
] as const;

export default function PolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-5 pt-10 pb-24">

        {/* Logo + back */}
        <div className="flex items-center justify-between mb-10">
          <Logo size={28} />
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium"
          >
            ← 戻る
          </button>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-1">料金・キャンセルポリシー</h1>
        <p className="text-xs text-slate-400 mb-8">最終更新：2025年1月</p>

        {/* 料金表 */}
        <section className="mb-8">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
            料金表
          </p>
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 px-4 py-2.5">
              <span className="text-[10px] font-semibold text-slate-400">ステップ</span>
              <span className="text-[10px] font-semibold text-slate-400 text-center">対象</span>
              <span className="text-[10px] font-semibold text-slate-400 text-right">費用</span>
            </div>
            {PRICE_TABLE.map(({ step, who, cost, note }) => (
              <div key={step} className="grid grid-cols-3 items-start px-4 py-3.5 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-xs font-medium text-slate-700">{step}</p>
                </div>
                <p className="text-xs text-slate-500 text-center">{who}</p>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800">{cost}</p>
                  {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* キャンセルポリシー */}
        <section className="mb-10">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
            キャンセルポリシー
          </p>
          <div className="space-y-3">
            {CANCEL_POLICIES.map(({ label, badge, badgeCls, desc }) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-white shadow-sm px-4 py-4">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <p className="text-sm font-bold text-slate-800 leading-snug">{label}</p>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${badgeCls}`}>
                    {badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 注意事項 */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 mb-8">
          <p className="text-xs font-semibold text-slate-600 mb-2">注意事項</p>
          <ul className="space-y-1.5">
            {[
              '工事代金は職人と直接お支払いいただきます。プラットフォームは仲介のみです。',
              '正式な工事金額は職人が写真を確認後に確定します。目安価格とは異なる場合があります。',
              '職人の評価や実績は参考情報です。保証ではありません。',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                <span className="text-slate-400 flex-shrink-0">·</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <button
          onClick={() => navigate('/')}
          className="w-full py-3.5 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 active:scale-95 transition-all"
        >
          トップへ戻る
        </button>
      </div>
    </div>
  );
}
