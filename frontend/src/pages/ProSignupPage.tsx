import { useNavigate } from 'react-router-dom';
import { Users, ClipboardList, BadgeCheck, TrendingUp } from 'lucide-react';

const BENEFITS = [
  {
    icon: Users,
    title: '新規顧客を自動でご紹介',
    desc: 'エリアと対応工事に合う案件が届きます。営業不要。',
  },
  {
    icon: ClipboardList,
    title: '動画・写真で状況確認',
    desc: '現地訪問前に状況を確認できるので、効率よく対応できます。',
  },
  {
    icon: BadgeCheck,
    title: '成約時のみサービス利用料',
    desc: '成約しない案件への費用はゼロ。リスクなく始められます。',
  },
  {
    icon: TrendingUp,
    title: '実績・評価が積み上がる',
    desc: '施工実績と評価が積み上がるほど、優先的に案件が紹介されます。',
  },
] as const;

export default function ProSignupPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-5 pt-10 pb-24">

        {/* Logo */}
        <div className="mb-10">
          <img src="/logo-full.svg" alt="PRO MATCH" className="h-8 object-contain" />
        </div>

        {/* Hero */}
        <div className="mb-8">
          <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-2">
            For Professionals
          </p>
          <h1 className="text-2xl font-bold text-slate-900 leading-snug">
            内装職人の方へ
          </h1>
          <p className="text-sm text-slate-500 mt-3 leading-relaxed">
            壁紙・床材の張り替え案件を継続的にご紹介します。<br />
            登録・案件閲覧・応募は無料です。
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-8">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">
            ご利用のメリット
          </p>
          {BENEFITS.map(({ icon: Icon, title, desc }, i) => (
            <div key={i} className="flex gap-4 items-start bg-white border border-slate-100 rounded-2xl px-4 py-4 shadow-sm">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center">
                <Icon size={17} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 料金 */}
        <div className="mb-8 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">費用について（職人側）</p>
          <div className="space-y-1.5">
            {([
              { label: '登録・掲載',   cost: '無料' },
              { label: '案件閲覧・応募', cost: '無料' },
              { label: 'サービス利用料', cost: '成約時のみ ¥500〜¥5,000' },
            ] as const).map(({ label, cost }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-slate-500">{label}</span>
                <span className="font-semibold text-slate-700">{cost}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
            ※ 工事代金は依頼者と直接やり取りします。PRO MATCHは工事代金をお預かりしません。
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/register')}
          className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-base transition-all shadow-sm"
        >
          職人として登録する
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">
          すでにアカウントをお持ちの方は{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-slate-700 font-semibold hover:underline"
          >
            ログイン
          </button>
        </p>
      </div>
    </div>
  );
}
