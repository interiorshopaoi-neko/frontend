// ─── 共通: 想定売上計算ユーティリティ ────────────────────────────────────────
//
// JobsSwipeView / JobsListView / ApplyConfirmModal で同一ロジックを使う。
// JobsListView は数値 (number) で返すため calcRevenueNum() を基幹とし、
// 文字列表示は calcRevenueStr() でラップする。

import type { Job } from '../pages/craftsman/CraftsmanJobsPage';
import { calculateServiceFee } from './serviceFee';

// 工事種別→ベース単価
function roomBase(workType: string): number {
  const wt = workType.toLowerCase();
  if (wt.includes('cf') || wt.includes('クッションフロア')) return 24000;
  if (wt.includes('補修'))                                 return 16000;
  if (wt.includes('床'))                                   return 34000;
  return 32000; // クロス・壁紙デフォルト
}

// 部屋サイズ→乗数
function sizeMul(sizeStr: string): number {
  const m = sizeStr.match(/(\d+)/);
  const t = m ? parseInt(m[1]) : 6;
  return t >= 10 ? 1.5 : t >= 8 ? 1.25 : t >= 6 ? 1.0 : 0.8;
}

/** 数値(円)で返す。表示用乗数込みの最小値 */
export function calcRevenueNum(job: Job): number {
  // meta.rooms がある場合は部屋ごとに加算（複数部屋対応）
  const rooms = job.meta?.rooms;
  if (rooms && rooms.length > 0) {
    return rooms.reduce((sum, r) => {
      const base = roomBase(r.workType ?? job.work_type ?? 'クロス');
      const mul  = sizeMul(r.size ?? '');
      return sum + Math.round((base * mul) / 1000) * 1000;
    }, 0);
  }

  // meta.rooms なし → 単一部屋
  const damage = job.damage_level;
  const base   = roomBase(job.work_type ?? '');
  const mul    = sizeMul(job.room_size ?? '');
  const dmgMul = damage === 'high' ? 1.3 : damage === 'middle' ? 1.1 : 1.0;
  return Math.round((base * mul * dmgMul) / 1000) * 1000;
}

/** 文字列で返す（例: "¥3〜5万"） */
export function calcRevenueStr(job: Job): string {
  const min = calcRevenueNum(job);
  const max  = Math.round((min * 1.5) / 1000) * 1000;
  const minW = Math.round(min / 10000);
  const maxW = Math.round(max / 10000);
  if (minW === 0 && maxW === 0) return `¥${Math.round(min / 1000)}〜${Math.round(max / 1000)}千`;
  return `¥${minW}〜${maxW}万`;
}

/** min/max/label を返す（サービス料・手取りのレンジ計算用） */
export function calcRevenueRange(job: Job): { min: number; max: number; label: string } {
  const min   = calcRevenueNum(job);
  const max   = Math.round((min * 1.5) / 1000) * 1000;
  const label = calcRevenueStr(job);
  return { min, max, label };
}

/**
 * 売上カード用の表示値を一括で返す。
 * ラベル（¥8〜11万）と計算値を完全一致させるため、
 * 万円単位に丸めた値を基準に fee / net を計算する。
 *
 * 例: calcRevenueNum→76,000
 *   → rMin=80,000, rMax=110,000
 *   → fMin=1,500, fMax=3,000
 *   → netMin=78,500→7.8万, netMax=107,000→10.7万
 */
export function getRevenueDisplay(job: Job): {
  revenueLabel: string;
  feeLabel: string;
  netLabel: string;
} {
  const { min, max, label: revenueLabel } = calcRevenueRange(job);
  const rMin = Math.round(min / 10000) * 10000;
  const rMax = Math.round(max / 10000) * 10000;
  const fMin = calculateServiceFee(rMin);
  const fMax = calculateServiceFee(rMax);
  const nMin = rMin - fMin;
  const nMax = rMax - fMax;

  const feeLabel = fMin === fMax
    ? `−¥${fMin.toLocaleString()}`
    : `−¥${fMin.toLocaleString()}〜¥${fMax.toLocaleString()}`;

  const nMinW  = Math.floor(nMin / 1000) / 10;   // 切り捨て: 78500→7.8
  const nMaxW  = Math.round(nMax / 1000) / 10;   // 四捨五入: 107000→10.7
  const netLabel = nMin === nMax ? `¥${nMinW}万` : `¥${nMinW}〜${nMaxW}万`;

  return { revenueLabel, feeLabel, netLabel };
}
