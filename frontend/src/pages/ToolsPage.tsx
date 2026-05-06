import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfitRecord = {
  id: number;
  amount: number;
  note: string;
  date: string;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ToolCard({
  icon,
  title,
  description,
  badge,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full text-left bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-4 flex items-start gap-3 transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-default"
    >
      <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-extrabold text-slate-900">{title}</p>
          {badge && (
            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      {onClick && (
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

// ─── Record Modal (簡易) ──────────────────────────────────────────────────────

function RecordModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (amount: number, note: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');

  function handleSave() {
    const n = Number(amount);
    if (!n || n <= 0) return;
    onSave(n, note.trim() || '売上記録');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-3xl ring-1 ring-slate-200 shadow-xl w-full max-w-sm p-5 space-y-4">
        <h3 className="text-base font-extrabold text-slate-900">利益を記録する</h3>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">金額（円）</label>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="例: 18000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-8 text-xl font-extrabold text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">円</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">メモ（任意）</label>
          <input
            type="text"
            placeholder="例: ○○様 クロス張替え"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm transition active:scale-95"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!amount || Number(amount) <= 0}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-extrabold text-sm shadow-sm shadow-blue-200 transition active:scale-95 disabled:opacity-40"
          >
            記録する
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [records, setRecords]     = useState<ProfitRecord[]>([
    { id: 1, amount: 18200, note: '田中様 クロス張替え', date: '今日' },
  ]);
  const [showModal, setShowModal] = useState(false);

  const totalToday = records
    .filter(r => r.date === '今日')
    .reduce((s, r) => s + r.amount, 0);

  function handleSave(amount: number, note: string) {
    setRecords(prev => [
      { id: Date.now(), amount, note, date: '今日' },
      ...prev,
    ]);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-extrabold text-slate-900">ツール</h1>
        <p className="text-xs text-slate-500 mt-0.5">現場で使える職人ツール</p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* 今日の利益カード */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl text-white px-5 py-5 shadow-sm shadow-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-blue-200 font-bold mb-1">今日の利益</p>
              <p className="text-3xl font-extrabold tracking-tight">
                +¥{totalToday.toLocaleString()}
              </p>
              <p className="text-[11px] text-blue-300 mt-1">{records.filter(r => r.date === '今日').length}件の記録</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-sm px-4 py-2.5 rounded-2xl transition active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              記録する
            </button>
          </div>
        </div>

        {/* ツール一覧 */}
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">ツール</p>
          <div className="space-y-2.5">
            <ToolCard
              icon="🧮"
              title="簡単見積"
              description="工事内容・面積を入力するだけで概算金額を計算します"
              onClick={() => alert('簡単見積は近日公開予定です')}
            />
            <ToolCard
              icon="📐"
              title="材料計算"
              description="クロス・CFの必要量を畳数・平米から自動計算します"
              onClick={() => alert('材料計算は近日公開予定です')}
            />
            <ToolCard
              icon="📝"
              title="現場メモ"
              description="現場の状況・メモを素早く記録。写真と一緒に保存できます"
              onClick={() => alert('現場メモは近日公開予定です')}
            />
            <ToolCard
              icon="✨"
              title="AI見積"
              description="写真をもとにAIが工事内容と概算金額を提案します"
              badge="準備中"
            />
          </div>
        </section>

        {/* 最近の記録 */}
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">最近の記録</p>
          {records.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 px-5 py-8 text-center">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm font-bold text-slate-600">記録がまだありません</p>
              <p className="text-xs text-slate-400 mt-1">「記録する」ボタンから利益を追加できます</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden divide-y divide-slate-100">
              {records.map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{r.note}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{r.date}</p>
                  </div>
                  <p className="text-base font-extrabold text-emerald-600">+¥{r.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {showModal && (
        <RecordModal onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
    </div>
  );
}
