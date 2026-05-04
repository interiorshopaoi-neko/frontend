import { useState, useEffect, useRef } from 'react';
import EstimateInput,   { type EstimateInputData } from './EstimateInput';
import EstimateSummary, { type DetailData }        from './EstimateSummary';
import EstimateMatching from './EstimateMatching';
import EstimatePayment  from './EstimatePayment';
import EstimateComplete from './EstimateComplete';

// ── Auto-demo ─────────────────────────────────────────────────────────────────

const isAutoDemo =
  new URLSearchParams(window.location.search).get('demo') === 'auto';

const DEMO_INPUT: EstimateInputData = {
  isPro: false, wallpaperUnitPrice: '', cfUnitPrice: '', bulkNotes: '', jobTemplate: '',
  workType: 'both', roomSize: 8, customSize: '', condition: 'medium',
  hasFurniture: false, timing: 'asap', photos: [], area: '群馬県太田市',
  contactName: '山田 花子', contactPhone: '090-1234-5678',
};

const DEMO_DETAIL: DetailData = {
  grade: 'standard',
  areas: ['wall'],
  rooms: 'リビング、寝室、トイレ',
  notes: '退去後の原状回復。汚れが目立つ壁を優先したい。',
};

// 各ステップの自動進行ディレイ（ms）
const AUTO_DELAYS: Partial<Record<number, number>> = { 1: 5000, 2: 4000, 3: 3500 };

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['入力', '確認', '照合', '予約'] as const;

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex gap-2 mb-10">
      {STEPS.map((label, i) => (
        <div key={i} className="flex-1 flex flex-col gap-1.5">
          <div className={`h-0.5 rounded-full transition-all duration-500 ${
            i <= current ? 'bg-slate-700' : 'bg-slate-100'
          }`} />
          <span className={`text-[10px] font-semibold tracking-wide ${
            i === current ? 'text-slate-700' : 'text-slate-300'
          }`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Flow ──────────────────────────────────────────────────────────────────────

export default function EstimateFlow() {
  const [step, setStep]           = useState(0);
  const [data, setData]           = useState<EstimateInputData | null>(isAutoDemo ? DEMO_INPUT : null);
  const [detail, setDetail]       = useState<DetailData | null>(isAutoDemo ? DEMO_DETAIL : null);
  const topRef = useRef<HTMLDivElement>(null);

  // Scroll to top on each step change
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  // Auto-advance
  useEffect(() => {
    if (!isAutoDemo) return;
    const delay = AUTO_DELAYS[step];
    if (delay == null) return;
    const t = setTimeout(() => setStep(s => s + 1), delay);
    return () => clearTimeout(t);
  }, [step]);

  const [submitError, setSubmitError] = useState(''); // TODO: エラー表示は本番実装時に有効化
  const [submitting,  setSubmitting]  = useState(false);

  const next = () => setStep(s => s + 1);
  const prev = () => setStep(s => s - 1);

  // ── 予約確定送信（現在はモック） ──────────────────────────────────────────
  const handlePaymentConfirm = async () => {
    if (isAutoDemo) { next(); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      // TODO: 本番APIに差し替える
      // await api.post('/bookings', { ...data, paymentToken: '...' });
      console.log('[mock] submit success', data);
      next();
    } catch (e) {
      console.error('[mock] submit error', e);
      // setSubmitError('登録に失敗しました'); // TODO: 本番実装時に有効化
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={topRef} className="min-h-screen bg-slate-50">
      {isAutoDemo && (
        <div className="fixed left-0 right-0 top-0 z-50 bg-yellow-300 px-4 py-2 text-center text-sm font-bold text-yellow-950">
          自動デモ再生中：実際の依頼・見積もり・決済は送信されません
        </div>
      )}
      <div className="max-w-md mx-auto px-5 pt-8 pb-28">

        {/* Step bar — hidden on complete screen */}
        {step < 4 && <StepBar current={step} />}

        {/* ── 料金バナー（入力開始前のみ） ────────────────── */}
        {step === 0 && (
          <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <div className="grid grid-cols-3 divide-x divide-slate-200">
              {([
                { label: '見積もり無料',   cost: null      },
                { label: '職人紹介無料',   cost: null      },
                { label: '予約確定時のみ', cost: '¥3,000' },
              ] as const).map(({ label, cost }) => (
                <div key={label} className="flex flex-col items-center py-3 px-2 text-center">
                  <p className="text-[11px] font-semibold text-slate-600 leading-tight">{label}</p>
                  {cost && <p className="text-[11px] font-bold text-slate-800 mt-0.5">{cost}</p>}
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 px-4 py-2">
              <p className="text-[10px] text-slate-500 text-center">
                ¥3,000は工事代金に充当 · 予約確定前は費用なし
              </p>
            </div>
          </div>
        )}

        {step === 0 && (
          <EstimateInput
            onNext={(d) => { setData(d); next(); }}
            isAutoDemo={isAutoDemo}
          />
        )}

        {step === 1 && data && (
          <EstimateSummary
            data={data}
            onConfirm={(d) => { setDetail(d); next(); }}
            onEdit={prev}
          />
        )}

        {step === 2 && (
          <EstimateMatching onNext={next} />
        )}

        {step === 3 && (
          <EstimatePayment onConfirm={handlePaymentConfirm} submitting={submitting} />
        )}

        {step === 4 && (
          <EstimateComplete />
        )}

      </div>
    </div>
  );
}
