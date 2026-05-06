import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type EstimateRequest = {
  id: string;
  created_at: string;
  area: string | null;
  work_type: string | null;
  contact_method: string | null;
  contact_value: string | null;
  status: string | null;
  video_url: string | null;
  room_type: string | null;
  size_note: string | null;
  timing: string | null;
  site_condition: string | null;
  desire_type: string | null;
  memo: string | null;
};

type EnrichedRow = EstimateRequest & {
  _score: number;
  _completeness: number;   // 0-100
  _elapsedHours: number;
  _action: string | null;
  _scoreReason: string;
};

type SortOrder = 'desc' | 'asc';

// ─────────────────────────────────────────────────────────────────────────────
// Constants / Maps
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  new: '新規', in_progress: '対応中', done: '完了',
};
const STATUS_STYLE: Record<string, string> = {
  new:         'bg-indigo-50 text-indigo-700 border-indigo-200',
  in_progress: 'bg-orange-50 text-orange-700 border-orange-200',
  done:        'bg-slate-100 text-slate-400 border-slate-200',
};

const DESIRE_SHORT: Record<string, string> = {
  'できるだけ費用を抑えたい':        '費用重視',
  '見た目をきれいにしたい':           '見た目重視',
  'こだわりたい（デザイン重視）':     'デザイン重視',
  '提案してほしい（よく分からない）': '提案希望',
  '品番や内容はある程度決まっている': '内容確定',
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure utility functions
// ─────────────────────────────────────────────────────────────────────────────

function getElapsedHours(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function formatElapsed(hours: number): string {
  if (hours < 1)  return `${Math.floor(hours * 60)}分前`;
  if (hours < 24) return `${Math.floor(hours)}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function calcCompleteness(r: EstimateRequest): number {
  const fields = [
    r.area, r.work_type, r.contact_method, r.contact_value,
    r.room_type, r.size_note, r.timing, r.site_condition,
    r.desire_type, r.memo, r.video_url,
  ];
  return Math.round(fields.filter(Boolean).length / fields.length * 100);
}

function calcScore(r: EstimateRequest): number {
  let s = 0;
  if (r.timing === '急ぎ')                               s += 3;
  if (r.timing === '1週間以内')                           s += 2;
  if (r.desire_type === 'こだわりたい（デザイン重視）')   s += 2;
  if (r.desire_type === '見た目をきれいにしたい')         s += 1;
  if (r.desire_type === '品番や内容はある程度決まっている') s += 1;
  if (calcCompleteness(r) >= 60)                         s += 1;
  if (r.video_url)                                       s += 1;
  return s;
}

function getScoreReason(r: EstimateRequest): string {
  const parts: string[] = [];
  if (r.timing === '急ぎ')                             parts.push('急ぎの依頼');
  if (r.desire_type === 'こだわりたい（デザイン重視）') parts.push('デザイン重視＝高単価');
  if (r.video_url)                                     parts.push('動画あり');
  if (calcCompleteness(r) >= 60)                       parts.push('情報が充実');
  return parts.length ? parts.join('・') : '新着依頼';
}

function getRecommendedAction(r: EstimateRequest, hours: number): string | null {
  if (r.status === 'new' && hours >= 48) return '返信が遅れています。今すぐ連絡を';
  if (r.timing === '急ぎ')              return 'すぐ連絡推奨';
  if (r.desire_type === 'こだわりたい（デザイン重視）') return '提案余地あり・単価アップ狙える';
  if (r.desire_type === 'できるだけ費用を抑えたい')     return '費用見積もりを先に提示';
  if (r.desire_type === '提案してほしい（よく分からない）') return '丁寧な説明でファン化チャンス';
  if (r.desire_type === '品番や内容はある程度決まっている') return '工期・費用の確認が最優先';
  if (r.timing === '1週間以内') return '早めの連絡を推奨';
  if (r.memo)                   return 'メモを事前に確認して連絡';
  return null;
}

function enrich(r: EstimateRequest): EnrichedRow {
  const hours = getElapsedHours(r.created_at);
  return {
    ...r,
    _score:        calcScore(r),
    _completeness: calcCompleteness(r),
    _elapsedHours: hours,
    _action:       getRecommendedAction(r, hours),
    _scoreReason:  getScoreReason(r),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Small display components
// ─────────────────────────────────────────────────────────────────────────────

function UrgencyTag({ timing }: { timing: string | null }) {
  if (!timing) return null;
  const map: Record<string, { label: string; cls: string }> = {
    '急ぎ':       { label: '至急',  cls: 'bg-red-50 text-red-600 border-red-200' },
    '1週間以内':  { label: '早め',  cls: 'bg-orange-50 text-orange-600 border-orange-200' },
    '今月中':     { label: '通常',  cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    '相談したい': { label: '相談中',cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  };
  const t = map[timing];
  if (!t) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${t.cls}`}>{t.label}</span>
  );
}

function TempLabel({ r }: { r: EstimateRequest }) {
  if (r.timing === '急ぎ')
    return <span className="text-[11px] font-extrabold text-rose-500">🔥 即対応</span>;
  if (r.desire_type === 'こだわりたい（デザイン重視）')
    return <span className="text-[11px] font-extrabold text-amber-600">💰 高単価</span>;
  if (r.desire_type === 'できるだけ費用を抑えたい' && r.area)
    return <span className="text-[11px] font-extrabold text-slate-400">🧊 様子見</span>;
  if (r.desire_type === '提案してほしい（よく分からない）')
    return <span className="text-[11px] font-extrabold text-blue-500">💬 提案待ち</span>;
  if (r.desire_type === '品番や内容はある程度決まっている')
    return <span className="text-[11px] font-extrabold text-emerald-600">✅ 即決まり</span>;
  if (r.timing === '1週間以内')
    return <span className="text-[11px] font-extrabold text-orange-500">⚡ 早急</span>;
  return null;
}

function PendingAlert({ status, hours }: { status: string | null; hours: number }) {
  if (status !== 'new') return null;
  if (hours >= 48) return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold border bg-red-50 text-red-600 border-red-300 flex items-center gap-0.5">
      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      要対応
    </span>
  );
  if (hours >= 24) return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold border bg-yellow-50 text-yellow-700 border-yellow-300">
      ⚠ 注意
    </span>
  );
  return null;
}

function CompletenessBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-1.5 min-w-[72px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold text-slate-400 tabular-nums w-7 text-right">{pct}%</span>
    </div>
  );
}

function ContactButton({
  r, onCopy,
}: {
  r: EstimateRequest;
  onCopy: (text: string, label: string) => void;
}) {
  if (!r.contact_value || !r.contact_method) return null;

  if (r.contact_method === '電話') {
    const tel = r.contact_value.replace(/[\s\-]/g, '');
    return (
      <a
        href={`tel:${tel}`}
        onClick={e => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-1.5 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        </svg>
        電話する
      </a>
    );
  }

  if (r.contact_method === 'メール') {
    const subject = encodeURIComponent('【内装工事のご相談】概算のご案内');
    const body = encodeURIComponent(
      `はじめまして。PRO MATCH と申します。\nこの度はお問い合わせいただきありがとうございます。\n\n${r.work_type ?? '内装工事'}（${r.area ?? ''}）についてご連絡差し上げました。\n\n概算金額をお伝えしたく、ご都合のよい日時をお知らせいただけますでしょうか。`
    );
    return (
      <a
        href={`mailto:${r.contact_value}?subject=${subject}&body=${body}`}
        onClick={e => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
        メール
      </a>
    );
  }

  if (r.contact_method === 'LINE') {
    return (
      <button
        onClick={e => { e.stopPropagation(); onCopy(r.contact_value!, 'LINE ID をコピーしました'); }}
        className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-3 py-1.5 transition-colors"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/>
        </svg>
        LINE IDをコピー
      </button>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RecommendedBanner
// ─────────────────────────────────────────────────────────────────────────────

function RecommendedBanner({
  row,
  onOpenDetail,
  onUpdateStatus,
  onCopy,
  onPlayVideo,
}: {
  row: EnrichedRow;
  onOpenDetail: () => void;
  onUpdateStatus: (id: string, next: string) => void;
  onCopy: (text: string, label: string) => void;
  onPlayVideo: (url: string) => void;
}) {
  return (
    <div className="mb-6 rounded-2xl overflow-hidden border-2 border-amber-300 shadow-md shadow-amber-100">
      {/* バナーヘッダー */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-white">⭐ おすすめ案件</span>
          <span className="text-xs text-amber-100 font-medium">{row._scoreReason}</span>
        </div>
        <span className="text-xs text-amber-100 font-semibold">スコア {row._score}pt</span>
      </div>

      {/* 本文 */}
      <div className="bg-white px-5 py-4 space-y-3">
        {/* 施工 + エリア + タグ */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-extrabold text-slate-900">{row.work_type || '—'}</p>
            <p className="text-sm text-slate-500">{row.area || '—'}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <TempLabel r={row} />
            {row.timing && <UrgencyTag timing={row.timing} />}
            {row.desire_type && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-200">
                {DESIRE_SHORT[row.desire_type] ?? row.desire_type}
              </span>
            )}
            <PendingAlert status={row.status} hours={row._elapsedHours} />
          </div>
        </div>

        {/* 推奨アクション + 充足度 */}
        {row._action && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
            <p className="text-xs font-bold text-amber-800">💡 {row._action}</p>
            <CompletenessBar pct={row._completeness} />
          </div>
        )}

        {/* メモ */}
        {row.memo && (
          <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed border border-slate-100 line-clamp-2">
            📝 {row.memo}
          </p>
        )}

        {/* アクション行 */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <ContactButton r={row} onCopy={onCopy} />
          {row.video_url && (
            <button
              onClick={e => { e.stopPropagation(); onPlayVideo(row.video_url!); }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              動画
            </button>
          )}
          {row.status === 'new' && (
            <button
              onClick={e => { e.stopPropagation(); onUpdateStatus(row.id, 'in_progress'); }}
              className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              対応開始
            </button>
          )}
          <button
            onClick={onOpenDetail}
            className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            詳細 →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg">
        {msg}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoModal
// ─────────────────────────────────────────────────────────────────────────────

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-semibold flex items-center gap-1.5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          閉じる
        </button>
        <video src={url} controls autoPlay playsInline preload="metadata"
          className="w-full rounded-2xl bg-black shadow-2xl" style={{ maxHeight: '75vh' }}>
          <a href={url} target="_blank" rel="noreferrer" className="text-white underline p-4 block">外部で開く</a>
        </video>
        <div className="mt-3 flex justify-end">
          <a href={url} target="_blank" rel="noreferrer"
            className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            別タブで開く
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DetailModal
// ─────────────────────────────────────────────────────────────────────────────

function DetailModal({
  row, onClose, onUpdate, onPlayVideo,
}: {
  row: EstimateRequest;
  onClose: () => void;
  onUpdate: (id: string, next: string) => void;
  onPlayVideo: (url: string) => void;
}) {
  const copy = (text: string) => navigator.clipboard.writeText(text);
  const hasDetail = !!(row.room_type || row.size_note || row.timing || row.site_condition || row.desire_type || row.memo);

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${STATUS_STYLE[row.status ?? 'new']}`}>
              {STATUS_LABEL[row.status ?? 'new'] ?? row.status}
            </span>
            <TempLabel r={row} />
            {row.timing && <UrgencyTag timing={row.timing} />}
            <p className="text-xs text-slate-400">{formatDate(row.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none ml-2">✕</button>
        </div>

        {/* 本文（スクロール） */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <ModalItem label="施工内容"   value={row.work_type} />
            <ModalItem label="施工エリア" value={row.area} />
            <ModalItem label="連絡方法"   value={row.contact_method} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">連絡先</p>
              <button onClick={() => row.contact_value && copy(row.contact_value)}
                className="flex items-center gap-1.5 text-sm text-slate-800 hover:text-indigo-600 group transition-colors" title="クリックでコピー">
                <span>{row.contact_value || '—'}</span>
                {row.contact_value && <span className="text-[10px] text-slate-300 group-hover:text-indigo-400">📋</span>}
              </button>
            </div>
          </div>

          {hasDetail && (
            <div className="rounded-2xl border border-violet-100 bg-violet-50/30 overflow-hidden">
              <div className="px-4 py-2 bg-violet-50 border-b border-violet-100">
                <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">現場の詳細情報</p>
              </div>
              <div className="divide-y divide-violet-50">
                {[
                  { label: '希望',       value: row.desire_type },
                  { label: '部屋の種類', value: row.room_type },
                  { label: '広さ',       value: row.size_note },
                  { label: '希望時期',   value: row.timing },
                  { label: '現場状況',   value: row.site_condition },
                  { label: '補足メモ',   value: row.memo },
                ].filter(({ value }) => value).map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3 px-4 py-2.5">
                    <p className="text-[10px] font-semibold text-slate-400 flex-shrink-0 pt-0.5 min-w-[4.5rem]">{label}</p>
                    <p className="text-xs text-slate-700 break-all leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">動画</p>
            {row.video_url ? (
              <div className="space-y-2">
                <video src={row.video_url} controls playsInline preload="metadata"
                  className="w-full rounded-xl bg-slate-900" style={{ maxHeight: '200px' }}>
                  動画を再生できません
                </video>
                <div className="flex items-center gap-3">
                  <button onClick={() => { onClose(); onPlayVideo(row.video_url!); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg px-3 py-1.5 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    大きく再生
                  </button>
                  <a href={row.video_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                    別タブで開く
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">動画なし</p>
            )}
          </div>
        </div>

        {/* ステータス操作 */}
        <div className="px-6 pb-6 pt-3 flex gap-2 border-t border-slate-100 flex-shrink-0">
          {row.status === 'new' && (
            <button onClick={() => onUpdate(row.id, 'in_progress')}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors">
              対応開始
            </button>
          )}
          {row.status === 'in_progress' && (
            <button onClick={() => onUpdate(row.id, 'done')}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors">
              完了にする
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-sm text-slate-800">{value || '—'}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminLogin
// ─────────────────────────────────────────────────────────────────────────────

function AdminLogin() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errMsg,   setErrMsg]   = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrMsg(`[${error.name ?? 'AuthError'}] ${error.message}`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-slate-900 items-center justify-center mb-4">
            <span className="text-white text-xl">🔑</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">管理画面</h1>
          <p className="text-sm text-slate-400 mt-1">ログインしてください</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">メールアドレス</label>
            <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">パスワード</label>
            <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"/>
          </div>
          <button type="submit" disabled={loading}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-700 active:scale-95'}`}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
          {errMsg && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <pre className="text-xs text-red-500 whitespace-pre-wrap break-all">{errMsg}</pre>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RequestsList
// ─────────────────────────────────────────────────────────────────────────────

function RequestsList({ session }: { session: Session }) {
  const [rows,         setRows]         = useState<EstimateRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [errMsg,       setErrMsg]       = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortOrder,    setSortOrder]    = useState<SortOrder>('desc');
  const [modalRow,     setModalRow]     = useState<EstimateRequest | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);
  const [videoUrl,     setVideoUrl]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('estimate_requests')
        .select('id, created_at, area, work_type, contact_method, contact_value, status, video_url, room_type, size_note, timing, site_condition, desire_type, memo')
        .order('created_at', { ascending: false });
      if (error) setErrMsg(`[SupabaseError] ${error.message}\n${JSON.stringify(error, null, 2)}`);
      else setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const updateStatus = async (id: string, next: string) => {
    const { error } = await supabase.from('estimate_requests').update({ status: next }).eq('id', id);
    if (error) { showToast('更新に失敗しました'); return; }
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: next } : r));
    setModalRow(prev => prev?.id === id ? { ...prev, status: next } : prev);
    showToast('更新しました');
  };

  const handleCopy = useCallback(async (text: string, label = 'コピーしました') => {
    try { await navigator.clipboard.writeText(text); showToast(label); }
    catch { showToast('コピーできませんでした'); }
  }, [showToast]);

  // useMemo でスコアリング・フィルタ・並び替えを一括処理
  const enrichedRows = useMemo(() => rows.map(enrich), [rows]);

  const displayRows = useMemo(() =>
    enrichedRows
      .filter(r => filterStatus === 'all' || r.status === filterStatus)
      .sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortOrder === 'desc' ? -diff : diff;
      }),
    [enrichedRows, filterStatus, sortOrder]
  );

  // おすすめ案件：new のみ・スコア最高・同点なら新しい順
  const recommendedRow = useMemo(() => {
    const newRows = enrichedRows.filter(r => r.status === 'new');
    if (!newRows.length) return null;
    return newRows.reduce((best, r) =>
      r._score > best._score || (r._score === best._score && r.created_at > best.created_at) ? r : best
    );
  }, [enrichedRows]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  return (
    <div className="min-h-screen bg-slate-50">

      {toast && <Toast msg={toast} />}
      {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}
      {modalRow && (
        <DetailModal
          row={modalRow}
          onClose={() => setModalRow(null)}
          onUpdate={async (id, next) => { await updateStatus(id, next); }}
          onPlayVideo={(url) => setVideoUrl(url)}
        />
      )}

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold text-slate-900">案件一覧</p>
            {!loading && (
              <span className="text-xs text-slate-400">
                新規 {rows.filter(r => r.status === 'new').length} / 全 {rows.length}件
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">{session.user.email}</span>
            <button onClick={handleLogout}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors hover:border-slate-400">
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 pt-5 pb-24">

        {/* ── フィルタバー ── */}
        {!loading && !errMsg && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div className="flex gap-1.5 flex-wrap">
              {([
                { value: 'all',         label: 'すべて' },
                { value: 'new',         label: '新規' },
                { value: 'in_progress', label: '対応中' },
                { value: 'done',        label: '完了' },
              ] as const).map(({ value, label }) => (
                <button key={value} onClick={() => setFilterStatus(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    filterStatus === value
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}>
                  {label}
                  {value !== 'all' && (
                    <span className="ml-1 opacity-60">{rows.filter(r => r.status === value).length}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1"/>
            <button onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-500 hover:border-slate-400 transition-all">
              {sortOrder === 'desc' ? '↓ 新しい順' : '↑ 古い順'}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <p className="text-sm text-slate-400 animate-pulse">読み込み中...</p>
          </div>
        )}
        {errMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-600 mb-2">取得エラー</p>
            <pre className="text-xs text-red-500 whitespace-pre-wrap break-all">{errMsg}</pre>
          </div>
        )}
        {!loading && !errMsg && displayRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-3xl">📭</p>
            <p className="text-sm text-slate-400">
              {filterStatus === 'all' ? 'まだ依頼はありません' : 'この条件の案件はありません'}
            </p>
          </div>
        )}

        {!loading && !errMsg && displayRows.length > 0 && (
          <div>
            {/* ── おすすめ案件バナー（新規のみ・フィルタが all/new のとき表示） ── */}
            {recommendedRow && (filterStatus === 'all' || filterStatus === 'new') && (
              <RecommendedBanner
                row={recommendedRow}
                onOpenDetail={() => setModalRow(recommendedRow)}
                onUpdateStatus={updateStatus}
                onCopy={handleCopy}
                onPlayVideo={(url) => setVideoUrl(url)}
              />
            )}

            {/* ── カード一覧 ── */}
            <div className="space-y-3">
              <p className="text-xs text-slate-400">{displayRows.length}件</p>

              {displayRows.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setModalRow(r)}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm cursor-pointer hover:border-slate-300 hover:shadow-md transition-all active:scale-[0.99] overflow-hidden"
                >
                  {/* ── ① タグ行 ── */}
                  <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-slate-50">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <TempLabel r={r} />
                      <UrgencyTag timing={r.timing} />
                      {r.desire_type && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-200">
                          {DESIRE_SHORT[r.desire_type] ?? r.desire_type}
                        </span>
                      )}
                      <PendingAlert status={r.status} hours={r._elapsedHours} />
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {r.video_url && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-violet-50 text-violet-600 border border-violet-200 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          動画
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${STATUS_STYLE[r.status ?? 'new'] ?? 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {STATUS_LABEL[r.status ?? 'new'] ?? r.status}
                      </span>
                    </div>
                  </div>

                  {/* ── ② 案件情報 ── */}
                  <div className="px-5 pt-3.5 pb-3 space-y-2.5">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">施工内容</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{r.work_type || '—'}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">エリア</p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{r.area || '—'}</p>
                      </div>
                    </div>

                    {/* 時期・広さ（あれば） */}
                    {(r.timing || r.size_note) && (
                      <div className="flex items-start gap-4">
                        {r.timing && (
                          <div className="flex-1">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">希望時期</p>
                            <p className="text-xs text-slate-600 mt-0.5">{r.timing}</p>
                          </div>
                        )}
                        {r.size_note && (
                          <div className="flex-1">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">広さ</p>
                            <p className="text-xs text-slate-600 mt-0.5">{r.size_note}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* メモ（あれば） */}
                    {r.memo && (
                      <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">📝 {r.memo}</p>
                      </div>
                    )}

                    {/* ── ③ 推奨アクション + 充足度 ── */}
                    {r._action && (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <p className="text-[11px] font-semibold text-slate-600">💡 {r._action}</p>
                        <CompletenessBar pct={r._completeness} />
                      </div>
                    )}
                    {!r._action && (
                      <div className="flex items-center justify-end">
                        <CompletenessBar pct={r._completeness} />
                      </div>
                    )}

                    {/* 受付日時 */}
                    <p className="text-[10px] text-slate-300">
                      {formatElapsed(r._elapsedHours)} ({formatDate(r.created_at)})
                    </p>
                  </div>

                  {/* ── ④ アクションバー ── */}
                  <div
                    className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-slate-50 bg-slate-50/60"
                    onClick={e => e.stopPropagation()}
                  >
                    <ContactButton r={r} onCopy={handleCopy} />
                    {r.video_url && (
                      <button onClick={() => setVideoUrl(r.video_url!)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-white hover:bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5 transition-colors">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        動画
                      </button>
                    )}
                    {r.status === 'new' && (
                      <button onClick={() => updateStatus(r.id, 'in_progress')}
                        className="text-xs font-semibold text-amber-700 bg-white hover:bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 transition-colors">
                        対応開始
                      </button>
                    )}
                    {r.status === 'in_progress' && (
                      <button onClick={() => updateStatus(r.id, 'done')}
                        className="text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 transition-colors">
                        完了にする
                      </button>
                    )}
                    <span className="ml-auto text-[10px] text-slate-300">詳細 →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root: auth guard
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminRequests() {
  const [session,   setSession]   = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400 animate-pulse">確認中...</p>
      </div>
    );
  }

  if (!session) return <AdminLogin />;
  return <RequestsList session={session} />;
}
