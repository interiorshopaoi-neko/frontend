import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateServiceFee } from '../../lib/serviceFee';
import { FEE_TABLE } from '../../constants/fees';
import type { Job } from './CraftsmanJobsPage';
import { calcRevenueRange } from '../../lib/revenueEstimate';
import { getRoomMedia, getRoomAdditionalInfo, hasCeilingWork } from '../../lib/requestMeta';
import { getRoomWorkSummaries } from '../../utils/requestSummary';
import SiteRadar from '../../components/SiteRadar';
import { getRemainingLabel, getDeadlineLevel } from '../../utils/requestDeadline';

// ─── Freshness helpers ───────────────────────────────────────────────────────

// estimate_requests.created_at は timestamp WITHOUT timezone (UTC) で保存される。
// JS の new Date() はタイムゾーン無し文字列をローカル時刻として解釈するため
// JST 環境では 9 時間ズレる。末尾に 'Z' を付与して UTC として強制解釈する。
function parseUtc(s: string): number {
  if (s.endsWith('Z') || s.includes('+')) return new Date(s).getTime();
  return new Date(s + 'Z').getTime();
}

function timeAgo(createdAt?: string): string {
  if (!createdAt) return '';
  const diff = Date.now() - parseUtc(createdAt);
  const mins  = Math.floor(diff / 60000);
  if (mins <  1)  return 'たった今';
  if (mins < 60)  return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  if (hours < 48) return '昨日投稿';
  const days  = Math.floor(hours / 24);
  return `${days}日前`;
}

type FreshnessBadge = { text: string; cls: string };

function getFreshnessBadge(job: Job): FreshnessBadge | null {
  const timingText = `${job.preferred_date ?? ''} ${job.meta?.extra_info?.timing ?? ''}`;
  const wantsToday = /今日|至急|早め|当日/.test(timingText);
  const hasVid     = job.has_video || !!job.video_url;

  if (job.created_at) {
    const hours = (Date.now() - parseUtc(job.created_at)) / 3600000;
    const days  = hours / 24;
    if (hours <= 0.5)  return { text: '🆕 NEW', cls: 'bg-rose-600 text-white animate-pulse' };
    if (hours <= 2) {
      if (hasVid) return { text: '🎬🔥 動画NEW', cls: 'bg-gradient-to-r from-rose-600 to-pink-500 text-white' };
      return { text: '🔥 新着', cls: 'bg-red-500 text-white' };
    }
    if (hours <= 24) return { text: '✨ 本日投稿', cls: 'bg-blue-500 text-white' };
    if (days  >= 4)  return { text: '⏳ まもなく終了', cls: 'bg-slate-500 text-white' };
  }
  if (wantsToday && job.urgency !== 'today' && job.urgency !== 'tomorrow') {
    return { text: '⏰ 今日対応歓迎', cls: 'bg-emerald-500 text-white' };
  }
  return null;
}

// ─── Revenue estimator ─── 共通ユーティリティに統一 ──────────────────────────
// calcRevenueRange: min/max/label をまとめて返す（売上・サービス料・手取りのレンジ表示用）

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPriority(job: Job) {
  let score = 0;
  if (job.urgency === 'today')                     score += 3;
  if (job.urgency === 'tomorrow')                  score += 2;
  if (job.has_video || !!job.video_url)            score += 2; // video_url も考慮
  if ((job.distance_km ?? 999) <= 10)              score += 2;
  if (job.has_photos)                              score += 1;
  return Math.min(5, score);
}

function fmt(n: number) {
  return `¥${n.toLocaleString()}`;
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function isUrgent(job: Job): boolean {
  if (job.urgency === 'today' || job.urgency === 'tomorrow' || job.urgency === 'soon') return true;
  return /急ぎ|なるべく早く|至急/.test(job.meta?.extra_info?.timing ?? '');
}

function isInfoRich(job: Job): boolean {
  const hasVideo     = job.has_video || !!job.video_url;
  const roomMedia    = getRoomMedia(job.meta ?? null);
  const hasRoomMedia = roomMedia.some(rm => rm.videos.length > 0 || rm.images.length > 0);
  const raiVals      = Object.values(getRoomAdditionalInfo(job.meta ?? null));
  const hasRaiMedia  = raiVals.some(e => !!e.videoUrl || (e.photos?.length ?? 0) > 0);
  return (hasVideo && !!job.has_photos) || hasRoomMedia || hasRaiMedia;
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type JobFilter = 'all' | 'new24h' | 'urgent' | 'video' | 'photo' | 'info_rich';

const JOB_FILTERS: { key: JobFilter; label: string }[] = [
  { key: 'all',       label: '全て'       },
  { key: 'new24h',    label: '🆕 新着'   },
  { key: 'urgent',    label: '🔥 急ぎ'   },
  { key: 'video',     label: '🎬 動画'   },
  { key: 'photo',     label: '📷 写真'   },
  { key: 'info_rich', label: '✓ 情報充実' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = { jobs: Job[]; loading: boolean; isLoggedIn?: boolean };

// ─── Component ───────────────────────────────────────────────────────────────

// 手取りレンジを「¥7.8〜11.7万」形式で返す
// min は切り捨て（Math.floor）、max は四捨五入（Math.round）
function fmtTakeRange(min: number, max: number): string {
  const minW = Math.floor(min / 1000) / 10;   // 切り捨て：78500→7.8
  const maxW = Math.round(max / 1000) / 10;   // 四捨五入：107500→10.8
  return `¥${minW}〜${maxW}万`;
}

export default function JobsListView({ jobs, loading, isLoggedIn = false }: Props) {
  const navigate   = useNavigate();
  const [filter, setFilter] = useState<JobFilter>('all');
  const [showFeeModal, setShowFeeModal] = useState(false);
  const closeFeeModal = useCallback(() => setShowFeeModal(false), []);

  // フィルター別の件数（チップに表示）
  const filterCounts = useMemo((): Partial<Record<JobFilter, number>> => {
    const c: Partial<Record<JobFilter, number>> = {};
    for (const job of jobs) {
      if (isUrgent(job))
        c.urgent    = (c.urgent    ?? 0) + 1;
      if (job.created_at && (Date.now() - parseUtc(job.created_at)) < 86400000)
        c.new24h    = (c.new24h    ?? 0) + 1;
      const raiVals = Object.values(getRoomAdditionalInfo(job.meta ?? null));
      if (job.has_video || !!job.video_url || raiVals.some(e => !!e.videoUrl))
        c.video     = (c.video     ?? 0) + 1;
      if (job.has_photos || raiVals.some(e => (e.photos?.length ?? 0) > 0))
        c.photo     = (c.photo     ?? 0) + 1;
      if (isInfoRich(job))
        c.info_rich = (c.info_rich ?? 0) + 1;
    }
    return c;
  }, [jobs]);

  const sortedJobs = useMemo(() => {
    return jobs
      .filter(job => {
        if (filter === 'urgent')    return isUrgent(job);
        if (filter === 'new24h')    return job.created_at ? (Date.now() - parseUtc(job.created_at)) < 86400000 : false;
        if (filter === 'video') {
          const raiVals = Object.values(getRoomAdditionalInfo(job.meta ?? null));
          return job.has_video || !!job.video_url || raiVals.some(e => !!e.videoUrl);
        }
        if (filter === 'photo') {
          const raiVals = Object.values(getRoomAdditionalInfo(job.meta ?? null));
          return job.has_photos || raiVals.some(e => (e.photos?.length ?? 0) > 0);
        }
        if (filter === 'info_rich') return isInfoRich(job);
        return true;
      })
      // 基本は新着順（created_at desc）
      .sort((a, b) => parseUtc(b.created_at ?? '') - parseUtc(a.created_at ?? ''));
  }, [jobs, filter]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-4 py-4">
      <div className="mx-auto max-w-3xl">

        {/* 収益モデル説明 + 手数料ボタン */}
        <div className="mb-3 rounded-xl bg-slate-100 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 leading-relaxed space-y-0.5">
            <p>・工事代金は依頼者と直接やり取りします</p>
            <p>・PRO MATCHは工事代金をお預かりしません</p>
            <p>・成約後に連絡先が開示されます</p>
          </div>
          <button
            onClick={() => setShowFeeModal(true)}
            className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition whitespace-nowrap shadow-sm"
          >
            手数料について
          </button>
        </div>

        {/* 手数料モーダル */}
        {showFeeModal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
            onClick={closeFeeModal}
          >
            <div
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
                <h2 className="text-base font-extrabold text-slate-800">💡 職人向け手数料について</h2>
                <button onClick={closeFeeModal} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
              </div>
              <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
                <ul className="space-y-2">
                  {[
                    '応募しただけでは料金は発生しません。',
                    'お客様と成約した場合のみ、成約時点の概算金額に応じて手数料が確定します。',
                    '工事後に金額が増減しても、原則として再計算は行いません。',
                    '工事代金は依頼者と職人が直接やり取りし、PRO MATCHは工事代金を預かりません。',
                  ].map(text => (
                    <li key={text} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                      <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
                      {text}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-extrabold text-slate-700 mb-2">手数料の目安</p>
                  <div className="rounded-xl overflow-hidden border border-slate-200">
                    {FEE_TABLE.map(({ label, feeLabel }, i) => (
                      <div
                        key={label}
                        className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                      >
                        <span className="text-sm text-slate-600">{label}</span>
                        <span className="text-sm font-extrabold text-slate-800">{feeLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  ※ 応募は無料です。手数料は成約時のみ発生します。
                </p>
                <button
                  onClick={closeFeeModal}
                  className="mt-3 w-full py-3 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 transition active:scale-95"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フィルター（横スクロール） */}
        <div className="mb-4 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
            {JOB_FILTERS.map(({ key, label }) => {
              const count = key === 'all' ? jobs.length : (filterCounts[key] ?? 0);
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border whitespace-nowrap transition active:scale-95 ${
                    filter === key
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`rounded-full text-[10px] font-extrabold px-1.5 py-0.5 leading-none ${
                      filter === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ローディング / 空 */}
        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-400 text-sm shadow-sm">
            読み込み中...
          </div>
        ) : sortedJobs.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-bold text-slate-700">該当する案件がありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedJobs.map(job => {
              const range    = calcRevenueRange(job);
              // ラベル表示（¥8〜11万）と手取り計算を一致させるため、
              // label が丸めた万円単位の値を基準に fee / take を計算する。
              // 例: range.min=76,000 → label "8万" → labelMin=80,000 → fee=1,500 → take=78,500→7.8万
              const labelMin = Math.round(range.min / 10000) * 10000;
              const labelMax = Math.round(range.max / 10000) * 10000;
              const feeMin   = calculateServiceFee(labelMin);
              const feeMax   = calculateServiceFee(labelMax);
              const takeMin  = labelMin - feeMin;
              const takeMax  = labelMax - feeMax;

              const isToday    = job.urgency === 'today';
              const isTomorrow = job.urgency === 'tomorrow';
              const isSoon     = job.urgency === 'soon';
              const hasVideo   = job.has_video || !!job.video_url; // DB video_url も考慮
              const hasMedia   = hasVideo || job.has_photos || job.has_floor_plan;
              const freshness  = getFreshnessBadge(job);
              const postedAt   = timeAgo(job.created_at);
              // 新着かどうか（24時間以内）
              const isNew24h   = job.created_at
                ? (Date.now() - parseUtc(job.created_at)) < 86400000 : false;
              // 5日以上経過した案件は目立たせない
              const isOld      = job.created_at
                ? (Date.now() - parseUtc(job.created_at)) > 86400000 * 5 : false;

              return (
                <article
                  key={job.id}
                  className={`rounded-3xl shadow-sm overflow-hidden transition ${
                    isOld
                      ? 'bg-slate-50 opacity-70 ring-1 ring-slate-100'
                      : isNew24h
                      ? 'bg-white ring-2 ring-blue-400 shadow-blue-100'
                      : 'bg-white ring-1 ring-slate-200'
                  }`}
                >

                  {/* ── 動画サムネイル（video_url がある案件のみ） ── */}
                  {job.video_url && (
                    <div
                      className="relative bg-slate-900 cursor-pointer"
                      onClick={() => navigate(`/craftsman/apply/${job.id}`, { state: { job } })}
                    >
                      {job.meta?.thumbnail_url ? (
                        /* サムネイル画像あり → <img> で表示（帯域ゼロ） */
                        <img
                          src={job.meta.thumbnail_url}
                          alt="現場動画サムネイル"
                          className="w-full h-36 object-cover opacity-70"
                          loading="lazy"
                        />
                      ) : (
                        /* 旧データ（thumbnail_url なし）→ <video preload="none"> にフォールバック */
                        <video
                          src={job.video_url}
                          preload="none"
                          className="w-full h-36 object-cover opacity-70"
                          muted
                          playsInline
                        />
                      )}
                      {/* 再生ボタンオーバーレイ */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg backdrop-blur-sm">
                          <svg className="w-6 h-6 text-blue-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow">
                          ▶ 現場動画あり
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ── バッジ行 ── */}
                  <div className="px-4 pt-4 pb-0 flex flex-wrap gap-1.5">
                    {freshness && (
                      <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${freshness.cls}`}>
                        {freshness.text}
                      </span>
                    )}
                    {isToday && (
                      <span className="bg-red-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full animate-pulse">
                        🔥 本日中に決まります
                      </span>
                    )}
                    {isTomorrow && (
                      <span className="bg-orange-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
                        ⏰ 明日まで
                      </span>
                    )}
                    {isSoon && !isToday && !isTomorrow && (
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        数日以内
                      </span>
                    )}
                    {postedAt && (
                      <span className="text-slate-400 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-50 ml-auto">
                        🕐 {postedAt}
                      </span>
                    )}
                  </div>

                  {/* ── タイトル・エリア ── */}
                  <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                        {job.work_type || '内装工事'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        {job.area || job.city || 'エリア未設定'}
                        {job.distance_km != null && ` · 約${job.distance_km}km`}
                      </p>
                    </div>
                    {job.distance_km != null && (
                      <div className="bg-slate-900 text-white rounded-2xl px-3 py-1.5 text-center flex-shrink-0">
                        <p className="text-[10px] opacity-60 leading-none">距離</p>
                        <p className="text-base font-extrabold leading-tight">{job.distance_km}km</p>
                      </div>
                    )}
                  </div>

                  {/* ── 施工概要ブロック（主役） ── */}
                  {(() => {
                    const rooms   = getRoomWorkSummaries(job.meta);
                    const raiVals = Object.values(getRoomAdditionalInfo(job.meta ?? null));

                    // 追加情報サマリー（一覧では品番の具体値は出さない・詳細ページで見せる）
                    const totalPhotos  = raiVals.reduce((n, e) => n + (e.photos?.length ?? 0), 0);
                    const hasRaiVideo  = raiVals.some(e => !!e.videoUrl);
                    const hasProduct   = raiVals.some(e => !!e.productNumber);
                    const hasNote      = raiVals.some(e => !!e.note);
                    const hasAddedRoom = raiVals.some(e => e.addedByCustomer);

                    const raiParts: string[] = [];
                    if (totalPhotos > 0) raiParts.push(`写真${totalPhotos}枚`);
                    if (hasRaiVideo)     raiParts.push('動画あり');
                    if (hasProduct)      raiParts.push('品番あり');
                    if (hasNote)         raiParts.push('メモあり');
                    if (hasAddedRoom)    raiParts.push('追加部屋あり');
                    const raiLine = raiParts.length > 0
                      ? `追加情報：${raiParts.join('・')}`
                      : null;

                    // 1部屋：「部屋名｜畳数」→「工事内容」→「条件」→「追加情報」
                    if (rooms.length === 1) {
                      const r = rooms[0];
                      return (
                        <div className="mx-4 mb-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                          <p className="text-lg font-extrabold text-slate-900 leading-tight">
                            {r.name}{r.size ? <span className="text-slate-400 font-bold">｜{r.size}</span> : ''}
                          </p>
                          {r.workParts.length > 0 && (
                            <p className="text-sm text-slate-600 mt-0.5">{r.workParts.join('・')}</p>
                          )}
                          {r.conditions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {r.conditions.map(c => (
                                <span key={c} className="text-[10px] bg-amber-50 border border-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                          {raiLine && (
                            <p className="text-[11px] font-bold text-emerald-600 mt-1.5">{raiLine}</p>
                          )}
                        </div>
                      );
                    }

                    // 複数部屋：「N部屋の工事」→ 部屋リスト →「追加情報」
                    if (rooms.length > 1) {
                      return (
                        <div className="mx-4 mb-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                          <p className="text-xs font-bold text-slate-400 mb-1.5">{rooms.length}部屋の工事</p>
                          <div className="space-y-1">
                            {rooms.map((r, i) => (
                              <div key={i} className="flex items-baseline gap-1.5">
                                <span className="text-base font-extrabold text-slate-900">{r.name}</span>
                                {r.size && <span className="text-xs text-slate-400">｜{r.size}</span>}
                                {r.workParts.length > 0 && (
                                  <span className="text-xs text-slate-500 truncate">{r.workParts.join('・')}</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {raiLine && (
                            <p className="text-[11px] font-bold text-emerald-600 mt-1.5">{raiLine}</p>
                          )}
                        </div>
                      );
                    }

                    // 部屋情報なし（旧データ）
                    return (
                      <div className="mx-4 mb-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                        <p className="text-lg font-extrabold text-slate-900 leading-tight">
                          {job.work_type || 'クロス張り替え'}
                        </p>
                        {raiLine && (
                          <p className="text-[11px] font-bold text-emerald-600 mt-1.5">{raiLine}</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── 売上ブロック（メイン） ── */}
                  <div className="mx-4 mb-3 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-4 shadow-sm shadow-blue-200">
                    {/* 想定売上（主役・一番大きく） */}
                    <div className="mb-3">
                      <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wide mb-0.5">想定売上</p>
                      <p className="text-3xl font-extrabold tracking-tight leading-none">{range.label}</p>
                    </div>
                    {/* サービス料（小さめ） */}
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/15">
                      <p className="text-[10px] text-blue-300">サービス料</p>
                      <p className="text-[11px] text-blue-200 font-semibold">
                        − {feeMin === feeMax ? fmt(feeMin) : `${fmt(feeMin)}〜${fmt(feeMax)}`}
                      </p>
                    </div>
                    {/* 手取り目安（緑・大きめ） */}
                    <div>
                      <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wide mb-0.5">手取り目安</p>
                      <p className="text-2xl font-extrabold text-emerald-300 leading-none">
                        {takeMin === takeMax ? fmt(takeMin) : fmtTakeRange(takeMin, takeMax)}
                      </p>
                    </div>
                  </div>

                  {/* ── 判断補助チップ（最大3つ・注意喚起と動画のみ） ── */}
                  {(() => {
                    const raiVals    = Object.values(getRoomAdditionalInfo(job.meta ?? null));
                    const hasRaiVideo = raiVals.some(e => !!e.videoUrl);
                    const roomCount  = job.meta?.rooms?.length ?? 0;
                    const isTough    = hasCeilingWork(job.meta) || roomCount >= 3;

                    const chips: { label: string; cls: string }[] = [];
                    // 1. 難易度（最優先・注意喚起）
                    if (isTough)
                      chips.push({ label: '⚠ 難易度高め', cls: 'bg-orange-50 text-orange-700 border border-orange-100' });
                    // 2. 部屋数（施工ボリューム判断）
                    if (roomCount > 0)
                      chips.push({ label: `🏠 ${roomCount}部屋`, cls: 'bg-slate-100 text-slate-600' });
                    // 3. 動画（一覧で判断できる最大の材料）
                    if (hasVideo || hasRaiVideo)
                      chips.push({ label: '🎥 動画あり', cls: 'bg-blue-50 text-blue-600 border border-blue-100' });

                    return chips.length > 0 ? (
                      <div className="px-4 mb-3 flex gap-1.5">
                        {chips.slice(0, 3).map(c => (
                          <span key={c.label} className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.cls}`}>
                            {c.label}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {/* ── 募集確認予定ラベル ── */}
                  {job.created_at && (() => {
                    const label = getRemainingLabel(job.created_at);
                    const level = getDeadlineLevel(job.created_at);
                    const cls =
                      level === 'expired' ? 'bg-slate-50 text-slate-400 border-slate-100' :
                      level === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-slate-50 text-slate-500 border-slate-200';
                    return (
                      <div className="mx-4 mb-3 flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
                          📅 {label}
                        </span>
                      </div>
                    );
                  })()}

                  {/* ── 現場レーダー ── */}
                  <div className="px-4 mb-3">
                    <SiteRadar job={job} />
                  </div>

                  {/* ── メモ（折り畳み） ── */}
                  {job.customer_note && (
                    <div className="mx-4 mb-3 bg-blue-50 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-blue-500 font-bold mb-1">依頼メモ</p>
                      <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                        {job.customer_note}
                      </p>
                    </div>
                  )}

                  {/* ── アクション ── */}
                  <div className="border-t border-slate-100 px-4 py-3 flex gap-2">
                    {isLoggedIn ? (
                      /* ログイン済み — 詳細 1 本に統一（応募フォームは詳細画面内）*/
                      <button
                        onClick={() => navigate(`/craftsman/apply/${job.id}`, { state: { job } })}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold shadow-sm shadow-blue-200 transition active:scale-[0.98]"
                      >
                        詳しく見る →
                      </button>
                    ) : (
                      /* 未ログイン — 詳細閲覧 + ログイン誘導 */
                      <>
                        <button
                          onClick={() => navigate(`/craftsman/apply/${job.id}`, { state: { job } })}
                          className="flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition active:scale-95"
                        >
                          詳しく見る
                        </button>
                        <button
                          onClick={() => navigate('/login', { state: { defaultRole: 'craftsman', from: `/craftsman/apply/${job.id}` } })}
                          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold shadow-sm shadow-blue-200 transition active:scale-[0.98]"
                        >
                          ログインして応募する →
                        </button>
                      </>
                    )}
                  </div>

                  <p className="pb-3 text-center text-[10px] text-slate-400">
                    応募無料 · 手数料は工事成立時のみ
                  </p>
                </article>
              );
            })}
          </div>
        )}

        {/* 下部フッター注記（簡略版）*/}
        <div className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-center">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            応募無料 · 手数料は成約時のみ発生 ·{' '}
            <button
              onClick={() => setShowFeeModal(true)}
              className="underline text-blue-500 font-bold hover:text-blue-700"
            >
              手数料の詳細
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
