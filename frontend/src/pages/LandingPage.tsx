import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const goToRequest = () => navigate('/request');

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-blue-600 to-blue-500 text-white px-5 pt-14 pb-16 text-center">
        <p className="text-sm font-semibold tracking-widest uppercase text-blue-100 mb-3">
          内装工事の見積もり、もっと簡単に
        </p>
        <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4">
          ショート動画を送るだけで<br />
          <span className="text-yellow-300">すぐ見積もり</span>が届く
        </h1>
        <p className="text-blue-100 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
          わずか30秒の動画を撮って送るだけ。<br />
          あとは職人さんからの連絡を待つだけです。
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {['ログイン不要', '住所入力不要', '完全無料', 'しつこい営業なし'].map(b => (
            <span
              key={b}
              className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/30"
            >
              ✓ {b}
            </span>
          ))}
        </div>

        <button
          onClick={goToRequest}
          className="w-full max-w-xs bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-gray-900 font-black text-lg py-4 px-8 rounded-2xl shadow-lg shadow-blue-900/30 transition-all"
        >
          📹 ショート動画を送る
        </button>
        <p className="text-blue-200 text-xs mt-3">現在は無料でご利用いただけます</p>
      </section>

      {/* ── How to shoot ────────────────────────────────────────────── */}
      <section className="px-5 py-12 bg-gray-50">
        <div className="max-w-lg mx-auto">
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase text-center mb-2">
            撮影ガイド
          </p>
          <h2 className="text-xl font-black text-center mb-6">
            こんなふうに動画を撮ってください
          </h2>
          <div className="rounded-2xl overflow-hidden shadow-lg mb-8">
            <img
              src="/guide-short-video.jpg"
              alt="撮影ガイド"
              className="w-full object-cover"
            />
          </div>

          {/* 3 steps */}
          <div className="flex flex-col gap-4">
            {[
              { step: '1', icon: '🔄', title: 'ぐるっと全体を撮る', desc: '部屋全体が分かるように、ゆっくり一周回しながら撮影してください。' },
              { step: '2', icon: '🧱', title: '壁・床をしっかり映す', desc: '工事したい壁や床に近づいて、素材の状態が分かるよう映してください。' },
              { step: '3', icon: '🔍', title: '気になる箇所をアップで', desc: '剥がれ・傷・汚れなど特に気になる部分はアップで映すと精度が上がります。' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex gap-4 items-start bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                  {step}
                </div>
                <div>
                  <p className="font-bold text-sm mb-0.5">{icon} {title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Good / Bad examples ──────────────────────────────────────── */}
      <section className="px-5 py-12 bg-white">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-black text-center mb-6">
            動画のポイント
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-green-700 font-black text-sm mb-3">✅ こんな動画がベスト</p>
              <ul className="text-gray-700 text-xs space-y-2">
                <li className="flex gap-2"><span className="text-green-500">◎</span>明るい場所で撮影</li>
                <li className="flex gap-2"><span className="text-green-500">◎</span>全体 → 細部の順</li>
                <li className="flex gap-2"><span className="text-green-500">◎</span>10〜30秒程度</li>
                <li className="flex gap-2"><span className="text-green-500">◎</span>ゆっくり動かす</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-red-700 font-black text-sm mb-3">❌ これはNG</p>
              <ul className="text-gray-700 text-xs space-y-2">
                <li className="flex gap-2"><span className="text-red-400">×</span>暗くてピンボケ</li>
                <li className="flex gap-2"><span className="text-red-400">×</span>一部だけを映す</li>
                <li className="flex gap-2"><span className="text-red-400">×</span>3秒以下の短い動画</li>
                <li className="flex gap-2"><span className="text-red-400">×</span>画面が揺れすぎる</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Flow ─────────────────────────────────────────────────────── */}
      <section className="px-5 py-12 bg-blue-50">
        <div className="max-w-lg mx-auto">
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase text-center mb-2">
            利用の流れ
          </p>
          <h2 className="text-xl font-black text-center mb-8">
            3ステップで完結
          </h2>
          <div className="relative flex flex-col gap-0">
            {[
              { n: '01', title: '動画を撮って送る', desc: '30秒ほどの動画＋工事内容を選択して送信。住所・ログイン不要。' },
              { n: '02', title: '職人から見積もりが届く', desc: '地元の職人さんが動画を確認し、概算見積もりを連絡してくれます。' },
              { n: '03', title: '依頼する職人を選ぶ', desc: '複数の見積もりを比較して、気に入った職人さんにお願いするだけ。' },
            ].map(({ n, title, desc }, i) => (
              <div key={n} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {n}
                  </div>
                  {i < 2 && <div className="w-0.5 h-8 bg-blue-200 my-1" />}
                </div>
                <div className="pb-6">
                  <p className="font-bold text-sm mb-1">{title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="px-5 py-14 bg-gradient-to-b from-blue-600 to-blue-700 text-white text-center">
        <h2 className="text-2xl font-black mb-2">まずは動画を送ってみませんか？</h2>
        <p className="text-blue-200 text-sm mb-8 leading-relaxed">
          完全無料・ログイン不要で今すぐ試せます
        </p>
        <button
          onClick={goToRequest}
          className="w-full max-w-xs bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-gray-900 font-black text-lg py-4 px-8 rounded-2xl shadow-lg shadow-blue-900/30 transition-all mb-4"
        >
          📹 ショート動画を送る
        </button>
        <p className="text-blue-300 text-xs">現在は無料でご利用いただけます</p>
      </section>

      {/* ── Footer links ─────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 text-xs text-center py-6 px-4">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-3">
          <a href="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</a>
          <a href="/terms"   className="hover:text-white transition-colors">利用規約</a>
          <a href="/policy"  className="hover:text-white transition-colors">料金ポリシー</a>
          <a href="/support" className="hover:text-white transition-colors">お問い合わせ</a>
          <a href="/craftsman/jobs" className="hover:text-white transition-colors">職人の方はこちら</a>
        </div>
        <p className="text-gray-600 text-xs">© 2025 PRO MATCH</p>
      </footer>
    </div>
  );
}
