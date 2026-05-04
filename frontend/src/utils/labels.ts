import type { WorkType, Condition, Grade, EstimateStatus } from '../types';
import type { I18nKey } from '../data/i18n';

export const WORK_TYPE_LABELS: Record<WorkType, I18nKey> = {
  cross: 'work_type_cross',
  cf: 'work_type_cf',
  both: 'work_type_both',
};

export const CONDITION_LABELS: Record<Condition, I18nKey> = {
  good: 'condition_good',
  normal: 'condition_normal',
  bad: 'condition_bad',
};

export const GRADE_LABELS: Record<Grade, I18nKey> = {
  economy: 'grade_economy',
  standard: 'grade_standard',
  premium: 'grade_premium',
};

export const STATUS_LABELS: Record<EstimateStatus, I18nKey> = {
  pending: 'status_pending',
  photo_uploaded: 'status_photo_uploaded',
  reviewing: 'status_reviewing',
  confirmed: 'status_confirmed',
  rejected: 'status_rejected',
  booked: 'status_booked',
};

export const STATUS_COLORS: Record<EstimateStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  photo_uploaded: 'bg-blue-100 text-blue-800',
  reviewing: 'bg-purple-100 text-purple-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  booked: 'bg-purple-100 text-purple-800',
};

export function formatPrice(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`;
}
