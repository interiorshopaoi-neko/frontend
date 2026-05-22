// Pure types and calculation functions for craftsman tools.
// Kept in a separate module so they can be reused when Supabase persistence is added.

// ── 見積 ──────────────────────────────────────────────────────────────────────

export type EstimateUnit = '㎡' | 'm' | '枚';
export type EstimateItemType = 'クロス' | '床CF' | 'フロアタイル' | 'その他';

export type EstimateLine = {
  id: number;
  item: EstimateItemType;
  name: string;
  qty: string;
  unit: EstimateUnit;
  unitPrice: string;
  purchasePrice: string;
  lossRate: string;
  memo: string;
  showDetail: boolean;
};

export type EstimateExpense = {
  misc: string;
  waste: string;
  parking: string;
  other: string;
};

export type LineResult = {
  revenue: number;
  purchaseQty: number;
  materialCost: number;
  profit: number;
  hasPurchasePrice: boolean;
};

export type EstimateTotals = {
  revenue: number;
  materialCost: number;
  expenses: number;
  profit: number;
  profitRate: number;
  hasAnyMissingCost: boolean;
};

function pn(s: string): number {
  const v = parseFloat(s);
  return isNaN(v) || v < 0 ? 0 : v;
}

export function calculateLineTotal(line: EstimateLine): LineResult {
  const qty = pn(line.qty);
  const unitPrice = pn(line.unitPrice);
  const purchasePrice = pn(line.purchasePrice);
  const lossRate = pn(line.lossRate);
  const hasPurchasePrice = line.purchasePrice.trim() !== '';

  const revenue = Math.round(qty * unitPrice);
  const purchaseQty = hasPurchasePrice
    ? Math.round(qty * (1 + lossRate / 100) * 100) / 100
    : 0;
  const materialCost = hasPurchasePrice ? Math.round(purchaseQty * purchasePrice) : 0;
  const profit = revenue - materialCost;

  return { revenue, purchaseQty, materialCost, profit, hasPurchasePrice };
}

export function calculateEstimateTotal(
  lines: EstimateLine[],
  expense: EstimateExpense,
): EstimateTotals {
  const results = lines.map(calculateLineTotal);
  const revenue = results.reduce((s, r) => s + r.revenue, 0);
  const materialCost = results.reduce((s, r) => s + r.materialCost, 0);
  const expenses = Math.round(
    pn(expense.misc) + pn(expense.waste) + pn(expense.parking) + pn(expense.other),
  );
  const profit = revenue - materialCost - expenses;
  const profitRate = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
  const hasAnyMissingCost = results.some(r => !r.hasPurchasePrice && r.revenue > 0);
  return { revenue, materialCost, expenses, profit, profitRate, hasAnyMissingCost };
}

// ── 発注長さ ──────────────────────────────────────────────────────────────────

// count: 枚数（同じ寸法が複数ある場合）。未入力時は 1 扱い。
export type LengthEntry = { id: number; cm: number; count: number };

export type OrderLengthResult = {
  totalCm: number;
  totalM: number;
  withLossM: number;
  recommendedM: number;
};

export function calculateOrderLength(
  entries: LengthEntry[],
  lossRate: number,
  unitM: 1 | 0.5,
): OrderLengthResult {
  const totalCm = entries.reduce((s, e) => s + e.cm * (e.count || 1), 0);
  const totalM = totalCm / 100;
  const withLossM = totalM * (1 + lossRate / 100);
  const recommendedM = Math.ceil(withLossM / unitM) * unitM;
  return { totalCm, totalM, withLossM, recommendedM };
}

// ── フロアタイル ──────────────────────────────────────────────────────────────

export type FloorTileInput = {
  roomWidth: string;
  roomDepth: string;
  tileWidth: string;
  tileLength: string;
  lossRate: string;
  extra: string;
};

export type FloorTileResult = {
  roomAreaM2: number;
  tileAreaM2: number;
  baseCount: number;
  withLossCount: number;
  recommendedCount: number;
};

export function calculateFloorTileCount(input: FloorTileInput): FloorTileResult | null {
  const rw = parseFloat(input.roomWidth);
  const rd = parseFloat(input.roomDepth);
  const tw = parseFloat(input.tileWidth);
  const tl = parseFloat(input.tileLength);
  const loss = parseFloat(input.lossRate) || 0;
  const extra = parseInt(input.extra) || 0;
  if (!rw || !rd || !tw || !tl) return null;
  const roomAreaM2 = (rw / 100) * (rd / 100);
  const tileAreaM2 = (tw / 1000) * (tl / 1000);
  if (tileAreaM2 <= 0) return null;
  const baseCount = Math.ceil(roomAreaM2 / tileAreaM2);
  const withLossCount = Math.ceil(baseCount * (1 + loss / 100));
  const recommendedCount = withLossCount + extra;
  return { roomAreaM2, tileAreaM2, baseCount, withLossCount, recommendedCount };
}
