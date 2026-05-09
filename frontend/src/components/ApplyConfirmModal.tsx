import { useEffect } from 'react';
import type { Job } from '../pages/craftsman/CraftsmanJobsPage';
import { FEE_TABLE } from '../constants/fees';

type Props = {
  job: Job;
  onCancel: () => void;
  onConfirm: () => void;
};

function estimateRevenue(job: Job): string {
  const base =
    job.work_type === '床補修' || job.work_type === '床工事' ? 30000
    : job.work_type?.includes('クロス') ? 20000
    : 15000;
  const factor =
    job.room_size?.includes('12') ? 2.0
    : job.room_size?.includes('10') ? 1.6
    : job.room_size?.includes('8') ? 1.3
    : 1.0;
  const min = Math.round((base * factor) / 1000) * 1000;
  const max = Math.round((min * 1.5) / 1000) * 1000;
  return `¥${Math.round(min / 10000)}〜${Math.round(max / 10000)}万`;
}

function timingLabel(job: Job): string {
  if (job.preferred_date) return job.preferred_date;
  if (job.urgency === 'today')    return '今日中';
  if (job.urgency === 'tomorrow') return '明日まで';
  if (job.urgency === 'soon')     return '数日以内';
  return '急ぎなし';
}

export default function ApplyConfirmModal({ job, onCancel, onConfirm }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const revenue = estimateRevenue(job);
  const timing  = timingLabel(job);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);   opacity: 1; }
          }
        `}</style>

        {/* ヘッダー */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-extrabold text-slate-800">応募の確認</h2>
          <p className="text-sm text-slate-500 mt-0.5">内容をご確認のうえ応募してください</p>
        </div>

        {/* 案件サマリー */}
        <div className="px-6 pt-4 pb-2 space-y-2.5">
          {[
            { label: '施工内容',     value: job.work_type || '内装工事'  },
            { label: 'エリア',       value: job.city       || 'エリア未設定' },
            { label: '想定売上目安', value: revenue                      },
            { label: '希望時期',     value: timing                       },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{label}</span>
              <span className="text-sm font-bold text-slate-800">{value}</span>
            </div>
          ))}

          {(job.has_video || job.has_photos) && (
            <div className="flex items-center gap-2 pt-1">
              {job.has_video  && <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">🎬 動画あり</span>}
              {job.has_photos && <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">📷 写真あり</span>}
            </div>
          )}
        </div>

        {/* 手数料説明ブロック */}
        <div className="px-6 pt-3 pb-4">
          <div className="bg-blue-50 rounded-2xl px-4 py-4">
            <p className="text-xs font-extrabold text-blue-700 mb-2.5">💡 成約時の手数料について</p>
            <ul className="space-y-1.5 mb-3">
              <li className="text-xs text-slate-600 flex items-start gap-1.5">
                <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                応募するだけでは料金は一切発生しません
              </li>
              <li className="text-xs text-slate-600 flex items-start gap-1.5">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
                お客様と成約したときだけ、手数料が発生します
              </li>
              <li className="text-xs text-slate-600 flex items-start gap-1.5">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
                手数料は、案件掲載・通知・マッチング運営のための費用です
              </li>
              <li className="text-xs text-slate-600 flex items-start gap-1.5">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
                成約時点の概算金額をもとに確定します。工事後に金額が増減しても、原則として再計算しません
              </li>
            </ul>

            <div className="border-t border-blue-100 pt-3">
              <p className="text-[10px] font-bold text-blue-600 mb-1.5">手数料の目安</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {FEE_TABLE.map(({ label, feeLabel }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{label}</span>
                    <span className="text-[11px] font-bold text-slate-700">{feeLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTAボタン */}
        <div className="px-6 pb-6 pt-0 space-y-2.5">
          <button
            onClick={onConfirm}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3.5 font-extrabold text-base shadow-sm shadow-blue-200 transition active:scale-[0.98]"
          >
            この案件に応募する
          </button>
          <button
            onClick={onCancel}
            className="w-full text-slate-400 text-sm py-2.5 font-medium hover:text-slate-600 transition"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
