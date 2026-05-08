import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const TRUST_BADGES = ['ログイン不要', '住所入力不要', 'しつこい営業なし', '地元の職人と直接つながる'];

export default function HomePage() {
  const navigate = useNavigate();

  const handleStartEstimate = () => navigate('/corporate');

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes heroScene1 {
          0%, 22%   { opacity: 1; }
          27%, 97%  { opacity: 0; }
          100%      { opacity: 0; }
        }
        @keyframes heroScene2 {
          0%, 22%   { opacity: 0; }
          27%, 47%  { opacity: 1; }
          52%, 100% { opacity: 0; }
        }
        @keyframes heroScene3 {
          0%, 47%   { opacity: 0; }
          52%, 72%  { opacity: 1; }
          77%, 100% { opacity: 0; }
        }
        @keyframes heroScene4 {
          0%, 72%   { opacity: 0; }
          77%, 97%  { opacity: 1; }
          100%      { opacity: 0; }
        }
        @keyframes heroPan {
          0%   { transform: translateX(0%); }
          50%  { transform: translateX(-18%); }
          100% { transform: translateX(0%); }
        }
        @keyframes heroZoom {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes heroDots {
          0%, 20%  { opacity: 0.3; }
          40%      { opacity: 1; }
          60%, 80% { opacity: 0.3; }
          100%     { opacity: 0.3; }
        }
        @keyframes heroSlideUp {
          0%   { transform: translateY(14px); opacity: 0; }
          100% { transform: translateY(0px);  opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-scene   { animation: none !important; opacity: 0 !important; }
          .hero-scene-1 { opacity: 1 !important; }
          .hero-pan, .hero-zoom, .hero-slideup { animation: none !important; transform: none !important; }
          .hero-dots span { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="px-5 pt-10 pb-14 max-w-md mx-auto">

        {/* ロゴ */}
        <div className="flex justify-center mb-8">
          <img src="/logo-full.svg" alt="PRO MATCH" className="h-9 object-contain" />
        </div>

        {/* 疑似体験アニメーション */}
        <div className="mb-7 rounded-3xl overflow-hidden shadow-xl select-none"
          style={{ height: 220, position: 'relative', background: '#f5f0eb' }}>

          {/* Scene 1: 撮影中（明るい室内カメラビュー） */}
          <div className="hero-scene hero-scene-1" style={{
            position: 'absolute', inset: 0,
            animation: 'heroScene1 12s ease-in-out infinite',
          }}>
            {/* 部屋の背景パン */}
            <div className="hero-pan" style={{
              position: 'absolute', inset: 0, overflow: 'hidden',
              background: '#f0ebe4',
              animation: 'heroPan 12s ease-in-out infinite',
            }}>
              {/* 天井 */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '18%', background: '#fafaf8' }} />
              {/* 壁（アイボリー） */}
              <div style={{ position: 'absolute', top: '18%', left: 0, right: 0, bottom: '34%', background: '#f5f0e8' }} />
              {/* 壁と床の境目（幅木） */}
              <div style={{ position: 'absolute', bottom: '34%', left: 0, right: 0, height: 4, background: '#d6cfc4' }} />
              {/* 床（明るい木目風） */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '34%', background: 'repeating-linear-gradient(90deg, #ddd0bb 0px, #ddd0bb 48px, #cfc1a8 48px, #cfc1a8 50px)' }} />

              {/* 窓（左側） */}
              <div style={{ position: 'absolute', top: '22%', left: '6%', width: 52, height: 72, background: '#d6eaf5', border: '3px solid #c8d8e4', borderRadius: 3, boxShadow: 'inset 0 0 12px rgba(180,220,255,0.4)' }}>
                <div style={{ position: 'absolute', top: '48%', left: 0, right: 0, height: 2, background: '#b8cad4' }} />
                <div style={{ position: 'absolute', left: '48%', top: 0, bottom: 0, width: 2, background: '#b8cad4' }} />
              </div>

              {/* ソファ（中央） */}
              <div style={{ position: 'absolute', bottom: '34%', left: '34%', width: 90, height: 36 }}>
                {/* 背もたれ */}
                <div style={{ position: 'absolute', top: 0, left: 4, right: 4, height: 22, background: '#c4a882', borderRadius: '6px 6px 0 0' }} />
                {/* 座面 */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 16, background: '#b89a6e', borderRadius: '0 0 4px 4px' }} />
                {/* 肘掛け */}
                <div style={{ position: 'absolute', top: 4, left: 0, width: 10, height: 18, background: '#b89a6e', borderRadius: '4px 0 0 4px' }} />
                <div style={{ position: 'absolute', top: 4, right: 0, width: 10, height: 18, background: '#b89a6e', borderRadius: '0 4px 4px 0' }} />
              </div>

              {/* 壁の染み・工事箇所（右壁） */}
              <div style={{ position: 'absolute', top: '28%', right: '8%', width: 38, height: 30, background: 'rgba(180,160,130,0.35)', borderRadius: 6, border: '1.5px dashed rgba(160,140,110,0.6)' }} />
              <div style={{ position: 'absolute', top: '24%', right: '12%', width: 16, height: 16, background: 'rgba(180,160,130,0.25)', borderRadius: '50%' }} />
            </div>

            {/* ビューファインダー枠 */}
            <div style={{ position: 'absolute', inset: 12, border: '1.5px solid rgba(255,255,255,0.55)', borderRadius: 16, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: -1, left: -1, width: 18, height: 18, borderTop: '3px solid rgba(255,255,255,0.95)', borderLeft: '3px solid rgba(255,255,255,0.95)', borderRadius: '12px 0 0 0' }} />
              <div style={{ position: 'absolute', top: -1, right: -1, width: 18, height: 18, borderTop: '3px solid rgba(255,255,255,0.95)', borderRight: '3px solid rgba(255,255,255,0.95)', borderRadius: '0 12px 0 0' }} />
              <div style={{ position: 'absolute', bottom: -1, left: -1, width: 18, height: 18, borderBottom: '3px solid rgba(255,255,255,0.95)', borderLeft: '3px solid rgba(255,255,255,0.95)', borderRadius: '0 0 0 12px' }} />
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 18, height: 18, borderBottom: '3px solid rgba(255,255,255,0.95)', borderRight: '3px solid rgba(255,255,255,0.95)', borderRadius: '0 0 12px 0' }} />
            </div>
            {/* RECインジケータ */}
            <div style={{ position: 'absolute', top: 20, right: 22, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.45)', borderRadius: 20, padding: '4px 10px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.08em' }}>REC</span>
            </div>
            {/* ガイドラベル */}
            <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', fontWeight: 600, background: 'rgba(255,255,255,0.75)', borderRadius: 20, padding: '3px 10px' }}>部屋を一周しながら撮影中...</span>
            </div>
          </div>

          {/* Scene 2: 送信完了（ズームアウト + チェック） */}
          <div className="hero-scene" style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            animation: 'heroScene2 12s ease-in-out infinite',
          }}>
            <div className="hero-zoom" style={{ animation: 'heroZoom 3s ease-in-out infinite' }}>
              <div style={{ width: 68, height: 68, borderRadius: 20, background: 'rgba(59,130,246,0.25)', border: '2px solid rgba(59,130,246,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 32 }}>📤</span>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 700, margin: 0 }}>動画を送信しました</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>職人が確認します</p>
          </div>

          {/* Scene 3: 職人が確認中 */}
          <div className="hero-scene" style={{
            position: 'absolute', inset: 0,
            background: '#f8fafc',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            animation: 'heroScene3 12s ease-in-out infinite',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 26 }}>🔍</span>
            </div>
            <p style={{ color: '#0f172a', fontSize: 14, fontWeight: 700, margin: 0 }}>職人が動画を確認中</p>
            <div className="hero-dots" style={{ display: 'flex', gap: 6 }}>
              {[0, 0.35, 0.7].map((delay, i) => (
                <span key={i} style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block',
                  animation: `heroDots 1.4s ease-in-out ${delay}s infinite`,
                }} />
              ))}
            </div>
          </div>

          {/* Scene 4: 見積もり到着 */}
          <div className="hero-scene" style={{
            position: 'absolute', inset: 0,
            background: '#f0fdf4',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0,
            animation: 'heroScene4 12s ease-in-out infinite',
          }}>
            <div className="hero-slideup" style={{ animation: 'heroSlideUp 0.5s ease-out forwards', width: '80%' }}>
              <div style={{
                background: '#fff', borderRadius: 16, padding: '16px 18px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.10)', border: '1px solid #d1fae5',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#065f46' }}>見積もりが届きました</span>
                </div>
                <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                  対応できる職人から<br />連絡があります
                </p>
              </div>
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
          <span className="block">職人から、</span>
          <span className="block">直接見積もりが届く。</span>
        </h1>

        {/* サブコピー */}
        <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
          部屋を30秒撮るだけ。<br />
          現場を見た職人が、直接確認します。
        </p>

        {/* 信頼バッジ */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {TRUST_BADGES.map(label => (
            <div key={label} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
              <span className="text-blue-500 font-bold text-xs leading-none flex-shrink-0">✓</span>
              <span className="text-xs font-semibold text-slate-700 leading-tight">{label}</span>
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
          お客様は完全無料・ログイン不要
        </p>

      </section>

      {/* ── 利用の流れ ──────────────────────────────────────── */}
      <section className="px-5 py-14 bg-blue-50">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <span className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 tracking-wide">
              FLOW
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
              送ったあと、どうなるの？
            </h2>
          </div>
          <div className="relative flex flex-col gap-0">
            {([
              { n: '01', title: '動画を送る',           desc: '部屋を1周撮影して送信。30秒でOK。' },
              { n: '02', title: '職人から見積もりが届く', desc: '動画を確認した職人から、直接見積もりが届きます。' },
              { n: '03', title: '気に入った職人を選ぶ',  desc: '複数の見積もりを比べて、職人を選ぶだけ。' },
            ] as const).map(({ n, title, desc }, i) => (
              <div key={n} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs flex-shrink-0">
                    {n}
                  </div>
                  {i < 2 && <div className="w-0.5 h-8 bg-blue-200 my-1" />}
                </div>
                <div className="pb-6">
                  <p className="font-bold text-sm text-slate-900 mb-1">{title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
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

      {/* ── Footer ───────────────────────────────────────────── */}
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
        <p className="text-xs text-slate-300 pt-1">© 2026 PRO MATCH</p>
      </footer>

      <BottomNav subtle />
    </div>
  );
}
