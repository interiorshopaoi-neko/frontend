import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Scissors, LayoutGrid, MessageSquare, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateThumbnail } from '../../utils/videoUtils';
import { compressImage } from '../../utils/imageUtils';

// ── 定数 ─────────────────────────────────────────────────────────────────────

type WorkOption = { value: string; Icon: React.FC<{ size?: number; className?: string }>; desc: string };
const WORK_OPTIONS: WorkOption[] = [
  { value: 'クロス張り替え', Icon: Layers,      desc: '壁紙を新しく張り替え' },
  { value: 'クロス補修',     Icon: Scissors,    desc: '傷・破れなど部分補修' },
  { value: '床工事',         Icon: LayoutGrid,  desc: 'フローリング・CF張替' },
  { value: 'その他相談',     Icon: MessageSquare, desc: 'まずは相談したい' },
];

const ROOM_TYPE_OPTIONS  = ['リビング', '洋室', '寝室', '廊下', 'その他', '不明'] as const;
const ROOM_SIZE_OPTIONS  = ['6畳以下', '6〜8畳', '8〜10畳', '10畳以上', '不明'] as const;
const TIMING_OPTIONS     = ['急ぎ', '1週間以内', '今月中', '相談したい'] as const;
const SITE_COND_OPTIONS  = ['空室', '入居中', '退去後', '不明'] as const;
const DESIRE_TYPE_OPTIONS = [
  'できるだけ費用を抑えたい',
  '見た目をきれいにしたい',
  'こだわりたい（デザイン重視）',
  '提案してほしい（よく分からない）',
  '品番や内容はある程度決まっている',
] as const;

const TRUST_ITEMS = ['ログイン不要', '住所入力不要', '概算確認のみ', 'しつこい営業なし'] as const;

// ── 複数部屋 ──────────────────────────────────────────────────────────────────

type Room = {
  name: string;
  workType: string;
  size: string;
  condition: string[];
  materialPref: string;
  customName: string;
  customSize: string;
  roomVideoFiles: File[];
  roomImageFiles: File[];
};

const ROOM_NAMES = ['LDK', '洋室', '寝室', '廊下', '玄関', '階段', 'トイレ', '洗面所', '収納', 'クローゼット', '店舗', '事務所', 'その他'] as const;
const ROOM_WORKS = ['壁紙・クロス', '天井クロス', '壁＋天井', 'クッションフロア', '両方'] as const;
const ROOM_SIZES = ['4.5畳', '6畳', '8畳', '10畳', '12畳', '12畳以上', '15畳以上', '20畳以上', '不明'] as const;
const ROOM_CONDS = ['汚れ', 'めくれ', '傷', 'カビ', 'ペット臭', '不明'] as const;
const ROOM_MATERIAL_PREFS = ['量産クロスでよい', '1000番・機能性クロスも検討', '柄物・アクセントクロス希望', 'まだ決まっていない'] as const;

// 初期表示に見せる優先チップ（それ以外は折りたたみ内）
const PRIMARY_ROOM_NAMES: readonly string[] = ['LDK', '洋室', '寝室', '廊下', '玄関', 'トイレ', 'その他'];
const PRIMARY_ROOM_WORKS: readonly string[] = ['壁紙・クロス', 'クッションフロア', '壁＋天井', '両方'];

// アップロード上限（定数化）
const MAX_VIDEO_BYTES_MAIN = 50 * 1024 * 1024; // 50MB — メイン動画
const ROOM_VIDEO_MAX_BYTES = 30 * 1024 * 1024; // 30MB — 部屋別動画（短い動画想定）

const WALLPAPER_MOODS = [
  '明るい白系', '汚れが目立ちにくい', 'ホテルっぽい', '北欧・ナチュラル',
  'グレー系', '木目アクセント', 'ペット向け', '子供部屋向け', 'まだ決まっていない',
] as const;

const TOTAL_STEPS = 6; // 動画/部屋/施工/エリア/詳細/メール

// ── CSS Keyframes ──────────────────────────────────────────────────────────────

const globalStyles = `
@keyframes recBlink{0%,100%{opacity:1}50%{opacity:.2}}
`;

// ── PageShell ─────────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center sm:justify-center sm:py-10 sm:px-4">
      <style>{globalStyles}</style>
      <div className="w-full max-w-lg bg-white sm:rounded-3xl sm:shadow-2xl sm:shadow-slate-200/60 flex flex-col min-h-screen sm:min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div className="px-6 pt-8 pb-6 border-b border-slate-100 flex-shrink-0">
      <div className="flex items-center gap-2 mb-4">
        <img src="/logo-full.png" alt="PRO MATCH" className="h-7 object-contain" />
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900 leading-snug mb-1">
        内装工事の概算確認
      </h1>
      <p className="text-sm text-slate-500 leading-relaxed">
        動画や簡単な情報から、対応可能な職人が内容を確認します
      </p>
      <div className="grid grid-cols-2 gap-2 mt-5">
        {TRUST_ITEMS.map(item => (
          <div key={item} className="flex items-center gap-2 bg-violet-50 rounded-xl px-3 py-2.5">
            <span className="text-violet-500 font-extrabold text-xs leading-none">✓</span>
            <span className="text-xs font-semibold text-violet-700">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── StepProgress ──────────────────────────────────────────────────────────────

function StepProgress({ step, displayStep, total }: { step: number; displayStep?: number; total?: number }) {
  const totalSteps = total ?? TOTAL_STEPS;
  const shown = displayStep ?? Math.min(step, totalSteps);
  const pct = Math.round((shown / totalSteps) * 100);
  return (
    <div className="px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-extrabold text-violet-600 tracking-[0.15em] uppercase">
          Step {shown}
        </span>
        <span className="text-xs font-semibold text-slate-400">
          {shown} <span className="text-slate-300">/</span> {totalSteps}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)' }}
        />
      </div>
    </div>
  );
}

// ── StepContent ───────────────────────────────────────────────────────────────

function StepContent({
  title,
  sub,
  scrollable = false,
  children,
}: {
  title: string;
  sub?: string;
  scrollable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex-1 px-6 py-7 flex flex-col ${scrollable ? 'overflow-y-auto' : ''}`}>
      <h2 className="text-xl font-extrabold text-slate-900 leading-snug mb-1 flex-shrink-0">{title}</h2>
      {sub && <p className="text-sm text-slate-400 mb-6 flex-shrink-0">{sub}</p>}
      {!sub && <div className="mb-6 flex-shrink-0" />}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

// ── BottomNav ─────────────────────────────────────────────────────────────────

function BottomNav({
  onBack,
  onNext,
  nextLabel = '次へ',
  nextDisabled = false,
  showBack = true,
  loading = false,
  loadingText = '送信中...',
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  loading?: boolean;
  loadingText?: string;
}) {
  return (
    <div className="px-6 py-5 border-t border-slate-100 bg-white mt-auto flex-shrink-0">
      <div className="flex items-center gap-3">
        {showBack && onBack && (
          <button
            onClick={onBack}
            className="flex-none px-5 h-12 rounded-2xl border-2 border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
          >
            ← 戻る
          </button>
        )}
        <button
          onClick={onNext}
          disabled={nextDisabled || loading}
          className={`flex-1 h-12 rounded-2xl font-extrabold text-sm transition-all ${
            nextDisabled || loading
              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
              : 'bg-violet-600 hover:bg-violet-700 active:scale-95 text-white shadow-md shadow-violet-200'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {loadingText}
            </span>
          ) : nextLabel}
        </button>
      </div>
    </div>
  );
}

// ── ChipGroup ─────────────────────────────────────────────────────────────────

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-600 mb-2">
        {label}
        <span className="ml-1.5 text-[10px] font-semibold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded-md">任意</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
              value === opt
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── RoomCard ──────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  index,
  canDelete,
  onUpdate,
  onDelete,
  expanded,
  onToggleExpand,
}: {
  room: Room;
  index: number;
  canDelete: boolean;
  onUpdate: (patch: Partial<Room>) => void;
  onDelete: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  function toggleCond(c: string) {
    const has = room.condition.includes(c);
    onUpdate({ condition: has ? room.condition.filter(x => x !== c) : [...room.condition, c] });
  }

  // 写真プレビュー用 objectURL（room.roomImageFiles が変わるたびに再生成・旧URL revoke）
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = room.roomImageFiles.map(f => URL.createObjectURL(f));
    setImageUrls(urls);
    return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [room.roomImageFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // 部屋別動画サイズエラー
  const [videoSizeError, setVideoSizeError] = useState<string | null>(null);

  // 詳細フィールドに値があれば自動で開く
  const hasDetailValues = !!(
    room.customName ||
    room.size || room.customSize ||
    room.condition.length > 0 ||
    room.materialPref ||
    room.roomVideoFiles.length > 0 ||
    room.roomImageFiles.length > 0 ||
    (room.workType && !PRIMARY_ROOM_WORKS.includes(room.workType))
  );
  const showDetail = expanded || hasDetailValues;

  // 折りたたみバッジ用カウント
  const detailCount = [
    room.customName || (room.name && !PRIMARY_ROOM_NAMES.includes(room.name)) ? 'x' : '',
    room.size || room.customSize,
    room.condition.length > 0 ? 'x' : '',
    room.materialPref,
    room.roomVideoFiles.length > 0 || room.roomImageFiles.length > 0 ? 'x' : '',
  ].filter(Boolean).length;

  const extraRoomNames = (ROOM_NAMES as readonly string[]).filter(n => !PRIMARY_ROOM_NAMES.includes(n));
  const extraRoomWorks = (ROOM_WORKS as readonly string[]).filter(w => !PRIMARY_ROOM_WORKS.includes(w));

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold text-slate-700">部屋 {index + 1}</p>
        {canDelete && (
          <button type="button" onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors">
            削除
          </button>
        )}
      </div>

      {/* ── 常に表示：部屋名（優先7チップ） ── */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 mb-1.5">部屋名</p>
        <div className="flex flex-wrap gap-1.5">
          {PRIMARY_ROOM_NAMES.map(n => (
            <button key={n} type="button" onClick={() => onUpdate({ name: n })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                room.name === n
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
              }`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* ── 常に表示：工事内容（優先4チップ） ── */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 mb-1.5">工事内容</p>
        <div className="flex flex-wrap gap-1.5">
          {PRIMARY_ROOM_WORKS.map(w => (
            <button key={w} type="button" onClick={() => onUpdate({ workType: w })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                room.workType === w
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
              }`}>
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* ── 常に表示：写真・動画の案内 ── */}
      <p className="text-[10px] text-slate-500 leading-relaxed bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
        📷 この部屋の写真や動画は、あとから追加できます。傷・めくれ・トイレなどは写真だけでも大丈夫です。
      </p>

      {/* ── 折りたたみトグル ── */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-violet-600 transition-colors"
      >
        <span className={`inline-block transition-transform duration-200 text-[10px] ${showDetail ? 'rotate-90' : ''}`}>▶</span>
        詳しく入力する（任意）
        {!showDetail && detailCount > 0 && (
          <span className="bg-violet-100 text-violet-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            {detailCount}
          </span>
        )}
      </button>

      {/* ── 折りたたみ内（詳細） ── */}
      {showDetail && (
        <div className="space-y-3 border-t border-slate-200 pt-3">

          {/* 部屋名：追加チップ＋自由入力 */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 mb-1.5">部屋名（その他）</p>
            {extraRoomNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {extraRoomNames.map(n => (
                  <button key={n} type="button" onClick={() => onUpdate({ name: n })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      room.name === n
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            )}
            <input
              value={room.customName}
              onChange={e => onUpdate({ customName: e.target.value })}
              placeholder="例：サンルーム、書斎、店舗入口、階段下収納 など"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            />
          </div>

          {/* 工事内容：追加チップ（天井クロスなど） */}
          {extraRoomWorks.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-1.5">工事内容（その他）</p>
              <div className="flex flex-wrap gap-1.5">
                {extraRoomWorks.map(w => (
                  <button key={w} type="button" onClick={() => onUpdate({ workType: w })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      room.workType === w
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                    }`}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 広さ */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 mb-1.5">だいたいの広さ</p>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {ROOM_SIZES.map(s => (
                <button key={s} type="button" onClick={() => onUpdate({ size: s })}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    room.size === s
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
            <input
              value={room.customSize}
              onChange={e => onUpdate({ customSize: e.target.value })}
              placeholder="例：13.5畳、約18畳、廊下5mくらい"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
            />
          </div>

          {/* 状態 */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 mb-1.5">状態（複数選択可）</p>
            <div className="flex flex-wrap gap-1.5">
              {ROOM_CONDS.map(c => (
                <button key={c} type="button" onClick={() => toggleCond(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    room.condition.includes(c)
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 材料の希望 */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 mb-1">材料の希望 <span className="font-normal text-slate-300">（任意）</span></p>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {ROOM_MATERIAL_PREFS.map(m => (
                <button key={m} type="button"
                  onClick={() => onUpdate({ materialPref: room.materialPref === m ? '' : m })}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    room.materialPref === m
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">詳しい品番は、職人が決まった後でも追加で相談できます。柄物・アクセント・機能性クロスは追加費用がかかる場合があります。</p>
          </div>

          {/* この部屋の動画・写真 */}
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-0.5">
                この部屋の動画・写真
                <span className="ml-1.5 font-normal text-slate-300">（任意）</span>
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                {room.customName || room.name || `部屋${index + 1}`} の様子が分かる動画や写真を追加してください。傷・めくれ・カビなどは写真だけでも大丈夫です。
              </p>
            </div>

            {/* 動画（最大3本 / 30MB制限） */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-[10px] font-bold text-slate-500">動画</p>
                <span className="text-[9px] text-slate-300">{room.roomVideoFiles.length}/3</span>
              </div>
              {room.roomVideoFiles.map((f, fi) => (
                <div key={fi} className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-1.5 mb-1">
                  <span className="text-[11px]">🎬</span>
                  <span className="text-xs text-violet-700 flex-1 truncate">{f.name}</span>
                  <span className="text-[9px] text-violet-400 flex-shrink-0">
                    {(f.size / 1024 / 1024).toFixed(1)}MB
                  </span>
                  <button type="button"
                    onClick={() => {
                      onUpdate({ roomVideoFiles: room.roomVideoFiles.filter((_, i) => i !== fi) });
                      setVideoSizeError(null);
                    }}
                    className="text-[10px] text-red-400 hover:text-red-600 font-bold flex-shrink-0">
                    削除
                  </button>
                </div>
              ))}
              {videoSizeError && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-1">
                  <p className="text-[11px] font-bold text-amber-800">動画が長いようです</p>
                  <p className="text-[10px] text-amber-700 leading-relaxed">{videoSizeError}</p>
                </div>
              )}
              {room.roomVideoFiles.length < 3 && (
                <label className="flex items-center gap-2 bg-white border border-dashed border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all">
                  <span className="text-sm">🎬</span>
                  <span className="text-xs text-slate-500">動画を追加（最大3本・30MB）</span>
                  <input type="file" accept="video/*" multiple className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      const oversized = files.filter(f => f.size > ROOM_VIDEO_MAX_BYTES);
                      if (oversized.length > 0) {
                        setVideoSizeError('10〜15秒程度の短い動画がおすすめです（30MB以下）。長い動画は短く撮り直してください。');
                        e.target.value = '';
                        return;
                      }
                      setVideoSizeError(null);
                      const toAdd = files.slice(0, 3 - room.roomVideoFiles.length);
                      onUpdate({ roomVideoFiles: [...room.roomVideoFiles, ...toAdd] });
                      e.target.value = '';
                    }} />
                </label>
              )}
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                長い動画より、部屋ごとの短い動画の方が確認しやすくなります
              </p>
            </div>

            {/* 写真（最大6枚・サムネイルプレビュー） */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-[10px] font-bold text-slate-500">写真</p>
                <span className="text-[9px] text-slate-300">{room.roomImageFiles.length}/6</span>
              </div>
              {room.roomImageFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                  {room.roomImageFiles.map((f, fi) => (
                    <div key={fi} className="relative group">
                      <div className="rounded-xl overflow-hidden aspect-square bg-slate-100 border border-slate-200">
                        {imageUrls[fi] ? (
                          <img
                            src={imageUrls[fi]}
                            alt={f.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-slate-300 text-lg">📷</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[8px] text-slate-400 truncate px-0.5 mt-0.5 leading-tight">
                        {(f.size / 1024).toFixed(0)}KB
                      </p>
                      <button type="button"
                        onClick={() => {
                          if (imageUrls[fi]) URL.revokeObjectURL(imageUrls[fi]);
                          onUpdate({ roomImageFiles: room.roomImageFiles.filter((_, i) => i !== fi) });
                        }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500/90 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {room.roomImageFiles.length < 6 && (
                <label className="flex items-center gap-2 bg-white border border-dashed border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                  <span className="text-sm">📷</span>
                  <span className="text-xs text-slate-500">写真を追加（最大6枚）</span>
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      const toAdd = files.slice(0, 6 - room.roomImageFiles.length);
                      onUpdate({ roomImageFiles: [...room.roomImageFiles, ...toAdd] });
                      e.target.value = '';
                    }} />
                </label>
              )}
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                傷・めくれ・カビ・巾木などは写真だけでも大丈夫です。あとから追加情報も送れます。
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CorporateRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // フォームデータ（基本）
  const [videoFile,       setVideoFile]       = useState<File | null>(null);
  const [videoSizeError,  setVideoSizeError]  = useState(false);
  const [workType,     setWorkType]     = useState('');
  const [area,         setArea]         = useState('');
  const [contactValue, setContactValue] = useState('');
  const contactMethod = 'メール'; // メールアドレスに統一

  // フォームデータ（詳細情報・すべて任意）
  const [roomType,      setRoomType]      = useState('');
  const [roomSize,      setRoomSize]      = useState('');
  const [timing,        setTiming]        = useState('');
  const [siteCondition, setSiteCondition] = useState('');
  const [desireType,    setDesireType]    = useState('');
  const [memo,          setMemo]          = useState('');
  const [wallpaperPreference, setWallpaperPreference] = useState('');

  // 複数部屋
  const [rooms, setRooms] = useState<Room[]>([
    { name: 'LDK', workType: '', size: '', condition: [], materialPref: '', customName: '', customSize: '', roomVideoFiles: [], roomImageFiles: [] },
  ]);
  const [expandedRooms, setExpandedRooms] = useState<boolean[]>([false]);

  function addRoom() {
    setRooms(prev => [...prev, { name: '洋室', workType: '', size: '', condition: [], materialPref: '', customName: '', customSize: '', roomVideoFiles: [], roomImageFiles: [] }]);
    setExpandedRooms(prev => [...prev, false]);
  }
  function removeRoom(idx: number) {
    setRooms(prev => prev.filter((_, i) => i !== idx));
    setExpandedRooms(prev => prev.filter((_, i) => i !== idx));
  }
  function updateRoom(idx: number, patch: Partial<Room>) {
    setRooms(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  // 前回の依頼 ID（localStorage から復元）
  const [lastRequestId] = useState<string | null>(() => {
    try { return localStorage.getItem('promatch_last_request_id'); } catch { return null; }
  });

  // 送信状態
  const [step3Skipped,   setStep3Skipped]   = useState(false);
  const [submitState,    setSubmitState]    = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [uploadPhase,    setUploadPhase]    = useState<string>('');
  const [devErrorDetail, setDevErrorDetail] = useState<string | null>(null);
  const [newRequestId,   setNewRequestId]   = useState<string | null>(null);

  const hasDetail = !!(timing || desireType || memo);
  const hasRoomInfo = rooms.some(r => r.workType || r.size);

  // 部屋の workType から施工内容を自動導出してStep3をスキップ
  function goFromRoomsToNext() {
    const roomTypes = rooms.map(r => r.workType).filter(Boolean);
    if (roomTypes.length > 0 && !workType) {
      const hasCF      = roomTypes.some(w => w === 'クッションフロア');
      const hasWall    = roomTypes.some(w => w === '壁紙・クロス' || w === '両方' || w === '壁＋天井');
      const hasCeiling = roomTypes.some(w => w === '天井クロス' || w === '壁＋天井');
      const hasBoth    = roomTypes.some(w => w === '両方');
      if (hasBoth || (hasCF && (hasWall || hasCeiling))) {
        setWorkType('クロス張り替え');
      } else if (hasCF) {
        setWorkType('床工事');
      } else {
        setWorkType('クロス張り替え');
      }
    }
    setStep3Skipped(true);
    setStep(4);
  }

  // ── Supabase 送信処理 ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitState('sending');
    setUploadPhase('');
    setDevErrorDetail(null);
    try {
      // 1. メイン動画を Storage にアップロード
      setUploadPhase('メイン動画をアップロード中...');
      let video_url: string | null = null;
      let thumbnail_url: string | null = null;
      if (videoFile) {
        const ext = videoFile.name.split('.').pop() ?? 'mp4';
        const ts  = Date.now();
        const path = `${ts}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('estimate-videos')
          .upload(path, videoFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('estimate-videos')
            .getPublicUrl(path);
          video_url = publicUrl;

          // 1b. サムネイル（失敗しても送信は続行）
          try {
            const thumbBlob = await generateThumbnail(videoFile);
            if (thumbBlob) {
              const thumbPath = `thumbnails/${ts}.jpg`;
              const { error: thumbUploadError } = await supabase.storage
                .from('estimate-videos')
                .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' });
              if (!thumbUploadError) {
                const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
                  .from('estimate-videos')
                  .getPublicUrl(thumbPath);
                thumbnail_url = thumbPublicUrl;
              }
            }
          } catch (thumbErr) {
            console.warn('[CorporateRequest] サムネイル生成スキップ:', thumbErr);
          }
        }
      }

      // 2. 部屋ごとの動画・写真をアップロード
      setUploadPhase('部屋の写真・動画をアップロード中...');
      const uploadTs = Date.now();
      type RoomMediaEntry = { roomId: string; roomName: string; videos: string[]; images: string[] };
      const roomMediaList: RoomMediaEntry[] = [];
      for (let ri = 0; ri < rooms.length; ri++) {
        const room = rooms[ri];
        const hasRoomMedia = room.roomVideoFiles.length > 0 || room.roomImageFiles.length > 0;
        if (!hasRoomMedia) continue;
        const roomId   = `room-${ri}`;
        const roomName = room.customName || room.name || roomId;
        const videoUrls: string[] = [];
        const imageUrls: string[] = [];

        for (const vf of room.roomVideoFiles) {
          try {
            const ext  = vf.name.split('.').pop() ?? 'mp4';
            const path = `room-videos/${uploadTs}/${ri}/${Date.now()}.${ext}`;
            const { error: ve } = await supabase.storage.from('estimate-videos').upload(path, vf);
            if (!ve) {
              const { data: { publicUrl } } = supabase.storage.from('estimate-videos').getPublicUrl(path);
              videoUrls.push(publicUrl);
            }
          } catch (e) { console.warn(`[roomMedia] video upload failed room${ri}:`, e); }
        }

        for (const imgFile of room.roomImageFiles) {
          try {
            const blob = await compressImage(imgFile, 1200, 0.80);
            const path = `room-images/${uploadTs}/${ri}/${Date.now()}.webp`;
            const { error: ie } = await supabase.storage.from('estimate-videos').upload(path, blob, { contentType: 'image/webp' });
            if (!ie) {
              const { data: { publicUrl } } = supabase.storage.from('estimate-videos').getPublicUrl(path);
              imageUrls.push(publicUrl);
            }
          } catch (e) { console.warn(`[roomMedia] image upload failed room${ri}:`, e); }
        }

        if (videoUrls.length > 0 || imageUrls.length > 0) {
          roomMediaList.push({ roomId, roomName, videos: videoUrls, images: imageUrls });
        }
      }

      // 3. estimate_requests に保存（SECURITY DEFINER RPC 経由でRLSをバイパス）
      setUploadPhase('依頼を送信中...');
      // File オブジェクトは meta に含めず、URLのみ保存する
      const roomsForMeta = hasRoomInfo ? rooms.map(r => ({
        name:         r.name,
        customName:   r.customName,
        workType:     r.workType,
        size:         r.size,
        customSize:   r.customSize,
        condition:    r.condition,
        materialPref: r.materialPref,
      })) : null;

      const metaPayload = {
        rooms:                roomsForMeta,
        extra_info:           null,
        wallpaper_preference: wallpaperPreference || null,
        ...(thumbnail_url ? { thumbnail_url } : {}),
        ...(roomMediaList.length > 0 ? { roomMedia: roomMediaList } : {}),
      };
      console.log('[CorporateRequest] rpc payload meta:', JSON.stringify(metaPayload, null, 2));

      const { data: rpcResult, error } = await supabase.rpc('create_estimate_request', {
        p_video_url:      video_url,
        p_area:           area,
        p_work_type:      workType,
        p_size_note:      roomSize        || '',
        p_timing:         timing          || '',
        p_contact_method: contactMethod,
        p_contact_value:  contactValue,
        p_room_type:      roomType        || null,
        p_site_condition: siteCondition   || null,
        p_desire_type:    desireType      || null,
        p_memo:           memo            || null,
        p_meta:           metaPayload,
      });

      if (error) {
        console.error('[handleSubmit] Supabase RPC error:', error.message, error);
        setDevErrorDetail(`[SupabaseRPCError] ${error.message}\n${JSON.stringify(error, null, 2)}`);
        setSubmitState('error');
        return;
      }

      const inserted = rpcResult as { id: string; status: string } | null;
      console.log('[CorporateRequest] insert success, id:', inserted?.id);
      if (inserted?.id) {
        setNewRequestId(inserted.id);
        // 前回依頼バナー用に localStorage に保存
        try {
          localStorage.setItem('promatch_last_request_id', String(inserted.id));
          localStorage.setItem('promatch_last_request_at', new Date().toISOString());
        } catch { /* localStorage 失敗は無視 */ }
      }

      // 5. 管理者へメール通知（失敗しても送信完了扱い）
      try {
        await fetch('/api/notify', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            area,
            work_type:      workType,
            contact_method: contactMethod,
            contact_value:  contactValue,
            created_at:     new Date().toISOString(),
          }),
        });
      } catch (notifyErr) {
        console.error('[notify] メール通知エラー:', notifyErr);
      }

      // 6. 依頼者へ受付完了メール（失敗しても送信完了扱い）
      if (contactMethod === 'メール' && contactValue.includes('@')) {
        const trimmedEmail = contactValue.trim();
        console.log('[send-customer-email] invoke 開始 →', trimmedEmail);
        try {
          const { data: mailData, error: mailError } = await supabase.functions.invoke('send-customer-email', {
            body: {
              to:         trimmedEmail,
              area,
              work_type:  workType,
              room_type:  roomType   || undefined,
              room_size:  roomSize   || undefined,
              timing:     timing     || undefined,
              request_id: inserted?.id,
            },
          });
          if (mailError) {
            console.error('[send-customer-email] invoke error:', {
              error:       mailError,
              targetEmail: trimmedEmail,
              requestId:   inserted?.id,
            });
          } else {
            console.log('[send-customer-email] invoke ok:', {
              response:    mailData,
              emailSent:   mailData?.emailSent ?? null,
              targetEmail: trimmedEmail,
              resendId:    mailData?.resendId  ?? null,
              reason:      mailData?.reason    ?? null,
            });
          }
        } catch (customerMailErr) {
          console.error('[send-customer-email] 予期しないエラー（依頼は受付済み）:', customerMailErr);
        }
      }

      setSubmitState('success');
    } catch (err) {
      console.error('[handleSubmit] 送信エラー:', err);
      const detail = err instanceof Error
        ? `[${err.name}] ${err.message}`
        : JSON.stringify(err, null, 2);
      setDevErrorDetail(detail);
      setSubmitState('error');
    }
  };

  // ── 送信完了画面 ───────────────────────────────────────────────────────────
  if (submitState === 'success') {
    const extraId = newRequestId ?? 'demo-1';
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'linear-gradient(160deg, #ecfdf5 0%, #f0fdf4 60%, #dcfce7 100%)' }}
      >
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
          <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-3">受付が完了しました</h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-xs mb-6">
          内容を確認後、対応可能な職人から<br />
          順次ご連絡いたします。<br />
          <span className="text-xs text-slate-400 mt-1 block">早ければ当日中に連絡が来る場合があります。</span>
        </p>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-100 px-6 py-5 text-left max-w-xs w-full space-y-3 shadow-sm mb-4">
          {[
            '費用が確定するまで料金は発生しません',
            '断っても一切費用はかかりません',
            'しつこい営業メールはいたしません',
          ].map(msg => (
            <div key={msg} className="flex items-start gap-2.5">
              <span className="text-emerald-500 font-extrabold text-xs mt-0.5 flex-shrink-0">✓</span>
              <span className="text-xs text-slate-600 font-medium">{msg}</span>
            </div>
          ))}
        </div>

        {/* 追加情報の安心文言 */}
        <div className="bg-teal-50 border border-teal-100 rounded-2xl px-5 py-4 text-left max-w-xs w-full mb-6">
          <p className="text-xs font-bold text-teal-700 mb-2">🎨 品番・希望はまだ決まっていなくても大丈夫</p>
          <div className="space-y-1.5">
            {[
              '送信後に追加情報を職人に伝えられます',
              '職人が決まった後、日程・材料・支払い方法などを確認できます',
              '品番が未定でも、気になる雰囲気だけで相談できます',
            ].map(msg => (
              <div key={msg} className="flex items-start gap-2">
                <span className="text-teal-500 text-[10px] mt-0.5 flex-shrink-0">●</span>
                <span className="text-[11px] text-teal-700 leading-relaxed">{msg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA群 */}
        <div className="max-w-xs w-full space-y-3">
          {/* 応募確認（request_id が取れた場合のみ） */}
          {newRequestId && (
            <button
              onClick={() => navigate(`/request/${newRequestId}/applications`)}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm transition-all shadow-sm"
            >
              職人の応募を確認する →
            </button>
          )}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-left">
            <p className="text-xs font-bold text-blue-800 mb-0.5">📸 クロス品番・写真・希望を後から追加できます</p>
            <p className="text-[11px] text-blue-600 leading-relaxed">品番・URL・気になる雰囲気・参考写真などを送ると、職人がより正確な概算を出せます。今すぐでなくても大丈夫です。</p>
          </div>
          <button
            onClick={() => navigate(`/request/${extraId}/extra-info`)}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm transition-all shadow-sm"
          >
            品番・写真・希望を追加する →
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-white transition-all"
          >
            今はスキップ
          </button>
        </div>
      </div>
    );
  }

  // ── エラー画面 ─────────────────────────────────────────────────────────────
  if (submitState === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">送信に失敗しました</h2>
        <p className="text-sm text-slate-500 mb-6">
          時間をおいて再度お試しください。
        </p>
        <button
          onClick={() => { setSubmitState('idle'); setStep(8); }}
          className="px-8 py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm shadow-sm hover:bg-violet-700 active:scale-95 transition-all mb-4"
        >
          もう一度試す
        </button>
        {import.meta.env.DEV && devErrorDetail && (
          <details className="w-full max-w-sm text-left mt-2">
            <summary className="text-xs text-slate-300 cursor-pointer select-none">DEV: 詳細を見る</summary>
            <pre className="mt-2 text-xs text-red-400 bg-red-50 rounded-xl p-3 whitespace-pre-wrap break-all border border-red-100">
              {devErrorDetail}
            </pre>
          </details>
        )}
      </div>
    );
  }

  // ── STEP 1：動画アップロード ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={1} />
        <StepContent title="まずメインのお部屋を撮影してください" sub="LDKや一番見てもらいたい部屋を10〜15秒ほど撮影してください。他の部屋の動画や写真は次の画面で追加できます。">

          {/* ── 前回の依頼バナー ── */}
          {lastRequestId && (
            <div className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-4">
              <p className="text-xs font-extrabold text-indigo-700 mb-2">📋 前回の依頼状況を確認する</p>
              <div className="flex flex-col gap-2">
                <a
                  href={`/request/${lastRequestId}/applications`}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-indigo-700 hover:bg-indigo-50 active:scale-95 transition-all"
                >
                  <span>応募状況を確認する</span>
                  <span className="text-indigo-400">→</span>
                </a>
                <a
                  href={`/request/${lastRequestId}/extra-info`}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-indigo-700 hover:bg-indigo-50 active:scale-95 transition-all"
                >
                  <span>追加情報を入力する</span>
                  <span className="text-indigo-400">→</span>
                </a>
              </div>
            </div>
          )}

          {/* ── ① HERO: HOW TO SHOOT + ランドスケープ撮影モック ── */}
          <div className="mb-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)' }}>
            {/* ヘッダー */}
            <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 3, height: 14, background: '#818cf8', borderRadius: 2 }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.9)', letterSpacing: '0.08em' }}>HOW TO SHOOT</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(129,140,248,.18)', borderRadius: 20, padding: '3px 8px' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 2v4M12 18v4"/>
                </svg>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#a5b4fc' }}>横向き推奨</span>
              </div>
            </div>
            {/* 16:9 ランドスケープ撮影モック（全幅） */}
            <div style={{ padding: '10px 16px 14px' }}>
              <div style={{
                position: 'relative', width: '100%', paddingTop: '56.25%',
                borderRadius: 10, background: '#0a0f1e',
                border: '2px solid #334155', overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}>
                <img src="/homepage/room-wide.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                {/* 四隅コーナー */}
                {([
                  { top: 8, left: 8, borderTop: '2px solid rgba(255,255,255,.6)', borderLeft: '2px solid rgba(255,255,255,.6)' },
                  { top: 8, right: 8, borderTop: '2px solid rgba(255,255,255,.6)', borderRight: '2px solid rgba(255,255,255,.6)' },
                  { bottom: 8, left: 8, borderBottom: '2px solid rgba(255,255,255,.6)', borderLeft: '2px solid rgba(255,255,255,.6)' },
                  { bottom: 8, right: 8, borderBottom: '2px solid rgba(255,255,255,.6)', borderRight: '2px solid rgba(255,255,255,.6)' },
                ] as React.CSSProperties[]).map((style, i) => (
                  <div key={i} style={{ position: 'absolute', width: 18, height: 18, ...style }} />
                ))}
                {/* REC バッジ */}
                <div style={{ position: 'absolute', top: 10, right: 14, display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,.6)', borderRadius: 6, padding: '3px 7px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'recBlink 1.2s ease-in-out infinite' }} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '0.05em' }}>REC</span>
                </div>
                {/* 撮影中ラベル */}
                <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>
                  <span style={{ background: 'rgba(255,255,255,.88)', borderRadius: 20, padding: '3px 12px', fontSize: 9, fontWeight: 700, color: '#0f172a' }}>部屋を一周しながら撮影中...</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── ② 3ステップ ビジュアルカード ── */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { img: '/homepage/room-wide.jpg', badge: '●REC', badgeColor: '#ef4444', label: '部屋を一周' },
              { img: '/homepage/wall-damage.jpg', badge: '🔍 ZOOM', badgeColor: '#f59e0b', label: '傷を近くで' },
              { img: '/homepage/room-wide.jpg', badge: '🚫', badgeColor: '#64748b', label: '個人情報\n映さない', dark: true },
            ].map((card, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-slate-200">
                <div style={{ position: 'relative', paddingTop: '75%', background: '#e2e8f0' }}>
                  <img
                    src={card.img} alt=""
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                      ...(card.dark ? { filter: 'brightness(0.35) saturate(0)' } : {}),
                    }}
                  />
                  <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,.55)', borderRadius: 4, padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 2 }}>
                    {i === 0 && <span style={{ width: 4, height: 4, borderRadius: '50%', background: card.badgeColor, display: 'inline-block' }} />}
                    <span style={{ fontSize: 7, fontWeight: 800, color: 'white' }}>{i === 0 ? 'REC' : card.badge}</span>
                  </div>
                  {card.dark && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 22 }}>🚫</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 4, left: 0, right: 0, textAlign: 'center', display: 'none' }} />
                  {/* step number */}
                  <div style={{ position: 'absolute', bottom: 4, right: 5, width: 16, height: 16, borderRadius: '50%', background: 'rgba(129,140,248,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 8, fontWeight: 900, color: 'white' }}>{i + 1}</span>
                  </div>
                </div>
                <div className="bg-white px-1.5 py-1.5 text-center">
                  <p className="text-[9.5px] font-bold text-slate-600 leading-tight whitespace-pre-line">{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── ③ GOOD / BAD ビジュアル比較 ── */}
          <div className="mb-5 rounded-2xl overflow-hidden border border-slate-200">
            <div className="grid grid-cols-2 divide-x divide-slate-200">
              {/* GOOD */}
              <div>
                <div className="flex items-center gap-1 px-3 py-2 bg-emerald-50 border-b border-slate-200">
                  <span className="text-emerald-500 text-[11px] font-extrabold">✓ GOOD</span>
                </div>
                <div className="space-y-0 divide-y divide-slate-100">
                  {[
                    { img: '/homepage/room-wide.jpg', label: '明るい・広角', filter: undefined },
                    { img: '/homepage/room-wide.jpg', label: 'ゆっくり撮影', filter: 'saturate(0.7) brightness(0.92)' },
                    { img: '/homepage/wall-damage.jpg', label: '傷をアップで', filter: undefined },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                      <div style={{ position: 'relative', width: 44, height: 30, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                        <img src={row.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: row.filter }} />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600">{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* BAD */}
              <div>
                <div className="flex items-center gap-1 px-3 py-2 bg-red-50 border-b border-slate-200">
                  <span className="text-red-500 text-[11px] font-extrabold">✗ BAD</span>
                </div>
                <div className="space-y-0 divide-y divide-slate-100">
                  {[
                    { img: '/homepage/room-wide.jpg', label: '暗い', filter: 'brightness(0.35) saturate(0.4)' },
                    { img: '/homepage/room-wide.jpg', label: 'ブレる', filter: 'blur(3px) brightness(1.05)' },
                    { img: '/homepage/wall-damage.jpg', label: '遠すぎ', filter: 'blur(4px) brightness(0.9)' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                      <div style={{ position: 'relative', width: 44, height: 30, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                        <img src={row.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: row.filter }} />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── ④ 動画アップロードエリア ── */}
          <label
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl px-6 py-10 cursor-pointer transition-all ${
              videoFile
                ? 'border-violet-400 bg-violet-50'
                : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/50'
            }`}
          >
            {videoFile ? (
              <>
                <span className="text-4xl">🎬</span>
                <p className="text-sm font-bold text-violet-700 text-center break-all px-2">{videoFile.name}</p>
                <span className="text-xs text-violet-400 bg-violet-100 px-3 py-1 rounded-full">タップして変更</span>
              </>
            ) : (
              <>
                <span className="text-4xl">📹</span>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700">メイン動画を追加する</p>
                  <p className="text-xs text-slate-400 mt-1">LDKや一番見てもらいたい部屋を撮影してください</p>
                </div>
                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">MP4 / MOV / その他動画形式</span>
                <p className="text-[11px] text-slate-400 text-center leading-relaxed px-2">
                  10〜15秒の短い動画がおすすめです。長い動画はアップロードや表示に時間がかかる場合があります。
                </p>
              </>
            )}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0] ?? null;
                if (file && file.size > MAX_VIDEO_BYTES_MAIN) {
                  setVideoSizeError(true);
                  // input をリセットして同じファイルを再選択できるようにする
                  e.target.value = '';
                } else {
                  setVideoSizeError(false);
                  setVideoFile(file);
                }
              }}
            />
          </label>

          {/* ── ⑤ 動画サイズエラー ── */}
          {videoSizeError && (
            <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm font-bold text-amber-800 mb-0.5">
                動画が少し長いようです
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                10〜15秒程度の短い動画を選んでください。<br />
                複数部屋を撮影している場合は、まず1部屋だけでも大丈夫です。
              </p>
            </div>
          )}

          {/* ── ⑥ LP callout ── */}
          {!videoFile && (
            <div className="mt-4 flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3">
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: 'white', marginLeft: 2 }}>▶</span>
              </div>
              <p className="text-xs font-semibold text-blue-700 leading-relaxed">長い動画より、部屋ごとの短い動画・写真の方が職人が確認しやすくなります。他の部屋は次の画面で追加できます。</p>
            </div>
          )}
        </StepContent>
        <BottomNav showBack={false} onNext={() => setStep(2)} nextLabel={videoFile ? '動画を添付して次へ →' : 'スキップして次へ →'} />
      </PageShell>
    );
  }

  // ── STEP 2：工事する部屋 ────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={2} />
        <StepContent title="工事する部屋を教えてください" sub="任意・スキップ可。1部屋から複数部屋まで対応" scrollable>
          <div className="space-y-4">
            {rooms.map((room, idx) => (
              <RoomCard
                key={idx}
                room={room}
                index={idx}
                canDelete={idx > 0}
                onUpdate={patch => updateRoom(idx, patch)}
                onDelete={() => removeRoom(idx)}
                expanded={expandedRooms[idx] ?? false}
                onToggleExpand={() => setExpandedRooms(prev => prev.map((v, i) => i === idx ? !v : v))}
              />
            ))}

            {/* 部屋追加ボタン */}
            <button
              type="button"
              onClick={addRoom}
              className="w-full rounded-2xl border-2 border-dashed border-slate-200 py-3.5 text-sm font-bold text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all active:scale-[0.99]"
            >
              ＋ 部屋を追加
            </button>

            {/* ── クロス選びサポート ── */}
            <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 space-y-3">
              <div>
                <p className="text-xs font-extrabold text-teal-700 mb-0.5">🎨 クロス選びに迷ったら</p>
                <p className="text-[11px] text-teal-600 leading-relaxed">品番が決まっていなくても大丈夫です。まずは近い雰囲気だけ選んでください。詳しい品番や材料の相談は、職人が決まった後でも追加で送れます。</p>
              </div>

              {/* 雰囲気チップ */}
              <div className="flex flex-wrap gap-1.5">
                {WALLPAPER_MOODS.map(mood => (
                  <button
                    key={mood} type="button"
                    onClick={() => setWallpaperPreference(prev => prev === mood ? '' : mood)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      wallpaperPreference === mood
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-teal-700 border-teal-200 hover:border-teal-400'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>

              {/* 人気クロス候補カード */}
              <div>
                <p className="text-[11px] font-bold text-teal-600 mb-2">💡 人気の選び方</p>
                <div className="space-y-2">
                  {[
                    { title: '失敗しにくい白系', desc: '明るく清潔感が出やすく、どの部屋にも合わせやすいです。' },
                    { title: '汚れが目立ちにくいグレー系', desc: '生活感を抑えやすく、落ち着いた雰囲気になります。' },
                    { title: 'アクセントクロス', desc: '一面だけ色や柄を変えて、部屋の印象を変えられます。' },
                    { title: 'ペット・子供部屋向け', desc: '汚れや傷が気になる部屋では、機能性クロスも相談できます。' },
                  ].map(card => (
                    <div key={card.title} className="bg-white/80 rounded-xl border border-teal-100 px-3 py-2.5">
                      <p className="text-xs font-bold text-slate-700">{card.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{card.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-amber-600 mt-2 leading-relaxed">※ 1000番クロス・柄物・アクセントクロス・機能性クロスは、通常クロスより費用が上がる場合があります。正式な金額は職人が確認後にご案内します。</p>
              </div>

              {/* AI準備中 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-slate-500 leading-relaxed">🔮 <span className="font-bold">準備中</span>：お部屋の写真があると、将来的にAIで施工後の雰囲気を確認できるようにする予定です。今は写真・URL・品番メモをもとに職人と相談できます。</p>
              </div>
            </div>
          </div>
        </StepContent>
        <BottomNav
          onBack={() => setStep(1)}
          onNext={goFromRoomsToNext}
          nextLabel={hasRoomInfo ? '次へ →' : 'スキップ →'}
        />
      </PageShell>
    );
  }

  // ── STEP 3：施工内容 ────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={3} />
        <StepContent title="ご希望の施工内容を選んでください" sub="当てはまるものをひとつ選択してください">
          <div className="grid grid-cols-2 gap-3">
            {WORK_OPTIONS.map(({ value, Icon, desc }) => (
              <button
                key={value}
                onClick={() => { setWorkType(value); setStep(4); }}
                className={`flex flex-col items-start gap-2.5 rounded-2xl border-2 px-4 py-5 text-left transition-all active:scale-95 ${
                  workType === value
                    ? 'border-violet-500 bg-violet-50 shadow-sm shadow-violet-100'
                    : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30'
                }`}
              >
                <span className={`${workType === value ? 'text-violet-500' : 'text-slate-400'}`}>
                  <Icon size={26} />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-slate-800">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
                {workType === value && (
                  <span className="text-xs font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">選択中</span>
                )}
              </button>
            ))}
          </div>
        </StepContent>
        <BottomNav onBack={() => setStep(2)} onNext={() => workType && setStep(4)} nextDisabled={!workType} nextLabel="次へ →" />
      </PageShell>
    );
  }

  // ── STEP 4：施工エリア ──────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={4} displayStep={step3Skipped ? 3 : 4} total={step3Skipped ? 5 : 6} />
        <StepContent title="施工エリアを教えてください" sub="住所は不要です。〇〇市・〇〇区レベルでOK">
          <div className="space-y-3">
            <input
              type="text"
              autoFocus
              value={area}
              onChange={e => setArea(e.target.value)}
              placeholder="例）東京都世田谷区、横浜市港北区など"
              className="w-full border-2 border-slate-200 rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-violet-400 transition-colors placeholder:text-slate-300"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {['東京都', '神奈川県', '埼玉県', '千葉県', '群馬県'].map(example => (
                <button
                  key={example}
                  onClick={() => setArea(example)}
                  className="text-xs text-slate-500 bg-slate-100 hover:bg-violet-50 hover:text-violet-600 px-3 py-1.5 rounded-full transition-colors font-medium"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </StepContent>
        <BottomNav onBack={() => setStep(step3Skipped ? 2 : 3)} onNext={() => setStep(5)} nextDisabled={area.trim() === ''} nextLabel="次へ →" />
      </PageShell>
    );
  }

  // ── STEP 5：詳細情報（すべて任意） ─────────────────────────────────────────
  if (step === 5) {
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={5} displayStep={step3Skipped ? 4 : 5} total={step3Skipped ? 5 : 6} />
        <StepContent
          title="ご希望を少しだけ教えてください"
          sub="任意です。わかる範囲だけで大丈夫です"
          scrollable
        >
          <div className="space-y-6 pb-2">
            <ChipGroup label="希望時期" options={TIMING_OPTIONS} value={timing} onChange={setTiming} />

            <div>
              <p className="text-xs font-bold text-slate-600 mb-0.5">
                今回のご希望に近いものを選んでください
                <span className="ml-1.5 text-[10px] font-semibold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded-md">任意</span>
              </p>
              <p className="text-[11px] text-slate-400 mb-2.5">一番近いものを選んでいただくだけでOKです</p>
              <div className="flex flex-col gap-2">
                {DESIRE_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDesireType(desireType === opt ? '' : opt)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-[0.98] ${
                      desireType === opt
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">
                補足メモ
                <span className="ml-1.5 text-[10px] font-semibold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded-md">任意</span>
              </p>
              <textarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
                rows={3}
                placeholder="気になる箇所、希望、伝えておきたいことなど"
                className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-400 transition-colors resize-none leading-relaxed"
              />
            </div>
          </div>
        </StepContent>
        <BottomNav
          onBack={() => setStep(4)}
          onNext={() => setStep(7)}
          nextLabel={hasDetail ? '次へ →' : 'スキップ →'}
        />
      </PageShell>
    );
  }

  // ── STEP 7（= 旧 STEP 7）：メールアドレス入力 ────────────────────────────────
  if (step === 7) {
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={6} displayStep={step3Skipped ? 5 : 6} total={step3Skipped ? 5 : 6} />
        <StepContent title="メールアドレスを入力してください" sub="見積もりのご案内をメールでお送りします">
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 mb-1">
              <Mail size={18} className="text-violet-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-violet-700">
                職人からのご連絡はメールでお届けします
              </p>
            </div>
            <input
              type="email"
              autoFocus
              value={contactValue}
              onChange={e => setContactValue(e.target.value)}
              placeholder="example@mail.com"
              className="w-full border-2 border-slate-200 rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-violet-400 transition-colors placeholder:text-slate-300"
            />
            <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-4 py-3">
              <span className="text-slate-400 text-xs mt-0.5 flex-shrink-0">🔒</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                入力したメールアドレスは見積もり対応にのみ使用します。マーケティング目的での使用や第三者への提供は行いません。
              </p>
            </div>
          </div>
        </StepContent>
        <BottomNav onBack={() => setStep(5)} onNext={() => setStep(8)} nextDisabled={contactValue.trim() === ''} nextLabel="確認画面へ →" />
      </PageShell>
    );
  }

  // ── STEP 8（確認画面）：送信確認 ────────────────────────────────────────────
  return (
    <PageShell>
      <PageHeader />
      <StepProgress step={7} />
      <StepContent title="内容をご確認ください" sub="送信後、住所はまだ共有されません。まだ契約ではありません。" scrollable>

        {/* 安心バッジ */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            '✓ お客様完全無料',
            '✓ 住所はまだ共有されません',
            '✓ まだ契約ではありません',
            '✓ 断っても費用なし',
          ].map(t => (
            <span key={t} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">{t}</span>
          ))}
        </div>

        {/* 基本情報 */}
        <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden mb-4">
          {[
            { label: '動画',        value: videoFile?.name ?? 'なし（スキップ）' },
            { label: '施工内容',    value: workType },
            { label: 'エリア',      value: area },
            { label: '連絡先(メール)', value: contactValue },
          ].map(({ label, value }, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-3.5 bg-white hover:bg-slate-50 transition-colors">
              <p className="text-xs font-bold text-slate-400 w-24 flex-shrink-0 pt-0.5">{label}</p>
              <p className="text-sm text-slate-800 break-all font-medium">{value || '—'}</p>
            </div>
          ))}
        </div>

        {/* 部屋情報まとめ（チップ形式） */}
        {hasRoomInfo && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 overflow-hidden mb-4">
            <div className="px-5 py-2.5 bg-blue-50 flex items-center gap-2">
              <p className="text-xs font-bold text-blue-600">希望内容まとめ（{rooms.length}部屋）</p>
              {wallpaperPreference && (
                <span className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                  🎨 {wallpaperPreference}
                </span>
              )}
            </div>
            {rooms.map((r, i) => {
              const displayName = r.customName || r.name || `部屋${i + 1}`;
              const displaySize = r.customSize || r.size;
              const hasMedia    = r.roomVideoFiles.length > 0 || r.roomImageFiles.length > 0;
              const chips = [
                r.workType,
                displaySize,
                ...r.condition,
                r.materialPref && r.materialPref !== 'まだ決まっていない' ? r.materialPref : '',
                hasMedia ? '動画・写真あり' : '',
              ].filter(Boolean);
              return (
                <div key={i} className="px-4 py-3 bg-white/60 border-t border-blue-100 first:border-t-0">
                  <p className="text-sm font-bold text-slate-700 mb-1.5">{displayName}</p>
                  {chips.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {chips.map((chip, ci) => (
                        <span key={ci} className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">詳細未入力</p>
                  )}
                </div>
              );
            })}
            <div className="px-4 py-2.5 bg-teal-50/60 border-t border-blue-100">
              <p className="text-[10px] text-teal-600 leading-relaxed">
                品番や詳しい希望がまだ決まっていなくても大丈夫です。送信後に追加情報を送れます。
              </p>
            </div>
          </div>
        )}

        {/* 詳細情報 */}
        {hasDetail ? (
          <div className="rounded-2xl border border-violet-100 bg-violet-50/40 divide-y divide-violet-100 overflow-hidden mb-4">
            <div className="px-5 py-2.5 bg-violet-50">
              <p className="text-xs font-bold text-violet-600">現場の詳細情報</p>
            </div>
            {[
              { label: '部屋の種類', value: roomType },
              { label: '広さ',       value: roomSize },
              { label: '希望時期',   value: timing },
              { label: '現場状況',   value: siteCondition },
              { label: '希望タイプ', value: desireType },
              { label: '補足メモ',   value: memo },
            ].filter(({ value }) => value)
              .map(({ label, value }) => (
                <div key={label} className="flex items-start gap-4 px-5 py-3 bg-white/60">
                  <p className="text-xs font-bold text-slate-400 w-20 flex-shrink-0 pt-0.5">{label}</p>
                  <p className="text-sm text-slate-700 break-all">{value}</p>
                </div>
              ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 mb-4 flex items-center gap-2">
            <span className="text-slate-300 text-xs">—</span>
            <p className="text-xs text-slate-400">詳細情報なし（スキップ済み）</p>
          </div>
        )}

        {/* 送信後の流れ */}
        <div className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-4 mb-2">
          <p className="text-xs font-bold text-violet-700 mb-2">📋 送信後の流れ</p>
          <ol className="space-y-1.5">
            {['対応可能な職人が動画・内容を確認します', 'メールアドレスに職人からご連絡があります（電話・LINEの開示なし）', '気に入った職人を選んで成約。お客様のご利用は完全無料です'].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-xs font-extrabold text-violet-400 flex-shrink-0 w-4">{i + 1}.</span>
                <span className="text-xs text-violet-700">{item}</span>
              </li>
            ))}
          </ol>
        </div>

      </StepContent>

      <BottomNav
        onBack={() => setStep(7)}
        onNext={handleSubmit}
        nextLabel="この内容で送信する ✓"
        loading={submitState === 'sending'}
        loadingText={uploadPhase || '送信中...'}
      />
    </PageShell>
  );
}
