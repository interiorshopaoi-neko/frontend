import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const TRUST_POINTS = [
  { icon: '🔓', label: 'ログイン不要' },
  { icon: '🙅', label: 'しつこい営業なし' },
  { icon: '✅', label: '見積もりだけでもOK' },
];

const SERVICES = [
  { label: '壁紙・クロス張替え', icon: '🧱' },
  { label: 'クッションフロア',   icon: '🪵' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const handleStartEstimate = () => navigate('/corporate');

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-7px); }
        }
        .phone-float { animation: float 3.2s ease-in-out infinite; }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="px-5 pt-10 pb-14 max-w-md mx-auto">

        {/* ロゴ */}
        <div className="flex justify-center mb-8">
          <img src="/logo-full.svg" alt="PRO MATCH" className="h-8 object-contain" />
        </div>

        {/* スマホ撮影カード */}
        <div
          className="mb-7 rounded-3xl overflow-hidden shadow-xl phone-float"
          style={{ background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)' }}
        >
          <div className="px-5 pt-5 pb-6 flex flex-col items-center gap-4">
            {/* 録画インジケータ */}
            <div className="self-end flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white tracking-wide">REC</span>
            </div>

            {/* メインテキスト */}
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-white font-extrabold text-xl text-center leading-snug">
                ショート動画で<br />壁紙・床の見積もり
              </p>
              <p className="text-white/60 text-xs font-medium">30秒で撮影OK</p>

              {/* 対象バッジ */}
              <div className="flex gap-2 flex-wrap justify-center">
                <span className="text-xs font-semibold bg-white/10 text-white/80 px-3 py-1 rounded-full border border-white/20">
                  壁紙・クロス
                </span>
                <span className="text-xs font-semibold bg-white/10 text-white/80 px-3 py-1 rounded-full border border-white/20">
                  クッションフロア
                </span>
              </div>
            </div>

            {/* カメラボタン */}
            <div className="w-14 h-14 rounded-full border-4 border-white/80 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-white/90" />
            </div>
          </div>
        </div>

        {/* メインタイトル */}
        <h1 className="text-3xl font-bold text-slate-900 text-center leading-tight tracking-tight mb-3">
          <span className="block">ショート動画で、</span>
          <span className="block">壁紙・床の見積もり</span>
        </h1>

        {/* サブコピー */}
        <p className="text-slate-600 text-center mb-6 leading-relaxed">
          部屋を撮って送るだけ。対応できる職人が内容を確認します。
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
          見積もりをはじめる
        </button>

        {/* 無料補足 */}
        <p className="text-center text-sm text-slate-400">
          見積もり・相談は無料です
        </p>
      </section>

      {/* ── 対応工事 ─────────────────────────────────────────────── */}
      <section className="bg-slate-50 px-5 py-8">
        <div className="max-w-md mx-auto">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">
            対応中の工事
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SERVICES.map(({ label, icon }) => (
              <div
                key={label}
                className="bg-white rounded-2xl border border-slate-100 px-4 py-4 flex items-center gap-3 shadow-sm"
              >
                <span className="text-2xl">{icon}</span>
                <p className="text-sm font-bold text-slate-800">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA再表示 ────────────────────────────────────────────── */}
      <section
        className="px-5 py-14 text-center"
        style={{ background: 'linear-gradient(160deg, #1d4ed8 0%, #2563eb 60%, #1e40af 100%)' }}
      >
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-extrabold text-white mb-2 leading-snug">
            撮れたら、そのまま送るだけ
          </h2>
          <p className="text-sm text-blue-200 mb-7">
            見積もり・相談は無料です
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

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="py-6 px-5 pb-24 text-center border-t border-slate-100 bg-white space-y-2">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          <a href="/faq"     className="text-xs text-slate-400 hover:text-slate-600 transition-colors">よくある質問</a>
          <a href="/support" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">お問い合わせ</a>
          <a href="/terms"   className="text-xs text-slate-400 hover:text-slate-600 transition-colors">利用規約</a>
          <a href="/privacy" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">プライバシーポリシー</a>
        </div>
        <div className="flex justify-center gap-4 pt-1">
          <a href="/pro-signup" className="text-xs text-slate-300 hover:text-slate-500 transition-colors">職人登録</a>
          <a href="/legal"      className="text-xs text-slate-300 hover:text-slate-500 transition-colors">特定商取引法</a>
        </div>
      </footer>

      <BottomNav subtle />
    </div>
  );
}
