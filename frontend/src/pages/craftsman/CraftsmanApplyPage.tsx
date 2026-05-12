import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateServiceFee, formatFee } from '../../lib/serviceFee';
import type { Job } from './CraftsmanJobsPage';

function labelUrgency(level?: string) {
  if (level === 'today') return '今日できる人希望';
  if (level === 'tomorrow') return '明日まで希望';
  if (level === 'soon') return '数日以内';
  return '急ぎではない';
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900 text-sm">{value}</p>
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

export default function CraftsmanApplyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const jobFromState = (location.state as { job?: Job } | null)?.job ?? null;
  const isDemo = id?.startsWith('demo-') ?? false;

  const [job, setJob] = useState<Job | null>(jobFromState);
  const [loadingJob, setLoadingJob] = useState(!jobFromState && !isDemo);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const numPrice = Number(price);
    if (!price || numPrice <= 0) {
      setError('概算金額を入力してください');
      return;
    }
    if (!id) return;

    if (isDemo) {
      setDone(true);
      return;
    }

    setSubmitting(true);

    const storedUser = localStorage.getItem('user');
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
      setError('送信に失敗しました。もう一度お試しください。');
      return;
    }

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
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">ステップ 2/2</p>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">概算金額を入力</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-10">

        {/* デモ通知 */}
        {isDemo && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-bold text-amber-700">📋 デモモード — 実際には保存されません</p>
          </div>
        )}

        {/* 案件サマリー */}
        <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">案件内容</p>
            <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
              {job?.work_type || '内装工事'}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 pb-4">
            <InfoBox label="エリア" value={(job as any)?.area || job?.city || '未設定'} />
            <InfoBox
              label="希望時期"
              value={job?.preferred_date || labelUrgency(job?.urgency)}
            />
          </div>
          {job?.customer_note && (
            <div className="mx-5 mb-5 rounded-2xl bg-blue-50 px-4 py-3">
              <p className="text-xs font-bold text-blue-700 mb-1">依頼主コメント</p>
              <p className="text-sm text-slate-700 leading-relaxed">{job.customer_note}</p>
            </div>
          )}
          {/* 部屋情報 */}
          {(() => {
            const rooms = job?.meta?.rooms ?? [];
            if (rooms.length === 0) return null;
            return (
              <div className="mx-5 mb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                  部屋情報（{rooms.length}部屋）
                </p>
                <div className="space-y-2">
                  {rooms.map((room, i) => {
                    const conds = room.condition ?? [];
                    return (
                      <div key={i} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-sm font-bold text-slate-800">
                          {room.name || `部屋${i + 1}`}
                          {room.workType && <span className="ml-2 text-xs font-normal text-slate-500">{room.workType}</span>}
                        </p>
                        {(room.size || conds.length > 0) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[room.size, ...conds].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {/* 追加情報 */}
          {(() => {
            const ei = job?.meta?.extra_info;
            if (!ei) return null;
            const items = [
              ei.furniture && `家具: ${ei.furniture}`,
              ei.parking   && `駐車: ${ei.parking}`,
              (ei.material?.length ?? 0) > 0 && `材料: ${(ei.material ?? []).join('・')}`,
              ei.timing    && `時期: ${ei.timing}`,
              ei.memo      && `メモ: ${ei.memo}`,
            ].filter(Boolean) as string[];
            if (items.length === 0) return null;
            return (
              <div className="mx-5 mb-5 rounded-2xl bg-emerald-50 px-4 py-3">
                <p className="text-xs font-bold text-emerald-700 mb-2">追加情報</p>
                <div className="space-y-1">
                  {items.map(item => (
                    <p key={item} className="text-xs text-slate-700">{item}</p>
                  ))}
                </div>
              </div>
            );
          })()}
        </section>

        {/* 入力フォーム */}
        <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-5">
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

            {/* 収益まとめ（金額入力後に表示） */}
            {Number(price) > 0 && (() => {
              const safePrice = Math.max(0, Number(price) || 0);
              const fee       = calculateServiceFee(safePrice);
              const takeHome  = safePrice - fee;
              return (
                <div className="rounded-2xl bg-slate-900 text-white px-4 py-3.5 space-y-1.5">
                  <p className="text-[11px] text-slate-400 font-bold mb-2">この案件の収益</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-300">想定売上</p>
                    <p className="text-base font-extrabold">¥{safePrice.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">サービス料</p>
                    <p className="text-sm text-slate-300">− {formatFee(fee)}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                    <p className="text-xs text-slate-300 font-bold">手取り</p>
                    <p className="text-lg font-extrabold text-emerald-400">¥{takeHome.toLocaleString()}</p>
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

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={submitting || !price}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 text-base font-extrabold shadow-sm shadow-blue-200 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '送信中...' : 'この内容で送る'}
            </button>

            {/* 手数料ルール */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500">サービス利用料について</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">・サービス利用料は、成約時点の概算金額を基準に確定します</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">・成約後に工事金額が増減しても、原則として再計算は行いません</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">・工事代金は依頼者と直接やり取りします。PRO MATCHは工事代金をお預かりしません</p>
            </div>

            {/* 連絡先開示 */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1">
              <p className="text-[11px] text-slate-500 text-center">🔒 成約前は、住所・電話番号などの個人情報は表示されません</p>
              <p className="text-[11px] text-slate-500 text-center">✓ 成約後に、詳細な連絡先を確認できます</p>
            </div>

            {/* 不正防止 */}
            <p className="text-center text-[11px] text-slate-400 leading-relaxed px-2">
              ⚠️ 成約後の外部誘導・虚偽申告が確認された場合、アカウント制限の対象となる場合があります
            </p>

            <p className="text-center text-[11px] text-slate-300 leading-relaxed px-2">
              ※契約・施工は当事者間で行われます。当サービスはマッチングの場を提供するものであり、施工内容・品質・トラブルについては当事者間でご確認ください。
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
