export type FreshnessStatus = 'fresh' | 'warning' | 'urgent';

export interface FreshnessInfo {
  days: number;
  label: string;
  status: FreshnessStatus;
}

export function getFreshness(createdAt: string): FreshnessInfo {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (days >= 5) return { days, label: '継続確認待ち', status: 'urgent'  };
  if (days >= 3) return { days, label: 'まもなく確認', status: 'warning' };
  return              { days, label: '募集中',       status: 'fresh'   };
}

export const FRESHNESS_CLASS: Record<FreshnessStatus, string> = {
  fresh:   'bg-slate-100 text-slate-500',
  warning: 'bg-yellow-100 text-yellow-700',
  urgent:  'bg-red-100 text-red-600',
};
