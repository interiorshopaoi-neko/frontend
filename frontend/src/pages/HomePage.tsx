import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

/* ─────────────── 型・データ ─────────────── */
type TipKey = 'bright' | 'slow' | 'focus' | 'dark' | 'fast' | 'blurry';

const GOOD_TIPS: { label: string; key: TipKey }[] = [
  { label: '明るい場所で撮る',   key: 'bright' },
  { label: 'ゆっくり動かす',     key: 'slow'   },
  { label: '気になる箇所を映す', key: 'focus'  },
];
const BAD_TIPS: { label: string; key: TipKey }[] = [
  { label: '暗すぎる',         key: 'dark'   },
  { label: '速く動きすぎ',     key: 'fast'   },
  { label: '近すぎ・ぼやける', key: 'blurry' },
];
const FEATURES = [
  { value: '全国対応',      label: '職人と直接つながる',     icon: '🤝' },
  { value: '安心保証',      label: '直接取引でトラブルなし', icon: '🛡️' },
  { value: '最短即日〜5日', label: '見積もりお届けの目安',   icon: '⏱️' },
  { value: '営業なし',      label: 'しつこい連絡は一切なし', icon: '✅' },
];
const SHOOT_STEPS = [
  {
    n: 1,
    title: '部屋を一周する',
    sub: '壁・床・天井をゆっくりひとまわり。\n10〜30秒の動画でOK。',
    point: '明るい時間帯・電気を付けて撮影すると\n職人に伝わりやすい',
    anim: 'pan' as const,
  },
  {
    n: 2,
    title: '傷や汚れに近づく',
    sub: '気になる箇所は数秒間寄ってみせる\nだけでOK。',
    point: 'ゆっくり近づいてピントが\n合ってから映すと◎',
    anim: 'zoom' as const,
  },
  {
    n: 3,
    title: 'そのまま送信',
    sub: '撮れたらフォームに貼るだけ。\nログイン・住所は不要。',
    point: '30秒以内に完了。\n職人がすぐに確認を始めます',
    anim: 'send' as const,
  },
] as const;

const TRUST_BADGES = ['ログイン不要', '住所入力不要', 'しつこい営業なし', '地元の職人と直接つながる'];

/* ─────────────── Good/Bad SVGイラスト ─────────────── */
function TipIllust({ tipKey }: { tipKey: TipKey }) {
  const S = { width: '100%', height: '100%' } as const;

  if (tipKey === 'bright') return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      <rect width="60" height="60" fill="#fdf8f0"/>
      <rect y="44" width="60" height="16" fill="#e8c888"/>
      <rect x="8" y="10" width="18" height="22" fill="#d8eefc" stroke="#a8d0e8" strokeWidth="1"/>
      <line x1="17" y1="10" x2="17" y2="32" stroke="#a8d0e8" strokeWidth="0.8"/>
      <line x1="8"  y1="21" x2="26" y2="21" stroke="#a8d0e8" strokeWidth="0.8"/>
      <path d="M26 10 L54 34 L54 44 L26 32Z" fill="rgba(255,240,160,0.22)"/>
      <circle cx="50" cy="11" r="6" fill="#fbbf24" opacity="0.9"/>
      <line x1="50" y1="2"  x2="50" y2="5"  stroke="#fbbf24" strokeWidth="1.5"/>
      <line x1="50" y1="17" x2="50" y2="20" stroke="#fbbf24" strokeWidth="1.5"/>
      <line x1="41" y1="11" x2="44" y2="11" stroke="#fbbf24" strokeWidth="1.5"/>
      <line x1="56" y1="11" x2="59" y2="11" stroke="#fbbf24" strokeWidth="1.5"/>
      <line x1="43.5" y1="4.5"  x2="45.5" y2="6.5"  stroke="#fbbf24" strokeWidth="1.2"/>
      <line x1="54.5" y1="15.5" x2="56.5" y2="17.5" stroke="#fbbf24" strokeWidth="1.2"/>
    </svg>
  );

  if (tipKey === 'slow') return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      <rect width="60" height="60" fill="#f0f4ff"/>
      <rect x="22" y="6" width="16" height="30" rx="5" fill="white" stroke="#c7d4f0" strokeWidth="1.5"/>
      <rect x="25" y="10" width="10" height="18" rx="2" fill="#e8eeff"/>
      <circle cx="30" cy="33" r="1.8" fill="#c7d4f0"/>
      <path d="M9 28 Q14 25 13 29 Q18 28 16 32" stroke="#6366f1" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <polygon points="16,26 25,30 16,34" fill="#6366f1" opacity="0.8"/>
      <text x="6" y="50" fontSize="8" fill="#6366f1" fontWeight="600" fontFamily="monospace">slow</text>
    </svg>
  );

  if (tipKey === 'focus') return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      <rect width="60" height="60" fill="#f5f5f0"/>
      <polyline points="5,15 5,5 15,5"   stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="45,5 55,5 55,15"  stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="5,45 5,55 15,55"  stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="55,45 55,55 45,55" stroke="#64748b" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <ellipse cx="30" cy="30" r="9" fill="#e0c8a0" opacity="0.6"/>
      <ellipse cx="30" cy="30" r="5" fill="#c4a070" opacity="0.8"/>
      <circle  cx="30" cy="30" r="2.5" fill="#9a7040"/>
    </svg>
  );

  if (tipKey === 'dark') return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      <rect width="60" height="60" fill="#12141e"/>
      <rect x="4" y="6" width="14" height="20" fill="#1e2235" stroke="#2a2e45" strokeWidth="1"/>
      <line x1="11" y1="6"  x2="11" y2="26" stroke="#2a2e45" strokeWidth="0.8"/>
      <line x1="4"  y1="16" x2="18" y2="16" stroke="#2a2e45" strokeWidth="0.8"/>
      <path d="M42 9 Q50 5 48 15 Q57 14 54 22 Q46 20 44 14 Q37 15 42 9Z" fill="#e2e8f0" opacity="0.4"/>
      <rect y="46" width="60" height="14" fill="#0a0c14"/>
    </svg>
  );

  if (tipKey === 'fast') return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      <rect width="60" height="60" fill="#fff5f5"/>
      <rect x="20" y="8" width="14" height="26" rx="4" fill="white" stroke="#fca5a5" strokeWidth="1.5"/>
      <rect x="23" y="12" width="8" height="14" rx="2" fill="#fee2e2"/>
      <line x1="38" y1="22" x2="54" y2="22" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
      <polygon points="50,17 59,22 50,27" fill="#ef4444"/>
      <line x1="6"  y1="18" x2="16" y2="18" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
      <line x1="8"  y1="24" x2="16" y2="24" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="10" y1="30" x2="16" y2="30" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
    </svg>
  );

  return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      <rect width="60" height="60" fill="#faf6f2"/>
      <circle cx="30" cy="30" r="20" fill="rgba(180,160,130,0.10)"/>
      <circle cx="30" cy="30" r="14" fill="rgba(180,160,130,0.14)"/>
      <circle cx="30" cy="30" r="9"  fill="rgba(180,160,130,0.20)"/>
      <circle cx="30" cy="30" r="5"  fill="rgba(160,130,90,0.30)"/>
      <circle cx="30" cy="30" r="2"  fill="rgba(140,110,70,0.40)"/>
      <text x="50%" y="56" textAnchor="middle" fontSize="7" fill="#a08060" fontFamily="sans-serif">blur</text>
    </svg>
  );
}

/* ─────────────── Heroの4ステップ小モック ─────────────── */
function HeroPhoneContent({ step }: { step: 1 | 2 | 3 | 4 }) {
  if (step === 1) return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#f0ebe4' }}>
      {/* 室内パン */}
      <div style={{ position: 'absolute', inset: 0, animation: 'heroPan 10s ease-in-out infinite' }}>
        {/* 天井 */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '15%', background: '#fafaf8' }} />
        {/* 壁 */}
        <div style={{ position: 'absolute', top: '15%', left: 0, right: 0, bottom: '28%', background: '#f5f0e8' }} />
        {/* 幅木 */}
        <div style={{ position: 'absolute', bottom: '28%', left: 0, right: 0, height: 2, background: '#d0c8bc' }} />
        {/* 床（木目） */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%', background: 'repeating-linear-gradient(90deg,#ddd0bb 0,#ddd0bb 18px,#cfc1a8 18px,#cfc1a8 20px)' }} />
        {/* 窓 */}
        <div style={{ position: 'absolute', top: '18%', left: '8%', width: 18, height: 26, background: '#d6eaf5', border: '1.5px solid #b0cee4', borderRadius: 2 }}>
          <div style={{ position: 'absolute', top: '48%', left: 0, right: 0, height: 1, background: '#a0c0d4' }} />
          <div style={{ position: 'absolute', left: '48%', top: 0, bottom: 0, width: 1, background: '#a0c0d4' }} />
        </div>
        {/* 日差し */}
        <div style={{ position: 'absolute', top: '15%', left: '24%', width: '30%', bottom: '28%', background: 'linear-gradient(100deg,rgba(255,240,160,0.18),transparent)' }} />
        {/* ソファ（シンプル横長） */}
        <div style={{ position: 'absolute', bottom: '28%', left: '30%', width: 38, height: 14 }}>
          <div style={{ position: 'absolute', inset: 0, background: '#c4a882', borderRadius: 2 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: '#b08a60' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(140,100,50,0.25)' }} />
        </div>
        {/* 壁の薄いシミ */}
        <div style={{ position: 'absolute', top: '30%', right: '10%', width: 10, height: 7, background: 'rgba(180,160,130,0.28)', borderRadius: 3, border: '0.8px dashed rgba(160,130,90,0.45)' }} />
      </div>
      {/* ビューファインダー枠 */}
      <div style={{ position: 'absolute', top: 5, left: 5, width: 9, height: 9, borderTop: '1.5px solid rgba(255,255,255,0.9)', borderLeft: '1.5px solid rgba(255,255,255,0.9)' }} />
      <div style={{ position: 'absolute', top: 5, right: 5, width: 9, height: 9, borderTop: '1.5px solid rgba(255,255,255,0.9)', borderRight: '1.5px solid rgba(255,255,255,0.9)' }} />
      <div style={{ position: 'absolute', bottom: 5, left: 5, width: 9, height: 9, borderBottom: '1.5px solid rgba(255,255,255,0.9)', borderLeft: '1.5px solid rgba(255,255,255,0.9)' }} />
      <div style={{ position: 'absolute', bottom: 5, right: 5, width: 9, height: 9, borderBottom: '1.5px solid rgba(255,255,255,0.9)', borderRight: '1.5px solid rgba(255,255,255,0.9)' }} />
      {/* REC */}
      <div style={{ position: 'absolute', top: 6, right: 7, display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(0,0,0,0.42)', borderRadius: 8, padding: '2px 5px' }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'recBlink 1.4s ease-in-out infinite' }} />
        <span style={{ fontSize: 5, fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>REC</span>
      </div>
      {/* ラベル */}
      <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ fontSize: 5.5, color: 'rgba(0,0,0,0.6)', fontWeight: 600, background: 'rgba(255,255,255,0.8)', borderRadius: 10, padding: '2px 6px' }}>撮影中...</span>
      </div>
    </div>
  );

  if (step === 2) return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg,#1e293b,#0f172a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(59,130,246,0.25)', border: '1.5px solid rgba(59,130,246,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'heroZoom 2.5s ease-in-out infinite' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 11V5M5 7.5L8 5l3 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" fill="rgba(255,255,255,0.45)"/>
        </svg>
      </div>
      <p style={{ fontSize: 7.5, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0, textAlign: 'center' }}>動画を送信しました</p>
      <p style={{ fontSize: 6, color: 'rgba(255,255,255,0.5)', margin: 0 }}>職人が確認します</p>
    </div>
  );

  if (step === 3) return (
    <div style={{ position: 'absolute', inset: 0, background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="4" fill="#94a3b8"/>
          <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" fill="#94a3b8"/>
        </svg>
      </div>
      <p style={{ fontSize: 7.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>職人が確認中</p>
      <div style={{ display: 'flex', gap: 4 }}>
        {([0, 0.35, 0.7] as const).map((d, i) => (
          <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: `heroDots 1.4s ease-in-out ${d}s infinite` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f0fdf4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: '8px 10px', border: '1px solid #d1fae5', width: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', animation: 'heroSlideUp 0.5s ease-out forwards' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
          <span style={{ fontSize: 9 }}>✅</span>
          <span style={{ fontSize: 7, fontWeight: 800, color: '#065f46', lineHeight: 1.2 }}>見積もりが届きました</span>
        </div>
        <p style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', margin: '0 0 3px' }}>¥92,000〜</p>
        <p style={{ fontSize: 5.5, color: '#64748b', margin: 0, lineHeight: 1.5 }}>壁紙張り替え・6畳<br/>最短3日で対応可能</p>
      </div>
    </div>
  );
}

/* ─────────────── 撮り方3ステップ 各画面 ─────────────── */
function ShootStepContent({ anim }: { anim: 'pan' | 'zoom' | 'send' }) {
  if (anim === 'pan') return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#f0ebe4' }}>
      <div style={{ position: 'absolute', inset: 0, animation: 'heroPan 12s ease-in-out infinite' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '14%', background: '#fafaf8' }} />
        <div style={{ position: 'absolute', top: '14%', left: 0, right: 0, bottom: '28%', background: '#f5f0e8' }} />
        <div style={{ position: 'absolute', bottom: '28%', left: 0, right: 0, height: 2, background: '#d0c8bc' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%', background: 'repeating-linear-gradient(90deg,#ddd0bb 0,#ddd0bb 22px,#cfc1a8 22px,#cfc1a8 24px)' }} />
        {/* 窓 */}
        <div style={{ position: 'absolute', top: '16%', left: '6%', width: 26, height: 36, background: '#d6eaf5', border: '2px solid #aecce4', borderRadius: 3 }}>
          <div style={{ position: 'absolute', top: '48%', left: 0, right: 0, height: 1.5, background: '#9cc0d8' }} />
          <div style={{ position: 'absolute', left: '48%', top: 0, bottom: 0, width: 1.5, background: '#9cc0d8' }} />
        </div>
        {/* 日差し */}
        <div style={{ position: 'absolute', top: '14%', left: '28%', width: '32%', bottom: '28%', background: 'linear-gradient(100deg,rgba(255,240,160,0.16),transparent)' }} />
        {/* ソファ */}
        <div style={{ position: 'absolute', bottom: '28%', left: '34%', width: 55, height: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: '#c4a882', borderRadius: 3 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '38%', background: '#b08a60' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(140,100,50,0.2)' }} />
        </div>
        {/* シミ（薄い自然なもの） */}
        <div style={{ position: 'absolute', top: '28%', right: '8%', width: 14, height: 9, background: 'rgba(180,160,130,0.28)', borderRadius: 4, border: '0.8px dashed rgba(150,125,90,0.5)' }} />
        <div style={{ position: 'absolute', top: '25%', right: '12%', width: 6, height: 6, background: 'rgba(180,160,130,0.2)', borderRadius: '50%' }} />
      </div>
      {/* ファインダー枠 */}
      {(['tl','tr','bl','br'] as const).map(c => (
        <div key={c} style={{
          position: 'absolute',
          top:    c.startsWith('t') ? 6 : undefined,
          bottom: c.startsWith('b') ? 6 : undefined,
          left:   c.endsWith('l')   ? 6 : undefined,
          right:  c.endsWith('r')   ? 6 : undefined,
          width: 10, height: 10,
          borderTop:    c.startsWith('t') ? '2px solid rgba(255,255,255,0.9)' : undefined,
          borderBottom: c.startsWith('b') ? '2px solid rgba(255,255,255,0.9)' : undefined,
          borderLeft:   c.endsWith('l')   ? '2px solid rgba(255,255,255,0.9)' : undefined,
          borderRight:  c.endsWith('r')   ? '2px solid rgba(255,255,255,0.9)' : undefined,
        }} />
      ))}
      {/* REC */}
      <div style={{ position: 'absolute', top: 8, right: 9, display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.42)', borderRadius: 10, padding: '2px 6px' }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'recBlink 1.4s ease-in-out infinite' }} />
        <span style={{ fontSize: 6, fontWeight: 700, color: '#fff' }}>REC</span>
      </div>
    </div>
  );

  if (anim === 'zoom') return (
    <div style={{ position: 'absolute', inset: 0, background: '#f5f0e8', overflow: 'hidden' }}>
      {/* ズームした壁面 */}
      <div style={{ position: 'absolute', inset: 0, animation: 'heroZoom 4s ease-in-out infinite' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#f0ebe0' }} />
        {/* 壁紙の継ぎ目線 */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '40%', width: 1, background: 'rgba(180,160,130,0.3)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '80%', width: 1, background: 'rgba(180,160,130,0.3)' }} />
        {/* メインのシミ（中央） */}
        <div style={{ position: 'absolute', top: '28%', left: '30%', width: '35%', height: '18%', background: 'rgba(190,165,130,0.5)', borderRadius: 8 }} />
        {/* 細い線傷 */}
        <div style={{ position: 'absolute', top: '46%', left: '28%', width: '40%', height: 1.5, background: 'rgba(160,130,90,0.4)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: '52%', left: '35%', height: '14%', width: 1.5, background: 'rgba(160,130,90,0.35)', borderRadius: 1 }} />
        {/* 剥がれ部分 */}
        <div style={{ position: 'absolute', top: '36%', left: '58%', width: '12%', height: '8%', background: 'rgba(210,190,160,0.6)', borderRadius: 2, transform: 'rotate(-8deg)' }} />
      </div>
      {/* フォーカス枠 */}
      <div style={{ position: 'absolute', top: '22%', left: '18%', right: '18%', bottom: '22%', border: '1.5px solid rgba(255,200,0,0.8)', borderRadius: 6 }}>
        {(['tl','tr','bl','br'] as const).map(c => (
          <div key={c} style={{
            position: 'absolute',
            top:    c.startsWith('t') ? -1 : undefined,
            bottom: c.startsWith('b') ? -1 : undefined,
            left:   c.endsWith('l')   ? -1 : undefined,
            right:  c.endsWith('r')   ? -1 : undefined,
            width: 8, height: 8,
            borderTop:    c.startsWith('t') ? '2.5px solid #fbbf24' : undefined,
            borderBottom: c.startsWith('b') ? '2.5px solid #fbbf24' : undefined,
            borderLeft:   c.endsWith('l')   ? '2.5px solid #fbbf24' : undefined,
            borderRight:  c.endsWith('r')   ? '2.5px solid #fbbf24' : undefined,
          }} />
        ))}
      </div>
    </div>
  );

  // send
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg,#1e293b,#0f172a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {/* チェックアイコン */}
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,197,94,0.2)', border: '2px solid rgba(34,197,94,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M4 11l5 5 9-9" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.95)', margin: 0, textAlign: 'center' }}>送信完了！</p>
      <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)', margin: 0, textAlign: 'center' }}>職人が確認を\n始めます</p>
    </div>
  );
}

/* ─────────────── メインコンポーネント ─────────────── */
export default function HomePage() {
  const navigate = useNavigate();
  const handleStart = () => navigate('/corporate');

  const heroMockLabels = ['部屋を撮影', '動画を送信', '職人が確認', '見積もりが届く'];

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes heroPan {
          0%   { transform: translateX(0%);   }
          50%  { transform: translateX(-14%); }
          100% { transform: translateX(0%);   }
        }
        @keyframes heroZoom {
          0%   { transform: scale(1);    }
          50%  { transform: scale(1.10); }
          100% { transform: scale(1);    }
        }
        @keyframes heroDots {
          0%, 20%  { opacity: 0.3; }
          40%      { opacity: 1;   }
          60%, 100% { opacity: 0.3; }
        }
        @keyframes heroSlideUp {
          0%   { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0px);  opacity: 1; }
        }
        @keyframes recBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
        @keyframes phoneFloat {
          0%, 100% { transform: translateY(0px);   }
          50%      { transform: translateY(-5px);   }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>

      {/* ── Topbar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* ロゴ */}
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#3b82f6"/>
              <path d="M7 24 L16 8 L25 24Z" fill="white" opacity="0.9"/>
              <rect x="12" y="18" width="8" height="6" fill="#3b82f6"/>
            </svg>
            <span className="font-extrabold text-slate-900 text-base tracking-tight">PRO MATCH</span>
          </div>
          <span className="hidden sm:inline-block text-xs bg-amber-50 border border-amber-200 text-amber-700 font-semibold px-3 py-1 rounded-full">
            🏆 利用者数 No.1 内装一括見積もりサービス
          </span>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 pt-10 pb-14 lg:flex lg:items-center lg:gap-12 lg:pt-16 lg:pb-20">

        {/* 左：テキスト・CTA */}
        <div className="lg:flex-1 mb-10 lg:mb-0">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
            30秒で完了・完全無料
          </div>

          <h1 className="text-[2rem] lg:text-[2.6rem] font-black text-slate-900 leading-tight tracking-tight mb-4">
            ショート動画で、<br />
            職人から<span className="text-blue-600">直接</span><br />
            見積もりが届く。
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed mb-7">
            部屋を撮るだけで、壁紙・床の見積もりが届きます。<br className="hidden sm:block"/>
            写真や寸法、現場説明は一切不要。
          </p>

          <div className="grid grid-cols-2 gap-2 mb-7">
            {(['写真や寸法は不要', '現場説明も不要', '説明文はいりません', 'しつこい営業なし'] as const).map(label => (
              <div key={label} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                <span className="text-blue-500 font-bold text-xs flex-shrink-0">✓</span>
                <span className="text-xs font-medium text-slate-700 leading-tight">{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleStart}
            className="w-full lg:w-auto lg:px-10 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-base shadow-lg shadow-blue-200 transition-all mb-2"
          >
            30秒で見積もりする →
          </button>
          <p className="text-xs text-slate-400 text-center lg:text-left">お客様は完全無料・ログイン不要</p>
        </div>

        {/* 右：4ステップ小モック */}
        <div className="lg:flex-1">
          <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto lg:max-w-none">
            {([1, 2, 3, 4] as const).map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-1.5">
                {/* 矢印（2〜4の前） */}
                {i > 0 && (
                  <div className="absolute" style={{ display: 'none' }} />
                )}
                {/* フォン枠 */}
                <div
                  className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800 relative overflow-hidden shadow-lg"
                  style={{ aspectRatio: '9/16', animation: `phoneFloat ${2.8 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}
                >
                  <HeroPhoneContent step={step} />
                  {/* ノッチ */}
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '40%', height: 4, background: '#1e2330', borderRadius: '0 0 4px 4px', zIndex: 10 }} />
                </div>
                {/* ステップラベル */}
                <p className="text-[9px] font-semibold text-slate-500 text-center leading-tight">{heroMockLabels[i]}</p>
              </div>
            ))}
          </div>
          {/* ステップ番号バー */}
          <div className="flex items-center max-w-sm mx-auto lg:max-w-none mt-3 px-2">
            {([1, 2, 3, 4] as const).map((n, i) => (
              <div key={n} className="flex items-center flex-1">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-extrabold flex-shrink-0 mx-auto">
                  {n}
                </div>
                {i < 3 && <div className="flex-1 h-px bg-blue-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* ── 撮り方はかんたん3ステップ ─────────────────────── */}
      <section className="px-5 py-16" style={{ background: '#f0f4ff' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 tracking-wide">HOW TO SHOOT</span>
            <h2 className="text-2xl font-black text-slate-900 mb-1">撮り方はかんたん3ステップ</h2>
            <p className="text-sm text-slate-500">スマホ1本でプロに伝わる動画が撮れます</p>
          </div>

          <div className="flex flex-col gap-5">
            {SHOOT_STEPS.map((step) => (
              <div key={step.n} className="bg-white rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* スマホモック（中） */}
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <div
                    className="w-24 h-40 rounded-3xl border-2 border-slate-700 bg-slate-800 relative overflow-hidden shadow-md"
                    style={{ animation: `phoneFloat ${3 + step.n * 0.3}s ease-in-out infinite` }}
                  >
                    <ShootStepContent anim={step.anim} />
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '40%', height: 5, background: '#1e2330', borderRadius: '0 0 5px 5px', zIndex: 10 }} />
                  </div>
                </div>

                {/* テキスト */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs flex-shrink-0">
                      {step.n}
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">{step.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2 whitespace-pre-line">{step.sub}</p>
                  <div className="bg-indigo-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-semibold text-indigo-600 mb-0.5">♦ ポイント</p>
                    <p className="text-[10px] text-slate-600 leading-relaxed whitespace-pre-line">{step.point}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 flex items-center gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <p className="text-sm text-amber-800 font-medium">
              長さの目安：10〜30秒でOK！　1部屋につき1本がおすすめです
            </p>
          </div>
        </div>
      </section>

      {/* ── キレイに撮るコツ ────────────────────────────── */}
      <section className="px-5 py-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-slate-900 mb-1">キレイに撮るコツ</h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Good */}
            <div className="flex-1 rounded-3xl bg-white border border-emerald-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-extrabold text-emerald-700">Good</span>
                <span className="text-xs text-slate-400">こんな撮り方がおすすめ！</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {GOOD_TIPS.map(({ label, key }) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <div className="w-full aspect-square rounded-2xl bg-emerald-50 border border-emerald-100 overflow-hidden">
                      <TipIllust tipKey={key} />
                    </div>
                    <p className="text-[10px] text-slate-600 text-center font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bad */}
            <div className="flex-1 rounded-3xl bg-white border border-red-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3l6 6M9 3l-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="font-extrabold text-red-600">Bad</span>
                <span className="text-xs text-slate-400">こうなると伝わりにくい…</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {BAD_TIPS.map(({ label, key }) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <div className="w-full aspect-square rounded-2xl bg-red-50 border border-red-100 overflow-hidden">
                      <TipIllust tipKey={key} />
                    </div>
                    <p className="text-[10px] text-slate-600 text-center font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4 flex items-start gap-3">
            <span className="text-xl mt-0.5 flex-shrink-0">✨</span>
            <div>
              <p className="text-sm font-extrabold text-indigo-700 mb-0.5">動画だから、伝わりやすい！</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                職人は動画を見ることで現場の状況を正確に把握でき、<br className="hidden sm:block"/>
                精度の高い見積もりをお届けできます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 特徴4点 ─────────────────────────────────────── */}
      <section className="px-5 py-12" style={{ background: '#f8faff' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {FEATURES.map(({ value, label, icon }) => (
              <div key={value} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center text-center gap-2">
                <span className="text-2xl">{icon}</span>
                <p className="text-base font-extrabold text-slate-900 leading-tight">{value}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section
        className="px-5 py-16 text-center"
        style={{ background: 'linear-gradient(160deg, #1d4ed8 0%, #2563eb 60%, #1e40af 100%)' }}
      >
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-extrabold text-white mb-2 leading-snug">
            撮れたら、そのまま送るだけ
          </h2>
          <p className="text-sm text-blue-200 mb-7">
            現在は無料でご利用いただけます
          </p>
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-yellow-900 font-extrabold text-[0.95rem] shadow-lg shadow-blue-900/40 transition-all"
          >
            ショート動画で見積もりする
          </button>
          <p className="text-xs text-blue-300 mt-4">ログイン不要・登録なし・無料</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
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
