// TODO(legacy): /estimates/:id 系の API は root api/ に serverless function がなく本番では動作しない。
// Supabase client 直接統合へ移行するまでこの画面のデータ取得・写真アップロードは機能しない。
// 参照: docs/CURRENT_STATUS.md「Legacy API 呼び出し」セクション
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, Camera } from 'lucide-react';
import type { Estimate } from '../../types';
import { useLangContext } from '../../context/LangContext';
import { WORK_TYPE_LABELS, CONDITION_LABELS, GRADE_LABELS, formatPrice } from '../../utils/labels';
import StatusBadge from '../../components/StatusBadge';
import api from '../../utils/api';

export default function EstimateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [booked, setBooked] = useState(false);
  const { t } = useLangContext();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get(`/estimates/${id}`)
      .then(({ data }) => {
        setEstimate(data);
        setBooked(data.status === 'booked');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('photos', f));
    try {
      await api.post(`/estimates/${id}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { data } = await api.get(`/estimates/${id}`);
      setEstimate(data);
    } catch {
      alert(t('upload_error'));
    } finally {
      setUploading(false);
    }
  };

  const handleBook = async () => {
    if (!window.confirm(t('book_confirm'))) return;
    await api.put(`/estimates/${id}/book`);
    setBooked(true);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">{t('loading')}</div>;
  if (!estimate) return <div className="text-center py-20 text-gray-400">{t('not_found')}</div>;

  const photos = estimate.photo_filenames ? estimate.photo_filenames.split(',') : [];

  return (
    <div>
      <button onClick={() => navigate('/customer')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <ArrowLeft size={16} />
        {t('back_to_list')}
      </button>

      {/* ステータスカード */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{estimate.room_name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{t(WORK_TYPE_LABELS[estimate.work_type])}</p>
          </div>
          <StatusBadge status={estimate.status} />
        </div>

        {/* 金額 */}
        <div className={`rounded-xl p-4 mb-4 text-center ${
          estimate.status === 'confirmed' || estimate.status === 'booked' ? 'bg-green-50' : 'bg-indigo-50'
        }`}>
          {(estimate.status === 'confirmed' || estimate.status === 'booked') && estimate.final_price ? (
            <>
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <span className="text-green-500 text-xs">●</span>
                <span className="text-xs text-green-700 font-medium">{t('pro_check')}</span>
              </div>
              <p className="text-xs text-green-600 font-medium mb-1">{t('price')}</p>
              <p className="text-3xl font-bold text-green-700">{formatPrice(estimate.final_price)}</p>
              <p className="text-xs text-gray-500 mt-1">{t('tax_included')}</p>
            </>
          ) : (
            <>
              <p className="text-xs text-indigo-600 font-medium mb-1">{t('rough_estimate_label')}</p>
              <p className="text-2xl font-bold text-indigo-700">
                {formatPrice(estimate.auto_min)} 〜 {formatPrice(estimate.auto_max)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{t('rough_estimate_note')}</p>
            </>
          )}
        </div>

        {estimate.status === 'pending' && (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full mt-3 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {t('photo_cta')}
          </button>
        )}

        {/* 職人コメント */}
        {estimate.craftsman_note && (
          <div className="bg-amber-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-amber-700 font-medium mb-1">{t('craftsman_comment_label')}</p>
            <p className="text-sm text-amber-900">{estimate.craftsman_note}</p>
          </div>
        )}

        {/* 即決UI */}
        {(estimate.status === 'confirmed' || estimate.status === 'booked') && estimate.final_price && (
          <div className="mt-4 border-2 border-indigo-200 rounded-xl p-4 bg-indigo-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                {t('limited_offer')}
              </span>
              <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                {t('offer_expiry')}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-4">{t('accent')}</p>
            <button
              onClick={handleBook}
              disabled={booked}
              className={`w-full py-3.5 rounded-xl font-bold text-base transition-all shadow-md ${
                booked
                  ? 'bg-green-500 text-white cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white'
              }`}
            >
              {booked ? '✓' : `${t('confirm')}（最短${estimate.tatami_count <= 8 ? 3 : 5}日）`}
            </button>
            {!booked && (
              <p className="text-center text-xs text-gray-400 mt-2">
                {t('no_extra_cost')}
              </p>
            )}
            <button
              onClick={() => window.location.href = `mailto:?subject=日程相談（見積もりID:${estimate.id}）`}
              className="w-full mt-2 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
            >
              {t('date')}
            </button>
          </div>
        )}

        {/* 工事詳細 */}
        <div className="space-y-2 text-sm mt-4">
          {[
            { label: t('size'), value: `${estimate.tatami_count}${t('tatami_unit')}` },
            { label: t('condition_label'), value: t(CONDITION_LABELS[estimate.condition]) },
            { label: t('material'), value: t(GRADE_LABELS[estimate.grade]) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-slate-200 last:border-0">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 写真セクション */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Camera size={18} className="text-indigo-600" />
          {t('site_photos')}
        </h3>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {photos.map((filename) => (
              <img
                key={filename}
                src={`/uploads/${filename}`}
                alt="現場写真"
                className="w-full aspect-square object-cover rounded-xl"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm mb-4">
            {t('no_photos')}
          </div>
        )}

        {(estimate.status === 'pending' || estimate.status === 'photo_uploaded') && (
          <>
            <input
              type="file"
              ref={fileRef}
              onChange={handleUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Upload size={18} />
              {uploading ? t('uploading') : t('photo')}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              {t('photo_instruction')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
