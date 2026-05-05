/**
 * 成功報酬モデル（職人側のみ）
 * ユーザー側には一切表示しない
 *
 * 〜30,000円      → 500円
 * 30,001〜80,000円  → 1,500円
 * 80,001〜150,000円 → 3,000円
 * 150,001円〜      → 5,000円
 */
export function calculateServiceFee(amount: number): number {
  const safe = Math.max(0, amount || 0);
  if (safe <= 30000)  return 500;
  if (safe <= 80000)  return 1500;
  if (safe <= 150000) return 3000;
  return 5000;
}

export function formatFee(fee: number): string {
  return `¥${fee.toLocaleString()}`;
}
