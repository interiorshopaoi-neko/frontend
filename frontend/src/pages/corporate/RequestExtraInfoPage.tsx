import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../utils/imageUtils';

// ── 型定義（後方互換のため保持）────────────────────────────────────────────────

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

// ── 部屋別データ型 ────────────────────────────────────────────────────────────

type RoomEntry = {
  name: string;
  index: number;
};

type RoomAdditionalData = {
  productNumber: string;
  memo: string;
  images: string[];
  uploading: boolean;
};

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RequestExtraInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isDemo = !id || id.startsWith('demo');

  // 部屋リスト（metaから取得）
  const [rooms, setRooms]       = useState<RoomEntry[]>([]);
  const [roomData, setRoomData] = useState<RoomAdditionalData[]>([]);
  const [loading, setLoading]   = useState(true);

  // 詳細オプション
  const [accentPref,   setAccentPref]   = useState('');
  const [sokibariPref, setSokibariPref] = useState('');
  const [furniture,    setFurniture]    = useState('');
  const [parking,      setParking]      = useState('');
  const [material,     setMaterial]     = useState<string[]>([]);
  const [showDetail,   setShowDetail]   = useState(false);

  const [saving, setSaving] = useState(false);

  // ── meta から部屋を取得 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo || !id) {
      // デモ：ダミー1部屋
      setRooms([{ name: 'メインのお部屋', index: 0 }]);
      setRoomData([{ productNumber: '', memo: '', images: [], uploading: false }]);
      setLoading(false);
      return;
    }

    supabase
      .from('estimate_requests')
      .select('meta')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        const meta = data?.meta as Record<string, unknown> | null;
        const rawRooms = (meta?.rooms as Array<Record<string, unknown>> | undefined) ?? [];
        let roomList: RoomEntry[] = rawRooms.map((r, i) => ({
          name: (r.customName as string) || (r.name as string) || `部屋${i + 1}`,
          index: i,
        }));
        if (roomList.length === 0) {
          roomList = [{ name: 'メインのお部屋', index: 0 }];
        }
        setRooms(roomList);
        setRoomData(roomList.map(() => ({ productNumber: '', memo: '', images: [], uploading: false })));

        // 既存値をプリセット
        const existingExtraInfo = meta?.extraInfo as Record<string, unknown> | null;
        if (existingExtraInfo) {
          setAccentPref((existingExtraInfo.accentPreference as string) ?? '');
          setSokibariPref((existingExtraInfo.softSokibariPreference as string) ?? '');
        }
        const existingLegacy = meta?.extra_info as Record<string, unknown> | null;
        if (existingLegacy) {
          setFurniture((existingLegacy.furniture as string) ?? '');
          setParking((existingLegacy.parking as string) ?? '');
          setMaterial((existingLegacy.material as string[]) ?? []);
        }
        setLoading(false);
      });
  }, [id, isDemo]);

  // ── 部屋別画像アップロード ──────────────────────────────────────────────────
  async function handleRoomImageFiles(roomIdx: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    setRoomData(prev =>
      prev.map((d, i) => i === roomIdx ? { ...d, uploading: true } : d)
    );
    const existing = roomData[roomIdx]?.images ?? [];
    const remaining = Math.max(0, 10 - existing.length);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      try {
        const blob = await compressImage(file, 1200, 0.80).catch(() => file as Blob);
        const ext  = blob.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `room-extra/${id ?? 'anon'}/${roomIdx}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('estimate-videos')
          .upload(path, blob, { contentType: blob.type });
        if (upErr) continue;
        const { data: { publicUrl } } = supabase.storage.from('estimate-videos').getPublicUrl(path);
        urls.push(publicUrl);
      } catch { /* skip */ }
    }
    setRoomData(prev =>
      prev.map((d, i) =>
        i === roomIdx
          ? { ...d, images: [...d.images, ...urls].slice(0, 10), uploading: false }
          : d
      )
    );
  }

  // ── 保存 ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);

    if (!isDemo && id) {
      const { data: existing } = await supabase
        .from('estimate_requests')
        .select('meta')
        .eq('id', id)
        .single();
      const existingMeta = (existing?.meta as Record<string, unknown> | null) ?? {};

      // 部屋別追加情報（入力があった部屋のみ）
      const roomAdditionalInfo = rooms
        .map((r, i) => ({
          roomIndex:     r.index,
          roomName:      r.name,
          productNumber: roomData[i]?.productNumber?.trim() ?? '',
          memo:          roomData[i]?.memo?.trim() ?? '',
          images:        roomData[i]?.images ?? [],
        }))
        .filter(r => r.productNumber || r.memo || r.images.length > 0);

      // extraInfo（アクセント・巾木）
      const prevExtraInfo = (existingMeta.extraInfo as Record<string, unknown> | null) ?? {};
      const extraInfo: Record<string, unknown> = { ...prevExtraInfo };
      if (accentPref)   extraInfo.accentPreference       = accentPref;
      if (sokibariPref) extraInfo.softSokibariPreference = sokibariPref;

      // extra_info（家具・駐車場・材料）
      const prevLegacy = (existingMeta.extra_info as Record<string, unknown> | null) ?? {};
      const extraInfoLegacy: Record<string, unknown> = { ...prevLegacy };
      if (furniture)           extraInfoLegacy.furniture = furniture;
      if (parking)             extraInfoLegacy.parking   = parking;
      if (material.length > 0) extraInfoLegacy.material  = material;

      const mergedMeta: Record<string, unknown> = {
        ...existingMeta,
        extra_info: extraInfoLegacy,
        extraInfo,
      };
      if (roomAdditionalInfo.length > 0) {
        mergedMeta.roomAdditionalInfo = roomAdditionalInfo;
      }

      const { error } = await supabase
        .from('estimate_requests')
        .update({ meta: mergedMeta } as Record<string, unknown>)
        .eq('id', id);
      if (error) {
        console.warn('[RequestExtraInfo] save error:', error.message);
      }
    }

    setSaving(false);
    navigate(id && !isDemo ? `/request/${id}` : '/');
  }

  // ── ローディング ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ── フォーム ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(id && !isDemo ? `/request/${id}` : '/')}
          className="text-slate-400 hover:text-slate-700 p-1 -ml-1 rounded-xl transition"
          aria-label="戻る"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">追加情報を送る</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">分かる範囲だけで大丈夫です。スキップもできます。</p>
        </div>
        <button
          onClick={() => navigate(id && !isDemo ? `/request/${id}` : '/')}
          className="text-xs text-slate-400 font-semibold hover:text-slate-600 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition"
        >
          スキップ
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {isDemo && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-bold text-amber-700">📋 デモモード — 実際には保存されません</p>
          </div>
        )}

        {/* 導入テキスト */}
        <div className="bg-blue-50 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-blue-700 mb-1.5">写真や品番を追加すると職人が判断しやすくなります</p>
          <p className="text-[11px] text-blue-600 leading-relaxed">
            部屋ごとに「参考写真」「品番・希望メモ」を追加できます。すでに依頼は完了しています。
          </p>
        </div>

        {/* ── 部屋別カード ── */}
        {rooms.map((room, roomIdx) => {
          const data = roomData[roomIdx] ?? { productNumber: '', memo: '', images: [], uploading: false };
          return (
            <div key={room.index} className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
              {/* 部屋ヘッダー */}
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                <span className="text-base">🏠</span>
                <p className="text-sm font-extrabold text-white">{room.name}</p>
              </div>

              <div className="px-4 py-4 space-y-4">

                {/* 写真追加 */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-2">
                    📸 写真・参考画像（任意）
                    <span className="ml-1 text-slate-300 font-normal">現在の壁・床の状態、気になる箇所など</span>
                  </p>
                  <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all ${data.uploading ? 'opacity-50 pointer-events-none' : 'hover:border-blue-300 hover:bg-blue-50'} border-slate-200`}>
                    <span className="text-lg">{data.uploading ? '⏳' : '📷'}</span>
                    <p className="text-xs font-bold text-slate-500">{data.uploading ? 'アップロード中...' : '写真を選択（複数可）'}</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={data.uploading || data.images.length >= 10}
                      onChange={e => handleRoomImageFiles(roomIdx, e.target.files)}
                    />
                  </label>
                  {data.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      {data.images.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                          <img src={url} alt={`写真${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                          <button
                            type="button"
                            onClick={() => setRoomData(prev =>
                              prev.map((d, ri) =>
                                ri === roomIdx
                                  ? { ...d, images: d.images.filter((_, j) => j !== i) }
                                  : d
                              )
                            )}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 品番 */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1.5">
                    🏷 クロス品番（任意）
                    <span className="ml-1 text-slate-300 font-normal">例：BB-8503、SP2816</span>
                  </p>
                  <input
                    value={data.productNumber}
                    onChange={e => setRoomData(prev =>
                      prev.map((d, ri) => ri === roomIdx ? { ...d, productNumber: e.target.value } : d)
                    )}
                    placeholder="品番を入力（分からなければ空白でOK）"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* メモ */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1.5">
                    📝 職人へのメモ（任意）
                  </p>
                  <textarea
                    value={data.memo}
                    onChange={e => setRoomData(prev =>
                      prev.map((d, ri) => ri === roomIdx ? { ...d, memo: e.target.value } : d)
                    )}
                    rows={2}
                    placeholder="例：窓の下が汚れている、北欧系の雰囲気にしたい など"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  />
                </div>

              </div>
            </div>
          );
        })}

        {/* ── 詳しく入力するトグル ── */}
        <button
          type="button"
          onClick={() => setShowDetail(v => !v)}
          className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-white flex items-center justify-center gap-2 transition-all"
        >
          {showDetail ? '▲ 閉じる' : '▼ 詳しく入力する（家具・材料・アクセントなど）'}
        </button>

        {showDetail && (
          <>
            {/* アクセントクロス */}
            <Section label="✨ アクセントクロス（任意）">
              <ChipSingle
                options={['希望あり', '希望なし', 'まだ決まっていない']}
                value={accentPref}
                onSelect={setAccentPref}
              />
            </Section>

            {/* ソフト巾木 */}
            <Section label="📐 ソフト巾木の施工（任意）">
              <ChipSingle
                options={['施工希望', '不要', 'まだ決まっていない']}
                value={sokibariPref}
                onSelect={setSokibariPref}
              />
            </Section>

            {/* 家具移動 */}
            <Section label="家具の移動について（任意）">
              <ChipSingle
                options={FURNITURE_OPTIONS}
                value={furniture}
                onSelect={setFurniture}
              />
            </Section>

            {/* 駐車場 */}
            <Section label="駐車場について（任意）">
              <ChipSingle
                options={PARKING_OPTIONS}
                value={parking}
                onSelect={setParking}
              />
            </Section>

            {/* 材料希望 */}
            <Section label="材料の希望（任意・複数選択可）">
              <ChipMulti
                options={MATERIAL_OPTIONS}
                selected={material}
                onToggle={v => setMaterial(prev =>
                  prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
                )}
              />
            </Section>
          </>
        )}

        {/* 送信 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-base transition-all shadow-sm disabled:opacity-50"
        >
          {saving ? '保存中...' : '追加情報を送る'}
        </button>

        <button
          onClick={() => navigate(id && !isDemo ? `/request/${id}` : '/')}
          className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-white transition-all"
        >
          今はスキップする
        </button>

        <p className="text-center text-[10px] text-slate-400 leading-relaxed px-2">
          ※ 個人情報（電話番号・住所等）は入力しないでください。成約後に別途メールにてご案内します。
        </p>

      </div>
    </div>
  );
}
