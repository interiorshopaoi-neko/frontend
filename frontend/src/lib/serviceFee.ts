import { FEE_TABLE } from '../constants/fees';

export function calculateServiceFee(amount: number): number {
  const safe = Math.max(0, amount || 0);
  return (FEE_TABLE.find(row => safe <= row.max) ?? FEE_TABLE[FEE_TABLE.length - 1]).fee;
}

export function formatFee(fee: number): string {
  return `¥${fee.toLocaleString()}`;
}
