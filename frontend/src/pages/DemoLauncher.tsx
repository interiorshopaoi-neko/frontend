import { Users, Hammer, BarChart2, Building2 } from 'lucide-react';

const DEMOS = [
  {
    href:  '/customer/estimate/flow?demo=auto',
    icon:  Users,
    label: 'お客様フロー',
    desc:  '見積もり依頼の自動デモ',
    color: 'bg-indigo-600',
  },
  {
    href:  '/craftsman/estimate/demo',
    icon:  Hammer,
    label: '職人ダッシュボード',
    desc:  '案件確認・受注判断のデモ',
    color: 'bg-emerald-600',
  },
  {
    href:  '/corporate',
    icon:  Building2,
    label: '管理会社フォーム',
    desc:  '物件・工事依頼・ファイル添付',
    color: 'bg-violet-600',
  },
  {
    href:  '/admin?demo=auto',
    icon:  BarChart2,
    label: '管理画面',
    desc:  'KPI・改善提案・A/Bテスト',
    color: 'bg-slate-700',
  },
] as const;

export default function DemoLauncher() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">Demo</p>
          <h1 className="text-2xl font-extrabold text-gray-900">自動デモを見る</h1>
          <p className="text-sm text-gray-400 mt-1">実際の依頼・決済は送信されません</p>
        </div>

        <div className="space-y-3">
          {DEMOS.map(({ href, icon: Icon, label, desc, color }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 hover:shadow-md transition-shadow active:scale-[0.98]"
            >
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </a>
          ))}
        </div>

        <p className="text-center text-xs text-gray-300">
          パスワード不要 · デモデータのみ
        </p>

      </div>
    </div>
  );
}
