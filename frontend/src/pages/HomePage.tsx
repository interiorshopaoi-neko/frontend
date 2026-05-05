import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const TRUST_POINTS = [
  { icon: '🔓', label: 'ログイン不要' },
  { icon: '🙅', label: 'しつこい営業なし' },
  { icon: '🔨', label: '近くの職人が確認' },
];

const STEPS = [
  { num: '①', title: '部屋をぐるっと撮る', desc: '壁・天井・全体を一周するように撮影' },
  { num: '②', title: '壁・床を映す',       desc: '施工する面をゆっくり映してください' },
  { num: '③', title: '気になる所をアップ', desc: '傷・汚れなど問題箇所を近くで撮影' },
];

const GOOD_EXAMPLES = ['明るい場所で撮る', 'ゆっくり動かす', '気になる場所を近くで撮る'];
const BAD_EXAMPLES  = ['暗い', 'ブレている', '遠すぎて見えない'];

export default function HomePage() {
  const navigate = useNavigate();

  const handleStartEstimate = () => navigate('/corporate');

  const scrollToGuide = () => {
    document.getElementById('guide')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="px-5 pt-10 pb-14 max-w-md mx-auto">

        {/* ロゴ */}
        <div className="flex justify-center mb-8">
          <Logo size={36} />
        </div>

        {/* スマホ撮影カード */}
        <div className="mb-7 bg-slate-900 rounded-3xl overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)' }}>
          <div className="px-5 pt-5 pb-6 flex flex-col items-center gap-4">
            {/* 録画インジケータ */}
            <div className="self-end flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white tracking-wide">REC</span>
            </div>

            {/* 中央アイコン */}
            <div className="flex flex-col items-center gap-3 select-none py-2">
              <div className="w-20 h-20 rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center">
                <span className="text-4xl">🎬</span>
              </div>
              <p className="text-white/60 text-xs font-medium text-center">
                部屋をゆっくり一周するように撮影
              </p>
            </div>

            {/* カメラボタン */}
            <div className="w-14 h-14 rounded-full border-4 border-white/80 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-white/90" />
            </div>
          </div>
        </div>

        {/* バッジ */}
        <div className="flex justify-center mb-5">
          <span className="inline-block bg-yellow-400 text-yellow-900 text-sm font-bold px-4 py-1 rounded-full shadow-sm">
            30秒で完了
          </span>
        </div>

        {/* メインタイトル */}
        <h1 className="text-3xl font-bold text-slate-900 text-center leading-tight tracking-tight mb-3">
          <span className="block">ショート動画で、</span>
          <span className="block">すぐ見積もり</span>
        </h1>

        {/* サブコピー */}
        <p className="text-slate-600 text-center mb-6">
          部屋を撮るだけ。プロがすぐ確認。
        </p>

        {/* 信頼要素 */}
        <div className="flex flex-col gap-2 mb-6">
          {TRUST_POINTS.map(({ icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-2 text-sm text-slate-700">
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* メインCTA */}
        <button
          onClick={handleStartEstimate}
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-lg shadow-lg transition-all mb-3"
        >
          30秒で見積もりする →
        </button>

        {/* サブCTA */}
        <p className="text-center text-sm text-slate-500 mb-2">
          今だけ無料（正式版は300円予定）
        </p>

        {/* ソーシャルプルーフ */}
        <p className="text-center text-xs text-slate-400">
          ・今日すでに3件依頼されています
        </p>
      </section>

      {/* ── 撮影ガイド ──────────────────────────────────────── */}
      <section id="guide" className="bg-slate-50 px-5 py-14">
        <div className="max-w-md mx-auto">

          {/* 見出し */}
          <div className="text-center mb-6">
            <span className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 tracking-wide">
              GUIDE
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 leading-snug mb-2">
              撮り方はかんたん3ステップ
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              この通りに撮るだけで、職人が内容を確認しやすくなります。
            </p>
          </div>

          {/* ガイド画像 */}
          <img
            src="/guide-short-video.jpg"
            alt="撮影ガイド"
            className="w-full rounded-2xl shadow-md mb-7 object-cover"
          />

          {/* 3ステップカード */}
          <div className="space-y-3">
            {STEPS.map(({ num, title, desc }) => (
              <div
                key={num}
                className="bg-white rounded-2xl border border-blue-100 px-5 py-4 flex items-start gap-4 shadow-sm"
              >
                <span className="text-xl font-extrabold text-blue-600 flex-shrink-0 w-7 leading-none pt-0.5">
                  {num}
                </span>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 良い例・悪い例 ────────────────────────────────── */}
      <section className="px-5 py-14 bg-white">
        <div className="max-w-md mx-auto">

          <h3 className="text-base font-extrabold text-slate-800 text-center mb-5">
            撮影のポイント
          </h3>

          <div className="flex flex-col gap-3">
            {/* 良い例 */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-sm font-extrabold text-emerald-800">良い例</span>
              </div>
              <div className="flex flex-col gap-2">
                {GOOD_EXAMPLES.map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <span className="text-emerald-500 font-bold text-sm flex-shrink-0">✓</span>
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 悪い例 */}
            <div className="rounded-2xl border-2 border-red-100 bg-red-50 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-red-400 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M3 3l4 4M7 3l-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-sm font-extrabold text-red-700">悪い例</span>
              </div>
              <div className="flex flex-col gap-2">
                {BAD_EXAMPLES.map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <span className="text-red-400 font-bold text-sm flex-shrink-0">✗</span>
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA再表示 ───────────────────────────────────────── */}
      <section
        className="px-5 py-14 text-center"
        style={{ background: 'linear-gradient(160deg, #1d4ed8 0%, #2563eb 60%, #1e40af 100%)' }}
      >
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-extrabold text-white mb-2 leading-snug">
            撮れたら、そのまま送るだけ
          </h2>
          <p className="text-sm text-blue-200 mb-7">
            現在は無料で利用できます
          </p>
          <button
            onClick={handleStartEstimate}
            className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-yellow-900 font-extrabold text-[0.95rem] shadow-lg shadow-blue-900/40 transition-all whitespace-nowrap"
          >
            ショート動画で見積もりする
          </button>
          <p className="text-xs text-blue-300 mt-4">
            ログイン不要・登録なし・無料
          </p>
        </div>
      </section>

      {/* ── Footer：職人向け導線 ─────────────────────────────── */}
      <footer className="py-8 px-5 text-center border-t border-slate-100 bg-white">
        <a
          href="/craftsman/jobs"
          className="text-xs text-slate-400 hover:text-blue-600 hover:underline transition-colors"
        >
          職人の方はこちら →
        </a>
        <div className="mt-4 flex justify-center gap-5">
          <a href="/policy" className="text-xs text-slate-300 hover:text-slate-500 transition-colors">
            料金・ポリシー
          </a>
          <a href="/pro-signup" className="text-xs text-slate-300 hover:text-slate-500 transition-colors">
            職人登録
          </a>
        </div>
      </footer>

    </div>
  );
}
