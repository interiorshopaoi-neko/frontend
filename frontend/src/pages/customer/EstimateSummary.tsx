import { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, ChevronRight, ChevronDown, Pencil } from 'lucide-react';
import type { EstimateInputData } from './EstimateInput';

// ── Calculation helpers ───────────────────────────────────────────────────────

function getTatami(d: EstimateInputData): number {
  return d.roomSize === 'other' ? parseFloat(d.customSize) || 8 : d.roomSize;
}

function calcWorkTime(d: EstimateInputData): { min: number; max: number } {
  const t = getTatami(d);
  const base =
    d.workType === 'wallpaper' ? Math.ceil(t / 2) + 1 :
    d.workType === 'floor'     ? Math.ceil(t / 2)     :
    Math.ceil(t / 2) + Math.ceil(t / 2) + 1;   // both
  const extra = (d.condition === 'heavy' ? 1 : 0) + (d.hasFurniture ? 1 : 0);
  return { min: base + extra, max: base + extra + 1 };
}

function calcPrice(d: EstimateInputData): { min: number; max: number } {
  const t = getTatami(d);
  const WALL_UNIT = { light: 3800, medium: 4500, heavy: 5500 }[d.condition];
  const FLOOR_UNIT = { light: 3200, medium: 3800, heavy: 4800 }[d.condition];
  const furniture = d.hasFurniture ? 8000 : 0;
  const wall  = t * WALL_UNIT  + 5000;   // base cost
  const floor = t * FLOOR_UNIT + 4000;
  const raw =
    d.workType === 'wallpaper' ? wall :
    d.workType === 'floor'     ? floor :
    wall + floor;
  return {
    min: Math.round((raw * 0.88 + furniture) / 1000) * 1000,
    max: Math.round((raw * 1.12 + furniture) / 1000) * 1000,
  };
}

// ── Display labels ────────────────────────────────────────────────────────────

const WORK_LABEL = {
  wallpaper: '壁紙の張り替え',
  floor:     '床材の張り替え',
  both:      '壁紙 + 床材セット',
} as const;

const CONDITION_LABEL = {
  light:  { text: '軽度',  sub: '薄い汚れ・日焼け',   cls: 'bg-emerald-100 text-emerald-700' },
  medium: { text: '中程度', sub: '破れ・変色・浮き',    cls: 'bg-amber-100 text-amber-700'   },
  heavy:  { text: '重度',  sub: 'カビ・大きな破れあり', cls: 'bg-rose-100 text-rose-700'     },
} as const;

const TIMING_LABEL = {
  asap:    'できるだけ早く',
  week:    '1週間以内',
  consult: '相談して決める',
} as const;

// ── Notes ─────────────────────────────────────────────────────────────────────

function getNotes(d: EstimateInputData): string[] {
  const notes: string[] = [];
  if (d.condition === 'heavy') notes.push('状態により、現地確認後に価格が変動する場合があります');
  if (d.hasFurniture)          notes.push('家具の移動費（¥8,000）が価格目安に含まれています');
  if (d.condition !== 'heavy') notes.push('写真確認後に正式な価格を職人がご提示します');
  return notes;
}

// ── Detail form types ─────────────────────────────────────────────────────────

export type GradeChoice = 'standard' | 'stylish' | 'premium';
export type AreaChoice  = 'wall' | 'ceiling' | 'floor';

export interface DetailData {
  grade: GradeChoice | null;
  areas: AreaChoice[];
  rooms: string;
  notes: string;
}

// ── Row component ─────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-semibold pt-0.5 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 text-right">{children}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  data:      EstimateInputData;
  onConfirm: (detail: DetailData) => void;
  onEdit:    () => void;
}

export default function EstimateSummary({ data, onConfirm, onEdit }: Props) {
  const tatami    = getTatami(data);
  const workTime  = calcWorkTime(data);
  const price     = calcPrice(data);
  const warnNotes = getNotes(data);
  const cond      = CONDITION_LABEL[data.condition];
  const roomLabel = data.roomSize === 'other' ? `${data.customSize}畳` : `${data.roomSize}畳`;

  // ── 詳細希望フォーム ──────────────────────────────────────────────────────
  const [showDetail, setShowDetail] = useState(false);
  const [grade, setGrade]           = useState<GradeChoice | null>(null);
  const [areas, setAreas]           = useState<AreaChoice[]>([]);
  const [rooms, setRooms]           = useState('');
  const [notes, setNotes]           = useState('');

  return (
    <div className="space-y-4">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle size={18} className="text-indigo-500" />
          <h2 className="text-xl font-bold text-gray-900">この内容で合っていますか？</h2>
        </div>
        <p className="text-sm text-gray-400 pl-6.5">
          違和感のある項目があれば「修正する」を押してください
        </p>
      </div>

      {/* ── Summary card ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">

        {/* Top accent */}
        <div className="h-1 bg-indigo-600" />

        <div className="px-5 py-1 divide-y divide-gray-50">
          <Row label="工事内容">
            <span className="text-sm font-bold text-gray-800">{WORK_LABEL[data.workType]}</span>
          </Row>

          <Row label="部屋サイズ">
            <span className="text-sm font-bold text-gray-800">{roomLabel}</span>
          </Row>

          <Row label="状態">
            <div className="flex flex-col items-end gap-0.5">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cond.cls}`}>{cond.text}</span>
              <span className="text-[11px] text-gray-400">{cond.sub}</span>
            </div>
          </Row>

          <Row label="家具">
            <span className="text-sm font-bold text-gray-800">
              {data.hasFurniture ? 'あり（移動が必要）' : 'なし'}
            </span>
          </Row>

          <Row label="施工時期">
            <span className="text-sm font-bold text-gray-800">{TIMING_LABEL[data.timing]}</span>
          </Row>

          <Row label="作業時間">
            <div className="flex items-center justify-end gap-1.5">
              <Clock size={13} className="text-gray-400" />
              <span className="text-sm font-bold text-gray-800">
                {workTime.min}〜{workTime.max}時間
              </span>
            </div>
          </Row>

          <Row label="目安工期">
            <span className="text-sm font-bold text-gray-800">
              {workTime.max <= 6 ? '1日' : workTime.max <= 12 ? '1〜2日' : '2〜3日'}
            </span>
          </Row>
        </div>

        {/* ── Price highlight ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-5 py-5 text-center">
          <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
            価格目安
          </p>
          <p className="text-4xl font-extrabold text-white tracking-tight">
            ¥{price.min.toLocaleString()}
            <span className="text-xl font-normal text-indigo-300 mx-2">〜</span>
            ¥{price.max.toLocaleString()}
          </p>
          <p className="text-xs text-indigo-300 mt-1.5">税込 · 写真確認後に正式金額を確定</p>
        </div>

        {/* ── Final price note ────────────────────────────────────────── */}
        <p className="text-xs text-gray-500 px-5 pt-3">
          最終金額は現地確認後に確定します
        </p>

        {/* ── Price reason ────────────────────────────────────────────── */}
        <div className="bg-slate-50 p-4 rounded-xl text-sm">
          <p className="font-bold">この金額の理由</p>
          <p>材料費・施工費を含んだ目安です</p>
          <p>事前説明なしの追加費用はありません</p>
        </div>

        {/* ── Notes ───────────────────────────────────────────────────── */}
        {warnNotes.length > 0 && (
          <div className="bg-amber-50 px-5 py-4 space-y-2">
            {warnNotes.map((note, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 leading-snug">{note}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Under-surface risk (heavy only) ─────────────────────────── */}
        {data.condition === 'heavy' && (
          <div className="bg-yellow-50 p-4 rounded-xl text-sm">
            <p>⚠️ 下地状態により追加費用の可能性</p>
            <p>理由：内部状態が見えないため</p>
            <p>対応：必ず事前に説明します</p>
          </div>
        )}
      </div>

      {/* ── Photo count ─────────────────────────────────────────────────── */}
      {data.photos.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <CheckCircle size={14} className="text-green-500" />
          <p className="text-xs text-gray-500">
            写真 <span className="font-bold text-gray-700">{data.photos.length}枚</span> 添付済み
            {data.area && (
              <span className="ml-2 text-gray-400">· {data.area}</span>
            )}
          </p>
        </div>
      )}

      {/* ── 詳細希望アコーディオン ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <button
          onClick={() => setShowDetail(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-slate-700">詳細な希望を追加する</p>
            <p className="text-xs text-slate-400 mt-0.5">壁紙の種類・施工箇所・複数部屋など（任意）</p>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${showDetail ? 'rotate-180' : ''}`}
          />
        </button>

        {showDetail && (
          <div className="border-t border-slate-100 px-4 py-4 space-y-5">

            {/* 壁紙グレード */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">壁紙グレード</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'standard', label: 'スタンダード' },
                  { value: 'stylish',  label: '少しおしゃれ' },
                  { value: 'premium',  label: 'こだわり'     },
                ] as { value: GradeChoice; label: string }[]).map(({ value, label }) => (
                  <button key={value} type="button"
                    onClick={() => setGrade(v => v === value ? null : value)}
                    className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                      grade === value
                        ? 'border-slate-700 bg-slate-700 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* 施工箇所 */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">施工箇所</p>
              <div className="flex gap-2">
                {([
                  { value: 'wall',    label: '壁'   },
                  { value: 'ceiling', label: '天井' },
                  { value: 'floor',   label: '床'   },
                ] as { value: AreaChoice; label: string }[]).map(({ value, label }) => (
                  <button key={value} type="button"
                    onClick={() => setAreas(prev =>
                      prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]
                    )}
                    className={`px-4 py-2 rounded-full border text-xs font-semibold transition-all ${
                      areas.includes(value)
                        ? 'border-slate-700 bg-slate-700 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* 部屋数・場所 */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">部屋数・場所</p>
              <input
                type="text"
                value={rooms}
                onChange={e => setRooms(e.target.value)}
                placeholder="例：リビング、寝室2つ、トイレ"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* その他の希望 */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">その他の希望</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="例：ペットがいるので耐久性重視、白系でまとめたい"
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              />
            </div>

          </div>
        )}
      </div>

      {/* ── Buttons ─────────────────────────────────────────────────────── */}
      <div className="space-y-2.5 pt-2">
        <button
          onClick={() => onConfirm({ grade, areas, rooms, notes })}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          この内容で進む
          <ChevronRight size={18} />
        </button>

        <button
          onClick={onEdit}
          className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Pencil size={15} />
          修正する
        </button>
      </div>

    </div>
  );
}
