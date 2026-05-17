// TODO(dead-file): このファイルは App.tsx にインポートされておらず、どのルートにも登録されていない。
// /craftsman/dashboard は CraftsmanDashboardPage.tsx が担当している。
// /estimates/craftsman API も root api/ に serverless function がなく本番では動作しない。
// 参照: docs/CURRENT_STATUS.md「Legacy API 呼び出し」セクション
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Hammer, Clock, CheckCircle } from 'lucide-react';
import type { Estimate } from '../../types';
import { WORK_TYPE_LABELS, formatPrice } from '../../utils/labels';
import StatusBadge from '../../components/StatusBadge';
import api from '../../utils/api';
import { useLangContext } from '../../context/LangContext';
import { DEMO_ESTIMATE } from '../../data/demoEstimate';

export default function CraftsmanDashboard() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const navigate = useNavigate();
  const { t } = useLangContext();

  useEffect(() => {
    api.get('/estimates/craftsman')
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          setEstimates(data);
        } else {
          // 案件0件 → UI確認用デモ表示
          setEstimates([DEMO_ESTIMATE]);
          setIsDemo(true);
        }
      })
      .catch(() => {
        // API未接続時もデモ表示
        setEstimates([DEMO_ESTIMATE]);
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const active = estimates.filter((e) => ['photo_uploaded', 'pending'].includes(e.status));
  const done = estimates.filter((e) => ['confirmed', 'rejected'].includes(e.status));
  const list = tab === 'active' ? active : done;

  return (
    <div>
      {/* ── デモ表示バナー ──────────────────────────────────────────── */}
      {isDemo && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <span className="text-amber-500 text-base leading-none mt-0.5">📋</span>
          <div>
            <p className="text-xs font-bold text-amber-700">デモ表示中</p>
            <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed">
              案件が0件のためUI確認用のサンプル案件を表示しています。実際の案件が登録されると自動的に非表示になります。
            </p>
          </div>
        </div>
      )}

      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">{t('craftsman_dashboard_title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('total_count').replace('{n}', String(estimates.length))}</p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: Clock, label: t('needs_review'), count: active.length, color: 'text-amber-500', bg: 'bg-amber-50' },
          { icon: CheckCircle, label: t('confirmed_label'), count: done.filter(e => e.status === 'confirmed').length, color: 'text-green-500', bg: 'bg-green-50' },
          { icon: Hammer, label: t('all_label'), count: estimates.length, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        ].map(({ icon: Icon, label, count, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
            <Icon size={20} className={`${color} mx-auto mb-1`} />
            <p className="text-xl font-bold text-gray-900">{count}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* タブ */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        {([['active', t('tab_active')], ['done', t('tab_done')]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {label}
            {key === 'active' && active.length > 0 && (
              <span className="ml-1 bg-amber-400 text-white text-xs px-1.5 py-0.5 rounded-full">
                {active.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">{t('loading')}</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-gray-400 text-sm">
            {tab === 'active' ? t('no_active') : t('no_done')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((est) => {
            const demoCard = isDemo && est.id === 9999;
            return (
            <button
              key={est.id}
              onClick={() => navigate(demoCard ? '/craftsman/estimate/demo' : `/craftsman/estimate/${est.id}`)}
              className={`w-full bg-white rounded-2xl border shadow-md p-6 text-left hover:shadow-md transition-shadow ${
                demoCard ? 'border-amber-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{est.room_name}</h3>
                    {est.status === 'photo_uploaded' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                    )}
                    {demoCard && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        DEMO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {est.customer_name} ・ {t(WORK_TYPE_LABELS[est.work_type])}
                  </p>
                </div>
                <StatusBadge status={est.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {t('rough_prefix')}: {formatPrice(est.auto_min)} 〜 {formatPrice(est.auto_max)}
                </span>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(est.created_at).toLocaleDateString('ja-JP')}
              </p>
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
