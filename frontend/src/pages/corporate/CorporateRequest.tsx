import { useState } from 'react';
import { Video } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── 定数 ─────────────────────────────────────────────────────────────────────

const WORK_OPTIONS = [
  { value: 'クロス張り替え', icon: '🧱', desc: '壁紙を新しく張り替え' },
  { value: 'クロス補修',     icon: '🔧', desc: '傷・破れなど部分補修' },
  { value: '床工事',         icon: '🪵', desc: 'フローリング・CF張替' },
  { value: 'その他相談',     icon: '💬', desc: 'まずは相談したい' },
] as const;

const CONTACT_OPTIONS = [
  { value: 'LINE',  icon: '💬', desc: 'LINEのIDをお知らせください', placeholder: 'LINE ID を入力' },
  { value: 'メール', icon: '📧', desc: 'メールアドレスを入力',       placeholder: 'example@mail.com' },
  { value: '電話',   icon: '📞', desc: '折り返しご連絡します',       placeholder: '090-0000-0000' },
] as const;

// ── 詳細情報の選択肢 ──────────────────────────────────────────────────────────

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

const TOTAL_STEPS = 6; // 動画・施工・エリア・詳細情報・連絡方法・連絡先

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
        <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
          <Video size={14} className="text-white" />
        </div>
        <span className="text-sm font-bold text-slate-700 tracking-wide">Aoi Interior</span>
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

// ── ChipGroup：選択チップ（詳細ステップ用） ──────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CorporateRequest() {
  // ── ステップ管理 ───────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── フォームデータ（基本） ─────────────────────────────────────────────────
  const [videoFile,     setVideoFile]     = useState<File | null>(null);
  const [workType,      setWorkType]      = useState('');
  const [area,          setArea]          = useState('');
  const [contactMethod, setContactMethod] = useState('');
  const [contactValue,  setContactValue]  = useState('');

  // ── フォームデータ（詳細情報・すべて任意） ────────────────────────────────
  const [roomType,      setRoomType]      = useState('');
  const [roomSize,      setRoomSize]      = useState('');
  const [timing,        setTiming]        = useState('');
  const [siteCondition, setSiteCondition] = useState('');
  const [desireType,    setDesireType]    = useState('');
  const [memo,          setMemo]          = useState('');

  // ── 送信状態 ───────────────────────────────────────────────────────────────
  const [submitState,    setSubmitState]    = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [devErrorDetail, setDevErrorDetail] = useState<string | null>(null); // 開発確認用（本番非表示）

  // ── 詳細情報の入力有無（確認画面で使う） ──────────────────────────────────
  const hasDetail = !!(roomType || roomSize || timing || siteCondition || desireType || memo);

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

      // 2. estimate_requests に保存
      const { error } = await supabase.from('estimate_requests').insert({
        video_url,
        area,
        work_type:      workType,
        rooms:          null,
        size_note:      roomSize   || '',
        timing:         timing     || '',
        contact_method: contactMethod,
        contact_value:  contactValue,
        status:         'new',
        // 詳細情報（新規カラム）
        room_type:      roomType      || null,
        site_condition: siteCondition || null,
        desire_type:    desireType    || null,
        memo:           memo          || null,
      });
      if (error) {
        // 技術的な詳細はコンソールのみ・UIには出さない
        console.error('[handleSubmit] Supabase insert error:', error.message, error);
        setDevErrorDetail(`[SupabaseError] ${error.message}\n${JSON.stringify(error, null, 2)}`);
        setSubmitState('error');
        return;
      }

      // 3. 管理者へメール通知（失敗しても送信完了扱い）
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

      setSubmitState('success');
    } catch (err) {
      // 予期しないエラーもコンソールのみ
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
        <p className="text-sm text-slate-600 leading-relaxed max-w-xs mb-8">
          内容を確認し、対応可能な職人から<br />
          <strong>2営業日以内</strong>にご連絡いたします。
        </p>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-100 px-6 py-5 text-left max-w-xs w-full space-y-3 shadow-sm">
          {[
            '費用が確定するまで料金は発生しません',
            '断っても一切費用はかかりません',
            'しつこい営業電話はいたしません',
          ].map(msg => (
            <div key={msg} className="flex items-start gap-2.5">
              <span className="text-emerald-500 font-extrabold text-xs mt-0.5 flex-shrink-0">✓</span>
              <span className="text-xs text-slate-600 font-medium">{msg}</span>
            </div>
          ))}
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
          onClick={() => { setSubmitState('idle'); setStep(7); }}
          className="px-8 py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm shadow-sm hover:bg-violet-700 active:scale-95 transition-all mb-4"
        >
          もう一度試す
        </button>
        {/* 開発環境のみエラー詳細を表示 */}
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
              <p className="text-xs font-bold text-slate-500 mb-2">📌 撮影のポイント</p>
              <ul className="space-y-1.5">
                {['部屋の四隅から全体を撮る', '傷や剥がれなどの気になる箇所はアップで', '明るい時間帯に撮影すると伝わりやすい'].map(tip => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="text-violet-400 text-xs mt-0.5">•</span>
                    <span className="text-xs text-slate-500">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </StepContent>
        <BottomNav showBack={false} onNext={() => setStep(2)} nextLabel={videoFile ? '動画を添付して次へ →' : 'スキップして次へ →'} />
      </PageShell>
    );
  }

  // ── STEP 2：施工内容 ────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={2} />
        <StepContent title="ご希望の施工内容を選んでください" sub="当てはまるものをひとつ選択してください">
          <div className="grid grid-cols-2 gap-3">
            {WORK_OPTIONS.map(({ value, icon, desc }) => (
              <button
                key={value}
                onClick={() => { setWorkType(value); setStep(3); }}
                className={`flex flex-col items-start gap-2.5 rounded-2xl border-2 px-4 py-5 text-left transition-all active:scale-95 ${
                  workType === value
                    ? 'border-violet-500 bg-violet-50 shadow-sm shadow-violet-100'
                    : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30'
                }`}
              >
                <span className="text-3xl">{icon}</span>
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
        <BottomNav onBack={() => setStep(1)} onNext={() => workType && setStep(3)} nextDisabled={!workType} nextLabel="次へ →" />
      </PageShell>
    );
  }

  // ── STEP 3：施工エリア ──────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={3} />
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
        <BottomNav onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={area.trim() === ''} nextLabel="次へ →" />
      </PageShell>
    );
  }

  // ── STEP 4：詳細情報（すべて任意） ─────────────────────────────────────────
  if (step === 4) {
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={4} />
        <StepContent
          title="現場の詳細を教えてください"
          sub="すべて任意です。わからない場合はスキップできます"
          scrollable
        >
          <div className="space-y-6 pb-2">

            {/* 部屋の種類 */}
            <ChipGroup
              label="部屋の種類"
              options={ROOM_TYPE_OPTIONS}
              value={roomType}
              onChange={setRoomType}
            />

            {/* だいたいの広さ */}
            <ChipGroup
              label="だいたいの広さ"
              options={ROOM_SIZE_OPTIONS}
              value={roomSize}
              onChange={setRoomSize}
            />

            {/* 希望時期 */}
            <ChipGroup
              label="希望時期"
              options={TIMING_OPTIONS}
              value={timing}
              onChange={setTiming}
            />

            {/* 現場状況 */}
            <ChipGroup
              label="現場状況"
              options={SITE_COND_OPTIONS}
              value={siteCondition}
              onChange={setSiteCondition}
            />

            {/* 希望タイプ */}
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

            {/* 補足メモ */}
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
        {/* 任意なので nextDisabled=false。何も選ばずに「スキップ」として機能する */}
        <BottomNav
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}
          nextLabel={hasDetail ? '次へ →' : 'スキップ →'}
        />
      </PageShell>
    );
  }

  // ── STEP 5：連絡方法 ────────────────────────────────────────────────────────
  if (step === 5) {
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={5} />
        <StepContent title="ご連絡方法を選んでください" sub="職人からのご案内に使用します。迷惑な連絡はしません">
          <div className="space-y-3">
            {CONTACT_OPTIONS.map(({ value, icon, desc }) => (
              <button
                key={value}
                onClick={() => { setContactMethod(value); setStep(6); }}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all active:scale-95 ${
                  contactMethod === value
                    ? 'border-violet-500 bg-violet-50 shadow-sm shadow-violet-100'
                    : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30'
                }`}
              >
                <span className="text-2xl w-8 flex-shrink-0">{icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-slate-800">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                {contactMethod === value && (
                  <span className="text-xs font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full flex-shrink-0">選択中</span>
                )}
              </button>
            ))}
          </div>
        </StepContent>
        <BottomNav onBack={() => setStep(4)} onNext={() => contactMethod && setStep(6)} nextDisabled={!contactMethod} nextLabel="次へ →" />
      </PageShell>
    );
  }

  // ── STEP 6：連絡先入力 ──────────────────────────────────────────────────────
  if (step === 6) {
    const contactOpt = CONTACT_OPTIONS.find(o => o.value === contactMethod);
    return (
      <PageShell>
        <PageHeader />
        <StepProgress step={6} />
        <StepContent title={`${contactMethod}を入力してください`} sub="職人のみが確認します。第三者への提供は一切行いません">
          <div className="space-y-3">
            <input
              type={contactMethod === 'メール' ? 'email' : contactMethod === '電話' ? 'tel' : 'text'}
              autoFocus
              value={contactValue}
              onChange={e => setContactValue(e.target.value)}
              placeholder={contactOpt?.placeholder ?? '入力してください'}
              className="w-full border-2 border-slate-200 rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-violet-400 transition-colors placeholder:text-slate-300"
            />
            <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-4 py-3">
              <span className="text-slate-400 text-xs mt-0.5 flex-shrink-0">🔒</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                入力した連絡先は見積もり対応にのみ使用します。マーケティング目的での使用や第三者への提供は行いません。
              </p>
            </div>
          </div>
        </StepContent>
        <BottomNav onBack={() => setStep(5)} onNext={() => setStep(7)} nextDisabled={contactValue.trim() === ''} nextLabel="確認画面へ →" />
      </PageShell>
    );
  }

  // ── STEP 7：送信確認 ────────────────────────────────────────────────────────
  return (
    <PageShell>
      <PageHeader />
      <StepProgress step={6} />
      <StepContent title="内容をご確認ください" sub="送信後に担当職人よりご連絡します" scrollable>

        {/* 基本情報 */}
        <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden mb-4">
          {[
            { label: '動画',     value: videoFile?.name ?? 'なし（スキップ）' },
            { label: '施工内容', value: workType },
            { label: 'エリア',   value: area },
            { label: '連絡方法', value: contactMethod },
            { label: '連絡先',   value: contactValue },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-4 px-5 py-3.5 bg-white hover:bg-slate-50 transition-colors">
              <p className="text-xs font-bold text-slate-400 w-20 flex-shrink-0 pt-0.5">{label}</p>
              <p className="text-sm text-slate-800 break-all font-medium">{value || '—'}</p>
            </div>
          ))}
        </div>

        {/* 詳細情報（入力があれば表示） */}
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
            {['担当職人が内容を確認します（2営業日以内）', '入力した連絡先にご連絡します', '概算金額をご案内します（無料）'].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-xs font-extrabold text-violet-400 flex-shrink-0 w-4">{i + 1}.</span>
                <span className="text-xs text-violet-700">{item}</span>
              </li>
            ))}
          </ol>
        </div>

      </StepContent>

      <BottomNav
        onBack={() => setStep(6)}
        onNext={handleSubmit}
        nextLabel="この内容で送信する ✓"
        loading={submitState === 'sending'}
      />
    </PageShell>
  );
}
