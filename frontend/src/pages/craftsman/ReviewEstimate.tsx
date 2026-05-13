import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import type { Estimate } from '../../types';
import { WORK_TYPE_LABELS, CONDITION_LABELS, GRADE_LABELS, formatPrice } from '../../utils/labels';
import StatusBadge from '../../components/StatusBadge';
import api from '../../utils/api';
import { useLangContext } from '../../context/LangContext';
import { DEMO_ESTIMATE, DEMO_EXTRA, DEMO_PHOTO_COUNT } from '../../data/demoEstimate';
import {
  calculateDecision,
  applyConversionCorrection,
  mapCondition,
  mapRoomSize,
  mapWorkType,
  type DecisionCondition,
  type DecisionRoomSize,
  type DecisionWorkType,
} from '@/lib/decisionEngine';

// 実績成約率（JOB_DATA平均）→ DB連携後はAPIから取得
const ACTUAL_CONV_RATE   = 36;
const BASELINE_CONV_RATE = 40;

export default function ReviewEstimate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalPrice, setFinalPrice] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'confirm' | 'reject' | null>(null);
  const { t } = useLangContext();

  const isDemo = id === 'demo';

  useEffect(() => {
    if (isDemo) {
      // デモモード：APIを呼ばずサンプルデータを直接セット
      setEstimate(DEMO_ESTIMATE);
      const mid = Math.round((DEMO_ESTIMATE.auto_min + DEMO_ESTIMATE.auto_max) / 2 / 100) * 100;
      setFinalPrice(String(mid));
      setLoading(false);
      return;
    }
    api.get(`/estimates/${id}`)
      .then(({ data }) => {
        setEstimate(data);
        // 概算の中間値をデフォルト入力
        const mid = Math.round((data.auto_min + data.auto_max) / 2 / 100) * 100;
        setFinalPrice(String(mid));
      })
      .finally(() => setLoading(false));
  }, [id, isDemo]);

  const handleConfirm = async () => {
    if (!finalPrice) return;
    if (isDemo) return;
    setSubmitting(true);
    try {
      await api.put(`/estimates/${id}/confirm`, { finalPrice: parseInt(finalPrice), craftsmanNote: note });
      navigate('/craftsman/dashboard');
    } catch {
      alert(t('error_occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (isDemo) return;
    setSubmitting(true);
    try {
      await api.put(`/estimates/${id}/reject`, { craftsmanNote: note });
      navigate('/craftsman/dashboard');
    } catch {
      alert(t('error_occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">{t('loading')}</div>;
  if (!estimate) return <div className="text-center py-20 text-gray-400">{t('not_found')}</div>;

  const photos = estimate.photo_filenames === '__demo__'
    ? Array.from({ length: DEMO_PHOTO_COUNT }, (_, i) => `__demo_${i}`)
    : estimate.photo_filenames ? estimate.photo_filenames.split(',') : [];
  const isEditable = estimate.status === 'photo_uploaded' || estimate.status === 'pending';

  return (
    <div>
      <button onClick={() => navigate('/craftsman/dashboard')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <ArrowLeft size={16} />
        {t('back_to_dashboard')}
      </button>

      {/* ── デモバナー ──────────────────────────────────────────────── */}
      {isDemo && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <span className="text-amber-500 text-base leading-none mt-0.5">📋</span>
          <div>
            <p className="text-xs font-bold text-amber-700">デモ表示中 — UI確認用サンプル案件</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              このデータは架空の案件です。ボタン操作はAPIに送信されません。
            </p>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-gray-900 text-lg">{estimate.room_name}</h2>
              {isDemo && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  DEMO
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{t('requester')}: {estimate.customer_name}</p>
            {isDemo && (
              <p className="text-xs text-indigo-600 font-medium mt-0.5">📍 {DEMO_EXTRA.area}</p>
            )}
          </div>
          <StatusBadge status={estimate.status} />
        </div>

        {/* 工事詳細 */}
        <div className="space-y-2 text-sm">
          {[
            { label: t('work_type_label'), value: t(WORK_TYPE_LABELS[estimate.work_type]) },
            { label: t('size'), value: `${estimate.tatami_count}${t('tatami_unit')}` },
            { label: t('condition_label'), value: t(CONDITION_LABELS[estimate.condition]) },
            { label: t('material'), value: t(GRADE_LABELS[estimate.grade]) },
            { label: t('has_cf_label'), value: estimate.has_existing_cf ? t('cf_yes') : t('cf_no') },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-slate-200 last:border-0">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        {/* デモ追加情報：部屋・施工箇所・備考 */}
        {isDemo && (
          <div className="mt-3 space-y-0 border-t border-gray-50 pt-2">
            {[
              { label: '対象部屋',  value: DEMO_EXTRA.rooms      },
              { label: '施工箇所',  value: DEMO_EXTRA.workAreas   },
              { label: '壁紙グレード', value: DEMO_EXTRA.grade_note },
              { label: 'お客様メモ', value: DEMO_EXTRA.notes       },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* 自動計算値 */}
        <div className="mt-4 bg-indigo-50 rounded-xl p-3 text-center">
          <p className="text-xs text-indigo-600 font-medium">{t('auto_estimate_label')}</p>
          <p className="text-xl font-bold text-indigo-700 mt-1">
            {formatPrice(estimate.auto_min)} 〜 {formatPrice(estimate.auto_max)}
          </p>
        </div>
      </div>

      {/* ── 受注判断カード ────────────────────────────────────────── */}
      {(() => {
        const decision = calculateDecision({
          workType: mapWorkType(estimate.work_type),
          roomSize: mapRoomSize(estimate.tatami_count),
          condition: mapCondition(estimate.condition),
          rooms: undefined,
        });

        const correctedRevenue = applyConversionCorrection(
          decision.revenue,
          ACTUAL_CONV_RATE,
          BASELINE_CONV_RATE,
        );
        const correctedProfit = correctedRevenue - decision.materialCost - decision.laborCost;

        return (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
            <h3 className="font-bold mb-2">🔥 この案件どう？</h3>

            <p>利益：¥{Math.round(correctedProfit).toLocaleString()}
              <span className="text-xs text-gray-400 ml-1">
                （補正前 ¥{Math.round(decision.profit).toLocaleString()}）
              </span>
            </p>
            <p>作業時間：{decision.hours.toFixed(1)}時間</p>
            <p>売上：¥{Math.round(correctedRevenue).toLocaleString()}
              <span className="text-xs text-gray-400 ml-1">
                （実績成約率{ACTUAL_CONV_RATE}%補正）
              </span>
            </p>
            <p>材料費：¥{Math.round(decision.materialCost).toLocaleString()}</p>
            <p>評価：{'★'.repeat(decision.rating)}</p>
          </div>
        );
      })()}

      {/* 写真 */}
      {photos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">{t('site_photos')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((filename) =>
              filename.startsWith('__demo_') ? (
                /* デモ：実際の画像がないためプレースホルダーを表示 */
                <div
                  key={filename}
                  className="w-full aspect-square rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-2xl">🏠</span>
                  <span className="text-[10px] text-slate-400 font-medium">現場写真（デモ）</span>
                </div>
              ) : (
                <a key={filename} href={`/uploads/${filename}`} target="_blank" rel="noreferrer">
                  <img
                    src={`/uploads/${filename}`}
                    alt="現場写真"
                    className="w-full aspect-square object-cover rounded-xl hover:opacity-90 transition-opacity"
                  />
                </a>
              )
            )}
          </div>
          {photos.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">{t('no_photos_received')}</p>
          )}
        </div>
      )}

      {/* 確定フォーム */}
      {isEditable && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
          <h3 className="font-semibold text-gray-900 mb-4">{t('fix_estimate_title')}</h3>

          {/* モード選択 */}
          {!mode && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('confirm')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:border-green-400 transition-colors"
              >
                <CheckCircle size={28} className="text-green-500" />
                <span className="text-sm font-semibold text-green-700">{t('fix_price')}</span>
              </button>
              <button
                onClick={() => setMode('reject')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:border-red-400 transition-colors"
              >
                <XCircle size={28} className="text-red-400" />
                <span className="text-sm font-semibold text-red-600">{t('need_site_check')}</span>
              </button>
            </div>
          )}

          {/* 確定フォーム */}
          {mode === 'confirm' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('official_price_label')}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-lg">¥</span>
                  <input
                    type="number"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-green-400"
                    step="100"
                    min="0"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {t('rough_prefix')}: {formatPrice(estimate.auto_min)} 〜 {formatPrice(estimate.auto_max)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('customer_comment_optional')}</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="例：下地の状態が良好のため標準価格でご対応できます"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode(null)}
                  className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                >
                  {t('back')}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!finalPrice || submitting}
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white font-semibold transition-colors"
                >
                  {submitting ? t('submitting') : t('fix_estimate_title')}
                </button>
              </div>
            </div>
          )}

          {/* 現地確認フォーム */}
          {mode === 'reject' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('customer_comment')}</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="例：写真だけでは判断が難しいため、現地確認させてください"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode(null)}
                  className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                >
                  {t('back')}
                </button>
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white font-semibold transition-colors"
                >
                  {submitting ? t('submitting') : t('request_site_check')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 確定済み表示 */}
      {!isEditable && estimate.status === 'confirmed' && estimate.final_price && (
        <div className="bg-green-50 rounded-2xl border border-green-100 p-5 text-center">
          <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-700">{t('estimate_confirmed')}</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{formatPrice(estimate.final_price)}</p>
        </div>
      )}
    </div>
  );
}
