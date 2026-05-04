import { Shield, Lock, CreditCard, ChevronRight } from 'lucide-react';

interface Props {
  onConfirm:  () => void;
  submitting?: boolean; // TODO: 本番実装時にボタン制御に使用
}

export default function EstimatePayment({ onConfirm, submitting = false }: Props) {
  return (
    <div className="space-y-5">

      {/* ── Title ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">予約を確定する</h2>
        <p className="text-sm text-gray-400 mt-1">職人のスケジュールを確保します</p>
      </div>

      {/* ── Amount card ───────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl overflow-hidden shadow-xl">

        {/* Amount */}
        <div className="px-6 py-8 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">予約金</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-2xl font-bold text-slate-300">¥</span>
            <span className="text-6xl font-extrabold text-white tracking-tight">3,000</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">税込</p>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-slate-700" />

        {/* Description */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            これは職人のスケジュールを確保するための予約金です。<br />
            残りの料金は<span className="font-bold text-white">当日、職人へ直接</span>お支払いください。
          </p>
          <div className="flex items-start gap-2.5 pt-1">
            <div className="w-1 h-1 rounded-full bg-slate-500 mt-1.5 flex-shrink-0" />
            <p className="text-xs text-slate-400">マッチング不成立の場合、全額返金いたします</p>
          </div>
        </div>
      </div>

      {/* ── Security trust ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">安心のセキュリティ</p>
        <div className="space-y-3">
          {[
            { icon: CreditCard, text: 'カード情報はこのサービスに保存されません' },
            { icon: Lock,       text: 'SSL暗号化による安全な決済サービスを使用' },
            { icon: Shield,     text: '不正利用検知・24時間モニタリング対応'    },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Icon size={13} className="text-green-600" />
              </div>
              <p className="text-xs text-gray-600 font-medium">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Powered by ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <Lock size={11} />
        <span>Powered by <span className="font-bold text-gray-500">Stripe</span></span>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <div className="pt-1 space-y-2.5">
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Lock size={15} />
          {submitting ? '送信中...' : '安全に予約を確定する（3,000円）'}
          {!submitting && <ChevronRight size={16} />}
        </button>

        <p className="text-center text-xs text-gray-400">
          タップすると<span className="underline">利用規約</span>・<span className="underline">プライバシーポリシー</span>に同意したことになります
        </p>
      </div>

    </div>
  );
}
