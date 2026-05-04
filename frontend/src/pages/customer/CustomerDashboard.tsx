import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, ClipboardList } from 'lucide-react';
import type { Estimate } from '../../types';
import { WORK_TYPE_LABELS, formatPrice } from '../../utils/labels';
import StatusBadge from '../../components/StatusBadge';
import api from '../../utils/api';
import { useLangContext } from '../../context/LangContext';

export default function CustomerDashboard() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useLangContext();

  useEffect(() => {
    api.get('/estimates/my')
      .then(({ data }) => setEstimates(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('dashboard_title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('estimate_count').replace('{n}', String(estimates.length))}</p>
        </div>
        <button
          onClick={() => navigate('/customer/estimate/flow')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
        >
          <Plus size={18} />
          {t('new_estimate')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">{t('loading')}</div>
      ) : estimates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={32} className="text-indigo-300" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">{t('no_estimates')}</h3>
          <p className="text-gray-400 text-sm mb-5">{t('no_estimates_desc')}</p>
          <button
            onClick={() => navigate('/customer/estimate/flow')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            {t('request_btn')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {estimates.map((est) => (
            <button
              key={est.id}
              onClick={() => navigate(`/customer/estimate/${est.id}`)}
              className="w-full bg-white rounded-2xl border border-slate-200 shadow-md p-6 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{est.room_name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{t(WORK_TYPE_LABELS[est.work_type])}</p>
                </div>
                <StatusBadge status={est.status} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  {est.status === 'confirmed' && est.final_price ? (
                    <span className="text-lg font-bold text-green-700">{formatPrice(est.final_price)}</span>
                  ) : (
                    <span className="text-sm text-gray-600">
                      {formatPrice(est.auto_min)} 〜 {formatPrice(est.auto_max)}
                    </span>
                  )}
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(est.created_at).toLocaleDateString('ja-JP')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
