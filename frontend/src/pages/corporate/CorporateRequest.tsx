import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Scissors, LayoutGrid, MessageSquare, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
};

const ROOM_NAMES = ['LDK', '洋室', '寝室', '廊下', 'トイレ', '洗面所', 'その他'] as const;
const ROOM_WORKS = ['壁紙・クロス', 'クッションフロア', '両方'] as const;
const ROOM_SIZES = ['6畳', '8畳', '12畳', '不明'] as const;
const ROOM_CONDS = ['汚れ', 'めくれ', '傷', 'カビ', 'ペット臭', '不明'] as const;

const TOTAL_STEPS = 6; // 動画/部屋/施工/エリア/詳細/メール

// ── PageShell ─────────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center sm:justify-center sm:py-10 sm:px-4">
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

function StepProgress({ step }: { step: number }) {
  const pct = Math.round((Math.min(step, TOTAL_STEPS) / TOTAL_STEPS) * 100);
  return (
    <div className="px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-extrabold text-violet-600 tracking-[0.15em] uppercase">
          Step {Math.min(step, TOTAL_STEPS)}
        </span>
        <span className="text-xs font-semibold text-slate-400">
          {Math.min(step, TOTAL_STEPS)} <span className="text-slate-300">/</span> {TOTAL_STEPS}
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
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  loading?: boolean;
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
              送信中...
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
}: {
  room: Room;
  index: number;
  canDelete: boolean;
  onUpdate: (patch: Partial<Room>) => void;
  onDelete: () => void;
}) {
  function toggleCond(c: string) {
    const has = room.condition.includes(c);
    onUpdate({ condition: has ? room.condition.filter(x => x !== c) : [...room.condition, c] });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold text-slate-700">部屋 {index + 1}</p>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors"
          >
            削除
          </button>
        )}
      </div>

      {/* 部屋名 */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 mb-1.5">部屋名</p>
        <div className="flex flex-wrap gap-1.5">
          {ROOM_NAMES.map(n => (
            <button
              key={n} type="button"
              onClick={() => onUpdate({ name: n })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                room.name === n
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* 工事内容 */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 mb-1.5">工事内容</p>
        <div className="flex flex-wrap gap-1.5">
          {ROOM_WORKS.map(w => (
            <button
              key={w} type="button"
              onClick={() => onUpdate({ workType: w })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                room.workType === w
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* 広さ */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 mb-1.5">だいたいの広さ</p>
        <div className="flex flex-wrap gap-1.5">
          {ROOM_SIZES.map(s => (
            <button
              key={s} type="button"
              onClick={() => onUpdate({ size: s })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                room.size === s
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 状態 */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 mb-1.5">状態（複数選択可）</p>
        <div className="flex flex-wrap gap-1.5">
          {ROOM_CONDS.map(c => (
            <button
              key={c} type="button"
              onClick={() => toggleCond(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                room.condition.includes(c)
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CorporateRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // フォームデータ（基本）
  const [videoFile,    setVideoFile]    = useState<File | null>(null);
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

  // 複数部屋
  const [rooms, setRooms] = useState<Room[]>([
    { name: 'LDK', workType: '', size: '', condition: [] },
  ]);

  function addRoom() {
    setRooms(prev => [...prev, { name: '洋室', workType: '', size: '', condition: [] }]);
  }
  function removeRoom(idx: number) {
    setRooms(prev => prev.filter((_, i) => i !== idx));
  }
  function updateRoom(idx: number, patch: Partial<Room>) {
    setRooms(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  // 送信状態
  const [submitState,    setSubmitState]    = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [devErrorDetail, setDevErrorDetail] = useState<string | null>(null);
  const [newRequestId,   setNewRequestId]   = useState<string | null>(null);

  const hasDetail = !!(timing || desireType || memo);
  const hasRoomInfo = rooms.some(r => r.workType || r.size);

  // ── Supabase 送信処理 ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitState('sending');
    setDevErrorDetail(null);
    try {
      // 1. 動画を Storage にアップロード
      let video_url: string | null = null;
      if (videoFile) {
        const ext = videoFile.name.split('.').pop() ?? 'mp4';
        const path = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('estimate-videos')
          .upload(path, videoFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('estimate-videos')
            .getPublicUrl(path);
          video_url = publicUrl;
        }
      }

      // 2. estimate_requests に保存（SECURITY DEFINER RPC 経由でRLSをバイパス）
      const metaPayload = { rooms: hasRoomInfo ? rooms : null, extra_info: null };
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
      }

      // 4. 管理者へメール通知（失敗しても送信完了扱い）
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

      // 5. 依頼者へ受付完了メール（失敗しても送信完了扱い・UI には影響させない）
      // TODO: request_logs テーブルを導入したら、ここで send_status / invoke error /
      //   Resend response を永続化する。現状は console.error のみで失敗は
      //   Supabase Edge Functions Logs か Resend Dashboard を見ないと検知できない。
      if (contactMethod === 'メール' && contactValue.includes('@')) {
        try {
          // supabase-js v2 の invoke は Edge Function が 4xx/5xx を返しても throw せず、
          // 戻り値の error プロパティに FunctionsHttpError を載せて返す。明示的に拾わないと
          // サイレント失敗になる（旧挙動）。throw されるのは network 障害 / relay 失敗のみ。
          const { error: invokeErr } = await supabase.functions.invoke('send-customer-email', {
            body: {
              to:        contactValue,
              area,
              work_type: workType,
              room_type: roomType   || undefined,
              room_size: roomSize   || undefined,
              timing:    timing     || undefined,
            },
          });
          if (invokeErr) {
            console.error('[send-customer-email] invoke 失敗（依頼は受付済み）:', invokeErr);
          }
        } catch (customerMailErr) {
          console.error('[send-customer-email] 例外（依頼は受付済み）:', customerMailErr);
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-100 px-6 py-5 text-left max-w-xs w-full space-y-3 shadow-sm mb-6">
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

        {/* 追加情報CTA */}
        <div className="max-w-xs w-full space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-left">
            <p className="text-xs font-bold text-blue-800 mb-0.5">さらに正確な見積もりにできます</p>
            <p className="text-[11px] text-blue-600 leading-relaxed">部屋ごとの情報（広さ・状態・家具量など）を追加すると、職人がより正確な概算を出せます。</p>
          </div>
          <button
            onClick={() => navigate(`/request/${extraId}/extra-info`)}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm transition-all shadow-sm"
          >
            部屋ごとの情報を追加する →
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
        <StepContent title="お部屋の動画を撮影してください" sub="10〜30秒でOK。壁・床・気になる箇所をゆっくり撮るだけ">

          {/* ── 撮影前チェックリスト ── */}
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-xs font-bold text-amber-800 mb-1">撮影前に軽くご確認ください</p>
            <p className="text-[11px] text-amber-700 mb-3 leading-relaxed">
              動画は職人が内容確認に使います。個人情報が映らないよう、撮影前に少し片付けていただけると安心です。
            </p>
            <ul className="space-y-2">
              {[
                '郵便物・書類が映っていない',
                '表札・住所が映っていない',
                '顔や家族の姿が映っていない',
                '車のナンバーが映っていない',
                '貴重品など個人情報がわかる物を片付けた',
              ].map(item => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded border border-amber-300 bg-white flex-shrink-0 flex items-center justify-center">
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5 3.5-4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="text-xs text-amber-900">{item}</span>
                </li>
              ))}
            </ul>
          </div>

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
                  <p className="text-sm font-bold text-slate-700">動画を選択する</p>
                  <p className="text-xs text-slate-400 mt-1">壁・床・気になる箇所をゆっくり撮影してください</p>
                </div>
                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">MP4 / MOV / その他動画形式</span>
              </>
            )}
            <input type="file" accept="video/*" className="hidden" onChange={e => setVideoFile(e.target.files?.[0] ?? null)} />
          </label>

          {!videoFile && (
            <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-4">
              <p className="text-xs font-bold text-slate-500 mb-3">📌 撮影のポイント（3ステップ）</p>
              <ul className="space-y-2.5">
                {[
                  { step: '①', title: '部屋をゆっくり一周',      desc: '壁・天井・全体が映るように撮影' },
                  { step: '②', title: '壁・床を映す',             desc: '施工したい面をゆっくり映してください' },
                  { step: '③', title: '気になる箇所を近くで撮る', desc: '傷・剥がれなど問題箇所はアップで' },
                ].map(({ step: s, title, desc }) => (
                  <li key={s} className="flex items-start gap-3">
                    <span className="text-violet-500 font-extrabold text-xs mt-0.5 w-4 flex-shrink-0">{s}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-blue-600 mt-3 leading-relaxed">
                💡 複数部屋の場合は、部屋ごとにゆっくり撮影してください。1本の動画にまとめてもOKです。
              </p>
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
          </div>
        </StepContent>
        <BottomNav
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
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
        <StepProgress step={4} />
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
              {['東京都', '神奈川県', '埼玉県', '千葉県'].map(example => (
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
        <BottomNav onBack={() => setStep(3)} onNext={() => setStep(5)} nextDisabled={area.trim() === ''} nextLabel="次へ →" />
      </PageShell>
    );
  }

  // ── STEP 5：詳細情報（すべて任意） ─────────────────────────────────────────
  if (step === 5) {
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={5} />
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
        <StepProgress step={6} />
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
      <StepContent title="内容をご確認ください" sub="送信後に担当職人よりご連絡します" scrollable>

        {/* 基本情報 */}
        <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden mb-4">
          {[
            { label: '動画',     value: videoFile?.name ?? 'なし（スキップ）' },
            { label: '施工内容', value: workType },
            { label: 'エリア',   value: area },
            { label: '連絡先',   value: 'メール' },
            { label: '連絡先',   value: contactValue },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-4 px-5 py-3.5 bg-white hover:bg-slate-50 transition-colors">
              <p className="text-xs font-bold text-slate-400 w-20 flex-shrink-0 pt-0.5">{label}</p>
              <p className="text-sm text-slate-800 break-all font-medium">{value || '—'}</p>
            </div>
          ))}
        </div>

        {/* 部屋情報 */}
        {hasRoomInfo && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 divide-y divide-blue-100 overflow-hidden mb-4">
            <div className="px-5 py-2.5 bg-blue-50">
              <p className="text-xs font-bold text-blue-600">工事する部屋 ({rooms.length}部屋)</p>
            </div>
            {rooms.map((r, i) => (
              <div key={i} className="px-5 py-3 bg-white/60">
                <p className="text-xs font-bold text-slate-700">部屋{i + 1}：{r.name || '未選択'}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[r.workType, r.size, r.condition.join('・')].filter(Boolean).join(' / ') || '詳細未入力'}
                </p>
              </div>
            ))}
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
            {['対応可能な職人が内容を確認します', '登録のメールアドレスにご連絡します', '概算金額をご案内します（無料）'].map((item, i) => (
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
      />
    </PageShell>
  );
}
