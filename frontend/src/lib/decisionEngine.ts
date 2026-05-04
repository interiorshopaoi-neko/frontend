export type DecisionWorkType = 'wallpaper' | 'floor' | 'both';
export type DecisionCondition = 'good' | 'normal' | 'bad';
export type DecisionRoomSize = 6 | 8 | 10 | 12 | 14 | 'other';

export type DecisionGrade = 'standard' | 'premium';

export type DecisionInput = {
  workType: DecisionWorkType;
  roomSize: DecisionRoomSize;
  condition: DecisionCondition;
  grade?: DecisionGrade;
  rooms?: string[];
};

export function mapWorkType(workType: string): DecisionWorkType {
  if (workType === 'floor') return 'floor';
  if (workType === 'both') return 'both';
  return 'wallpaper';
}

export function mapCondition(condition: string): DecisionCondition {
  if (condition === 'heavy' || condition === 'bad' || condition === 'damaged') {
    return 'bad';
  }

  if (condition === 'medium' || condition === 'normal') {
    return 'normal';
  }

  return 'good';
}

export function mapRoomSize(roomSize: unknown): DecisionRoomSize {
  if (
    roomSize === 6 ||
    roomSize === 8 ||
    roomSize === 10 ||
    roomSize === 12 ||
    roomSize === 14
  ) {
    return roomSize;
  }

  return 'other';
}

export function calculateDecision(input: DecisionInput) {
  const tatami = typeof input.roomSize === 'number' ? input.roomSize : 8;

  const floorArea = tatami * 1.65;
  const wallArea = tatami * 3.3 * 2.3;

  const isPremium = input.grade === 'premium';

  const CROSS_MATERIAL_COST_PER_M2 = isPremium ? 400 : 210;
  const CROSS_REVENUE_PER_M2       = isPremium ? 1600 : 1300;
  const CF_MATERIAL_COST_PER_M2    = 1480;
  const CF_REVENUE_PER_M2          = 3500;
  const LABOR_COST_PER_HOUR        = 4000;

  const includesWall  = input.workType === 'wallpaper' || input.workType === 'both';
  const includesFloor = input.workType === 'floor'     || input.workType === 'both';

  const materialCost =
    (includesWall  ? wallArea  * CROSS_MATERIAL_COST_PER_M2 : 0) +
    (includesFloor ? floorArea * CF_MATERIAL_COST_PER_M2    : 0);

  const expectedRevenue =
    (includesWall  ? wallArea  * CROSS_REVENUE_PER_M2 : 0) +
    (includesFloor ? floorArea * CF_REVENUE_PER_M2    : 0);

  let workHours = 0;

  if (includesWall)  workHours += wallArea  / 10;
  if (includesFloor) workHours += floorArea / 6;

  if (input.condition === 'bad')  workHours *= 1.3;
  if (input.condition === 'good') workHours *= 0.9;

  const laborCost = workHours * LABOR_COST_PER_HOUR;
  const expectedProfit = expectedRevenue - materialCost - laborCost;

  let score = 50;

  if (expectedProfit > 40000) score += 20;
  if (workHours < 6) score += 15;
  if (input.condition === 'bad') score -= 10;

  const rating =
    score > 80 ? 5 :
    score > 65 ? 4 :
    score > 50 ? 3 :
    score > 35 ? 2 :
    1;

  const difficulty =
    input.condition === 'bad'
      ? '高'
      : input.condition === 'normal'
      ? '中'
      : '低';

  return {
    floorArea,
    wallArea,
    materialCost,
    laborCost,
    revenue: expectedRevenue,
    profit: expectedProfit,
    hours: workHours,
    difficulty,
    score,
    rating,
  };
}

// ── Conversion correction ─────────────────────────────────────────────────────
//
// 実際の成約率（actualConvRate）と期待成約率（baselineConvRate）の比を
// 期待売上に乗算して補正する。±20%にクランプすることで大幅な乖離を防ぐ。
// DB連携後は actualConvRate を API から取得して渡す。

export function applyConversionCorrection(
  revenue: number,
  actualConvRate: number,     // 実績成約率 (0–100)
  baselineConvRate: number,   // 期待成約率 (0–100)
): number {
  const factor = actualConvRate / baselineConvRate;
  const clamped = Math.min(Math.max(factor, 0.8), 1.2);
  return revenue * clamped;
}
