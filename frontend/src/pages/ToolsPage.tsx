import { useState } from 'react';

// ─── 定数 ────────────────────────────────────────────────────────────────────

const UNIT_PRICES = {
  closs: 1100, // クロス（円/㎡）
  cf:    5600, // 床CF（円/㎡）
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfitRecord = {
  id: number;
  siteName: string;
  revenue: number;
  materialCost: number;
  profit: number;
  note: string;
  date: string;
};

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

function numVal(s: string): number {
  const n = Number(s);
  return isNaN(n) || n < 0 ? 0 : n;
}

function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}

// ─── 記録モーダル ─────────────────────────────────────────────────────────────

type RecordModalProps = {
  onClose: () => void;
  onSave: (r: Omit<ProfitRecord, 'id' | 'date'>) => void;
};

function RecordModal({ onClose, onSave }: RecordModalProps) {
  const [siteName,     setSiteName]     = useState('');
  const [revenue,      setRevenue]      = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [note,         setNote]         = useState('');

  const profit = numVal(revenue) - numVal(materialCost);
  const canSave = numVal(revenue) > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      siteName:     siteName.trim() || '現場記録',
      revenue:      numVal(revenue),
      materialCost: numVal(materialCost),
      profit,
      note:         note.trim(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-3xl ring-1 ring-slate-200 shadow-xl w-full max-w-sm p-5 space-y-4">

        <h3 className="text-base font-extrabold text-slate-900">現場を記録する</h3>

        {/* 現場名 */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">現場名</label>
          <input
            type="text"
            placeholder="例: 田中様邸"
            value={siteName}
            onChange={e => setSiteName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* 売上・材料費 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              売上 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="50000"
                value={revenue}
                onChange={e => setRevenue(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-7 text-base font-extrabold text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">円</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">材料費</label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="8000"
                value={materialCost}
                onChange={e => setMaterialCost(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-7 text-base font-extrabold text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">円</span>
            </div>
          </div>
        </div>

        {/* 利益プレビュー */}
        {numVal(revenue) > 0 && (
          <div className={`rounded-2xl px-4 py-3 flex items-center justify-between ${
            profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'
          }`}>
            <div>
              <p className="text-[11px] font-bold text-slate-500">利益（売上 − 材料費）</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {yen(numVal(revenue))} − {yen(numVal(materialCost))}
              </p>
            </div>
            <p className={`text-xl font-extrabold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {profit >= 0 ? '+' : ''}{yen(profit)}
            </p>
          </div>
        )}

        {/* メモ */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">メモ（任意）</label>
          <input
            type="text"
            placeholder="例: クロス張替え・6畳"
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
            disabled={!canSave}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-extrabold text-sm shadow-sm shadow-blue-200 transition active:scale-95 disabled:opacity-40"
          >
            記録する
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 簡単見積カード ───────────────────────────────────────────────────────────

function QuoteCalculator() {
  const [crossQty, setCrossQty] = useState('');
  const [cfQty,    setCfQty]    = useState('');

  const crossTotal = numVal(crossQty) * UNIT_PRICES.closs;
  const cfTotal    = numVal(cfQty)    * UNIT_PRICES.cf;
  const grandTotal = crossTotal + cfTotal;

  const hasAny = numVal(crossQty) > 0 || numVal(cfQty) > 0;

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧮</span>
          <div>
            <p className="text-sm font-extrabold text-slate-900">簡単見積</p>
            <p className="text-[11px] text-slate-400">数量を入力すると概算が出ます</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* クロス */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-700 mb-1">クロス</p>
            <p className="text-[10px] text-slate-400">単価 ¥1,100 / ㎡</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative w-28">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={crossQty}
                onChange={e => setCrossQty(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-right text-base font-extrabold text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">㎡</span>
            </div>
            <span className="text-slate-300 text-sm">=</span>
            <p className="w-24 text-right text-sm font-extrabold text-slate-700">
              {numVal(crossQty) > 0 ? yen(crossTotal) : '—'}
            </p>
          </div>
        </div>

        {/* CF */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-700 mb-1">床CF</p>
            <p className="text-[10px] text-slate-400">単価 ¥5,600 / ㎡</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative w-28">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={cfQty}
                onChange={e => setCfQty(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-right text-base font-extrabold text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">㎡</span>
            </div>
            <span className="text-slate-300 text-sm">=</span>
            <p className="w-24 text-right text-sm font-extrabold text-slate-700">
              {numVal(cfQty) > 0 ? yen(cfTotal) : '—'}
            </p>
          </div>
        </div>

        {/* 合計 */}
        {hasAny && (
          <div className="rounded-xl bg-blue-600 text-white px-4 py-3 flex items-center justify-between mt-1">
            <p className="text-xs font-bold text-blue-200">概算合計</p>
            <p className="text-xl font-extrabold">{yen(grandTotal)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [records,   setRecords]   = useState<ProfitRecord[]>([
    { id: 1, siteName: '田中様邸', revenue: 52000, materialCost: 8000, profit: 44000, note: 'クロス張替え', date: '今日' },
    { id: 2, siteName: '佐藤様邸', revenue: 35000, materialCost: 6000, profit: 29000, note: '床CF', date: '今日' },
  ]);
  const [showModal, setShowModal] = useState(false);

  const todayRecords  = records.filter(r => r.date === '今日');
  const totalProfit   = todayRecords.reduce((s, r) => s + r.profit, 0);
  const totalRevenue  = todayRecords.reduce((s, r) => s + r.revenue, 0);

  function handleSave(data: Omit<ProfitRecord, 'id' | 'date'>) {
    setRecords(prev => [{ id: Date.now(), ...data, date: '今日' }, ...prev]);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-extrabold text-slate-900">ツール</h1>
        <p className="text-xs text-slate-500 mt-0.5">現場で使える職人ツール</p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* 今日の利益サマリー */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl text-white px-5 py-5 shadow-sm shadow-blue-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] text-blue-200 font-bold mb-1">今日の利益</p>
              <p className="text-3xl font-extrabold tracking-tight">
                +{yen(totalProfit)}
              </p>
              <p className="text-[11px] text-blue-300 mt-1">売上合計 {yen(totalRevenue)} · {todayRecords.length}件</p>
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

          {/* 内訳バー */}
          {todayRecords.length > 0 && (
            <div className="space-y-1.5">
              {todayRecords.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-200 truncate max-w-[60%]">{r.siteName}{r.note ? `・${r.note}` : ''}</span>
                  <span className="text-emerald-300 font-bold flex-shrink-0">+{yen(r.profit)}</span>
                </div>
              ))}
              {todayRecords.length > 3 && (
                <p className="text-[10px] text-blue-300">他 {todayRecords.length - 3}件...</p>
              )}
            </div>
          )}
        </div>

        {/* 簡単見積 */}
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">簡単見積</p>
          <QuoteCalculator />
        </section>

        {/* ツール（準備中） */}
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">その他ツール</p>
          <div className="space-y-2">
            {[
              { icon: '📐', title: '材料計算', desc: 'クロス・CFの必要量を畳数から自動計算' },
              { icon: '📝', title: '現場メモ', desc: '現場の状況・メモを素早く記録' },
              { icon: '✨', title: 'AI見積',   desc: '写真をもとにAIが概算金額を提案' },
            ].map(t => (
              <div key={t.title} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex items-center gap-3 opacity-60">
                <span className="text-xl">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold text-slate-700">{t.title}</p>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">準備中</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 最近の記録 */}
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">最近の記録</p>
          {records.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 px-5 py-8 text-center">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm font-bold text-slate-600">記録がまだありません</p>
              <p className="text-xs text-slate-400 mt-1">「記録する」から現場の売上・利益を追加できます</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden divide-y divide-slate-100">
              {records.map(r => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{r.siteName}</p>
                      {r.note && <p className="text-[11px] text-slate-400 mt-0.5">{r.note}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-extrabold text-emerald-600">+{yen(r.profit)}</p>
                      <p className="text-[10px] text-slate-400">売上 {yen(r.revenue)}</p>
                    </div>
                  </div>
                  {r.materialCost > 0 && (
                    <div className="mt-1.5 flex gap-3 text-[10px] text-slate-400">
                      <span>材料費 {yen(r.materialCost)}</span>
                    </div>
                  )}
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
