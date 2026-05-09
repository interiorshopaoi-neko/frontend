import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Video,
  Camera,
  MapPin,
  Wallet,
  ArrowRight,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';

/* 未登録/未ログイン状態で /pro/jobs ・ /craftsman/jobs を表示する場合の
 * 安全なプレビュー画面。実データ（estimate_requests）は一切読み込まず、
 * 都道府県レベル + 工事種別 + 想定売上目安 + 動画あり/写真あり有無のみ表示。
 * 詳細メモ・市町村以下の住所・連絡先・動画/写真ボタン・応募ボタンは出さない。
 */

const SAMPLE_JOBS = [
  {
    workType: 'クロス張替え',
    pref: '群馬県',
    revenue: '3〜6万円前後',
    hasVideo: true,
    hasPhoto: true,
  },
  {
    workType: '床補修',
    pref: '埼玉県',
    revenue: '5〜10万円前後',
    hasVideo: true,
    hasPhoto: true,
  },
  {
    workType: 'クロス補修',
    pref: '東京都',
    revenue: '2〜4万円前後',
    hasVideo: false,
    hasPhoto: true,
  },
  {
    workType: '床工事',
    pref: '栃木県',
    revenue: '6〜12万円前後',
    hasVideo: true,
    hasPhoto: true,
  },
] as const;

export default function JobsLockedPreview() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/for-pros')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft size={14} />
            職人LPへ
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            ログイン
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-7 pb-24">
        {/* タイトル */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 mb-3">
            <Sparkles size={11} />
            <span className="text-[10px] font-bold tracking-wide">SAMPLE PREVIEW</span>
          </div>
          <h1 className="text-[22px] font-black text-slate-900 leading-snug mb-2">
            案件の雰囲気を<br />サンプルでご紹介
          </h1>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            動画・詳細・応募は<span className="font-bold text-slate-700">無料の職人登録</span>後にご利用いただけます。<br />
            実際の案件データは登録後に表示されます。
          </p>
        </div>

        {/* ロック注意バー */}
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 flex items-start gap-2 mb-6">
          <Lock size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11.5px] text-amber-800 leading-relaxed font-semibold">
            ここはサンプル表示です。お客様の連絡先・詳細メモ・動画/写真は登録した職人だけに公開されます。
          </p>
        </div>

        {/* サンプルカード */}
        <div className="space-y-2.5 mb-6">
          {SAMPLE_JOBS.map((j, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
            >
              <div className="px-4 pt-3.5 pb-3">
                <p className="text-sm font-bold text-slate-900 leading-tight mb-1.5">
                  {j.workType}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} className="text-slate-400" />
                    {j.pref}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Wallet size={11} className="text-slate-400" />
                    想定売上 <span className="font-semibold text-slate-700">{j.revenue}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {j.hasVideo && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 text-[10px] font-bold">
                      <Video size={10} />
                      動画あり
                    </span>
                  )}
                  {j.hasPhoto && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 text-slate-600 border border-slate-100 px-1.5 py-0.5 text-[10px] font-bold">
                      <Camera size={10} />
                      写真あり
                    </span>
                  )}
                </div>
              </div>

              {/* ロック帯：詳細・動画・応募ボタンの代わり */}
              <div className="relative border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                <div className="flex items-center gap-2 select-none" aria-hidden>
                  <div className="flex-1 h-7 rounded-md bg-slate-200/70 blur-[2px]" />
                  <div className="w-16 h-7 rounded-md bg-slate-200/70 blur-[2px]" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-white/55 backdrop-blur-[1px]">
                  <Lock size={12} className="text-slate-500" />
                  <span className="text-[11px] font-bold text-slate-600">
                    詳細・動画・応募は職人登録後
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/register')}
          className="w-full py-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-black text-[14.5px] transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
        >
          無料で職人登録する
          <ArrowRight size={16} />
        </button>
        <button
          onClick={() => navigate('/for-pros')}
          className="w-full mt-2.5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-900 font-bold text-[13px] border border-slate-200 transition-all"
        >
          職人LPに戻る
        </button>

        <p className="text-center text-[11px] text-slate-400 mt-3">
          登録・案件閲覧・応募はすべて無料 / 営業電話なし
        </p>
      </main>
    </div>
  );
}
