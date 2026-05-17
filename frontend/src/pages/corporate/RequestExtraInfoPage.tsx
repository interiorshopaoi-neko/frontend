import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../utils/imageUtils';

// ── 型定義 ────────────────────────────────────────────────────────────────────

export type RoomInfo = {
  name: string;
  workType: string;
  size: string;
  condition: string[];
  furniture: string;
  memo: string;
};

export type ExtraInfo = {
  furniture: string;
  parking: string;
  material: string[];
  condition: string[];
  timing: string;
  memo: string;
  roomCount: string;
  rooms: RoomInfo[];
  attachmentFlags: string[];
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

const ROOM_COUNT_OPTIONS = [
  '1部屋',
  '2部屋',
  '3部屋以上',
  'まだ決まっていない',
] as const;

const ROOM_NAME_OPTIONS = ['LDK', '洋室', '和室', '廊下', 'その他'] as const;
const WORK_TYPE_OPTIONS = ['壁紙', '床', '両方'] as const;
const ROOM_SIZE_OPTIONS = ['6畳以下', '6〜8畳', '8〜10畳', '10畳以上', '不明'] as const;
const ROOM_COND_OPTIONS = ['汚れ', 'めくれ', '傷', 'カビ', 'ペット臭', '不明'] as const;
const ROOM_FURNITURE_OPTIONS = ['少ない', '普通', '多い'] as const;
const ATTACHMENT_OPTIONS = ['写真', '間取り図', '品番メモ', '施工指示書'] as const;

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
    furniture:       '',
    parking:         '',
    material:        [],
    condition:       [],
    timing:          '',
    memo:            '',
    roomCount:       '',
    rooms:           [{ name: '', workType: '', size: '', condition: [], furniture: '', memo: '' }],
    attachmentFlags: [],
  });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  // ── 新フィールド（extraInfo として meta に保存）────────────────────────────
  const [productNumber, setProductNumber] = useState('');
  const [productUrl,    setProductUrl]    = useState('');
  const [accentPref,    setAccentPref]    = useState('');
  const [sokibariPref,  setSokibariPref]  = useState('');
  const [productNote,   setProductNote]   = useState('');
  const [images,        setImages]        = useState<string[]>([]);
  const [uploading,     setUploading]     = useState(false);
  const [uploadErrors,  setUploadErrors]  = useState<string[]>([]);

  function updateRoom(idx: number, field: keyof RoomInfo, val: string) {
    setInfo(prev => ({
      ...prev,
      rooms: prev.rooms.map((r, i) => i === idx ? { ...r, [field]: val } : r),
    }));
  }
  function toggleRoomCond(idx: number, val: string) {
    setInfo(prev => ({
      ...prev,
      rooms: prev.rooms.map((r, i) => {
        if (i !== idx) return r;
        const has = r.condition.includes(val);
        return { ...r, condition: has ? r.condition.filter(c => c !== val) : [...r.condition, val] };
      }),
    }));
  }
  function addRoom() {
    setInfo(prev => ({ ...prev, rooms: [...prev.rooms, { name: '', workType: '', size: '', condition: [], furniture: '', memo: '' }] }));
  }
  function removeRoom(idx: number) {
    setInfo(prev => ({ ...prev, rooms: prev.rooms.filter((_, i) => i !== idx) }));
  }

  function toggleMulti(key: 'material' | 'condition', val: string) {
    setInfo(prev => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val],
      };
    });
  }

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const errs: string[] = [];
    const urls: string[] = [];
    const remaining = Math.max(0, 10 - images.length);
    for (const file of Array.from(files).slice(0, remaining)) {
      try {
        const blob = await compressImage(file, 1200, 0.80).catch(() => file as Blob);
        const ext  = blob.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `extra-images/${id ?? 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('estimate-videos')
          .upload(path, blob, { contentType: blob.type });
        if (upErr) { errs.push(file.name); continue; }
        const { data: { publicUrl } } = supabase.storage.from('estimate-videos').getPublicUrl(path);
        urls.push(publicUrl);
      } catch {
        errs.push(file.name);
      }
    }
    setImages(prev => [...prev, ...urls].slice(0, 10));
    if (errs.length > 0) setUploadErrors(errs);
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);

    console.log('[RequestExtraInfo] extra_info to save:', JSON.stringify(info, null, 2));

    if (!isDemo && id) {
      // 既存 meta を読んで rooms 等を保持しつつ extra_info だけ更新
      const { data: existing } = await supabase
        .from('estimate_requests')
        .select('meta')
        .eq('id', id)
        .single();
      const existingMeta = (existing?.meta as Record<string, unknown> | null) ?? {};
      const extraInfo: Record<string, unknown> = {};
      if (productNumber.trim())  extraInfo.productNumber          = productNumber.trim();
      if (productUrl.trim())     extraInfo.productUrl             = productUrl.trim();
      if (accentPref)            extraInfo.accentPreference       = accentPref;
      if (sokibariPref)          extraInfo.softSokibariPreference = sokibariPref;
      if (productNote.trim())    extraInfo.note                   = productNote.trim();
      if (images.length > 0)     extraInfo.images                 = images;
      const mergedMeta = { ...existingMeta, extra_info: info, extraInfo };

      const { error } = await supabase
        .from('estimate_requests')
        .update({ meta: mergedMeta } as Record<string, unknown>)
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
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">部屋ごとの詳細を追加できます</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">任意です。複数部屋ある場合は部屋ごとに分けると職人が判断しやすくなります</p>
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

        {/* 職人への価値説明 */}
        <div className="bg-indigo-50 rounded-2xl px-5 py-4 border border-indigo-100">
          <p className="text-xs font-bold text-indigo-700 mb-1">入力は任意です</p>
          <p className="text-xs text-indigo-500 leading-relaxed">
            部屋数・家具量・希望時期があると、職人が見積もりを出しやすくなります。分かる範囲だけで大丈夫です。
          </p>
        </div>

        {/* ── 新フィールド：品番・写真・希望 ── */}

        {/* 安心メッセージ */}
        <div className="bg-teal-50 border border-teal-100 rounded-2xl px-5 py-4">
          <p className="text-sm font-bold text-teal-700 mb-1">🎨 品番はまだ決まっていなくても大丈夫です</p>
          <p className="text-xs text-teal-600 leading-relaxed">
            気になる雰囲気・URLだけでも送れます。職人が決まった後でも追加で相談できます。
          </p>
        </div>

        {/* 品番・URL */}
        <Section label="クロス品番・URL（任意）">
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">品番</p>
              <input
                value={productNumber}
                onChange={e => setProductNumber(e.target.value)}
                placeholder="例：BB-8503、SP2816 など"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">気になるURL・リンク</p>
              <input
                value={productUrl}
                onChange={e => setProductUrl(e.target.value)}
                placeholder="https://... （メーカーサイト・通販ページなど）"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">品番が分からない場合は気になる壁紙のURL・写真だけでも大丈夫です</p>
          </div>
        </Section>

        {/* アクセントクロス・ソフト巾木 */}
        <Section label="追加ご希望（任意）">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">✨ アクセントクロス</p>
              <ChipSingle
                options={['希望あり', '希望なし', 'まだ決まっていない']}
                value={accentPref}
                onSelect={setAccentPref}
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">📐 ソフト巾木の施工</p>
              <ChipSingle
                options={['施工希望', '不要', 'まだ決まっていない']}
                value={sokibariPref}
                onSelect={setSokibariPref}
              />
            </div>
          </div>
        </Section>

        {/* 写真追加 */}
        <Section label="参考写真（任意・最大10枚）">
          <div className="space-y-3">
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl px-4 py-6 cursor-pointer transition-all ${uploading ? 'opacity-50 pointer-events-none' : 'hover:border-teal-300 hover:bg-teal-50/40'} border-slate-200`}>
              <span className="text-2xl">{uploading ? '⏳' : '📸'}</span>
              <p className="text-xs font-bold text-slate-600">{uploading ? 'アップロード中...' : '写真を選択する'}</p>
              <p className="text-[10px] text-slate-400">気になる壁紙・現在の壁の状態など（複数可）</p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading || images.length >= 10}
                onChange={e => handleImageFiles(e.target.files)}
              />
            </label>
            {uploadErrors.length > 0 && (
              <p className="text-[10px] text-amber-600">一部アップロードに失敗しました：{uploadErrors.join('、')}</p>
            )}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                    <img src={url} alt={`写真${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    <button
                      type="button"
                      onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* 追加メモ */}
        <Section label="クロス・材料についての追加メモ（任意）">
          <textarea
            value={productNote}
            onChange={e => setProductNote(e.target.value)}
            rows={3}
            placeholder="例：北欧っぽい雰囲気にしたい、白系で清潔感を出したい、子供が汚してもOKな素材希望など"
            className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-teal-400 resize-none leading-relaxed"
          />
        </Section>

        {/* クロス選び安心導線 */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-slate-600 mb-2">💡 人気の選び方</p>
          <div className="space-y-1.5">
            {[
              { t: '失敗しにくい白系', d: '清潔感が出やすく、どの部屋にも合わせやすいです' },
              { t: 'グレー系', d: '生活感を抑えた落ち着いた雰囲気に' },
              { t: 'アクセントクロス', d: '一面だけ色を変えて印象を変えられます' },
            ].map(({ t, d }) => (
              <div key={t} className="bg-white rounded-xl px-3 py-2 border border-slate-100">
                <p className="text-xs font-bold text-slate-700">{t}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{d}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">🔮 準備中：AIで施工後の雰囲気イメージを確認できる機能を開発中です</p>
        </div>

        <div className="border-t border-slate-200 pt-2">
          <p className="text-[11px] font-bold text-slate-500 mb-3">その他の詳細情報（任意）</p>
        </div>

        {/* 0. 部屋数 */}
        <Section label="部屋数">
          <ChipSingle
            options={ROOM_COUNT_OPTIONS}
            value={info.roomCount}
            onSelect={v => setInfo(prev => ({ ...prev, roomCount: v }))}
          />
        </Section>

        {/* 複数部屋の内訳 */}
        {(info.roomCount === '2部屋' || info.roomCount === '3部屋以上') && (
          <Section label="部屋ごとの情報（任意）">
            <div className="space-y-4">
              {info.rooms.map((room, i) => (
                <div key={i} className="border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">部屋 {i + 1}</p>
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => removeRoom(i)}
                        className="text-[11px] text-red-400 hover:text-red-600 font-semibold"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">部屋名</p>
                    <ChipSingle options={ROOM_NAME_OPTIONS} value={room.name} onSelect={v => updateRoom(i, 'name', v)} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">工事内容</p>
                    <ChipSingle options={WORK_TYPE_OPTIONS} value={room.workType} onSelect={v => updateRoom(i, 'workType', v)} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">だいたいの広さ</p>
                    <ChipSingle options={ROOM_SIZE_OPTIONS} value={room.size} onSelect={v => updateRoom(i, 'size', v)} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">状態（複数選択可）</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ROOM_COND_OPTIONS.map(c => (
                        <button key={c} type="button" onClick={() => toggleRoomCond(i, c)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            room.condition.includes(c)
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                          }`}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">家具量</p>
                    <ChipSingle options={ROOM_FURNITURE_OPTIONS} value={room.furniture} onSelect={v => updateRoom(i, 'furniture', v)} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">気になる箇所（任意）</p>
                    <input
                      value={room.memo}
                      onChange={e => updateRoom(i, 'memo', e.target.value)}
                      placeholder="例：窓の下が汚れている"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-blue-300 bg-white"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addRoom}
                className="w-full py-2.5 rounded-xl border border-dashed border-blue-300 text-xs font-semibold text-blue-500 hover:bg-blue-50 transition"
              >
                ＋ 部屋を追加
              </button>
            </div>
          </Section>
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

        {/* F. 追加メモ */}
        <Section label="F. 追加メモ（任意）">
          <textarea
            value={info.memo}
            onChange={e => setInfo(prev => ({ ...prev, memo: e.target.value }))}
            rows={3}
            placeholder="気になる箇所、希望、職人に伝えたいことなど"
            className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 resize-none leading-relaxed"
          />
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            ※ 個人情報（電話番号・住所等）は入力しないでください。成約後に別途メールにてご案内します。
          </p>
        </Section>

        {/* G. 追加資料 */}
        <Section label="G. 追加資料（任意・複数選択可）">
          <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
            お持ちの場合は後からチャットでお送りいただけます。
          </p>
          <ChipMulti
            options={ATTACHMENT_OPTIONS}
            selected={info.attachmentFlags}
            onToggle={v => setInfo(prev => ({
              ...prev,
              attachmentFlags: prev.attachmentFlags.includes(v)
                ? prev.attachmentFlags.filter(x => x !== v)
                : [...prev.attachmentFlags, v],
            }))}
          />
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
