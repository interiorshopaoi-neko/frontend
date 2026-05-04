import type { EstimateStatus } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../utils/labels';
import { useLangContext } from '../context/LangContext';

export default function StatusBadge({ status }: { status: EstimateStatus }) {
  const { t } = useLangContext();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {t(STATUS_LABELS[status])}
    </span>
  );
}
