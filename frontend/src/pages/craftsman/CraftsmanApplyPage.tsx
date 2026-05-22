import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateServiceFee, formatFee } from '../../lib/serviceFee';
import type { Job } from './CraftsmanJobsPage';
import { getExtraInfo, getRoomMedia, getRoomAdditionalInfo, getRoomWorkSummary, getWallpaperAccentPreferences } from '../../lib/requestMeta';
import SiteRadar from '../../components/SiteRadar';

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

  const stateData = location.state as { job?: Job; readOnly?: boolean } | null;
  const jobFromState = stateData?.job ?? null;
  const readOnly     = stateData?.readOnly ?? false;
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

    // 未ログインの場合はログインページへ誘導
    if (!craftsmanId) {
      setSubmitting(false);
      navigate('/login', { state: { defaultRole: 'craftsman', from: location.pathname } });
      return;
    }

    // ── 二重応募チェック ─────────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('job_applications')
      .select('id')
      .eq('estimate_request_id', String(id))
      .eq('craftsman_id', craftsmanId)
      .maybeSingle();

    if (existing) {
      setSubmitting(false);
      setError('この案件にはすでに応募済みです。応募一覧から確認してください。');
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

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

    // fire-and-forget: 依頼者・管理者へ応募通知メール
    // demo-* は呼ばない（isDemo チェック済み）
    fetch('/api/notify-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id:   id,
        craftsman_id: craftsmanId,
        work_type:    job?.work_type ?? '',
        area:         (job as any)?.area ?? job?.city ?? '',
        message:      message.trim() || null,
        created_at:   new Date().toISOString(),
      }),
    }).catch(() => { /* fire-and-forget — 応募保存には影響しない */ });

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
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">案件詳細</p>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">
            {readOnly ? '動画・写真・案件内容' : '詳細確認・概算を送る'}
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-10">

        {/* 応募済み案件の参照モード */}
        {readOnly && (
          <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">📋</span>
            <div>
              <p className="text-sm font-extrabold text-blue-800">応募済みの案件です</p>
              <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                動画・写真・案件内容を確認できます。この画面は工事完了までいつでも確認できます。
              </p>
            </div>
          </div>
        )}

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
          {/* 部屋情報 — 職人が最初に判断する施工スコープ */}
          {(() => {
            const rooms = job?.meta?.rooms ?? [];
            const wallPref = job?.meta?.wallpaper_preference;
            const accentPrefs = getWallpaperAccentPreferences(job?.meta);
            const hasCeiling = rooms.some(r =>
              r.wallWorkScope === 'ceiling' || r.wallWorkScope === 'wall_ceiling' ||
              r.workType === '天井クロス' || r.workType === '壁＋天井'
            );
            if (rooms.length === 0 && !wallPref) return null;
            return (
              <div className="mx-5 mb-3">
                {/* ヘッダーチップ行 */}
                {(wallPref || hasCeiling || accentPrefs.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {wallPref && (
                      <span className="bg-teal-50 text-teal-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-teal-100">
                        🎨 雰囲気：{wallPref}
                      </span>
                    )}
                    {hasCeiling && (
                      <span className="bg-amber-50 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-amber-100">
                        天井あり
                      </span>
                    )}
                    {accentPrefs.filter(p => p !== 'まだ分からない').map(p => (
                      <span key={p} className="bg-purple-50 text-purple-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-purple-100">
                        ✨ {p}
                      </span>
                    ))}
                  </div>
                )}
                {rooms.length > 0 && (
                  <>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                      部屋情報（{rooms.length}部屋）
                    </p>
                    <div className="space-y-2">
                      {rooms.map((room, i) => {
                        const conds = room.condition ?? [];
                        const workParts = getRoomWorkSummary(room);
                        return (
                          <div key={i} className="rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-sm font-bold text-slate-800">
                              {room.customName || room.name || `部屋${i + 1}`}
                            </p>
                            {workParts.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {workParts.map(w => (
                                  <span key={w} className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                                    {w}
                                  </span>
                                ))}
                              </div>
                            )}
                            {((room.customSize || room.size) || conds.length > 0) && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {[room.customSize || room.size, ...conds].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            {room.materialPref && room.materialPref !== 'まだ決まっていない' && (
                              <span className="inline-block mt-1.5 bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-100">
                                材料希望：{room.materialPref === '柄物・アクセントクロス希望' ? 'アクセント希望あり' : room.materialPref}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {rooms.some(r => r.materialPref && r.materialPref !== 'まだ決まっていない') && (
                      <p className="text-[10px] text-amber-600 mt-1.5 leading-relaxed">材料によって金額が変わる場合があります</p>
                    )}
                  </>
                )}
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
          {/* 部屋別動画・写真（roomMedia） */}
          {(() => {
            const roomMedia = getRoomMedia(job?.meta);
            if (roomMedia.length === 0) return null;
            return (
              <div className="mx-5 mb-5 rounded-2xl border border-violet-100 bg-violet-50/40 overflow-hidden">
                <div className="px-4 py-2 bg-violet-50 border-b border-violet-100">
                  <p className="text-[11px] font-bold text-violet-600">🎬 部屋別 動画・写真</p>
                </div>
                <div className="px-4 py-3 space-y-4">
                  {roomMedia.map(rm => (
                    <div key={rm.roomId}>
                      <p className="text-xs font-bold text-slate-700 mb-1.5">{rm.roomName}</p>
                      {rm.videos.length > 0 && (
                        <div className="space-y-2 mb-2">
                          {rm.videos.map((url, vi) => (
                            <video key={vi} src={url} controls playsInline preload="none"
                              className="w-full rounded-xl bg-slate-900" style={{ maxHeight: '180px' }}>
                              動画を再生できません
                            </video>
                          ))}
                        </div>
                      )}
                      {rm.images.length > 0 && (
                        <div className="grid grid-cols-3 gap-1.5">
                          {rm.images.map((url, ii) => (
                            <a key={ii} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={`${rm.roomName} 写真${ii + 1}`}
                                className="w-full aspect-square object-cover rounded-xl border border-slate-100" loading="lazy" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {/* 部屋別追加情報（roomAdditionalInfo — RequestExtraInfoPage 経由） */}
          {(() => {
            const rai     = getRoomAdditionalInfo(job?.meta);
            const entries = Object.entries(rai).filter(([, e]) =>
              (e.photos?.length ?? 0) > 0 || !!e.videoUrl || !!e.productNumber || !!e.note,
            );
            if (entries.length === 0) return null;
            return (
              <div className="mx-5 mb-5 rounded-2xl border border-emerald-100 bg-emerald-50/30 overflow-hidden">
                <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100">
                  <p className="text-[11px] font-bold text-emerald-700">📋 お客様による追加情報（部屋別）</p>
                </div>
                <div className="px-4 py-3 space-y-5">
                  {entries.map(([key, entry]) => (
                    <div key={key}>
                      {/* 部屋名 */}
                      <p className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        {entry.roomName || key}
                        {entry.addedByCustomer && (
                          <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
                            🆕 お客様追加
                          </span>
                        )}
                      </p>
                      {/* 品番 */}
                      {entry.productNumber && (
                        <p className="text-xs text-slate-700 mb-1">
                          <span className="font-bold text-slate-500">品番：</span>{entry.productNumber}
                        </p>
                      )}
                      {/* メモ */}
                      {entry.note && (
                        <p className="text-xs text-slate-700 mb-1.5 leading-relaxed">
                          <span className="font-bold text-slate-500">メモ：</span>{entry.note}
                        </p>
                      )}
                      {/* 動画 */}
                      {entry.videoUrl && (
                        <video
                          src={entry.videoUrl}
                          controls
                          playsInline
                          preload="none"
                          className="w-full rounded-xl bg-slate-900 mb-2"
                          style={{ maxHeight: '200px' }}
                        >
                          動画を再生できません
                        </video>
                      )}
                      {/* 写真グリッド */}
                      {(entry.photos?.length ?? 0) > 0 && (
                        <div className="grid grid-cols-3 gap-1.5">
                          {entry.photos!.map((url, ii) => (
                            <a key={ii} href={url} target="_blank" rel="noreferrer">
                              <img
                                src={url}
                                alt={`${entry.roomName} 写真${ii + 1}`}
                                className="w-full aspect-square object-cover rounded-xl border border-slate-100"
                                loading="lazy"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 現場レーダー */}
          {job && (
            <div className="mx-5 mb-4 pb-3 border-b border-slate-100">
              <SiteRadar job={job} />
            </div>
          )}

          {job?.customer_note && (
            <div className="mx-5 mb-5 rounded-2xl bg-blue-50 px-4 py-3">
              <p className="text-xs font-bold text-blue-700 mb-1">依頼主コメント</p>
              <p className="text-sm text-slate-700 leading-relaxed">{job.customer_note}</p>
            </div>
          )}

          {/* お客様追加情報（extraInfo） */}
          {(() => {
            const ei = getExtraInfo(job?.meta);
            if (!ei) return null;
            const hasData = ei.productNumber || ei.productUrl || ei.accentPreference || ei.softSokibariPreference || ei.note || (ei.images?.length ?? 0) > 0;
            if (!hasData) return null;
            return (
              <div className="mx-5 mb-5 rounded-2xl border border-blue-100 bg-blue-50/40 overflow-hidden">
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                  <p className="text-[11px] font-bold text-blue-600">📝 お客様からの追加情報</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {ei.productNumber && <p className="text-xs text-slate-700"><span className="font-bold text-slate-500">品番：</span>{ei.productNumber}</p>}
                  {ei.productUrl && (
                    <p className="text-xs text-slate-700">
                      <span className="font-bold text-slate-500">URL：</span>
                      <a href={ei.productUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">{ei.productUrl}</a>
                    </p>
                  )}
                  {ei.accentPreference && <p className="text-xs text-slate-700"><span className="font-bold text-slate-500">アクセント：</span>{ei.accentPreference}</p>}
                  {ei.softSokibariPreference && <p className="text-xs text-slate-700"><span className="font-bold text-slate-500">ソフト巾木：</span>{ei.softSokibariPreference}</p>}
                  {ei.note && <p className="text-xs text-slate-700 leading-relaxed"><span className="font-bold text-slate-500">メモ：</span>{ei.note}</p>}
                  {(ei.images?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 mb-1.5">参考写真</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {ei.images!.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt={`写真${i + 1}`} className="w-full aspect-square object-cover rounded-xl border border-slate-100" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </section>

        {/* 入力フォーム — readOnly時は非表示 */}
        {!readOnly && (
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200" />
            <p className="text-xs font-extrabold text-slate-500 whitespace-nowrap">📝 対応できます・概算を送る</p>
            <div className="flex-1 border-t border-slate-200" />
          </div>
        )}
        {!readOnly && <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-5">
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

            {/* 応募安心テキスト */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 space-y-1">
              <p className="text-[11px] font-bold text-emerald-700">✓ 送信について</p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">・この送信だけで成約確定にはなりません</p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">・まずは対応可能かと概算を依頼者に伝えます</p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">・正式な連絡先開示・成約は依頼者の確認後に進みます</p>
            </div>

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={submitting || !price}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 text-base font-extrabold shadow-sm shadow-blue-200 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '送信中...' : '概算を送る（対応できます）'}
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
        </section>}
      </div>
    </div>
  );
}
