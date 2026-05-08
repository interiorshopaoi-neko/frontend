import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateServiceFee, formatFee } from '../../lib/serviceFee';
import { getFreshness } from '../../lib/freshness';
import ConfirmApplyModal from '../../components/ConfirmApplyModal';
import type { Job } from './CraftsmanJobsPage';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function labelUrgency(level?: string) {
  if (level === 'today')    return '今日できる人希望';
  if (level === 'tomorrow') return '明日まで希望';
  if (level === 'soon')     return '数日以内';
  return '急ぎではない';
}

function estimateRevenue(job: Job): number {
  const type   = (job.work_type ?? '').toLowerCase();
  const damage = job.damage_level;
  const size   = job.room_size ?? '';

  let base = 32000;
  if (type.includes('cf') || type.includes('クッションフロア')) base = 24000;
  else if (type.includes('補修'))                              base = 16000;
  else if (type.includes('床'))                               base = 34000;
  else if (type.includes('クロス'))                           base = 32000;

  const m = size.match(/(\d+)/);
  const tatami   = m ? parseInt(m[1]) : 6;
  const sizeMul  = tatami >= 10 ? 1.5 : tatami >= 8 ? 1.25 : tatami >= 6 ? 1.0 : 0.8;
  const dmgMul   = damage === 'high' ? 1.3 : damage === 'middle' ? 1.1 : 1.0;

  return Math.round((base * sizeMul * dmgMul) / 1000) * 1000;
}

function fmt(n: number) { return `¥${n.toLocaleString()}`; }

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
      <p className="text-[10px] text-slate-400 font-bold mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-800 leading-snug">{value}</p>
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-slate-100 last:border-0">
      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
        ok ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-300'
      }`}>
        {ok ? '✓' : '−'}
      </span>
      <span className={`text-sm font-bold ${ok ? 'text-slate-800' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}

function SuccessView({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden max-w-sm w-full text-center">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 pt-8 pb-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-white">送信しました</h2>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-4 text-left space-y-2.5">
            {[
              { icon: '🔍', text: '依頼者が内容を確認中です' },
              { icon: '📞', text: '条件が合えば、直接連絡が来ます' },
              { icon: '💡', text: 'この間に他の案件もチェックできます' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <span className="text-base leading-none mt-0.5 flex-shrink-0">{icon}</span>
                <p className="text-sm text-slate-700 leading-snug">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">個人情報は相互合意後に開示されます</p>
          <button
            onClick={onBack}
            className="w-full bg-blue-600 text-white rounded-2xl py-3.5 font-extrabold text-base shadow-sm shadow-blue-200 transition active:scale-[0.99]"
          >
            他の案件を見る
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CraftsmanApplyPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const location  = useLocation();

  const jobFromState = (location.state as { job?: Job } | null)?.job ?? null;
  const isDemo       = id?.startsWith('demo-') ?? false;

  const [job,        setJob]        = useState<Job | null>(jobFromState);
  const [loadingJob, setLoadingJob] = useState(!jobFromState && !isDemo);
  const [price,       setPrice]       = useState('');
  const [message,     setMessage]     = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!id || job || isDemo) return;
    (async () => {
      const { data } = await supabase
        .from('estimate_requests')
        .select('*')
        .eq('id', id)
        .single();
      setJob(data);
      setLoadingJob(false);
    })();
  }, [id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const numPrice = Number(price);
    if (!price || numPrice <= 0) {
      setError('概算金額を入力してください');
      return;
    }
    setShowConfirm(true);
  }

  async function handleConfirm() {
    const numPrice = Number(price);
    if (!id) return;
    if (isDemo) { setShowConfirm(false); setDone(true); return; }

    setSubmitting(true);

    const storedUser  = localStorage.getItem('user');
    const craftsmanId = storedUser ? JSON.parse(storedUser).id : null;

    const { error: dbError } = await supabase.from('job_applications').insert({
      estimate_request_id: id,
      craftsman_id: craftsmanId,
      status: 'available',
      price: numPrice,
      service_fee: calculateServiceFee(numPrice),
      message: message.trim() || null,
    });

    setSubmitting(false);

    if (dbError) {
      setShowConfirm(false);
      setError('送信に失敗しました。もう一度お試しください。');
      return;
    }

    setShowConfirm(false);
    setDone(true);
  }

  if (loadingJob) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (done) {
    return <SuccessView onBack={() => navigate('/craftsman/jobs')} />;
  }

  const estRevenue  = job ? estimateRevenue(job) : 0;
  const estFee      = calculateServiceFee(estRevenue);
  const estTake     = estRevenue - estFee;
  const freshness   = job?.created_at ? getFreshness(job.created_at) : null;
  const isStale     = freshness?.status === 'urgent';

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-700 transition p-1 -ml-1 rounded-xl"
          aria-label="戻る"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">案件の最終確認</p>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">応募内容を確認する</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-12">

        {/* デモ通知 */}
        {isDemo && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-bold text-amber-700">📋 デモモード — 実際には保存されません</p>
          </div>
        )}

        {/* 継続確認待ち警告 */}
        {isStale && (
          <div className="rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3 flex items-start gap-2.5">
            <span className="text-orange-500 text-base flex-shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="text-xs font-extrabold text-orange-700 mb-0.5">継続確認待ちの案件です</p>
              <p className="text-xs text-orange-600 leading-relaxed">
                依頼者の意向を確認中のため、返答が遅れる場合があります。応募自体は可能です。
              </p>
            </div>
          </div>
        )}

        {/* ── 1. 仕事概要カード ── */}
        <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">仕事概要</p>
            <h2 className="text-lg font-extrabold text-slate-900 leading-tight mb-4">
              {job?.work_type || '内装工事'}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <InfoBox label="エリア"    value={job?.city || '未設定'} />
              <InfoBox label="部屋数・広さ" value={job?.room_size || '未設定'} />
              <InfoBox label="希望時期"  value={job?.preferred_date || labelUrgency(job?.urgency)} />
              {job?.damage_level && (
                <InfoBox
                  label="損傷度"
                  value={job.damage_level === 'low' ? '軽め' : job.damage_level === 'middle' ? '普通' : '重め'}
                />
              )}
            </div>
          </div>
          {job?.customer_note && (
            <div className="mx-5 mb-5 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
              <p className="text-[10px] font-bold text-blue-600 mb-1">依頼主コメント</p>
              <p className="text-sm text-slate-700 leading-relaxed">{job.customer_note}</p>
            </div>
          )}
        </section>

        {/* ── 2. 金額カード ── */}
        {estRevenue > 0 && <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 text-white px-5 py-4 shadow-sm shadow-blue-200">
          <p className="text-[11px] text-blue-200 font-bold uppercase tracking-wide mb-3">概算収益（参考）</p>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-200">想定売上</p>
            <p className="text-xl font-extrabold tracking-tight">{fmt(estRevenue)}</p>
          </div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-blue-300">サービス料</p>
            <p className="text-sm text-blue-200">− {fmt(estFee)}</p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-white/20">
            <p className="text-sm text-blue-200 font-bold">手取り目安</p>
            <p className="text-2xl font-extrabold text-emerald-300 tracking-tight">{fmt(estTake)}</p>
          </div>
          <p className="mt-2 text-[10px] text-blue-300/70">※ 最終金額は入力した概算金額で確定します</p>
        </section>}

        {/* ── 3. 情報充足度 ── */}
        <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 px-5 py-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">情報充足度</p>
          <CheckRow ok={!!job?.has_video}      label="動画あり" />
          <CheckRow ok={!!job?.has_photos}     label="写真あり" />
          <CheckRow ok={!!job?.has_floor_plan} label="図面あり" />
          <CheckRow ok={!!job?.customer_note}  label="追加情報あり" />
        </section>

        {/* ── 4. 応募前の安心メッセージ ── */}
        <section className="bg-emerald-50 border border-emerald-200 rounded-3xl px-5 py-4">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-3">応募前にご確認ください</p>
          {[
            '応募だけでは料金は発生しません',
            '成約時に手数料が確定します',
            '工事代金はお客様と直接やり取りします',
          ].map(text => (
            <div key={text} className="flex items-center gap-2.5 py-2 border-b border-emerald-100 last:border-0">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-extrabold">✓</span>
              <p className="text-sm font-bold text-emerald-800">{text}</p>
            </div>
          ))}
        </section>

        {/* ── 5. 入力フォーム ── */}
        <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-4">概算金額を入力して応募</p>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* 概算金額 */}
            <div>
              <label className="block text-sm font-extrabold text-slate-900 mb-1.5">
                概算金額
                <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="例: 35000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pr-10 text-xl font-extrabold text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">円</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">税込・概算でOKです</p>
            </div>

            {/* 収益プレビュー（金額入力後） */}
            {Number(price) > 0 && (() => {
              const sp  = Math.max(0, Number(price));
              const fee = calculateServiceFee(sp);
              return (
                <div className="rounded-2xl bg-slate-900 text-white px-4 py-3.5 space-y-1.5">
                  <p className="text-[11px] text-slate-400 font-bold mb-2">この金額での収益</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-300">入力金額</p>
                    <p className="text-base font-extrabold">{fmt(sp)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">サービス料</p>
                    <p className="text-sm text-slate-300">− {formatFee(fee)}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                    <p className="text-xs text-slate-300 font-bold">手取り</p>
                    <p className="text-lg font-extrabold text-emerald-400">{fmt(sp - fee)}</p>
                  </div>
                </div>
              );
            })()}

            {/* メッセージ */}
            <div>
              <label className="block text-sm font-extrabold text-slate-900 mb-1.5">
                メッセージ
                <span className="ml-1.5 text-xs font-normal text-slate-400">任意</span>
              </label>
              <textarea
                rows={3}
                placeholder="施工方法・条件・気になる点など一言あれば..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none transition"
              />
            </div>

            {/* エラー */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* CTA */}
            <button
              type="submit"
              disabled={submitting || !price}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 text-base font-extrabold shadow-sm shadow-blue-200 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '送信中...' : 'この案件に対応できます'}
            </button>

          </form>
        </section>

        {/* ── フッター注記 ── */}
        <div className="space-y-2 px-1">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5">
            <p className="text-[11px] font-bold text-slate-500">サービス利用料について</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">・サービス利用料は、成約時点の概算金額を基準に確定します</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">・成約後に工事金額が増減しても、原則として再計算は行いません</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">・工事代金は依頼者と直接やり取りします。PRO MATCHは工事代金をお預かりしません</p>
          </div>
          <p className="text-center text-[11px] text-slate-500 px-2">🔒 成約前は住所・電話番号などの個人情報は表示されません</p>
          <p className="text-center text-[11px] text-slate-400 leading-relaxed px-2">
            ⚠️ 成約後の外部誘導・虚偽申告が確認された場合、アカウント制限の対象となる場合があります
          </p>
          <p className="text-center text-[11px] text-slate-300 leading-relaxed px-2">
            ※契約・施工は当事者間で行われます。当サービスはマッチングの場を提供するものであり、施工内容・品質・トラブルについては当事者間でご確認ください。
          </p>
        </div>

      </div>

      {showConfirm && Number(price) > 0 && (
        <ConfirmApplyModal
          workType={job?.work_type ?? ''}
          city={job?.city ?? ''}
          revenue={Number(price)}
          fee={calculateServiceFee(Number(price))}
          takeHome={Number(price) - calculateServiceFee(Number(price))}
          submitting={submitting}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
