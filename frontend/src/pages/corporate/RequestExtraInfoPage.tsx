import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ── 型定義 ────────────────────────────────────────────────────────────────────

export type ExtraInfo = {
  furniture: string;
  parking: string;
  material: string[];
  condition: string[];
  timing: string;
  memo: string;
};

// ── 選択肢 ────────────────────────────────────────────────────────────────────

const FURNITURE_OPTIONS = [
  '家具はほとんどない',
  '自分で動かせる家具がある',
  '一部は自分で動かせる',
  '大きな家具があり自分では動かせない',
  '不明',
] as const;

const PARKING_OPTIONS = [
  'あり',
  '近くにコインパーキングあり',
  'なし',
  '不明',
] as const;

const MATERIAL_OPTIONS = [
  '量産クロス',
  '1000番クロス',
  'クッションフロア',
  '職人に相談したい',
  '未定',
] as const;

const CONDITION_OPTIONS = [
  '汚れ',
  'めくれ',
  '穴・傷',
  'カビ',
  'ペット臭',
  '特になし',
  '不明',
] as const;

const TIMING_OPTIONS = [
  'できるだけ早く',
  '1〜2週間以内',
  '1ヶ月以内',
  '急がない',
  '相談したい',
] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 px-5 py-4">
      <p className="text-xs font-bold text-slate-600 mb-3">{label}</p>
      {children}
    </div>
  );
}

function ChipSingle({
  options,
  value,
  onSelect,
}: {
  options: readonly string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt === value ? '' : opt)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
            value === opt
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ChipMulti({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
            selected.includes(opt)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RequestExtraInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isDemo = !id || id.startsWith('demo');

  const [info, setInfo] = useState<ExtraInfo>({
    furniture: '',
    parking:   '',
    material:  [],
    condition: [],
    timing:    '',
    memo:      '',
  });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  function toggleMulti(key: 'material' | 'condition', val: string) {
    setInfo(prev => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val],
      };
    });
  }

  async function handleSave() {
    setSaving(true);

    const payload = { extra_info: info };
    console.log('[RequestExtraInfo] saving meta:', JSON.stringify(payload, null, 2));

    if (!isDemo && id) {
      const { error } = await supabase
        .from('estimate_requests')
        .update({ meta: payload } as Record<string, unknown>)
        .eq('id', id);
      if (error) {
        console.warn('[RequestExtraInfo] meta save skipped (column may not exist):', error.message);
      }
    }

    setSaving(false);
    setDone(true);
  }

  // ── 完了画面 ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">ありがとうございます</h2>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          追加情報を受け付けました。<br />職人がより正確な概算を出しやすくなります。
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full max-w-xs py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-base transition-all"
        >
          トップへ戻る
        </button>
      </div>
    );
  }

  // ── フォーム ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-slate-700 p-1 -ml-1 rounded-xl transition"
          aria-label="閉じる"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">追加情報（任意）</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">入力すると見積もり精度が上がります</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-xs text-slate-400 font-semibold hover:text-slate-600 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition"
        >
          スキップ
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* 導入テキスト */}
        <div className="bg-blue-50 rounded-2xl px-5 py-4 border border-blue-100">
          <p className="text-sm font-bold text-blue-800 mb-1">見積もり精度を上げるために</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            あと少しだけ教えてください。スキップしても依頼は完了しています。
          </p>
        </div>

        {isDemo && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-bold text-amber-700">📋 デモモード — 実際には保存されません</p>
          </div>
        )}

        {/* A. 家具移動 */}
        <Section label="A. 家具の移動について">
          <ChipSingle
            options={FURNITURE_OPTIONS}
            value={info.furniture}
            onSelect={v => setInfo(prev => ({ ...prev, furniture: v }))}
          />
        </Section>

        {/* B. 駐車場 */}
        <Section label="B. 駐車場について">
          <ChipSingle
            options={PARKING_OPTIONS}
            value={info.parking}
            onSelect={v => setInfo(prev => ({ ...prev, parking: v }))}
          />
        </Section>

        {/* C. 材料希望 */}
        <Section label="C. 材料の希望（複数選択可）">
          <ChipMulti
            options={MATERIAL_OPTIONS}
            selected={info.material}
            onToggle={v => toggleMulti('material', v)}
          />
        </Section>

        {/* D. 現在の状態 */}
        <Section label="D. 現在の状態（複数選択可）">
          <ChipMulti
            options={CONDITION_OPTIONS}
            selected={info.condition}
            onToggle={v => toggleMulti('condition', v)}
          />
        </Section>

        {/* E. 希望時期 */}
        <Section label="E. 希望時期">
          <ChipSingle
            options={TIMING_OPTIONS}
            value={info.timing}
            onSelect={v => setInfo(prev => ({ ...prev, timing: v }))}
          />
        </Section>

        {/* F. 追加メモ */}
        <Section label="F. 追加メモ（任意）">
          <textarea
            value={info.memo}
            onChange={e => setInfo(prev => ({ ...prev, memo: e.target.value }))}
            rows={3}
            placeholder="電話番号・住所・LINE IDは書かないでください"
            className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 resize-none leading-relaxed"
          />
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            ※ 個人情報（電話番号・住所・LINE ID等）は入力しないでください。成約後に別途開示します。
          </p>
        </Section>

        {/* 送信 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-base transition-all shadow-sm disabled:opacity-50"
        >
          {saving ? '保存中...' : '追加情報を送る'}
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-white transition-all"
        >
          今はスキップする
        </button>

      </div>
    </div>
  );
}
