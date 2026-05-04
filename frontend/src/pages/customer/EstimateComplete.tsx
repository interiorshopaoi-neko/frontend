import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const STEPS = [
  { icon: '🔍', label: '職人が内容確認' },
  { icon: '🤝', label: 'マッチング確定' },
  { icon: '📅', label: '日程調整'       },
];

export default function EstimateComplete() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-5 py-12 flex flex-col items-center text-center space-y-8">

      {/* ── Success icon ──────────────────────────────────────────────── */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <span className="absolute -top-1 -right-1 text-2xl">🎉</span>
      </div>

      {/* ── Title ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-gray-900">予約リクエストを<br />送信しました</h2>
        <p className="text-sm text-gray-400">あとは職人からの連絡を待つだけです</p>
      </div>

      {/* ── Status card ───────────────────────────────────────────────── */}
      <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-gray-50">
        {[
          { icon: '✅', label: '職人に内容を送信済み',      sub: null                },
          { icon: '⏱',  label: '通常30分〜数時間で返信',    sub: null                },
          { icon: '📬', label: 'メールまたはLINEで連絡',    sub: '登録した連絡先に届きます' },
        ].map(({ icon, label, sub }) => (
          <div key={label} className="flex items-center gap-4 px-5 py-4">
            <span className="text-xl w-7 text-center flex-shrink-0">{icon}</span>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-800">{label}</p>
              {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Next steps ────────────────────────────────────────────────── */}
      <div className="w-full">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">次の流れ</p>
        <div className="flex items-center justify-center gap-2">
          {STEPS.map(({ icon, label }, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl">
                  {icon}
                </div>
                <p className="text-[10px] font-bold text-gray-500 text-center leading-tight">{label}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-6 h-px bg-gray-200 mb-5 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <div className="w-full pt-2">
        <button
          onClick={() => navigate('/customer')}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-200 active:scale-95 transition-all"
        >
          トップへ戻る
        </button>
        <p className="text-xs text-gray-400 mt-3">
          マッチング状況は「依頼一覧」から確認できます
        </p>
      </div>

    </div>
  );
}
