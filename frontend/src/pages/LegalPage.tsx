import { useNavigate } from 'react-router-dom';

const ROWS: { label: string; value: string }[] = [
  { label: 'サービス名',     value: 'PRO MATCH' },
  { label: '運営者',         value: '（運営者名・法人名を記載予定）' },
  { label: '所在地',         value: '（住所を記載予定）' },
  { label: '問い合わせ先',   value: 'サポートページよりお問い合わせください' },
  { label: 'サービス料金',   value: 'お客様：無料 / 職人：成約時500円〜5,000円（概算金額により変動）' },
  { label: '支払時期',       value: '成約確定後' },
  { label: '支払方法',       value: '（決済方法は今後追加予定）' },
  { label: 'キャンセルについて', value: '成約前はキャンセル料なし。成約後は依頼者・職人間で直接ご相談ください。' },
  { label: '工事代金の取り扱い', value: 'PRO MATCHは工事代金を預かりません。工事代金は依頼者と職人が直接やり取りします。' },
];

export default function LegalPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 p-1 -ml-1 rounded-xl transition" aria-label="戻る">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">特定商取引法に基づく表記</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Legal Notice</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        <p className="text-[11px] text-slate-400 px-1">最終更新：2026年5月</p>

        <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden divide-y divide-slate-100">
          {ROWS.map(r => (
            <div key={r.label} className="px-5 py-3.5 flex gap-4">
              <p className="text-xs font-bold text-slate-500 w-32 flex-shrink-0 leading-relaxed">{r.label}</p>
              <p className="text-xs text-slate-700 leading-relaxed flex-1">{r.value}</p>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
          ※ 一部情報は準備中です。正式公開前に更新します。
        </p>
      </div>
    </div>
  );
}
