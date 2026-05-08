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

/* ─────────────── 共通：部屋シーン ─────────────── */
function RoomScene({ scale = 1, panAnim = false }: { scale?: number; panAnim?: boolean }) {
  const wrapStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, overflow: 'hidden',
    animation: panAnim ? 'heroPan 12s ease-in-out infinite' : undefined,
  };
  return (
    <div style={wrapStyle}>
      {/* 天井 */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'15%',
        background:'linear-gradient(180deg,#ffffff 0%,#f8f4ee 100%)' }} />

      {/* 壁（窓側から暖かいグラデーション） */}
      <div style={{ position:'absolute', top:'15%', left:0, right:0, bottom:'28%',
        background:'radial-gradient(ellipse 75% 110% at 18% 35%, #fff8f0 0%, #f5ece0 45%, #ede3d2 100%)' }} />

      {/* 窓からの光の筋 */}
      <div style={{ position:'absolute', top:'15%', left:'22%', width:'28%', bottom:'28%',
        background:'linear-gradient(105deg,rgba(255,248,200,0.22) 0%,transparent 70%)',
        pointerEvents:'none' }} />

      {/* 幅木 */}
      <div style={{ position:'absolute', bottom:'28%', left:0, right:0, height: 3 * scale,
        background:'linear-gradient(90deg,#cec6b8 0%,#d6cebc 60%,#cec6b8 100%)' }} />

      {/* 床（暖かい木目、奥から手前で濃くなる） */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'28%',
        background:'linear-gradient(180deg,#c8a87c 0%,#b89060 50%,#a87e4c 100%)' }}>
        <div style={{ position:'absolute', inset:0,
          background:'repeating-linear-gradient(90deg,transparent 0px,transparent 17px,rgba(0,0,0,0.055) 17px,rgba(0,0,0,0.055) 18px)' }} />
        <div style={{ position:'absolute', top:0, left:0, right:'50%', height:'35%',
          background:'linear-gradient(180deg,rgba(255,255,255,0.10) 0%,transparent 100%)' }} />
      </div>

      {/* 窓 */}
      <div style={{ position:'absolute', top:'18%', left:'7%', width: 22 * scale, height: 30 * scale,
        background:'linear-gradient(150deg,#eef6ff 0%,#c4dff0 100%)',
        border:`${1.8 * scale}px solid #aec8de`, borderRadius: 2 * scale,
        boxShadow:`0 0 ${20*scale}px ${7*scale}px rgba(180,218,255,0.50),inset 0 0 ${8*scale}px rgba(255,255,255,0.55)` }}>
        <div style={{ position:'absolute', top:'47%', left:0, right:0, height: 1.5 * scale, background:'rgba(160,200,220,0.65)' }} />
        <div style={{ position:'absolute', left:'47%', top:0, bottom:0, width: 1.5 * scale, background:'rgba(160,200,220,0.65)' }} />
      </div>

      {/* ソファ（グラデーション＋ドロップシャドウ） */}
      <div style={{ position:'absolute', bottom:'28%', left:'32%', width: 44 * scale, height: 16 * scale,
        filter:`drop-shadow(0 ${4*scale}px ${8*scale}px rgba(70,40,15,0.28))` }}>
        {/* 背もたれ */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'54%',
          background:'linear-gradient(180deg,#d0b08e 0%,#c4a080 100%)',
          borderRadius:`${3*scale}px ${3*scale}px 0 0` }} />
        {/* 座面 */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'50%',
          background:'linear-gradient(180deg,#b89468 0%,#a88050 100%)',
          borderRadius:`0 0 ${2*scale}px ${2*scale}px` }} />
        {/* クッション境界線 */}
        <div style={{ position:'absolute', top:'8%', bottom:'42%', left:'49%', width: 1,
          background:'rgba(100,60,20,0.18)' }} />
        {/* 縁の立体感 */}
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(90deg,rgba(0,0,0,0.07) 0%,transparent 12%,transparent 88%,rgba(0,0,0,0.07) 100%)' }} />
      </div>

      {/* 壁の薄いシミ（自然な有機的形状） */}
      <div style={{ position:'absolute', top:'30%', right:'10%',
        width: 14 * scale, height: 9 * scale,
        background:'rgba(175,152,115,0.28)',
        borderRadius:'42% 58% 55% 45% / 52% 44% 56% 48%' }} />

      {/* ビネット（周辺光量落ち） */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 88% 88% at 50% 45%, transparent 42%, rgba(0,0,0,0.10) 100%)' }} />
    </div>
  );
}

/* ─────────────── Good/Bad SVGイラスト ─────────────── */
function TipIllust({ tipKey }: { tipKey: TipKey }) {
  const S = { width:'100%', height:'100%' } as const;

  if (tipKey === 'bright') return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      {/* 天井 */}
      <rect width="60" height="10" fill="#fafaf8"/>
      {/* 壁（暖かい光） */}
      <defs>
        <radialGradient id="wg" cx="20%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#fff9f0"/>
          <stop offset="100%" stopColor="#eee0cc"/>
        </radialGradient>
      </defs>
      <rect y="10" width="60" height="35" fill="url(#wg)"/>
      {/* 床 */}
      <rect y="45" width="60" height="15" fill="#c8a87a"/>
      <line x1="0" y1="45" x2="60" y2="45" stroke="#bca072" strokeWidth="1"/>
      <line x1="18" y1="45" x2="18" y2="60" stroke="#b89060" strokeWidth="0.6" opacity="0.5"/>
      <line x1="36" y1="45" x2="36" y2="60" stroke="#b89060" strokeWidth="0.6" opacity="0.5"/>
      {/* 窓 */}
      <rect x="6" y="13" width="18" height="22" rx="1" fill="#deeffe" stroke="#a8cce0" strokeWidth="1"/>
      <line x1="15" y1="13" x2="15" y2="35" stroke="#a0c4d8" strokeWidth="0.8"/>
      <line x1="6"  y1="24" x2="24" y2="24" stroke="#a0c4d8" strokeWidth="0.8"/>
      {/* 光の筋 */}
      <path d="M24 13 L52 36 L52 45 L24 35Z" fill="rgba(255,244,160,0.16)"/>
      {/* 太陽 */}
      <circle cx="50" cy="10" r="6" fill="#fbbf24" opacity="0.9"/>
      <line x1="50" y1="1"  x2="50" y2="4"  stroke="#fcd34d" strokeWidth="1.5"/>
      <line x1="50" y1="16" x2="50" y2="19" stroke="#fcd34d" strokeWidth="1.5"/>
      <line x1="41" y1="10" x2="44" y2="10" stroke="#fcd34d" strokeWidth="1.5"/>
      <line x1="56" y1="10" x2="59" y2="10" stroke="#fcd34d" strokeWidth="1.5"/>
    </svg>
  );

  if (tipKey === 'slow') return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      <rect width="60" height="60" fill="#f4f6ff"/>
      {/* スマホ */}
      <rect x="20" y="7" width="20" height="35" rx="5" fill="white" stroke="#d0d8f0" strokeWidth="1.5"/>
      <rect x="23" y="11" width="14" height="22" rx="2" fill="#eaedff"/>
      <circle cx="30" cy="37" r="2" fill="#d0d8f0"/>
      <rect x="26" y="5" width="8" height="2" rx="1" fill="#c8d0ec"/>
      {/* ゆっくり矢印 */}
      <path d="M8 30 C10 27 14 27 16 30" stroke="#6366f1" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <polygon points="15,26 24,30 15,34" fill="#6366f1" opacity="0.75"/>
      {/* slow テキスト */}
      <rect x="5" y="44" width="22" height="9" rx="4" fill="#eef0ff"/>
      <text x="16" y="51" fontSize="6.5" fill="#6366f1" fontWeight="700" fontFamily="monospace" textAnchor="middle">slow</text>
    </svg>
  );

  if (tipKey === 'focus') return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      <rect width="60" height="60" fill="#f5f4ef"/>
      {/* 壁の背景 */}
      <rect x="0" y="0" width="60" height="60" fill="#f0ece4"/>
      {/* フォーカスブラケット */}
      <polyline points="6,18 6,6 18,6"   stroke="#475569" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="42,6 54,6 54,18"  stroke="#475569" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="6,42 6,54 18,54"  stroke="#475569" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="54,42 54,54 42,54" stroke="#475569" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* ターゲット（壁のシミ） */}
      <ellipse cx="30" cy="30" r="10" fill="rgba(190,165,130,0.35)"/>
      <ellipse cx="30" cy="30" r="5.5" fill="rgba(175,148,110,0.55)"/>
      <circle  cx="30" cy="30" r="2.5" fill="rgba(155,120,80,0.75)"/>
      {/* 十字線 */}
      <line x1="30" y1="22" x2="30" y2="27" stroke="#64748b" strokeWidth="1" opacity="0.5"/>
      <line x1="30" y1="33" x2="30" y2="38" stroke="#64748b" strokeWidth="1" opacity="0.5"/>
      <line x1="22" y1="30" x2="27" y2="30" stroke="#64748b" strokeWidth="1" opacity="0.5"/>
      <line x1="33" y1="30" x2="38" y2="30" stroke="#64748b" strokeWidth="1" opacity="0.5"/>
    </svg>
  );

  if (tipKey === 'dark') return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      <rect width="60" height="60" fill="#10121c"/>
      {/* 暗い窓 */}
      <rect x="5" y="8" width="14" height="18" rx="1" fill="#181c2c" stroke="#222638" strokeWidth="1"/>
      <line x1="12" y1="8"  x2="12" y2="26" stroke="#1e2234" strokeWidth="0.8"/>
      <line x1="5"  y1="17" x2="19" y2="17" stroke="#1e2234" strokeWidth="0.8"/>
      {/* 月 */}
      <path d="M44 10 Q52 7 50 16 Q58 15 55 23 Q47 21 45 15 Q39 16 44 10Z" fill="#e2e8f0" opacity="0.45"/>
      {/* 暗い床 */}
      <rect y="48" width="60" height="12" fill="#0c0e18"/>
      {/* 暗さを示すオーバーレイ */}
      <rect width="60" height="60" fill="rgba(0,0,20,0.35)"/>
      {/* 暗いラベル */}
      <rect x="12" y="42" width="36" height="8" rx="4" fill="#1e2234"/>
      <text x="30" y="48.5" fontSize="6.5" fill="#4a5568" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">暗くて見えない…</text>
    </svg>
  );

  if (tipKey === 'fast') return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      <rect width="60" height="60" fill="#fff5f5"/>
      {/* スマホ（傾き） */}
      <g transform="rotate(-8,30,30)">
        <rect x="21" y="9" width="18" height="32" rx="5" fill="white" stroke="#fca5a5" strokeWidth="1.5"/>
        <rect x="24" y="13" width="12" height="20" rx="2" fill="#fee8e8"/>
        <circle cx="30" cy="37" r="2" fill="#fca5a5"/>
      </g>
      {/* スピード矢印 */}
      <line x1="40" y1="24" x2="57" y2="24" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round"/>
      <polygon points="53,19 60,24 53,29" fill="#ef4444"/>
      {/* モーションライン */}
      <line x1="5"  y1="19" x2="17" y2="19" stroke="#fca5a5" strokeWidth="1.8" strokeLinecap="round" opacity="0.75"/>
      <line x1="7"  y1="25" x2="17" y2="25" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" opacity="0.55"/>
      <line x1="9"  y1="31" x2="17" y2="31" stroke="#fca5a5" strokeWidth="1.2" strokeLinecap="round" opacity="0.35"/>
      {/* 警告ラベル */}
      <rect x="10" y="46" width="40" height="9" rx="4" fill="#fef2f2"/>
      <text x="30" y="52.5" fontSize="6.5" fill="#ef4444" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">速すぎてブレる</text>
    </svg>
  );

  // blurry
  return (
    <svg viewBox="0 0 60 60" fill="none" style={S}>
      <rect width="60" height="60" fill="#faf7f3"/>
      {/* ぼかし同心円 */}
      <circle cx="30" cy="28" r="22" fill="rgba(180,160,130,0.08)"/>
      <circle cx="30" cy="28" r="16" fill="rgba(180,158,125,0.12)"/>
      <circle cx="30" cy="28" r="11" fill="rgba(178,152,115,0.18)"/>
      <circle cx="30" cy="28" r="7"  fill="rgba(170,142,105,0.28)"/>
      <circle cx="30" cy="28" r="4"  fill="rgba(158,128,88,0.40)"/>
      {/* ぼかし感を出す線 */}
      <circle cx="30" cy="28" r="19" fill="none" stroke="rgba(175,155,120,0.14)" strokeWidth="4"/>
      <circle cx="30" cy="28" r="13" fill="none" stroke="rgba(170,148,112,0.18)" strokeWidth="3"/>
      {/* ラベル */}
      <rect x="10" y="47" width="40" height="9" rx="4" fill="#f5ede4"/>
      <text x="30" y="53.5" fontSize="6.5" fill="#a08060" fontWeight="600" fontFamily="sans-serif" textAnchor="middle">ぼやけて伝わらない</text>
    </svg>
  );
}

/* ─────────────── Heroの4ステップ小モック ─────────────── */
function HeroPhoneContent({ step }: { step: 1 | 2 | 3 | 4 }) {
  if (step === 1) return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      <RoomScene scale={0.55} panAnim />
      {/* ビューファインダー */}
      {(['tl','tr','bl','br'] as const).map(c => (
        <div key={c} style={{
          position:'absolute',
          top:    c[0]==='t' ? 5 : undefined,
          bottom: c[0]==='b' ? 5 : undefined,
          left:   c[1]==='l' ? 5 : undefined,
          right:  c[1]==='r' ? 5 : undefined,
          width:9, height:9,
          borderTop:    c[0]==='t' ? '1.5px solid rgba(255,255,255,0.9)' : undefined,
          borderBottom: c[0]==='b' ? '1.5px solid rgba(255,255,255,0.9)' : undefined,
          borderLeft:   c[1]==='l' ? '1.5px solid rgba(255,255,255,0.9)' : undefined,
          borderRight:  c[1]==='r' ? '1.5px solid rgba(255,255,255,0.9)' : undefined,
        }}/>
      ))}
      {/* REC */}
      <div style={{ position:'absolute', top:6, right:7, display:'flex', alignItems:'center', gap:2,
        background:'rgba(0,0,0,0.48)', borderRadius:8, padding:'2px 5px' }}>
        <span style={{ width:4, height:4, borderRadius:'50%', background:'#ef4444', display:'inline-block',
          animation:'recBlink 1.4s ease-in-out infinite' }}/>
        <span style={{ fontSize:5, fontWeight:700, color:'#fff', letterSpacing:'0.06em' }}>REC</span>
      </div>
      {/* ラベル */}
      <div style={{ position:'absolute', bottom:6, left:0, right:0, textAlign:'center' }}>
        <span style={{ fontSize:5, color:'rgba(0,0,0,0.65)', fontWeight:600,
          background:'rgba(255,255,255,0.82)', borderRadius:8, padding:'1.5px 6px', backdropFilter:'blur(4px)' }}>撮影中...</span>
      </div>
    </div>
  );

  if (step === 2) return (
    <div style={{ position:'absolute', inset:0, background:'linear-gradient(155deg,#1a2540 0%,#0e1628 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:7 }}>
      {/* アップロードアイコン */}
      <div style={{ width:34, height:34, borderRadius:10,
        background:'linear-gradient(135deg,rgba(59,130,246,0.3),rgba(99,102,241,0.2))',
        border:'1.5px solid rgba(99,102,241,0.55)',
        display:'flex', alignItems:'center', justifyContent:'center',
        animation:'heroZoom 2.8s ease-in-out infinite',
        boxShadow:'0 0 16px rgba(99,102,241,0.25)' }}>
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
          <path d="M8.5 11.5V5M5.5 7.5L8.5 5l3 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="2.5" y="12" width="12" height="1.5" rx="0.75" fill="rgba(255,255,255,0.45)"/>
        </svg>
      </div>
      {/* 進捗バー */}
      <div style={{ width:'72%', height:3, background:'rgba(255,255,255,0.12)', borderRadius:4 }}>
        <div style={{ width:'75%', height:'100%', background:'linear-gradient(90deg,#6366f1,#3b82f6)', borderRadius:4 }}/>
      </div>
      <p style={{ fontSize:7.5, fontWeight:700, color:'rgba(255,255,255,0.92)', margin:0, textAlign:'center' }}>動画を送信しました</p>
      <p style={{ fontSize:6, color:'rgba(255,255,255,0.45)', margin:0 }}>職人が確認します</p>
    </div>
  );

  if (step === 3) return (
    <div style={{ position:'absolute', inset:0, background:'#f8fafc', display:'flex', flexDirection:'column' }}>
      {/* アプリヘッダー */}
      <div style={{ background:'white', padding:'5px 7px', borderBottom:'1px solid #f0f4f8',
        display:'flex', alignItems:'center', gap:4 }}>
        <div style={{ width:14, height:14, borderRadius:'50%',
          background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M5 1L9 8H1L5 1Z" fill="white"/>
          </svg>
        </div>
        <span style={{ fontSize:6, fontWeight:700, color:'#1e293b' }}>PRO MATCH</span>
        <div style={{ marginLeft:'auto', fontSize:5, color:'#64748b' }}>通知</div>
      </div>
      {/* メッセージカード */}
      <div style={{ flex:1, padding:'6px 7px', display:'flex', flexDirection:'column', justifyContent:'center', gap:5 }}>
        <div style={{ background:'white', borderRadius:10, padding:'6px 7px',
          boxShadow:'0 2px 8px rgba(0,0,0,0.07)', border:'1px solid #f0f4f8' }}>
          <div style={{ display:'flex', alignItems:'center', gap:3, marginBottom:3 }}>
            <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,#f59e0b,#d97706)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="9" height="9" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="7" r="4" fill="white" opacity="0.9"/>
                <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" fill="white" opacity="0.9"/>
              </svg>
            </div>
            <span style={{ fontSize:5.5, fontWeight:600, color:'#374151' }}>山田職人</span>
            <span style={{ fontSize:5, color:'#9ca3af', marginLeft:'auto' }}>今</span>
          </div>
          <p style={{ fontSize:6, color:'#374151', margin:0, lineHeight:1.5 }}>
            動画を確認しました！<br/>すぐに見積もりをお送りします。
          </p>
        </div>
        {/* タイピング中 */}
        <div style={{ display:'flex', alignItems:'center', gap:3, paddingLeft:2 }}>
          <span style={{ fontSize:5, color:'#9ca3af' }}>見積もりを作成中</span>
          <div style={{ display:'flex', gap:2, alignItems:'center' }}>
            {([0,0.3,0.6] as const).map((d, i) => (
              <span key={i} style={{ width:3, height:3, borderRadius:'50%', background:'#94a3b8',
                display:'inline-block', animation:`heroDots 1.4s ease-in-out ${d}s infinite` }}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // step 4: 見積もりカード
  return (
    <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg,#f0fdf6 0%,#e8faf0 100%)',
      display:'flex', flexDirection:'column' }}>
      {/* ヘッダー */}
      <div style={{ background:'white', padding:'5px 7px', borderBottom:'1px solid #f0f4f8',
        display:'flex', alignItems:'center', gap:4 }}>
        <div style={{ width:14, height:14, borderRadius:'50%',
          background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M5 1L9 8H1L5 1Z" fill="white"/>
          </svg>
        </div>
        <span style={{ fontSize:6, fontWeight:700, color:'#1e293b' }}>PRO MATCH</span>
      </div>
      {/* 見積もりカード */}
      <div style={{ flex:1, padding:'5px 7px', display:'flex', flexDirection:'column', justifyContent:'center', gap:4,
        animation:'heroSlideUp 0.5s ease-out forwards' }}>
        <div style={{ background:'white', borderRadius:10, padding:'7px 8px',
          boxShadow:'0 3px 12px rgba(0,0,0,0.08)', border:'1px solid #d1fae5' }}>
          <div style={{ display:'flex', alignItems:'center', gap:3, marginBottom:5 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', flexShrink:0 }}/>
            <span style={{ fontSize:6, fontWeight:700, color:'#15803d' }}>見積もりが届きました</span>
          </div>
          <div style={{ marginBottom:4 }}>
            <p style={{ fontSize:14, fontWeight:800, color:'#1e293b', margin:'0 0 1px',
              letterSpacing:'-0.03em' }}>¥92,000<span style={{ fontSize:9, color:'#64748b' }}>〜</span></p>
            <p style={{ fontSize:5, color:'#64748b', margin:0 }}>壁紙張り替え・6畳</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:3, paddingTop:4,
            borderTop:'1px solid #f0fdf4' }}>
            <div style={{ width:14, height:14, borderRadius:'50%', background:'linear-gradient(135deg,#f59e0b,#d97706)',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="8" height="8" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="7" r="4" fill="white" opacity="0.9"/>
                <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" fill="white" opacity="0.9"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize:5.5, fontWeight:600, color:'#374151', margin:0 }}>山田職人</p>
              <p style={{ fontSize:5, color:'#9ca3af', margin:0 }}>最短3日で対応可能</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── 撮り方3ステップ 各画面 ─────────────── */
function ShootStepContent({ anim }: { anim: 'pan' | 'zoom' | 'send' }) {
  if (anim === 'pan') return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      <RoomScene scale={0.85} panAnim />
      {/* ファインダー枠 */}
      {(['tl','tr','bl','br'] as const).map(c => (
        <div key={c} style={{
          position:'absolute',
          top:    c[0]==='t' ? 7 : undefined,
          bottom: c[0]==='b' ? 7 : undefined,
          left:   c[1]==='l' ? 7 : undefined,
          right:  c[1]==='r' ? 7 : undefined,
          width:12, height:12,
          borderTop:    c[0]==='t' ? '2px solid rgba(255,255,255,0.88)' : undefined,
          borderBottom: c[0]==='b' ? '2px solid rgba(255,255,255,0.88)' : undefined,
          borderLeft:   c[1]==='l' ? '2px solid rgba(255,255,255,0.88)' : undefined,
          borderRight:  c[1]==='r' ? '2px solid rgba(255,255,255,0.88)' : undefined,
        }}/>
      ))}
      {/* REC */}
      <div style={{ position:'absolute', top:8, right:9, display:'flex', alignItems:'center', gap:3,
        background:'rgba(0,0,0,0.46)', borderRadius:10, padding:'2px 7px' }}>
        <span style={{ width:5, height:5, borderRadius:'50%', background:'#ef4444', display:'inline-block',
          animation:'recBlink 1.4s ease-in-out infinite' }}/>
        <span style={{ fontSize:6.5, fontWeight:700, color:'#fff' }}>REC</span>
      </div>
      {/* ラベル */}
      <div style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center' }}>
        <span style={{ fontSize:7, color:'rgba(0,0,0,0.6)', fontWeight:600,
          background:'rgba(255,255,255,0.82)', borderRadius:12, padding:'2px 10px' }}>
          部屋を一周しながら撮影中
        </span>
      </div>
    </div>
  );

  if (anim === 'zoom') return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', background:'#ede8e0' }}>
      {/* 壁クローズアップ */}
      <div style={{ position:'absolute', inset:0, animation:'heroZoom 5s ease-in-out infinite',
        background:'radial-gradient(ellipse 70% 60% at 55% 40%, #f8f2e8 0%, #ede4d4 60%, #e0d4c0 100%)' }}>
        {/* 壁紙の継ぎ目 */}
        <div style={{ position:'absolute', top:0, bottom:0, left:'38%', width:1.5, background:'rgba(180,160,130,0.28)' }}/>
        <div style={{ position:'absolute', top:0, bottom:0, left:'76%', width:1.5, background:'rgba(180,160,130,0.28)' }}/>
        {/* メインのシミ（自然な有機的形状） */}
        <div style={{ position:'absolute', top:'24%', left:'28%', width:'40%', height:'22%',
          background:'rgba(185,160,120,0.48)',
          borderRadius:'45% 55% 52% 48% / 50% 48% 52% 50%' }}/>
        <div style={{ position:'absolute', top:'34%', left:'32%', width:'25%', height:'12%',
          background:'rgba(175,148,108,0.35)',
          borderRadius:'40% 60% 55% 45%' }}/>
        {/* 細い線傷 */}
        <div style={{ position:'absolute', top:'47%', left:'25%', width:'48%', height:1.5,
          background:'rgba(155,128,90,0.38)', borderRadius:1 }}/>
        <div style={{ position:'absolute', top:'50%', left:'38%', height:'16%', width:1.5,
          background:'rgba(155,128,90,0.32)', borderRadius:1 }}/>
        {/* 剥がれ */}
        <div style={{ position:'absolute', top:'38%', left:'62%', width:'14%', height:'9%',
          background:'rgba(215,200,170,0.65)', borderRadius:3, transform:'rotate(-6deg)' }}/>
      </div>
      {/* ゴールドフォーカス枠 */}
      <div style={{ position:'absolute', top:'18%', left:'14%', right:'14%', bottom:'18%',
        border:'2px solid rgba(251,191,36,0.85)', borderRadius:8 }}>
        {(['tl','tr','bl','br'] as const).map(c => (
          <div key={c} style={{
            position:'absolute',
            top:    c[0]==='t' ? -2 : undefined,
            bottom: c[0]==='b' ? -2 : undefined,
            left:   c[1]==='l' ? -2 : undefined,
            right:  c[1]==='r' ? -2 : undefined,
            width:10, height:10,
            borderTop:    c[0]==='t' ? '3px solid #fbbf24' : undefined,
            borderBottom: c[0]==='b' ? '3px solid #fbbf24' : undefined,
            borderLeft:   c[1]==='l' ? '3px solid #fbbf24' : undefined,
            borderRight:  c[1]==='r' ? '3px solid #fbbf24' : undefined,
          }}/>
        ))}
      </div>
      {/* ラベル */}
      <div style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center' }}>
        <span style={{ fontSize:7, color:'rgba(0,0,0,0.6)', fontWeight:600,
          background:'rgba(255,255,255,0.82)', borderRadius:12, padding:'2px 10px' }}>
          気になる箇所をクローズアップ
        </span>
      </div>
    </div>
  );

  // send
  return (
    <div style={{ position:'absolute', inset:0, background:'linear-gradient(155deg,#1a2540 0%,#0e1628 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
      <div style={{ width:48, height:48, borderRadius:16,
        background:'linear-gradient(135deg,rgba(34,197,94,0.25),rgba(16,185,129,0.2))',
        border:'2px solid rgba(34,197,94,0.55)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 0 24px rgba(34,197,94,0.2)' }}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M5 13l6 6 10-10" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.95)', margin:'0 0 4px' }}>送信完了！</p>
        <p style={{ fontSize:8, color:'rgba(255,255,255,0.5)', margin:0 }}>職人が確認を始めます</p>
      </div>
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
          50%  { transform: translateX(-12%); }
          100% { transform: translateX(0%);   }
        }
        @keyframes heroZoom {
          0%   { transform: scale(1);    }
          50%  { transform: scale(1.10); }
          100% { transform: scale(1);    }
        }
        @keyframes heroDots {
          0%, 20%   { opacity: 0.3; }
          40%       { opacity: 1;   }
          60%, 100% { opacity: 0.3; }
        }
        @keyframes heroSlideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0px);  opacity: 1; }
        }
        @keyframes recBlink {
          0%, 100% { opacity: 1;   }
          50%      { opacity: 0.2; }
        }
        @keyframes phoneFloat {
          0%, 100% { transform: translateY(0px);  }
          50%      { transform: translateY(-6px);  }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>

      {/* ── Topbar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100/80">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#3b82f6"/>
              <path d="M8 23 L16 9 L24 23Z" fill="white" opacity="0.95"/>
              <rect x="12" y="19" width="8" height="4" fill="#3b82f6"/>
            </svg>
            <span className="font-extrabold text-slate-900 text-[15px] tracking-tight">PRO MATCH</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 font-semibold px-3 py-1.5 rounded-full">
            🏆 <span>利用者数 No.1 内装一括見積もりサービス</span>
          </span>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 pt-12 pb-16 lg:flex lg:items-center lg:gap-14 lg:pt-20 lg:pb-24">

        {/* 左：テキスト・CTA */}
        <div className="lg:flex-1 mb-12 lg:mb-0">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block"/>
            30秒で完了・完全無料
          </div>

          <h1 className="text-[2.1rem] lg:text-[2.8rem] font-black text-slate-900 leading-[1.15] tracking-tight mb-5">
            ショート動画で、<br />
            職人から<span className="text-blue-600">直接</span><br />
            見積もりが届く。
          </h1>

          <p className="text-[14px] text-slate-500 leading-relaxed mb-8">
            部屋を撮るだけで、壁紙・床の見積もりが届きます。<br className="hidden sm:block"/>
            写真や寸法の準備は必要ありません。
          </p>

          <div className="grid grid-cols-2 gap-2.5 mb-8">
            {(['動画を撮るだけでOK', 'ログイン不要', '地元の職人に直接依頼', 'しつこい営業なし'] as const).map(label => (
              <div key={label} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                  <circle cx="6" cy="6" r="6" fill="#3b82f6"/>
                  <path d="M3 6l2 2 4-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-xs font-medium text-slate-700 leading-tight">{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleStart}
            className="w-full lg:w-auto lg:px-12 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-base shadow-lg shadow-blue-200/80 transition-all mb-2.5"
          >
            30秒で見積もりする →
          </button>
          <p className="text-xs text-slate-400 text-center lg:text-left">お客様は完全無料・ログイン不要</p>
        </div>

        {/* 右：4ステップ小モック */}
        <div className="lg:flex-1">
          <div className="grid grid-cols-4 gap-2.5 max-w-xs mx-auto lg:max-w-none">
            {([1, 2, 3, 4] as const).map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-2xl relative overflow-hidden shadow-xl"
                  style={{
                    aspectRatio:'9/16',
                    border:'2px solid #1e2938',
                    background:'#111827',
                    animation:`phoneFloat ${3.0+i*0.4}s ease-in-out infinite`,
                    animationDelay:`${i*0.28}s`,
                    boxShadow:'0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.12)',
                  }}
                >
                  <HeroPhoneContent step={step}/>
                  {/* ノッチ */}
                  <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                    width:'38%', height:4, background:'#111827', borderRadius:'0 0 5px 5px', zIndex:10 }}/>
                  {/* 画面の微かな反射 */}
                  <div style={{ position:'absolute', top:0, left:0, right:'60%', height:'40%',
                    background:'linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 100%)',
                    pointerEvents:'none', zIndex:9 }}/>
                </div>
                <p className="text-[9px] font-semibold text-slate-400 text-center leading-tight">{heroMockLabels[i]}</p>
              </div>
            ))}
          </div>
          {/* ステップインジケーター */}
          <div className="flex items-center max-w-xs mx-auto lg:max-w-none mt-4 px-2">
            {([1, 2, 3, 4] as const).map((n, i) => (
              <div key={n} className="flex items-center flex-1">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-extrabold flex-shrink-0 mx-auto shadow-sm">
                  {n}
                </div>
                {i < 3 && <div className="flex-1 h-px bg-blue-100 mx-1"/>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 撮り方はかんたん3ステップ ─────────────────── */}
      <section className="px-5 py-20" style={{ background:'linear-gradient(180deg,#f4f7ff 0%,#eef1fa 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 tracking-widest">HOW TO SHOOT</span>
            <h2 className="text-2xl font-black text-slate-900 mb-2">撮り方はかんたん3ステップ</h2>
            <p className="text-sm text-slate-500">スマホ1本でプロに伝わる動画が撮れます</p>
          </div>

          <div className="flex flex-col gap-6">
            {SHOOT_STEPS.map((step) => (
              <div key={step.n} className="bg-white rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-6"
                style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)' }}>
                {/* スマホモック */}
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <div
                    className="w-24 h-40 relative overflow-hidden shadow-lg"
                    style={{
                      borderRadius:20,
                      border:'2.5px solid #1e2938',
                      background:'#111827',
                      animation:`phoneFloat ${3.2+step.n*0.3}s ease-in-out infinite`,
                      boxShadow:'0 8px 28px rgba(0,0,0,0.15)',
                    }}
                  >
                    <ShootStepContent anim={step.anim}/>
                    <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                      width:'38%', height:5, background:'#111827', borderRadius:'0 0 5px 5px', zIndex:10 }}/>
                    <div style={{ position:'absolute', top:0, left:0, right:'55%', height:'35%',
                      background:'linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 100%)',
                      pointerEvents:'none', zIndex:9 }}/>
                  </div>
                </div>

                {/* テキスト */}
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-sm">
                      {step.n}
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-[15px] leading-snug">{step.title}</h3>
                  </div>
                  <p className="text-[13px] text-slate-500 leading-relaxed mb-3 whitespace-pre-line">{step.sub}</p>
                  <div className="bg-indigo-50 rounded-xl px-3.5 py-2.5">
                    <p className="text-[10px] font-bold text-indigo-500 mb-1 tracking-wide">◆ POINT</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{step.point}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3.5 flex items-center gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <p className="text-[13px] text-amber-800 font-medium">
              長さの目安：10〜30秒でOK！　1部屋につき1本がおすすめです
            </p>
          </div>
        </div>
      </section>

      {/* ── キレイに撮るコツ ────────────────────────────── */}
      <section className="px-5 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-black text-slate-900 mb-2">キレイに撮るコツ</h2>
            <p className="text-sm text-slate-500">ちょっとした工夫で、職人への伝わり方がぐっと変わります</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Good */}
            <div className="flex-1 rounded-3xl border border-emerald-100 p-6"
              style={{ background:'linear-gradient(145deg,#fafffe 0%,#f0fdf8 100%)', boxShadow:'0 1px 3px rgba(0,0,0,0.05),0 4px 16px rgba(16,185,129,0.06)' }}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2.5 6.5l3 3 5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-extrabold text-emerald-700 text-[15px]">Good</span>
                <span className="text-xs text-slate-400">こんな撮り方がおすすめ！</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {GOOD_TIPS.map(({ label, key }) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <div className="w-full aspect-square rounded-2xl bg-white border border-emerald-100 overflow-hidden shadow-sm">
                      <TipIllust tipKey={key}/>
                    </div>
                    <p className="text-[10px] text-slate-600 text-center font-semibold leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bad */}
            <div className="flex-1 rounded-3xl border border-red-100 p-6"
              style={{ background:'linear-gradient(145deg,#fffafa 0%,#fff5f5 100%)', boxShadow:'0 1px 3px rgba(0,0,0,0.05),0 4px 16px rgba(239,68,68,0.06)' }}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-full bg-red-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M3 3l7 7M10 3l-7 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="font-extrabold text-red-600 text-[15px]">Bad</span>
                <span className="text-xs text-slate-400">こうなると伝わりにくい…</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {BAD_TIPS.map(({ label, key }) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <div className="w-full aspect-square rounded-2xl bg-white border border-red-100 overflow-hidden shadow-sm">
                      <TipIllust tipKey={key}/>
                    </div>
                    <p className="text-[10px] text-slate-600 text-center font-semibold leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-indigo-50 border border-indigo-100/80 px-5 py-4 flex items-start gap-3"
            style={{ boxShadow:'0 1px 8px rgba(99,102,241,0.08)' }}>
            <span className="text-xl mt-0.5 flex-shrink-0">✨</span>
            <div>
              <p className="text-sm font-extrabold text-indigo-700 mb-1">動画だから、伝わりやすい！</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                職人は動画を見ることで現場の状況を正確に把握でき、<br className="hidden sm:block"/>
                精度の高い見積もりをお届けできます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 特徴4点 ─────────────────────────────────────── */}
      <section className="px-5 py-14" style={{ background:'#f6f8ff' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {FEATURES.map(({ value, label, icon }) => (
              <div key={value} className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col items-center text-center gap-2"
                style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.05),0 4px 12px rgba(0,0,0,0.04)' }}>
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
        className="px-5 py-20 text-center"
        style={{ background:'linear-gradient(160deg,#1d4ed8 0%,#2563eb 55%,#1e40af 100%)' }}
      >
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-extrabold text-white mb-3 leading-snug tracking-tight">
            撮れたら、そのまま送るだけ
          </h2>
          <p className="text-sm text-blue-200/90 mb-8">
            現在は無料でご利用いただけます
          </p>
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-yellow-900 font-extrabold text-base shadow-xl shadow-blue-900/30 transition-all"
          >
            ショート動画で見積もりする
          </button>
          <p className="text-xs text-blue-300/80 mt-4">ログイン不要・登録なし・無料</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="py-8 px-5 pb-24 text-center border-t border-slate-100 bg-white space-y-2.5">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <a href="/faq"     className="text-xs text-slate-400 hover:text-slate-600 transition-colors">よくある質問</a>
          <a href="/support" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">お問い合わせ</a>
          <a href="/terms"   className="text-xs text-slate-400 hover:text-slate-600 transition-colors">利用規約</a>
          <a href="/privacy" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">プライバシーポリシー</a>
        </div>
        <div className="flex justify-center gap-5 pt-1">
          <a href="/pro-signup" className="text-xs text-slate-300 hover:text-slate-500 transition-colors">職人登録</a>
          <a href="/legal"      className="text-xs text-slate-300 hover:text-slate-500 transition-colors">特定商取引法</a>
        </div>
        <p className="text-xs text-slate-300 pt-1">© 2026 PRO MATCH</p>
      </footer>

      <BottomNav subtle />
    </div>
  );
}
