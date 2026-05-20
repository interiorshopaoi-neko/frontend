import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { getFreshness, FRESHNESS_CLASS } from '../../lib/freshness';
import { AdminLogin, AdminNav, AdminUnauthorized, isAdminRole } from './shared';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import { getWallpaperPreference, getMaterialPreferenceChips, hasCeilingWork, getExtraInfo, getRoomMedia, getWallpaperAccentPreferences, getRoomWorkSummary } from '../../lib/requestMeta';

const URL_FILTER_LABELS: Record<string, string> = {
  new:         '新しい案件',
  in_progress: '対応中',
  done:        '完了',
  stale:       '継続確認推奨',
  neglected:   '長期放置',
  fresh:       '募集中（0〜2日）',
  warning:     'まもなく確認（3〜4日）',
  today:       '今日の新着',
};

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
  room_size: string | null;
  rooms: string | null;
  size_note: string | null;
  timing: string | null;
  site_condition: string | null;
  desire_type: string | null;
  memo: string | null;
  meta: unknown;
};

type EnrichedRow = EstimateRequest & {
  _score: number;
  _completeness: number;   // 0-100
  _elapsedHours: number;
  _action: string | null;
  _scoreReason: string;
};

type SortOrder = 'desc' | 'asc';

type NotifiableCraftsman = {
  user_id: string;
  shop_name: string | null;
  full_name: string | null;
  email: string;
  service_area: string | null;
  work_types: string[] | null;
};

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
        onClick={e => { e.stopPropagation(); onCopy(r.contact_value!, '連絡先をコピーしました'); }}
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        連絡先をコピー
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

          {/* クロス希望・材料情報（meta から） */}
          {(() => {
            const wallPref   = getWallpaperPreference(row.meta);
            const matChips   = getMaterialPreferenceChips(row.meta);
            const ceiling    = hasCeilingWork(row.meta);
            const accentPrefs = getWallpaperAccentPreferences(row.meta).filter(p => p !== 'まだ分からない');
            if (!wallPref && matChips.length === 0 && !ceiling && accentPrefs.length === 0) return null;
            return (
              <div className="rounded-2xl border border-teal-100 bg-teal-50/30 overflow-hidden">
                <div className="px-4 py-2 bg-teal-50 border-b border-teal-100">
                  <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">クロス希望・材料情報</p>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-1.5">
                  {ceiling && (
                    <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
                      天井あり
                    </span>
                  )}
                  {wallPref && (
                    <span className="bg-teal-100 border border-teal-200 text-teal-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
                      🎨 雰囲気：{wallPref}
                    </span>
                  )}
                  {accentPrefs.map(p => (
                    <span key={p} className="bg-purple-50 border border-purple-100 text-purple-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
                      ✨ {p}
                    </span>
                  ))}
                  {matChips.map(({ room, pref }) => (
                    <span key={room} className="bg-violet-50 border border-violet-100 text-violet-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
                      {room}：{pref === '柄物・アクセントクロス希望' ? 'アクセント希望あり' : pref}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* お客様が後から追加した情報 */}
          {(() => {
            const ei = getExtraInfo(row.meta);
            if (!ei) return null;
            const hasData = ei.productNumber || ei.productUrl || ei.accentPreference || ei.softSokibariPreference || ei.note || (ei.images?.length ?? 0) > 0;
            if (!hasData) return null;
            return (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/30 overflow-hidden">
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">お客様追加情報</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {ei.productNumber && (
                    <div className="flex items-start gap-2">
                      <p className="text-[10px] font-semibold text-slate-400 w-16 flex-shrink-0 pt-0.5">品番</p>
                      <p className="text-xs text-slate-700 font-medium">{ei.productNumber}</p>
                    </div>
                  )}
                  {ei.productUrl && (
                    <div className="flex items-start gap-2">
                      <p className="text-[10px] font-semibold text-slate-400 w-16 flex-shrink-0 pt-0.5">URL</p>
                      <a href={ei.productUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline break-all line-clamp-2">{ei.productUrl}</a>
                    </div>
                  )}
                  {ei.accentPreference && (
                    <div className="flex items-start gap-2">
                      <p className="text-[10px] font-semibold text-slate-400 w-16 flex-shrink-0 pt-0.5">アクセント</p>
                      <p className="text-xs text-slate-700">{ei.accentPreference}</p>
                    </div>
                  )}
                  {ei.softSokibariPreference && (
                    <div className="flex items-start gap-2">
                      <p className="text-[10px] font-semibold text-slate-400 w-16 flex-shrink-0 pt-0.5">ソフト巾木</p>
                      <p className="text-xs text-slate-700">{ei.softSokibariPreference}</p>
                    </div>
                  )}
                  {ei.note && (
                    <div className="flex items-start gap-2">
                      <p className="text-[10px] font-semibold text-slate-400 w-16 flex-shrink-0 pt-0.5">メモ</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{ei.note}</p>
                    </div>
                  )}
                  {(ei.images?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 mb-1.5">参考写真</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {ei.images!.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt={`写真${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-slate-100" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 部屋別動画・写真（roomMedia） */}
          {(() => {
            const roomMedia = getRoomMedia(row.meta);
            if (roomMedia.length === 0) return null;
            return (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/30 overflow-hidden">
                <div className="px-4 py-2 bg-violet-50 border-b border-violet-100">
                  <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">部屋別 動画・写真</p>
                </div>
                <div className="px-4 py-3 space-y-4">
                  {roomMedia.map(rm => (
                    <div key={rm.roomId}>
                      <p className="text-xs font-bold text-slate-700 mb-1.5">{rm.roomName}</p>
                      {rm.videos.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {rm.videos.map((url, vi) => (
                            <div key={vi} className="flex items-center gap-2">
                              <video src={url} controls playsInline preload="none"
                                className="w-full rounded-lg bg-slate-900" style={{ maxHeight: '140px' }}>
                                動画を再生できません
                              </video>
                            </div>
                          ))}
                        </div>
                      )}
                      {rm.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-1">
                          {rm.images.map((url, ii) => (
                            <a key={ii} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={`${rm.roomName} 写真${ii + 1}`}
                                className="w-full aspect-square object-cover rounded-lg border border-slate-100" loading="lazy" />
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

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">動画（全体）</p>
            {row.video_url ? (
              <div className="space-y-2">
                <video src={row.video_url} controls playsInline preload="none"
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
// CraftsmanNotifyPanel
// ─────────────────────────────────────────────────────────────────────────────

/** エリア・工事種別の簡易マッチング */
function isRecommendedCraftsman(req: EstimateRequest, c: NotifiableCraftsman): boolean {
  const reqArea     = req.area ?? '';
  const reqWorkType = req.work_type ?? '';
  const cArea       = c.service_area ?? '';
  const cTypes      = c.work_types ?? [];

  const areaMatch =
    cArea.length > 0 &&
    (reqArea.includes(cArea) || cArea.includes(reqArea));

  const typeMatch =
    cTypes.length > 0 &&
    cTypes.some(t => reqWorkType.includes(t) || t.includes(reqWorkType));

  return areaMatch && typeMatch;
}

/** 推奨理由チップ（表示用） */
function getRecommendReasons(req: EstimateRequest, c: NotifiableCraftsman): string[] {
  const reqArea     = req.area ?? '';
  const reqWorkType = req.work_type ?? '';
  const cArea       = c.service_area ?? '';
  const cTypes      = c.work_types ?? [];
  const reasons: string[] = [];

  if (cArea.length > 0 && (reqArea.includes(cArea) || cArea.includes(reqArea))) {
    reasons.push(`${cArea}エリア`);
  }
  cTypes
    .filter(t => reqWorkType.includes(t) || t.includes(reqWorkType))
    .forEach(t => reasons.push(`${t}対応`));

  return reasons;
}

/** 除外理由テキスト（表示用） */
function getExcludeReasons(req: EstimateRequest, c: NotifiableCraftsman): string[] {
  const reqArea     = req.area ?? '';
  const reqWorkType = req.work_type ?? '';
  const cArea       = c.service_area ?? '';
  const cTypes      = c.work_types ?? [];
  const reasons: string[] = [];

  const areaMatch = cArea.length > 0 && (reqArea.includes(cArea) || cArea.includes(reqArea));
  const typeMatch = cTypes.length > 0 && cTypes.some(t => reqWorkType.includes(t) || t.includes(reqWorkType));

  if (!areaMatch) reasons.push(cArea.length === 0 ? 'エリア未設定' : `エリア未一致（${cArea}）`);
  if (!typeMatch) reasons.push(cTypes.length === 0 ? '工種未設定' : '工種未一致');

  return reasons;
}

// ─── DryRunPanel ──────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 3)}***@${domain}`;
}

function DryRunPanel({
  req,
  craftsmen,
}: {
  req: EstimateRequest;
  craftsmen: NotifiableCraftsman[];
}) {
  const [open, setOpen] = useState(false);

  const recommended = craftsmen.filter(c => isRecommendedCraftsman(req, c));
  const others      = craftsmen.filter(c => !isRecommendedCraftsman(req, c));

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
      >
        🤖 自動通知判定（Dry Run）
        <span className="text-emerald-600 font-bold">対象 {recommended.length}人</span>
        <span className="text-slate-400">除外 {others.length}人</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-3 text-[11px]">

          {/* ✅ 通知対象 */}
          <div>
            <p className="font-bold text-emerald-700 mb-1.5">✅ 通知対象 {recommended.length}人</p>
            {recommended.length === 0 ? (
              <p className="text-slate-400 pl-2">対象職人なし</p>
            ) : (
              <div className="space-y-2">
                {recommended.map(c => {
                  const reasons = getRecommendReasons(req, c);
                  return (
                    <div key={c.user_id} className="pl-2 border-l-2 border-emerald-200 space-y-0.5">
                      <p className="font-semibold text-slate-800">
                        {c.shop_name || c.full_name || '名称未設定'}
                      </p>
                      <p className="text-slate-400">{maskEmail(c.email)}</p>
                      <div className="flex flex-wrap gap-1">
                        {reasons.map(r => (
                          <span key={r} className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 leading-none">
                            ✓ {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ❌ 除外 */}
          <div>
            <p className="font-bold text-slate-500 mb-1.5">❌ 除外 {others.length}人</p>
            {others.length === 0 ? (
              <p className="text-slate-400 pl-2">除外職人なし</p>
            ) : (
              <div className="space-y-2">
                {others.map(c => {
                  const reasons = getExcludeReasons(req, c);
                  return (
                    <div key={c.user_id} className="pl-2 border-l-2 border-slate-200 space-y-0.5">
                      <p className="font-semibold text-slate-600">
                        {c.shop_name || c.full_name || '名称未設定'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {reasons.map(r => (
                          <span key={r} className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-1.5 py-0.5 leading-none">
                            — {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* サマリー */}
          <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
            通知対象: {recommended.length}人 / 除外: {others.length}人（エリア×工種 テキスト部分一致）
          </p>
        </div>
      )}
    </div>
  );
}

function CraftsmanNotifyPanel({
  reqId,
  req,
  craftsmen,
  sendingKey,
  sentMap,
  onSend,
  onBulkSend,
}: {
  reqId: string;
  req: EstimateRequest;
  craftsmen: NotifiableCraftsman[];
  sendingKey: string | null;
  sentMap: Record<string, string>;
  onSend: (c: NotifiableCraftsman) => void;
  onBulkSend: (list: NotifiableCraftsman[]) => Promise<void>;
}) {
  const [open,        setOpen]        = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const count = craftsmen.length;

  const recommended = craftsmen.filter(c => isRecommendedCraftsman(req, c));
  const others      = craftsmen.filter(c => !isRecommendedCraftsman(req, c));

  const renderRow = (c: NotifiableCraftsman, isRec: boolean) => {
    const key         = `${reqId}-${c.user_id}`;
    const sentTime    = sentMap[key];
    const isSending   = sendingKey === key;
    const displayName = c.shop_name || c.full_name || '名称未設定';
    const recReasons  = isRec ? getRecommendReasons(req, c) : [];
    const excReasons  = isRec ? [] : getExcludeReasons(req, c);
    return (
      <div key={c.user_id} className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-bold text-slate-800 truncate">{displayName}</p>
          </div>
          {/* 推奨理由チップ */}
          {recReasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {recReasons.map(r => (
                <span key={r} className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 leading-none">
                  ✓ {r}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {c.service_area && (
              <span className="text-[11px] text-slate-400">📍 {c.service_area}</span>
            )}
            {c.work_types && c.work_types.length > 0 && (
              <span className="text-[11px] text-slate-400">{c.work_types.join('・')}</span>
            )}
            <span className="text-[11px] text-emerald-500">🔔 通知ON</span>
          </div>
          {/* 除外理由 */}
          {excReasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {excReasons.map(r => (
                <span key={r} className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5 leading-none">
                  — {r}
                </span>
              ))}
            </div>
          )}
        </div>
        {sentTime ? (
          <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            送信済み（{sentTime}）
          </span>
        ) : (
          <button
            onClick={() => onSend(c)}
            disabled={!!sendingKey}
            className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-300 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSending ? '送信中...' : 'この職人へ通知'}
          </button>
        )}
      </div>
    );
  };

  if (count === 0) {
    return (
      <span className="text-[11px] text-slate-400 flex items-center gap-1">
        🔔 通知可能な職人 0人（メール登録なし）
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-300 rounded-lg px-3 py-1.5 transition-colors"
      >
        🔔 通知可能な職人 {count}人
        {recommended.length > 0 ? (
          <span className="text-emerald-700 font-bold">（自動通知候補 {recommended.length}人）</span>
        ) : (
          <span className="text-amber-600 font-bold">（候補0人）</span>
        )}
        {open ? ' ▲' : ' ▼'}
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {/* 一括通知ボタン（推奨のみ）*/}
          {recommended.length > 0 ? (
            <div className="space-y-1">
              <button
                onClick={async () => {
                  setBulkSending(true);
                  await onBulkSend(recommended);
                  setBulkSending(false);
                }}
                disabled={bulkSending || !!sendingKey}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {bulkSending ? '送信中...' : `⭐ 自動通知候補 ${recommended.length}人に一括通知`}
              </button>
              <p className="text-[10px] text-slate-400 text-center">エリア・工種が一致した職人にのみ送信されます</p>
            </div>
          ) : (
            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ エリア「{req.area}」×工種「{req.work_type}」に一致する推奨職人がいません。個別に通知してください。
            </p>
          )}

          {/* A. おすすめ職人 */}
          {recommended.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-emerald-700 mb-1 flex items-center gap-1">
                ⭐ 自動通知候補
                <span className="bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5">{recommended.length}人</span>
                <span className="text-[9px] text-slate-400 font-normal ml-0.5">Dry Run</span>
              </p>
              <p className="text-[10px] text-slate-400 mb-1.5">エリア・工種が一致した職人です（自動通知時の対象予定）</p>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 divide-y divide-emerald-100 overflow-hidden">
                {recommended.map(c => renderRow(c, true))}
              </div>
            </div>
          )}
          {/* B. その他の通知可能な職人 */}
          {others.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                その他の通知可能な職人
                <span className="bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">{others.length}人</span>
              </p>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 divide-y divide-indigo-100 overflow-hidden">
                {others.map(c => renderRow(c, false))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RequestsList
// ─────────────────────────────────────────────────────────────────────────────

function RequestsList({ session }: { session: Session }) {
  const [searchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter') ?? '';

  const [rows,         setRows]         = useState<EstimateRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [errMsg,       setErrMsg]       = useState<string | null>(null);
  const [filterStatus,  setFilterStatus]  = useState<string>('all');
  const [filterStale,   setFilterStale]   = useState(false);
  const [sortOrder,     setSortOrder]     = useState<SortOrder>('desc');
  const [modalRow,     setModalRow]     = useState<EstimateRequest | null>(null);
  const [toast,              setToast]              = useState<string | null>(null);
  const [videoUrl,           setVideoUrl]           = useState<string | null>(null);
  const [sendingFollowupId,  setSendingFollowupId]  = useState<string | null>(null);
  const [followupSentMap,    setFollowupSentMap]    = useState<Record<string, string>>({});
  const [notifiableCraftsmen, setNotifiableCraftsmen] = useState<NotifiableCraftsman[]>([]);
  const [sendingNotifyKey,   setSendingNotifyKey]   = useState<string | null>(null);
  const [notifySentMap,      setNotifySentMap]      = useState<Record<string, string>>({});
  const [appCountMap,        setAppCountMap]        = useState<Record<string, number>>({});
  const [contractedMap,      setContractedMap]      = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('estimate_requests')
        .select('id, created_at, area, work_type, contact_method, contact_value, status, video_url, room_type, room_size, rooms, size_note, timing, site_condition, desire_type, memo, meta')
        .order('created_at', { ascending: false });
      if (error) setErrMsg(`[SupabaseError] ${error.message}\n${JSON.stringify(error, null, 2)}`);
      else setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  // 通知可能な職人一覧を取得（authenticated セッションで craftsmen テーブルへ直接アクセス可）
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('craftsmen')
        .select('user_id, shop_name, full_name, email, service_area, work_types')
        .eq('notification_enabled', true)
        .not('email', 'is', null)
        .neq('email', '');
      setNotifiableCraftsmen((data ?? []) as NotifiableCraftsman[]);
    })();
  }, []);

  // 応募数・成約数を取得
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('job_applications')
        .select('estimate_request_id, is_contracted');
      if (data) {
        const counts: Record<string, number> = {};
        const contracted: Record<string, number> = {};
        (data as Array<{ estimate_request_id: string; is_contracted: boolean | null }>).forEach(a => {
          const rid = String(a.estimate_request_id ?? '');
          if (!rid) return;
          counts[rid] = (counts[rid] ?? 0) + 1;
          if (a.is_contracted) contracted[rid] = (contracted[rid] ?? 0) + 1;
        });
        setAppCountMap(counts);
        setContractedMap(contracted);
      }
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

  const handleSendFollowup = useCallback(async (r: EstimateRequest, email: string) => {
    if (sendingFollowupId) return;
    setSendingFollowupId(r.id);
    try {
      const { error } = await supabase.functions.invoke('send-request-followup-email', {
        body: { email, requestId: r.id },
      });
      if (error) {
        showToast('メール送信に失敗しました');
      } else {
        const sentTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        setFollowupSentMap(prev => ({ ...prev, [r.id]: sentTime }));
        showToast('確認メールを送信しました');
      }
    } catch {
      showToast('メール送信に失敗しました');
    } finally {
      setSendingFollowupId(null);
    }
  }, [sendingFollowupId, showToast]);

  const handleSendToOneCraftsman = useCallback(async (
    reqId: string,
    req: EstimateRequest,
    c: NotifiableCraftsman,
  ) => {
    const key = `${reqId}-${c.user_id}`;
    if (sendingNotifyKey) return;
    setSendingNotifyKey(key);
    try {
      const { error } = await supabase.functions.invoke('send-craftsman-notification', {
        body: {
          to:        c.email,
          work_type: req.work_type  ?? '内装工事',
          area:      req.area       ?? '未設定',
          room_type: req.room_type  ?? undefined,
          room_size: req.room_size  ?? undefined,
          rooms:     req.rooms      ?? undefined,
          size_note: req.size_note  ?? undefined,
          timing:    req.timing     ?? undefined,
          has_video: !!req.video_url,
          has_photos:     false,
          has_floor_plan: false,
        },
      });
      if (error) {
        showToast('通知メールの送信に失敗しました');
      } else {
        const sentTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        setNotifySentMap(prev => ({ ...prev, [key]: sentTime }));
        showToast(`${c.shop_name || c.full_name || '職人'}へ通知しました`);
      }
    } catch {
      showToast('通知メールの送信に失敗しました');
    } finally {
      setSendingNotifyKey(null);
    }
  }, [sendingNotifyKey, showToast]);

  const handleBulkSendToRecommended = useCallback(async (
    reqId: string,
    req: EstimateRequest,
    recommended: NotifiableCraftsman[],
  ) => {
    const total    = notifiableCraftsmen.length;
    const selCount = recommended.length;

    console.log(`[notify] bulk start — selectedCraftsmenCount=${selCount}/${total} area="${req.area}" work_type="${req.work_type}"`);

    if (selCount === 0) {
      const skippedReason = `エリア「${req.area}」×工種「${req.work_type}」に一致する職人なし`;
      console.warn(`[notify] selectedCraftsmenCount=0 skippedReason="${skippedReason}"`);
      return;
    }

    let successCount = 0;
    for (const c of recommended) {
      const key = `${reqId}-${c.user_id}`;
      if (notifySentMap[key]) continue; // skip already sent
      try {
        const { error } = await supabase.functions.invoke('send-craftsman-notification', {
          body: {
            to:        c.email,
            work_type: req.work_type  ?? '内装工事',
            area:      req.area       ?? '未設定',
            room_type: req.room_type  ?? undefined,
            room_size: req.room_size  ?? undefined,
            rooms:     req.rooms      ?? undefined,
            size_note: req.size_note  ?? undefined,
            timing:    req.timing     ?? undefined,
            has_video: !!req.video_url,
            has_photos:     false,
            has_floor_plan: false,
          },
        });
        if (!error) {
          const sentTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
          setNotifySentMap(prev => ({ ...prev, [key]: sentTime }));
          successCount++;
          console.log(`[notify] sent (${successCount}/${selCount}) → ${c.shop_name || c.email}`);
        } else {
          console.error(`[notify] failed for ${c.email}:`, error);
        }
      } catch (e) {
        console.error(`[notify] exception for ${c.email}:`, e);
      }
    }

    console.log(`[notify] bulk done — sent=${successCount} selectedCraftsmenCount=${selCount}`);
    showToast(`${successCount}人の推奨職人に通知しました`);
  }, [notifiableCraftsmen, notifySentMap, showToast]);

  // useMemo でスコアリング・フィルタ・並び替えを一括処理
  const enrichedRows = useMemo(() => rows.map(enrich), [rows]);

  const staleCount = useMemo(
    () => enrichedRows.filter(r => getFreshness(r.created_at).status === 'urgent').length,
    [enrichedRows],
  );

  const displayRows = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return enrichedRows
      .filter(r => filterStatus === 'all' || r.status === filterStatus)
      .filter(r => !filterStale || getFreshness(r.created_at).status === 'urgent')
      .filter(r => {
        switch (urlFilter) {
          case 'new':         return r.status === 'new';
          case 'in_progress': return r.status === 'in_progress';
          case 'done':        return r.status === 'done';
          case 'stale':       return getFreshness(r.created_at).status === 'urgent';
          case 'neglected':   return r._elapsedHours / 24 >= 14;
          case 'fresh':       return getFreshness(r.created_at).status === 'fresh';
          case 'warning':     return getFreshness(r.created_at).status === 'warning';
          case 'today':       return r.created_at.startsWith(todayStr);
          default:            return true;
        }
      })
      .sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortOrder === 'desc' ? -diff : diff;
      });
  }, [enrichedRows, filterStatus, filterStale, urlFilter, sortOrder]);

  // おすすめ案件：new のみ・スコア最高・同点なら新しい順
  const recommendedRow = useMemo(() => {
    const newRows = enrichedRows.filter(r => r.status === 'new');
    if (!newRows.length) return null;
    return newRows.reduce((best, r) =>
      r._score > best._score || (r._score === best._score && r.created_at > best.created_at) ? r : best
    );
  }, [enrichedRows]);

  const [showLogout, setShowLogout] = useState(false);
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
            <Link to="/admin/dashboard" className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors">← ダッシュボード</Link>
            <p className="text-sm font-bold text-slate-900">案件一覧</p>
            {!loading && (
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <span>新規 {rows.filter(r => r.status === 'new').length} / 全 {rows.length}件</span>
                {staleCount > 0 && (
                  <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">
                    ⚠️ 継続確認待ち {staleCount}件
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">{session.user.email}</span>
            <button onClick={() => setShowLogout(true)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors hover:border-slate-400">
              ログアウト
            </button>
            {showLogout && (
              <LogoutConfirmModal
                onConfirm={() => { setShowLogout(false); handleLogout(); }}
                onCancel={() => setShowLogout(false)}
              />
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 pt-5 pb-24">

        {/* ── URLフィルタ バナー ── */}
        {urlFilter && URL_FILTER_LABELS[urlFilter] && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
            <span>表示中：{URL_FILTER_LABELS[urlFilter]}</span>
            <Link to="/admin/requests" className="ml-auto text-blue-500 hover:text-blue-700 underline">すべて表示に戻す</Link>
          </div>
        )}

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
            <button
              onClick={() => setFilterStale(v => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
                filterStale
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-orange-600 border-orange-300 hover:border-orange-500'
              }`}
            >
              ⚠️ 継続確認待ち
              {staleCount > 0 && <span className={filterStale ? 'opacity-80' : 'opacity-60'}>{staleCount}</span>}
            </button>
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

              {displayRows.map((r) => {
                const isStaleCard  = getFreshness(r.created_at).status === 'urgent';
                const isNeglected  = r._elapsedHours / 24 >= 14;
                const isVeryNew    = r._elapsedHours <= 2;
                const todayStr2    = new Date().toISOString().slice(0, 10);
                const isToday      = r.created_at.startsWith(todayStr2);
                const sentTime = followupSentMap[r.id];
                const appCount     = appCountMap[r.id] ?? 0;
                const hasContracted = (contractedMap[r.id] ?? 0) > 0;
                const cardBadge = sentTime
                  ? { emoji: '🔵', label: '確認メール送信済み', cls: 'bg-blue-50 text-blue-700 border-b border-blue-100' }
                  : isNeglected
                  ? { emoji: '⚫', label: '長期放置', cls: 'bg-slate-100 text-slate-600 border-b border-slate-200' }
                  : isStaleCard
                  ? { emoji: '🟡', label: '継続確認推奨', cls: 'bg-orange-50 text-orange-700 border-b border-orange-100' }
                  : isVeryNew
                  ? { emoji: '🆕', label: 'NEW 新着', cls: 'bg-rose-50 text-rose-700 border-b border-rose-100 font-extrabold' }
                  : isToday
                  ? { emoji: '✨', label: '本日新着', cls: 'bg-blue-50 text-blue-700 border-b border-blue-100' }
                  : { emoji: '🟢', label: '新しい案件', cls: 'bg-emerald-50 text-emerald-700 border-b border-emerald-100' };
                return (
                <div
                  key={r.id}
                  onClick={() => setModalRow(r)}
                  className={`rounded-2xl border bg-white shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.99] overflow-hidden ${
                    isStaleCard
                      ? 'border-orange-300 hover:border-orange-400'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* ── 状態バッジストリップ ── */}
                  <div className={`flex items-center gap-1.5 px-5 py-1.5 text-[11px] font-semibold ${cardBadge.cls}`}>
                    <span>{cardBadge.emoji}</span>
                    <span>{cardBadge.label}</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      {hasContracted && (
                        <span className="bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                          🎉 成約済み
                        </span>
                      )}
                      {!hasContracted && (
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          appCount === 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          応募 {appCount}件
                        </span>
                      )}
                    </span>
                  </div>

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

                    {/* 動画サムネイル */}
                    {r.video_url && (
                      <div
                        className="relative rounded-xl overflow-hidden bg-slate-900 cursor-pointer"
                        onClick={e => { e.stopPropagation(); setVideoUrl(r.video_url!); }}
                      >
                        <video
                          src={r.video_url}
                          preload="none"
                          className="w-full object-cover"
                          style={{ maxHeight: '90px' }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-violet-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="absolute top-2 left-2">
                          <span className="text-[10px] font-bold text-white bg-violet-600 px-2 py-0.5 rounded-full">
                            🎬 動画あり
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 応募ゼロ警告 */}
                    {appCount === 0 && r.status !== 'done' && r._elapsedHours >= 4 && (
                      <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2">
                        <p className="text-xs font-bold text-red-700">
                          ⚠️ 応募がありません — 職人への通知をご検討ください
                        </p>
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

                    {/* 受付日時 + 鮮度 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[10px] text-slate-300">
                        {formatElapsed(r._elapsedHours)} ({formatDate(r.created_at)})
                      </p>
                      {(() => {
                        const f = getFreshness(r.created_at);
                        return (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${FRESHNESS_CLASS[f.status]}`}>
                            {f.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* ── 継続確認待ちアクション案内 ── */}
                  {isStaleCard && (
                    <div
                      className="mx-5 mb-3 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3"
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-xs font-bold text-orange-700 mb-2">
                        ⚠️ お客様へ募集継続の確認が必要です
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          // contact_value に @ が含まれていればメールアドレスとして使用
                          // contact_method への依存を最小化し、将来フィールド追加にも対応
                          const contactValue = r.contact_value?.trim() ?? '';
                          const followupEmail = contactValue.includes('@') ? contactValue : null;
                          return followupEmail ? (
                          sentTime ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                              </svg>
                              送信済み（{sentTime}）
                            </span>
                          ) : (
                          <button
                            onClick={() => handleSendFollowup(r, followupEmail)}
                            disabled={sendingFollowupId === r.id}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            {sendingFollowupId === r.id ? '送信中...' : '確認メールを送る'}
                          </button>
                          )
                          ) : (
                          <button
                            disabled
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-not-allowed"
                            title="メールアドレスの連絡先がある場合のみ送信できます"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            確認メールを送る（メール連絡先なし）
                          </button>
                          );
                        })()}
                        <button
                          disabled
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-not-allowed"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                          募集終了にする（準備中）
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── ④ アクションバー ── */}
                  <div
                    className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-slate-50 bg-slate-50/60"
                    onClick={e => e.stopPropagation()}
                  >
                    <ContactButton r={r} onCopy={handleCopy} />
                    {(() => {
                      const contactValue = r.contact_value?.trim() ?? '';
                      const followupEmail = contactValue.includes('@') ? contactValue : null;
                      return sentTime ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                          送信済み（{sentTime}）
                        </span>
                      ) : followupEmail ? (
                        <button
                          onClick={() => handleSendFollowup(r, followupEmail)}
                          disabled={sendingFollowupId === r.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                          </svg>
                          {sendingFollowupId === r.id ? '送信中...' : '確認メールを送る'}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-not-allowed"
                          title="メールアドレスの連絡先がある場合のみ送信できます"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                          </svg>
                          メールアドレスなし
                        </button>
                      );
                    })()}
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

                  {/* ── ⑤ 職人への通知パネル ── */}
                  <div
                    className="px-5 pb-4 pt-3 border-t border-slate-100"
                    onClick={e => e.stopPropagation()}
                  >
                    <CraftsmanNotifyPanel
                      reqId={r.id}
                      req={r}
                      craftsmen={notifiableCraftsmen}
                      sendingKey={sendingNotifyKey}
                      sentMap={notifySentMap}
                      onSend={c => handleSendToOneCraftsman(r.id, r, c)}
                      onBulkSend={list => handleBulkSendToRecommended(r.id, r, list)}
                    />
                    <DryRunPanel req={r} craftsmen={notifiableCraftsmen} />
                  </div>
                </div>
                );
              })}
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
  if (!isAdminRole(session)) return <AdminUnauthorized />;
  return <RequestsList session={session} />;
}
