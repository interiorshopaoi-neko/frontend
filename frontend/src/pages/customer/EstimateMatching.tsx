import { ChevronRight, Users, Zap, ClipboardCheck } from 'lucide-react';

const DUMMY_COUNT = 12;

const POINTS = [
  {
    icon: Users,
    color: 'bg-indigo-100 text-indigo-600',
    title: '条件に合う職人を最大3名選定',
    desc:  'エリア・工事内容・評価をもとにAIが自動で絞り込みます',
  },
  {
    icon: Zap,
    color: 'bg-amber-100 text-amber-600',
    title: '最短で即日対応可能',
    desc:  '対応可能な職人がいれば、当日中に連絡が届きます',
  },
  {
    icon: ClipboardCheck,
    color: 'bg-emerald-100 text-emerald-600',
    title: '入力内容をもとに職人が判断',
    desc:  '写真と状態から職人が事前確認し、的確な見積もりを提示します',
  },
] as const;

interface Props {
  onNext: () => void;
}

export default function EstimateMatching({ onNext }: Props) {
  return (
    <div className="space-y-6">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="text-center pt-2">

        {/* Animated matching visual */}
        <div className="relative inline-flex items-center justify-center mb-6">
          {/* Pulse rings */}
          <span className="absolute w-24 h-24 rounded-full bg-indigo-200 opacity-40 animate-ping" />
          <span className="absolute w-20 h-20 rounded-full bg-indigo-300 opacity-30 animate-ping [animation-delay:0.3s]" />
          {/* Icon */}
          <div className="relative w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 flex items-center justify-center">
            <span className="text-3xl">👷</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 leading-tight">
          最適な職人を<br />自動でマッチングします
        </h2>
        <p className="text-sm text-gray-400 mt-2">
          入力内容をもとに最適な職人を選定します
        </p>
      </div>

      {/* ── Feature points ────────────────────────────────────────────── */}
      <div className="space-y-3">
        {POINTS.map(({ icon: Icon, color, title, desc }, i) => (
          <div key={i}
            className="flex items-start gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 leading-snug">{title}</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Live count badge ──────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-5 py-4">
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <p className="text-sm font-bold text-green-700">
          現在、<span className="text-lg">{DUMMY_COUNT}</span>名の職人が対応可能です
        </p>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          次へ進む
          <ChevronRight size={18} />
        </button>
        <p className="text-xs text-center text-gray-400 mt-3">
          この時点では費用は発生しません
        </p>
      </div>

    </div>
  );
}
