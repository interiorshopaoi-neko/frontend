// TODO(legacy): api.post('/estimates') は root api/ に serverless function がなく本番では動作しない。
// Supabase client 直接統合へ移行するまでこの画面の送信処理は機能しない。
// 参照: docs/CURRENT_STATUS.md「Legacy API 呼び出し」セクション
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLangContext } from '../../context/LangContext';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { WorkType, Condition, Grade } from '../../types';
import { WORK_TYPE_LABELS, CONDITION_LABELS, GRADE_LABELS, formatPrice } from '../../utils/labels';
import type { I18nKey } from '../../data/i18n';
import api from '../../utils/api';

// Internal room option values (Japanese) — stored in DB as-is
const ROOM_OPTIONS_JP = ['リビング', '寝室', '子供部屋', '和室', '廊下', 'トイレ', '洗面所', 'キッチン', 'その他'] as const;
const ROOM_OPTION_KEYS: Record<string, I18nKey> = {
  'リビング': 'room_living', '寝室': 'room_bedroom', '子供部屋': 'room_kids',
  '和室': 'room_japanese', '廊下': 'room_hall', 'トイレ': 'room_toilet',
  '洗面所': 'room_washroom', 'キッチン': 'room_kitchen', 'その他': 'room_other',
};

interface FormData {
  workType: WorkType;
  roomName: string;
  customRoomName: string;
  tatamiCount: string;
  condition: Condition;
  grade: Grade;
  hasExistingCf: boolean;
}

// 概算計算（フロント側でもリアルタイム表示用）
function calcEstimate(f: FormData) {
  const tatami = parseFloat(f.tatamiCount) || 0;
  const CROSS_MATERIAL: Record<Grade, number> = { economy: 1050, standard: 1450, premium: 2200 };
  const CROSS_CONDITION: Record<Condition, number> = { good: 1.0, normal: 1.15, bad: 1.3 };
  const CF_MATERIAL: Record<Grade, number> = { economy: 1200, standard: 1800, premium: 2400 };
  let total = 0;
  if (f.workType === 'cross' || f.workType === 'both') {
    const wallArea = tatami * 1.62 * 2.4 * 0.85;
    total += wallArea * CROSS_MATERIAL[f.grade] + wallArea * 900 * CROSS_CONDITION[f.condition] + 3000;
  }
  if (f.workType === 'cf' || f.workType === 'both') {
    const floorArea = tatami * 1.62;
    total += floorArea * CF_MATERIAL[f.grade] + floorArea * 1200 + (f.hasExistingCf ? floorArea * 800 : 0);
  }
  return {
    min: Math.round(total * 0.9 / 100) * 100,
    max: Math.round(total * 1.1 / 100) * 100,
  };
}

export default function NewEstimate() {
  const [step, setStep] = useState(0);
  const { t } = useLangContext();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    workType: 'cross',
    roomName: 'リビング',
    customRoomName: '',
    tatamiCount: '',
    condition: 'normal',
    grade: 'standard',
    hasExistingCf: false,
  });
  const navigate = useNavigate();

  const STEPS = [
    t('work_type_label'), t('location_label'), t('size'),
    t('condition_label'), t('material'), t('step_summary'),
  ];

  const roomName = form.roomName === 'その他' ? form.customRoomName : form.roomName;

  const canNext = () => {
    if (step === 2) return parseFloat(form.tatamiCount) > 0;
    if (step === 1 && form.roomName === 'その他') return form.customRoomName.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/estimates', {
        workType: form.workType,
        roomName,
        tatamiCount: parseFloat(form.tatamiCount),
        condition: form.condition,
        grade: form.grade,
        hasExistingCf: form.hasExistingCf,
      });
      navigate(`/customer/estimate/${data.id}`);
    } catch {
      alert(t('error_retry'));
    } finally {
      setLoading(false);
    }
  };

  const estimate = calcEstimate(form);

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Step {step + 1} / {STEPS.length}</span>
          <span className="text-sm font-medium text-indigo-600">{STEPS[step]}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

        {/* Step 0: Work type */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('step0_q')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('step0_hint')}</p>
            <div className="space-y-3">
              {(Object.entries(WORK_TYPE_LABELS) as [WorkType, I18nKey][]).map(([value, labelKey]) => (
                <button
                  key={value}
                  onClick={() => setForm({ ...form, workType: value })}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    form.workType === value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      form.workType === value ? 'border-indigo-500' : 'border-gray-300'
                    }`}>
                      {form.workType === value && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{t(labelKey)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {value === 'cross' && t('work_type_cross_desc')}
                        {value === 'cf' && t('work_type_cf_desc')}
                        {value === 'both' && t('work_type_both_desc')}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('step1_q')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('step1_hint')}</p>
            <div className="grid grid-cols-3 gap-2">
              {ROOM_OPTIONS_JP.map((room) => (
                <button
                  key={room}
                  onClick={() => setForm({ ...form, roomName: room })}
                  className={`py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.roomName === room
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t(ROOM_OPTION_KEYS[room])}
                </button>
              ))}
            </div>
            {form.roomName === 'その他' && (
              <input
                type="text"
                value={form.customRoomName}
                onChange={(e) => setForm({ ...form, customRoomName: e.target.value })}
                placeholder={t('room_name_placeholder')}
                className="mt-3 w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}
          </div>
        )}

        {/* Step 2: Size */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('step2_q')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('step2_hint')}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tatami_or_sqm')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={form.tatamiCount}
                    onChange={(e) => setForm({ ...form, tatamiCount: e.target.value })}
                    placeholder="例: 8"
                    min="1"
                    max="100"
                    step="0.5"
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="text-gray-500 font-medium">{t('tatami_unit')}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">{t('sqm_note')}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">{t('common_sizes')}</p>
                <div className="grid grid-cols-4 gap-2">
                  {['4.5', '6', '8', '10', '12', '14', '16', '18'].map((n) => (
                    <button
                      key={n}
                      onClick={() => setForm({ ...form, tatamiCount: n })}
                      className={`py-2 text-sm rounded-lg border transition-all ${
                        form.tatamiCount === n
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {n}{t('tatami_unit')}
                    </button>
                  ))}
                </div>
              </div>

              {(form.workType === 'cf' || form.workType === 'both') && (
                <div
                  onClick={() => setForm({ ...form, hasExistingCf: !form.hasExistingCf })}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.hasExistingCf ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    form.hasExistingCf ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                  }`}>
                    {form.hasExistingCf && <Check size={12} className="text-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t('has_existing_cf')}</div>
                    <div className="text-xs text-gray-500">{t('cf_removal_note')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Condition */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('step3_q')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('step3_hint')}</p>
            <div className="space-y-3">
              {([
                { value: 'good', emoji: '✨', descKey: 'condition_good_desc' },
                { value: 'normal', emoji: '🙂', descKey: 'condition_normal_desc' },
                { value: 'bad', emoji: '😟', descKey: 'condition_bad_desc' },
              ] as { value: Condition; emoji: string; descKey: I18nKey }[]).map(({ value, emoji, descKey }) => (
                <button
                  key={value}
                  onClick={() => setForm({ ...form, condition: value })}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    form.condition === value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{t(CONDITION_LABELS[value])}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{t(descKey)}</div>
                    </div>
                    {form.condition === value && (
                      <Check size={16} className="ml-auto text-indigo-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Grade */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('step4_q')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('step4_hint')}</p>
            <div className="space-y-3">
              {([
                { value: 'economy', emoji: '💰', descKey: 'grade_economy_desc', badgeKey: 'badge_budget' },
                { value: 'standard', emoji: '⭐', descKey: 'grade_standard_desc', badgeKey: 'badge_popular' },
                { value: 'premium', emoji: '👑', descKey: 'grade_premium_desc', badgeKey: 'badge_premium_label' },
              ] as { value: Grade; emoji: string; descKey: I18nKey; badgeKey: I18nKey }[]).map(({ value, emoji, descKey, badgeKey }) => (
                <button
                  key={value}
                  onClick={() => setForm({ ...form, grade: value })}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    form.grade === value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{t(GRADE_LABELS[value])}</span>
                        {value === 'standard' && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{t(badgeKey)}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{t(descKey)}</div>
                    </div>
                    {form.grade === value && (
                      <Check size={16} className="text-indigo-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            {form.grade && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm bg-green-50 text-green-700">
                <span>✓</span><span className="font-medium">{t('content_ok')}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Summary */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('rough_estimate_title')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('rough_estimate_note')}</p>

            <div className="bg-indigo-50 rounded-2xl p-5 mb-5 text-center">
              <p className="text-sm text-indigo-600 font-medium mb-1">{t('rough_estimate_label')}</p>
              <p className="text-3xl font-bold text-indigo-700">
                {formatPrice(estimate.min)} 〜 {formatPrice(estimate.max)}
              </p>
              <p className="text-xs text-gray-500 mt-2">{t('estimate_accuracy_note')}</p>
            </div>

            <div className="space-y-2 text-sm">
              {[
                { label: t('work_type_label'), value: t(WORK_TYPE_LABELS[form.workType]) },
                { label: t('location_label'), value: roomName },
                { label: t('size'), value: `${form.tatamiCount}${t('tatami_unit')}` },
                { label: t('condition_label'), value: t(CONDITION_LABELS[form.condition]) },
                { label: t('material'), value: t(GRADE_LABELS[form.grade]) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-200 last:border-0">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
              {t('after_submit_note')}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-4">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={18} />
            {t('back')}
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold transition-colors"
          >
            {t('next')}
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold transition-colors"
          >
            {loading ? t('submitting') : t('start')}
          </button>
        )}
      </div>
    </div>
  );
}
