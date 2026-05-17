import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import {
  type EstimateLine,
  type EstimateExpense,
  type EstimateUnit,
  type EstimateItemType,
  type LengthEntry,
  type FloorTileInput,
  calculateLineTotal,
  calculateEstimateTotal,
  calculateOrderLength,
  calculateFloorTileCount,
} from '../lib/craftsmanTools';

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

function nv(s: string): number {
  const n = Number(s);
  return isNaN(n) || n < 0 ? 0 : n;
}
function yen(n: number): string { return `¥${n.toLocaleString()}`; }
function fmt2(n: number): string { return n.toFixed(2); }
function fmt3(n: number): string { return n.toFixed(3); }

// ─── Types for profit records (kept for future persistence) ──────────────────

type ProfitRecord = {
  id: number;
  siteName: string;
  revenue: number;
  materialCost: number;
  profit: number;
  note: string;
  date: string;
};

// ─── 記録モーダル（変更なし）─────────────────────────────────────────────────

type RecordModalProps = {
  onClose: () => void;
  onSave: (r: Omit<ProfitRecord, 'id' | 'date'>) => void;
};

function RecordModal({ onClose, onSave }: RecordModalProps) {
  const [siteName,     setSiteName]     = useState('');
  const [revenue,      setRevenue]      = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [note,         setNote]         = useState('');
  const profit = nv(revenue) - nv(materialCost);
  const canSave = nv(revenue) > 0;
  function handleSave() {
    if (!canSave) return;
    onSave({ siteName: siteName.trim() || '現場記録', revenue: nv(revenue), materialCost: nv(materialCost), profit, note: note.trim() });
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-3xl ring-1 ring-slate-200 shadow-xl w-full max-w-sm p-5 space-y-4">
        <h3 className="text-base font-extrabold text-slate-900">現場を記録する</h3>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">現場名</label>
          <input type="text" placeholder="例: 田中様邸" value={siteName} onChange={e => setSiteName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '売上', value: revenue, set: setRevenue, required: true },
            { label: '材料費', value: materialCost, set: setMaterialCost, required: false },
          ].map(({ label, value, set, required }) => (
            <div key={label}>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input type="number" inputMode="numeric" min={0} placeholder="0" value={value} onChange={e => set(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-7 text-base font-extrabold text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">円</span>
              </div>
            </div>
          ))}
        </div>
        {nv(revenue) > 0 && (
          <div className={`rounded-2xl px-4 py-3 flex items-center justify-between ${profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div>
              <p className="text-[11px] font-bold text-slate-500">利益（売上 − 材料費）</p>
              <p className="text-xs text-slate-400 mt-0.5">{yen(nv(revenue))} − {yen(nv(materialCost))}</p>
            </div>
            <p className={`text-xl font-extrabold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {profit >= 0 ? '+' : ''}{yen(profit)}
            </p>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">メモ（任意）</label>
          <input type="text" placeholder="例: クロス張替え・6畳" value={note} onChange={e => setNote(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm transition active:scale-95">キャンセル</button>
          <button onClick={handleSave} disabled={!canSave} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-extrabold text-sm shadow-sm shadow-blue-200 transition active:scale-95 disabled:opacity-40">記録する</button>
        </div>
      </div>
    </div>
  );
}

// ─── NumInput（変更なし）─────────────────────────────────────────────────────

function NumInput({ value, onChange, placeholder, step, unit, className }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; step?: string; unit?: string; className?: string;
}) {
  return (
    <div className="relative">
      <input type="number" inputMode="decimal" min={0} step={step ?? '1'} placeholder={placeholder ?? '0'}
        value={value} onChange={e => onChange(e.target.value)}
        className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-7 text-right text-sm font-extrabold text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${className ?? ''}`}
      />
      {unit && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">{unit}</span>}
    </div>
  );
}

// ─── ProQuoteCalculator ───────────────────────────────────────────────────────

const ITEM_DEFAULTS: Record<EstimateItemType, { unit: EstimateUnit; price: string }> = {
  'クロス':       { unit: '㎡', price: '1100' },
  '床CF':        { unit: '㎡', price: '5600' },
  'フロアタイル': { unit: '枚', price: '800'  },
  'その他':      { unit: '㎡', price: ''      },
};

const UNIT_OPTIONS: EstimateUnit[] = ['㎡', 'm', '枚'];

function newLine(id: number): EstimateLine {
  return { id, item: 'クロス', name: '', qty: '', unit: '㎡', unitPrice: '1100', purchasePrice: '', lossRate: '10', memo: '', showDetail: false };
}

function ProQuoteCalculator() {
  const [lines, setLines] = useState<EstimateLine[]>([newLine(1)]);
  const [expense, setExpense] = useState<EstimateExpense>({ misc: '', waste: '', parking: '', other: '' });
  const [showExpense, setShowExpense] = useState(false);

  function addLine() { setLines(prev => [...prev, newLine(Date.now())]); }
  function deleteLine(id: number) { setLines(prev => prev.filter(l => l.id !== id)); }
  function update(id: number, patch: Partial<EstimateLine>) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }
  function updateItem(id: number, item: EstimateItemType) {
    const def = ITEM_DEFAULTS[item];
    setLines(prev => prev.map(l => l.id === id ? { ...l, item, unit: def.unit, unitPrice: def.price } : l));
  }

  const totals = calculateEstimateTotal(lines, expense);
  const hasAny = totals.revenue > 0;

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧮</span>
          <div>
            <p className="text-sm font-extrabold text-slate-900">かんたん利益見積</p>
            <p className="text-[11px] text-slate-400">工事項目・数量・単価で粗利まで計算</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {lines.map((line, idx) => {
          const r = calculateLineTotal(line);
          return (
            <div key={line.id} className="rounded-xl border border-slate-200 overflow-hidden">
              {/* クイック入力行 */}
              <div className="px-3 pt-3 pb-2 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {/* 工事項目 */}
                  <select
                    value={line.item}
                    onChange={e => updateItem(line.id, e.target.value as EstimateItemType)}
                    className="text-xs font-extrabold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
                  >
                    {(['クロス', '床CF', 'フロアタイル', 'その他'] as EstimateItemType[]).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {/* 単位切替 */}
                  <div className="flex gap-1">
                    {UNIT_OPTIONS.map(u => (
                      <button key={u} type="button" onClick={() => update(line.id, { unit: u })}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${
                          line.unit === u ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'
                        }`}
                      >{u}</button>
                    ))}
                  </div>
                  {/* 削除 */}
                  {lines.length > 1 && (
                    <button onClick={() => deleteLine(line.id)} className="text-slate-300 hover:text-red-400 transition text-base leading-none" title="削除">✕</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">数量</p>
                    <NumInput value={line.qty} onChange={v => update(line.id, { qty: v })} placeholder="0" step="0.1" unit={line.unit} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">施工単価</p>
                    <NumInput value={line.unitPrice} onChange={v => update(line.id, { unitPrice: v })} placeholder="0" unit="円" />
                  </div>
                </div>
                {/* 行小計 */}
                {r.revenue > 0 && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">売上小計</span>
                    <span className="font-extrabold text-blue-700">{yen(r.revenue)}</span>
                    {r.hasPurchasePrice && (
                      <span className={`font-bold ${r.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        粗利 {r.profit >= 0 ? '+' : ''}{yen(r.profit)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 詳細入力トグル */}
              <button
                type="button"
                onClick={() => update(line.id, { showDetail: !line.showDetail })}
                className="w-full text-[10px] text-slate-400 font-bold py-1.5 hover:bg-slate-50 transition flex items-center justify-center gap-1 border-t border-slate-100"
              >
                {line.showDetail ? '▲ 詳細を閉じる' : `▼ 詳細入力（仕入単価・ロス率）　行 ${idx + 1}`}
              </button>

              {/* 詳細入力 */}
              {line.showDetail && (
                <div className="px-3 py-3 border-t border-slate-100 space-y-2 bg-white">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">名称（内訳メモ）</p>
                    <input type="text" value={line.name} onChange={e => update(line.id, { name: e.target.value })}
                      placeholder="例) 量産クロス・1000番・巾木など"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-300 focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">仕入単価</p>
                      <NumInput value={line.purchasePrice} onChange={v => update(line.id, { purchasePrice: v })} placeholder="未入力" unit="円" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">ロス率</p>
                      <NumInput value={line.lossRate} onChange={v => update(line.id, { lossRate: v })} placeholder="10" unit="%" />
                    </div>
                  </div>
                  {r.hasPurchasePrice && nv(line.qty) > 0 && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2 space-y-0.5 text-[11px] text-slate-500">
                      <div className="flex justify-between"><span>仕入数量</span><span className="font-bold text-slate-700">{fmt2(r.purchaseQty)} {line.unit}</span></div>
                      <div className="flex justify-between"><span>材料原価</span><span className="font-bold text-slate-700">{yen(r.materialCost)}</span></div>
                      <div className={`flex justify-between font-bold ${r.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        <span>粗利</span><span>{r.profit >= 0 ? '+' : ''}{yen(r.profit)}</span>
                      </div>
                    </div>
                  )}
                  {!r.hasPurchasePrice && (
                    <p className="text-[10px] text-amber-600">※ 仕入単価を入力すると材料原価・粗利が計算されます</p>
                  )}
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">メモ</p>
                    <input type="text" value={line.memo} onChange={e => update(line.id, { memo: e.target.value })}
                      placeholder="例) アクセントクロス・2面貼り"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-300 focus:border-blue-400 focus:outline-none" />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 行追加 */}
        <button type="button" onClick={addLine}
          className="w-full rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-xs font-bold text-slate-400 hover:border-blue-300 hover:text-blue-500 transition active:scale-95">
          ＋ 行を追加
        </button>

        {/* 諸経費 */}
        <div>
          <button type="button" onClick={() => setShowExpense(v => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition">
            {showExpense ? '▲' : '▼'} その他費用を入力する
          </button>
          {showExpense && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([
                { key: 'misc',    label: '諸経費' },
                { key: 'waste',   label: '廃材処分費' },
                { key: 'parking', label: '駐車場代' },
                { key: 'other',   label: 'その他費用' },
              ] as { key: keyof EstimateExpense; label: string }[]).map(({ key, label }) => (
                <div key={key}>
                  <p className="text-[10px] text-slate-400 mb-1">{label}</p>
                  <NumInput value={expense[key]} onChange={v => setExpense(prev => ({ ...prev, [key]: v }))} placeholder="0" unit="円" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 合計 */}
        {hasAny && (
          <div className="space-y-2 pt-1">
            <div className="rounded-xl bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
              <p className="text-xs font-bold text-blue-200">売上合計</p>
              <p className="text-2xl font-extrabold">{yen(totals.revenue)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 space-y-1.5 text-[12px]">
              <div className="flex justify-between text-slate-500">
                <span>材料原価合計</span>
                <span className="font-bold text-slate-700">
                  {totals.materialCost > 0 ? yen(totals.materialCost) : '—'}
                  {totals.hasAnyMissingCost && <span className="ml-1 text-amber-500">（未入力あり）</span>}
                </span>
              </div>
              {totals.expenses > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>経費合計</span>
                  <span className="font-bold text-slate-700">{yen(totals.expenses)}</span>
                </div>
              )}
              <div className={`flex justify-between font-extrabold text-sm border-t border-slate-200 pt-1.5 ${totals.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <span>粗利{totals.profitRate !== 0 ? `（${totals.profitRate}%）` : ''}</span>
                <span>{totals.profit >= 0 ? '+' : ''}{yen(totals.profit)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LengthCalculator ─────────────────────────────────────────────────────────

function LengthCalculator() {
  const [entries, setEntries] = useState<LengthEntry[]>([]);
  const [inputCm,   setInputCm]   = useState('');
  const [lossRate,  setLossRate]  = useState('10');
  const [orderUnit, setOrderUnit] = useState<1 | 0.5>(1);
  const [copied,    setCopied]    = useState(false);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const cm = parseFloat(inputCm);
    if (!cm || cm <= 0) return;
    setEntries(prev => [...prev, { id: Date.now(), cm }]);
    setInputCm('');
  }

  const result = entries.length > 0
    ? calculateOrderLength(entries, parseFloat(lossRate) || 0, orderUnit)
    : null;

  function copyResult() {
    if (!result) return;
    const text = [
      '発注長さ計算',
      '寸法:',
      ...entries.map(e => `${e.cm}cm`),
      '',
      `合計: ${result.totalCm}cm / ${fmt2(result.totalM)}m`,
      `ロス率: ${lossRate}%`,
      `ロス込み: ${fmt2(result.withLossM)}m`,
      `推奨発注: ${result.recommendedM}m`,
    ].join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xl">📏</span>
        <div>
          <p className="text-sm font-extrabold text-slate-900">発注長さ計算</p>
          <p className="text-[11px] text-slate-400">寸法をcmで入力してEnter → 合計・発注mを自動計算</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 入力 */}
        <div>
          <p className="text-xs font-bold text-slate-600 mb-1.5">寸法入力（cm）</p>
          <input
            type="number" inputMode="decimal" value={inputCm}
            onChange={e => setInputCm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例）182　→ Enter で追加"
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-base font-extrabold text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none transition"
          />
          <p className="text-[10px] text-slate-400 mt-1">数字を入力して Enter キーで追加します</p>
        </div>

        {/* 追加済みリスト */}
        {entries.length > 0 && (
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {entries.map(e => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-bold text-slate-800">{e.cm} cm</span>
                <button onClick={() => setEntries(prev => prev.filter(x => x.id !== e.id))}
                  className="text-slate-300 hover:text-red-400 text-sm transition">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* 設定 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-slate-400 mb-1">ロス率</p>
            <NumInput value={lossRate} onChange={setLossRate} placeholder="10" unit="%" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 mb-1">発注単位</p>
            <div className="flex gap-1">
              {([1, 0.5] as const).map(u => (
                <button key={u} type="button" onClick={() => setOrderUnit(u)}
                  className={`flex-1 text-xs font-bold py-2 rounded-xl border transition ${
                    orderUnit === u ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'
                  }`}>{u}m単位</button>
              ))}
            </div>
          </div>
        </div>

        {/* 結果 */}
        {result && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 space-y-1.5">
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="text-slate-500">合計</div>
              <div className="font-bold text-slate-800 text-right">{result.totalCm}cm / {fmt2(result.totalM)}m</div>
              <div className="text-slate-500">ロス込み</div>
              <div className="font-bold text-slate-800 text-right">{fmt2(result.withLossM)}m</div>
            </div>
            <div className="flex items-center justify-between border-t border-blue-200 pt-2">
              <div>
                <p className="text-[10px] text-blue-500 font-bold">推奨発注</p>
                <p className="text-2xl font-extrabold text-blue-700">{result.recommendedM} m</p>
              </div>
              <button onClick={copyResult}
                className={`text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 ${
                  copied ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white'
                }`}
              >{copied ? '✅ コピー済み' : '📋 結果をコピー'}</button>
            </div>
          </div>
        )}

        {entries.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-2">寸法を追加すると結果が表示されます</p>
        )}
      </div>
    </div>
  );
}

// ─── FloorTileCalculator ──────────────────────────────────────────────────────

function FloorTileCalculator() {
  const [input, setInput] = useState<FloorTileInput>({
    roomWidth: '', roomDepth: '',
    tileWidth: '150', tileLength: '914',
    lossRate: '10', extra: '0',
  });
  const [copied, setCopied] = useState(false);

  function upd(patch: Partial<FloorTileInput>) { setInput(prev => ({ ...prev, ...patch })); }

  const result = calculateFloorTileCount(input);

  function copyResult() {
    if (!result) return;
    const text = [
      'フロアタイル枚数計算',
      `部屋: ${input.roomWidth}cm × ${input.roomDepth}cm`,
      `タイル: ${input.tileWidth}mm × ${input.tileLength}mm`,
      `部屋面積: ${fmt2(result.roomAreaM2)}㎡`,
      `1枚面積: ${fmt3(result.tileAreaM2)}㎡`,
      `ロス率: ${input.lossRate}%`,
      input.extra !== '0' ? `予備: ${input.extra}枚` : '',
      `推奨発注: ${result.recommendedCount}枚`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xl">🟦</span>
        <div>
          <p className="text-sm font-extrabold text-slate-900">フロアタイル枚数計算</p>
          <p className="text-[11px] text-slate-400">部屋寸法とタイルサイズから必要枚数を計算</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 部屋寸法 */}
        <div>
          <p className="text-xs font-bold text-slate-600 mb-2">部屋寸法（cm）</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-slate-400 mb-1">幅</p>
              <NumInput value={input.roomWidth} onChange={v => upd({ roomWidth: v })} placeholder="360" unit="cm" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 mb-1">奥行き</p>
              <NumInput value={input.roomDepth} onChange={v => upd({ roomDepth: v })} placeholder="270" unit="cm" />
            </div>
          </div>
        </div>

        {/* タイルサイズ */}
        <div>
          <p className="text-xs font-bold text-slate-600 mb-2">タイルサイズ（mm）</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-slate-400 mb-1">幅</p>
              <NumInput value={input.tileWidth} onChange={v => upd({ tileWidth: v })} placeholder="150" unit="mm" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 mb-1">長さ</p>
              <NumInput value={input.tileLength} onChange={v => upd({ tileLength: v })} placeholder="914" unit="mm" />
            </div>
          </div>
        </div>

        {/* ロス率・予備 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-slate-400 mb-1">ロス率</p>
            <NumInput value={input.lossRate} onChange={v => upd({ lossRate: v })} placeholder="10" unit="%" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 mb-1">予備枚数</p>
            <NumInput value={input.extra} onChange={v => upd({ extra: v })} placeholder="0" unit="枚" />
          </div>
        </div>

        {/* 結果 */}
        {result ? (
          <div className="rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 space-y-1.5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
              <div className="text-slate-500">部屋面積</div>
              <div className="font-bold text-slate-800 text-right">{fmt2(result.roomAreaM2)}㎡</div>
              <div className="text-slate-500">1枚あたり</div>
              <div className="font-bold text-slate-800 text-right">{fmt3(result.tileAreaM2)}㎡</div>
              <div className="text-slate-500">必要枚数</div>
              <div className="font-bold text-slate-800 text-right">{result.baseCount}枚</div>
              <div className="text-slate-500">ロス込み</div>
              <div className="font-bold text-slate-800 text-right">{result.withLossCount}枚</div>
            </div>
            <div className="flex items-center justify-between border-t border-violet-200 pt-2">
              <div>
                <p className="text-[10px] text-violet-500 font-bold">推奨発注</p>
                <p className="text-2xl font-extrabold text-violet-700">{result.recommendedCount} 枚</p>
              </div>
              <button onClick={copyResult}
                className={`text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 ${
                  copied ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-600 text-white'
                }`}
              >{copied ? '✅ コピー済み' : '📋 結果をコピー'}</button>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-slate-400 py-2">部屋寸法とタイルサイズを入力すると計算されます</p>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const navigate = useNavigate();
  const [records,   setRecords]   = useState<ProfitRecord[]>([
    { id: 1, siteName: '田中様邸', revenue: 52000, materialCost: 8000, profit: 44000, note: 'クロス張替え', date: '今日' },
    { id: 2, siteName: '佐藤様邸', revenue: 35000, materialCost: 6000, profit: 29000, note: '床CF', date: '今日' },
  ]);
  const [showModal, setShowModal] = useState(false);

  const todayRecords = records.filter(r => r.date === '今日');
  const totalProfit  = todayRecords.reduce((s, r) => s + r.profit, 0);
  const totalRevenue = todayRecords.reduce((s, r) => s + r.revenue, 0);

  function handleSave(data: Omit<ProfitRecord, 'id' | 'date'>) {
    setRecords(prev => [{ id: Date.now(), ...data, date: '今日' }, ...prev]);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <button onClick={() => navigate('/craftsman/dashboard')}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm mb-2 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          案件管理へ戻る
        </button>
        <h1 className="text-lg font-extrabold text-slate-900">現場ツール</h1>
        <p className="text-xs text-slate-500 mt-0.5">見積・計算・記録を現場ですぐ使えます</p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* 今日の利益サマリー */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl text-white px-5 py-5 shadow-sm shadow-blue-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] text-blue-200 font-bold mb-1">今日の利益</p>
              <p className="text-3xl font-extrabold tracking-tight">+{yen(totalProfit)}</p>
              <p className="text-[11px] text-blue-300 mt-1">売上合計 {yen(totalRevenue)} · {todayRecords.length}件</p>
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-sm px-4 py-2.5 rounded-2xl transition active:scale-95">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              記録する
            </button>
          </div>
          {todayRecords.length > 0 && (
            <div className="space-y-1.5">
              {todayRecords.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-200 truncate max-w-[60%]">{r.siteName}{r.note ? `・${r.note}` : ''}</span>
                  <span className="text-emerald-300 font-bold flex-shrink-0">+{yen(r.profit)}</span>
                </div>
              ))}
              {todayRecords.length > 3 && <p className="text-[10px] text-blue-300">他 {todayRecords.length - 3}件...</p>}
            </div>
          )}
        </div>

        {/* かんたん利益見積 */}
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">かんたん利益見積</p>
          <ProQuoteCalculator />
        </section>

        {/* 発注長さ計算 */}
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">発注長さ計算</p>
          <LengthCalculator />
        </section>

        {/* フロアタイル枚数計算 */}
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">フロアタイル枚数計算</p>
          <FloorTileCalculator />
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
                    <p className="mt-1 text-[10px] text-slate-400">材料費 {yen(r.materialCost)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {showModal && <RecordModal onClose={() => setShowModal(false)} onSave={handleSave} />}
      <BottomNav />
    </div>
  );
}
