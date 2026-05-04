import { useState, useRef, useEffect } from 'react';
import { Camera, Navigation } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type WorkType  = 'wallpaper' | 'floor' | 'both';
type Condition = 'light' | 'medium' | 'heavy';
type RoomSize  = 6 | 8 | 10 | 'other';

export interface EstimateInputData {
  isPro:               boolean;
  wallpaperUnitPrice:  string;
  cfUnitPrice:         string;
  bulkNotes:           string;
  jobTemplate:         string;
  workType:            WorkType;
  roomSize:     RoomSize;
  customSize:   string;
  condition:    Condition;
  hasFurniture: boolean;
  timing:       'asap';
  photos:       File[];
  area:         string;
  contactName:  string;
  contactPhone: string;
}

// ── Progress ──────────────────────────────────────────────────────────────────

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-between mb-10">
      <div className="flex gap-1.5 flex-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            i < current ? 'bg-indigo-500' : i === current ? 'bg-indigo-300' : 'bg-gray-100'
          }`} />
        ))}
      </div>
      <span className="ml-3 text-xs font-bold text-gray-400 flex-shrink-0">
        {current + 1} / {total}
      </span>
    </div>
  );
}

// ── Question wrapper ──────────────────────────────────────────────────────────

function Q({ ja, en }: { ja: string; en: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">{ja}</h2>
      <p className="text-sm text-gray-400 mt-1 font-medium">{en}</p>
    </div>
  );
}

// ── Work type cards ───────────────────────────────────────────────────────────

const WORK_CARDS = [
  {
    id:        'wallpaper' as WorkType,
    badge:     '壁・天井',
    badgeCls:  'bg-indigo-600',
    arrowCls:  'bg-indigo-600',
    title:     '壁紙クロス',
    desc:      '壁・天井のクロス張り替え',
    wallGrad:  'linear-gradient(180deg,#f5f5f7 0%,#e8e9ed 65%,#dddde2 100%)',
    floorCol:  '#cdc3b2',
  },
  {
    id:        'floor' as WorkType,
    badge:     '床材',
    badgeCls:  'bg-orange-500',
    arrowCls:  'bg-orange-500',
    title:     'クッションフロア',
    desc:      'シート状床材の張り替え',
    wallGrad:  'linear-gradient(180deg,#f1ece5 0%,#e8ddd0 60%,#ddd0be 100%)',
    floorCol:  '#b8966a',
  },
  {
    id:        'both' as WorkType,
    badge:     '壁＋床',
    badgeCls:  'bg-emerald-600',
    arrowCls:  'bg-emerald-600',
    title:     '壁紙＋床セット',
    desc:      '壁紙の張り替えと床材の張り替え',
    wallGrad:  'linear-gradient(180deg,#e8eef6 0%,#dae3ee 60%,#cdd8e6 100%)',
    floorCol:  '#c2b08a',
  },
] as const;

// ── Main ─────────────────────────────────────────────────────────────────────

export default function EstimateInput({ onNext, isAutoDemo = false }: { onNext: (d: EstimateInputData) => void; isAutoDemo?: boolean }) {
  const [sub,        setSub]        = useState(isAutoDemo ? 1 : 0);
  const [isPro,               setIsPro]               = useState(false);
  const [wallpaperUnitPrice,  setWallpaperUnitPrice]   = useState('');
  const [cfUnitPrice,         setCfUnitPrice]          = useState('');
  const [bulkNotes,           setBulkNotes]            = useState('');
  const [jobTemplate,         setJobTemplate]          = useState('');
  const [workType,            setWorkType]             = useState<WorkType | null>(null);
  const [roomSize,   setRoomSize]   = useState<RoomSize | null>(null);
  const [customSize, setCustomSize] = useState('');
  const [condition,  setCondition]  = useState<Condition | null>(null);
  const [photos,     setPhotos]     = useState<File[]>([]);
  const [photoUrls,  setPhotoUrls]  = useState<string[]>([]);
  const [area,       setArea]       = useState('');
  const [locating,   setLocating]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const go = (n: number) => setSub(n);

  useEffect(() => {
    if (!isAutoDemo) return;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => { setWorkType('both');   go(1); }, 800));
    timers.push(window.setTimeout(() => { setRoomSize(8);        go(2); }, 1600));
    timers.push(window.setTimeout(() => { setCondition('medium'); go(3); }, 2400));
    timers.push(window.setTimeout(() => { setArea('群馬県太田市'); go(4); }, 3200));
    timers.push(window.setTimeout(() => {
      onNext({
        isPro: false, wallpaperUnitPrice: '', cfUnitPrice: '', bulkNotes: '', jobTemplate: '',
        workType: 'both', roomSize: 8, customSize: '', condition: 'medium',
        hasFurniture: false, timing: 'asap', photos: [], area: '群馬県太田市',
        contactName: '', contactPhone: '',
      });
    }, 4200));
    return () => { timers.forEach(t => window.clearTimeout(t)); };
  }, [isAutoDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = <T,>(val: T, setter: (v: T) => void, next: number) => {
    setter(val);
    setTimeout(() => go(next), 120); // brief pause so selection is visible
  };

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPhotos(p  => [...p, ...files]);
    setPhotoUrls(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };

  const handleGeo = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      () => { setArea('現在地を取得済み'); setLocating(false); },
      ()  => setLocating(false),
    );
  };

  const submit = () => {
    if (!workType || !roomSize || !condition) return;
    const data: EstimateInputData = {
      isPro, wallpaperUnitPrice, cfUnitPrice, bulkNotes, jobTemplate,
      workType, roomSize, customSize, condition,
      hasFurniture: false, timing: 'asap',
      photos, area, contactName: '', contactPhone: '',
    };
    localStorage.setItem('lastEstimateInput', JSON.stringify({ ...data, photos: [] }));
    onNext(data);
  };

  const lastInput: EstimateInputData | null = (() => {
    try {
      const raw = localStorage.getItem('lastEstimateInput');
      return raw ? (JSON.parse(raw) as EstimateInputData) : null;
    } catch {
      return null;
    }
  })();

  // ── Q0: お客様タイプ ─────────────────────────────────────────────────────

  if (sub === 0) return (
    <div>
      <Progress current={0} total={6} />
      <Q ja="どちらですか？" en="Customer type?" />

      {lastInput && (
        <button
          onClick={() => onNext({ ...lastInput, photos: [] })}
          className="w-full mb-4 py-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold text-sm active:scale-95 transition-all"
        >
          前回と同じ条件で依頼
        </button>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setIsPro(false); go(1); }}
          className={`py-8 rounded-2xl border-2 font-bold text-lg transition-all active:scale-95 ${
            !isPro ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-gray-50 text-gray-700'
          }`}
        >
          一般
        </button>
        <button
          onClick={() => setIsPro(true)}
          className={`py-8 rounded-2xl border-2 font-bold text-lg transition-all active:scale-95 ${
            isPro ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-gray-50 text-gray-700'
          }`}
        >
          管理会社
        </button>
      </div>

      {isPro && (
        <div className="bg-white p-4 rounded-xl mt-4">
          <p className="font-bold mb-3">希望単価</p>
          <input
            value={wallpaperUnitPrice}
            onChange={e => setWallpaperUnitPrice(e.target.value)}
            placeholder="壁紙単価 例:1200"
            type="number"
            className="w-full border-b border-gray-200 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-indigo-400 mb-3"
          />
          <input
            value={cfUnitPrice}
            onChange={e => setCfUnitPrice(e.target.value)}
            placeholder="CF単価 例:3000"
            type="number"
            className="w-full border-b border-gray-200 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-indigo-400"
          />
          {(() => {
            const prices = [wallpaperUnitPrice, cfUnitPrice]
              .map(Number)
              .filter(n => n > 0);
            const price = prices.length ? Math.min(...prices) : Infinity;
            return price < 1000 ? (
              <div className="bg-red-50 p-2 text-sm mt-3">
                相場より低いため対応できる職人が少ない可能性があります
              </div>
            ) : null;
          })()}
          <select
            value={jobTemplate}
            onChange={e => setJobTemplate(e.target.value)}
            className="w-full mt-4 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          >
            <option value="">テンプレートを選択（任意）</option>
            <option value="1LDK原状回復">1LDK原状回復</option>
            <option value="2DKフル交換">2DKフル交換</option>
          </select>
          <textarea
            value={bulkNotes}
            onChange={e => setBulkNotes(e.target.value)}
            placeholder="複数案件をまとめて入力できます"
            rows={3}
            className="w-full mt-4 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
          <p className="text-xs text-gray-500 mt-3">
            この単価で対応可能な職人にのみ案件を配信します
          </p>
        </div>
      )}

      {isPro && (
        <button
          onClick={() => go(1)}
          className="mt-4 w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-base active:scale-95 transition-all shadow-lg shadow-indigo-200"
        >
          次へ
        </button>
      )}
    </div>
  );

  // ── Q1: 工事内容 ─────────────────────────────────────────────────────────

  if (sub === 1) return (
    <div>
      <Progress current={1} total={6} />

      {/* 見出し */}
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-gray-900 leading-tight">
          該当するものを選んでください
        </h2>
        <p className="text-sm text-gray-400 mt-1">後から変更できます</p>
      </div>

      {/* カード3列 */}
      <div className="grid grid-cols-3 gap-2.5">
        {WORK_CARDS.map(({ id, badge, badgeCls, arrowCls, title, desc, wallGrad, floorCol }) => (
          <button
            key={id}
            onClick={() => pick(id, setWorkType, 2)}
            className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 text-left transition-all active:scale-95 ${
              workType === id ? 'border-indigo-500' : 'border-slate-100 hover:border-slate-300'
            }`}
          >
            {/* 疑似写真エリア */}
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1 / 1.1' }}>
              {/* 壁面グラデーション */}
              <div className="absolute inset-0" style={{ background: wallGrad }} />
              {/* 床面 */}
              <div
                className="absolute bottom-0 left-0 right-0"
                style={{ height: '32%', background: floorCol }}
              >
                {/* 木目 */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg,transparent,transparent 12px,rgba(0,0,0,0.3) 13px)',
                  }}
                />
              </div>
              {/* 壁・床の境界線 */}
              <div
                className="absolute left-0 right-0 h-px bg-black/10"
                style={{ bottom: '32%' }}
              />

              {/* バッジ */}
              <span
                className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-[9px] font-bold ${badgeCls}`}
              >
                {badge}
              </span>

              {/* 選択時ボーダーオーバーレイ */}
              {workType === id && (
                <div className="absolute inset-0 border-2 border-indigo-500 rounded-2xl pointer-events-none" />
              )}
            </div>

            {/* テキスト＋矢印 */}
            <div className="px-2 pt-2 pb-2.5 flex items-end justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-900 leading-tight">{title}</p>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{desc}</p>
              </div>
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full ${arrowCls} flex items-center justify-center`}
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path
                    d="M1.5 4.5h6M5 2L7.5 4.5 5 7"
                    stroke="white"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 工事内容説明 */}
      <div className="mt-5 bg-slate-50 rounded-2xl px-4 py-3.5 flex gap-3">
        <span className="text-base mt-0.5 flex-shrink-0">💡</span>
        <div>
          <p className="text-xs font-bold text-indigo-700 mb-1.5">それぞれの工事内容</p>
          <ul className="space-y-1">
            {[
              '壁紙（クロス）：部屋の壁や天井のビニールクロスを新しくします',
              '床（クッションフロア）：水回りなどに使われるシート状の床材を新しくします',
              '壁紙＋床セット：壁と床をまとめて張り替えるお得なプランです',
            ].map((t, i) => (
              <li key={i} className="text-[11px] text-slate-600 leading-snug">・{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  // ── Q2: 広さ ─────────────────────────────────────────────────────────────

  if (sub === 2) return (
    <div>
      <Progress current={2} total={6} />
      <Q ja="部屋の広さは？" en="Room size?" />
      <div className="grid grid-cols-2 gap-3">
        {([6, 8, 10, 'other'] as RoomSize[]).map(n => (
          <button key={String(n)}
            onClick={() => n === 'other' ? go(11) : pick(n, setRoomSize, 3)}
            className={`py-7 rounded-2xl border-2 transition-all active:scale-95 ${
              roomSize === n
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 bg-gray-50 hover:border-gray-200'
            }`}>
            <p className="text-3xl font-extrabold text-gray-900">
              {n === 'other' ? '?' : n}
            </p>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              {n === 'other' ? 'その他  Other' : '畳  tatami'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Q2b: カスタムサイズ ───────────────────────────────────────────────────

  if (sub === 11) return (
    <div>
      <Progress current={2} total={6} />
      <Q ja="何畳ですか？" en="How many tatami?" />
      <div className="flex gap-3 items-center">
        <input type="number" value={customSize} onChange={e => setCustomSize(e.target.value)}
          placeholder="12" min="1" max="100" autoFocus
          className="flex-1 text-4xl font-extrabold text-center border-b-2 border-indigo-400 bg-transparent py-4 focus:outline-none text-gray-900"
        />
        <span className="text-2xl font-bold text-gray-400">畳</span>
      </div>
      <button
        onClick={() => { setRoomSize('other'); go(3); }}
        disabled={!customSize}
        className="mt-8 w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-base disabled:opacity-30 active:scale-95 transition-all"
      >
        次へ
      </button>
    </div>
  );

  // ── Q3: 状態 ─────────────────────────────────────────────────────────────

  if (sub === 3) return (
    <div>
      <Progress current={3} total={6} />
      <Q ja="今の状態は？" en="Current condition?" />
      <div className="grid grid-cols-3 gap-3">
        {([
          { id: 'light'  as Condition, emoji: '😊', ja: 'きれい',      en: 'Good',    from: 'from-emerald-400', to: 'to-emerald-500' },
          { id: 'medium' as Condition, emoji: '😐', ja: '普通',         en: 'Normal',  from: 'from-amber-400',   to: 'to-amber-500'   },
          { id: 'heavy'  as Condition, emoji: '😟', ja: '傷んでいる',  en: 'Damaged', from: 'from-rose-400',    to: 'to-rose-500'    },
        ]).map(({ id, emoji, ja, en, from, to }) => (
          <button key={id}
            onClick={() => pick(id, setCondition, 4)}
            className={`flex flex-col rounded-2xl border-2 overflow-hidden transition-all active:scale-95 ${
              condition === id ? 'border-indigo-500 shadow-md' : 'border-slate-200'
            }`}>
            <div className={`w-full aspect-square bg-gradient-to-br ${from} ${to} flex items-center justify-center`}>
              <span className="text-4xl">{emoji}</span>
            </div>
            <div className="py-2.5 px-1 bg-white text-center">
              <p className="text-xs font-extrabold text-gray-800">{ja}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{en}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Q4: 写真 ─────────────────────────────────────────────────────────────

  if (sub === 4) return (
    <div>
      <Progress current={4} total={6} />
      <Q ja="写真を撮ってください" en="Take a photo" />
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />

      {photoUrls.length === 0 ? (
        <button onClick={() => fileRef.current?.click()}
          className="w-full aspect-square max-h-64 rounded-3xl border-2 border-dashed border-indigo-300 bg-indigo-50 flex flex-col items-center justify-center gap-4 active:scale-95 transition-all">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <Camera size={32} className="text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-indigo-600">タップして追加</p>
            <p className="text-xs text-indigo-400 mt-1">Tap to upload</p>
          </div>
        </button>
      ) : (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {photoUrls.map((url, i) => (
              <div key={i} className="relative aspect-square">
                <img src={url} className="w-full h-full object-cover rounded-xl" />
                <button onClick={() => {
                  setPhotos(p => p.filter((_, j) => j !== i));
                  setPhotoUrls(p => p.filter((_, j) => j !== i));
                }} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full text-white text-xs font-bold flex items-center justify-center">×</button>
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 flex items-center justify-center">
              <Camera size={18} className="text-indigo-400" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2.5">
        <button onClick={() => go(5)} disabled={photos.length === 0}
          className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-base disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-indigo-200">
          次へ
        </button>
        <button onClick={() => go(5)}
          className="w-full py-3 text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors">
          あとでOK · Skip for now
        </button>
      </div>
    </div>
  );

  // ── Q4: エリア ───────────────────────────────────────────────────────────

  return (
    <div>
      <Progress current={5} total={6} />
      <Q ja="どこですか？" en="Your area?" />
      <div className="space-y-3">
        <div className="flex gap-2">
          <input type="text" value={area} onChange={e => setArea(e.target.value)}
            placeholder="例: 東京都渋谷区" autoFocus
            className="flex-1 border-b-2 border-gray-200 focus:border-indigo-400 bg-transparent py-3 text-lg font-bold text-gray-900 focus:outline-none placeholder:text-gray-300"
          />
          <button onClick={handleGeo} disabled={locating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-100 text-indigo-600 text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex-shrink-0">
            <Navigation size={13} />
            {locating ? '取得中...' : 'GPS'}
          </button>
        </div>
        {area === '現在地を取得済み' && (
          <p className="text-xs text-green-600 font-medium">✓ 現在地を取得しました</p>
        )}
      </div>

      <button onClick={submit} disabled={!area.trim()}
        className="mt-10 w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-indigo-200">
        完了 · Done
      </button>
    </div>
  );
}
