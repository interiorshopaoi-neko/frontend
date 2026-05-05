/**
 * 成功報酬モデル（職人側のみ）
 * ユーザー側には一切表示しない
 *
 * 〜30,000円     → 1,000円
 * 30,001〜80,000円 → 2,000円
 * 80,001円〜     → 3,000円
 */
export function calculateServiceFee(amount: number): number {
  if (amount <= 30000) return 1000;
  if (amount <= 80000) return 2000;
  return 3000;
}

export function formatFee(fee: number): string {
  return `¥${fee.toLocaleString()}`;
}
