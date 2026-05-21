import { useNavigate } from 'react-router-dom';

const CSS = `
@keyframes recBlink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes dots{0%,80%,100%{opacity:0;transform:scale(.5)}40%{opacity:1;transform:scale(1)}}
`;

/*
  ── 画像素材リスト ────────────────────────────────────────────────────────
  public/homepage/ に以下のファイルを配置してください（JPEG推奨、800px以上）:

  room-wide.jpg        部屋全体の明るい写真（白い壁・ソファ・窓・自然光）
  wall-damage.jpg      壁紙クロスのアップ（汚れ・色変わり・剥がれが分かる）
  floor.jpg            床のクローズアップ（フローリング・CF の質感が分かる）
  craftsman-young.jpg  職人がスマホで動画確認している写真（正面〜斜め）

  ファイルがない場合はfallback色で表示されます。
  ─────────────────────────────────────────────────────────────────────── */
const IMG = {
  roomWide:   '/homepage/room-wide.jpg',
  panorama:   '/homepage/guide-panorama-room.png',
  wallDamage: '/homepage/wall-damage.jpg',
  floor:      '/homepage/floor.jpg',
  craftsman:  '/homepage/craftsman-young.jpg',
} as const;
type ImgKey = keyof typeof IMG;

/* 画像が存在しない間のfallback背景色 */
const IMG_FALLBACK: Record<ImgKey, string> = {
  roomWide:   'linear-gradient(135deg,#e8f0fe 0%,#c7d7f8 100%)',
  panorama:   'linear-gradient(90deg,#e8f0fe 0%,#d4e4f8 50%,#e2edfa 100%)',
  wallDamage: 'linear-gradient(135deg,#f5f0e8 0%,#e8dcc8 100%)',
  floor:      'linear-gradient(135deg,#f0e8d8 0%,#d4b896 100%)',
  craftsman:  'linear-gradient(135deg,#1e2a3a 0%,#2d3f55 100%)',
};

/* ── 共通コンポーネント ──────────────────────────── */

function PhoneShell({ children, dark = false, style: s }: {
  children: React.ReactNode; dark?: boolean; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      position: 'relative', borderRadius: 20, overflow: 'hidden',
      background: dark ? '#0a0f1e' : '#ffffff',
      border: '5px solid #111827',
      boxShadow: '0 12px 40px rgba(0,0,0,.4)',
      aspectRatio: '9 / 16',
      ...s,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 44, height: 5, background: '#111827',
        borderRadius: '0 0 6px 6px', zIndex: 10,
      }} />
      {children}
    </div>
  );
}

function Corners({ size = 14, color = 'rgba(255,255,255,.9)', offset = 10, z = 2 }: {
  size?: number; color?: string; offset?: number; z?: number;
}) {
  return (
    <>
      {(['tl','tr','bl','br'] as const).map(c => (
        <div key={c} style={{
          position: 'absolute', zIndex: z,
          top: c[0]==='t' ? offset : undefined, bottom: c[0]==='b' ? offset : undefined,
          left: c[1]==='l' ? offset : undefined, right: c[1]==='r' ? offset : undefined,
          width: size, height: size,
          borderTop:    c[0]==='t' ? `2px solid ${color}` : undefined,
          borderBottom: c[0]==='b' ? `2px solid ${color}` : undefined,
          borderLeft:   c[1]==='l' ? `2px solid ${color}` : undefined,
          borderRight:  c[1]==='r' ? `2px solid ${color}` : undefined,
        }} />
      ))}
    </>
  );
}

function FlowArrow() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, paddingTop: '4rem',
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </div>
  );
}

/* ── スマホ画面コンテンツ ────────────────────────── */

function PhoneRoom() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: IMG_FALLBACK.panorama }} />
      <img src={IMG.panorama} alt="部屋全体の撮影イメージ" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
      }} />
      <Corners />
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 3,
        display: 'flex', alignItems: 'center', gap: 3,
        background: 'rgba(0,0,0,.52)', borderRadius: 10, padding: '3px 8px',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
          display: 'inline-block', animation: 'recBlink 1.4s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 7, fontWeight: 700, color: '#fff' }}>REC</span>
      </div>
      <div style={{
        position: 'absolute', bottom: 10, left: 0, right: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      }}>
        <span style={{
          fontSize: 7, color: 'rgba(0,0,0,.7)', fontWeight: 600,
          background: 'rgba(255,255,255,.88)', borderRadius: 10, padding: '3px 10px',
        }}>部屋を一周しながら撮影中...</span>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,.8)', background: 'rgba(239,68,68,.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: 1, background: 'white' }} />
        </div>
      </div>
    </>
  );
}

function PhoneUpload() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(ellipse at 50% 50%,#0f1a2e,#060c18)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
    }}>
      {[10,25,45,60,75,85,15,40,65,80].map((l, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${l}%`, top: `${10+i*8}%`,
          width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,.15)',
        }} />
      ))}
      <div style={{ position: 'relative', width: 60, height: 60 }}>
        <div style={{
          position: 'absolute', inset: 3, borderRadius: '50%',
          background: 'linear-gradient(135deg,rgba(59,130,246,.4),rgba(99,102,241,.3))',
          border: '2px solid rgba(99,102,241,.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px rgba(99,102,241,.35)',
        }}>
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <path d="M14 19V9M10 13l4-4 4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="5" y="21" width="18" height="2" rx="1" fill="rgba(255,255,255,.4)"/>
          </svg>
        </div>
      </div>
      <div style={{ width: '65%', height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 4 }}>
        <div style={{ width: '82%', height: '100%', background: 'linear-gradient(90deg,#6366f1,#3b82f6)', borderRadius: 4 }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.95)', margin: '0 0 3px' }}>送信完了！</p>
        <p style={{ fontSize: 7.5, color: 'rgba(255,255,255,.45)', margin: 0 }}>職人に共有しました</p>
      </div>
    </div>
  );
}

function PhoneCraftsman() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: IMG_FALLBACK.craftsman }} />
      <img src={IMG.craftsman} alt="職人が動画を確認している様子" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: 'center top',
      }} />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(0deg,rgba(0,0,0,.75) 0%,rgba(0,0,0,.1) 55%,transparent 100%)',
      }} />
      <div style={{
        position: 'absolute', top: '15%', right: '8%', zIndex: 2,
        background: 'white', borderRadius: 12, padding: '7px 10px',
        boxShadow: '0 4px 16px rgba(0,0,0,.2)',
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: '50%', background: '#94a3b8',
            display: 'inline-block', animation: `dots 1.4s ease-in-out ${d}s infinite`,
          }} />
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2, padding: '10px 12px 14px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'white', margin: '0 0 2px' }}>内容を確認中...</p>
        <p style={{ fontSize: 7.5, color: 'rgba(255,255,255,.6)', margin: 0 }}>対応可能な職人が確認しています</p>
      </div>
    </>
  );
}

function PhoneEstimate() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: 'white', padding: '5px 10px', borderBottom: '1px solid #f0f4f8',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="7" height="7" viewBox="0 0 10 10" fill="white"><path d="M5 1L9 8H1L5 1Z"/></svg>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#0f172a' }}>お見積もり</span>
      </div>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f4f8', background: 'white' }}>
        <p style={{ fontSize: 7, color: '#94a3b8', margin: '0 0 3px' }}>概算費用（税込）</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' }}>¥92,000</span>
          <span style={{ fontSize: 10, color: '#64748b' }}>〜</span>
        </div>
        <p style={{ fontSize: 7, color: '#94a3b8', margin: '3px 0 0' }}>最終金額は現地確認後に確定</p>
      </div>
      <div style={{ padding: '8px 12px', flex: 1 }}>
        {['壁紙張替', '床材補修', '下地補修'].map(item => (
          <div key={item} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 0', borderBottom: '1px solid #f0f4f8',
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%', background: '#22c55e', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 9, color: '#374151' }}>{item}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{
          padding: '9px 0', borderRadius: 30,
          background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
          color: 'white', fontSize: 9.5, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          boxShadow: '0 4px 16px rgba(59,130,246,.4)',
        }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          見積もりが届きました！
        </div>
      </div>
    </div>
  );
}

/* ── HOW TO SHOOT サムネイル ─────────────────────── */

function LandscapeThumb({ imgKey, showZoom = false, showRec = false }: {
  imgKey: ImgKey; showZoom?: boolean; showRec?: boolean;
}) {
  return (
    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '16 / 9', background: IMG_FALLBACK[imgKey] }}>
      <img src={IMG[imgKey]} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
      }} />
      {!showZoom && <Corners size={10} offset={7} z={2} />}
      {showZoom && (
        <div style={{
          position: 'absolute', top: '10%', left: '12%', right: '12%', bottom: '10%', zIndex: 2,
          border: '2px solid rgba(251,191,36,.9)', borderRadius: 5,
        }}>
          {(['tl','tr','bl','br'] as const).map(c => (
            <div key={c} style={{
              position: 'absolute',
              top: c[0]==='t' ? -2 : undefined, bottom: c[0]==='b' ? -2 : undefined,
              left: c[1]==='l' ? -2 : undefined, right: c[1]==='r' ? -2 : undefined,
              width: 7, height: 7,
              borderTop:    c[0]==='t' ? '2.5px solid #fbbf24' : undefined,
              borderBottom: c[0]==='b' ? '2.5px solid #fbbf24' : undefined,
              borderLeft:   c[1]==='l' ? '2.5px solid #fbbf24' : undefined,
              borderRight:  c[1]==='r' ? '2.5px solid #fbbf24' : undefined,
            }} />
          ))}
        </div>
      )}
      {showRec && (
        <div style={{
          position: 'absolute', top: 7, right: 8, zIndex: 3,
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'rgba(0,0,0,.52)', borderRadius: 8, padding: '2px 6px',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: '#ef4444',
            display: 'inline-block', animation: 'recBlink 1.4s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 6, fontWeight: 700, color: '#fff' }}>REC</span>
        </div>
      )}
    </div>
  );
}

/* ── Good/Bad サムネイル ─────────────────────────── */

function TipThumb({ imgKey, filter, focusBrackets = false }: {
  imgKey: ImgKey; filter?: string; focusBrackets?: boolean;
}) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, aspectRatio: '4 / 3', background: IMG_FALLBACK[imgKey] }}>
      <img src={IMG[imgKey]} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', filter: filter || undefined,
      }} />
      {focusBrackets && (
        <div style={{
          position: 'absolute', top: '12%', left: '12%', right: '12%', bottom: '12%', zIndex: 2,
          border: '2px solid rgba(251,191,36,.9)', borderRadius: 4,
        }}>
          {(['tl','tr','bl','br'] as const).map(c => (
            <div key={c} style={{
              position: 'absolute',
              top: c[0]==='t' ? -2 : undefined, bottom: c[0]==='b' ? -2 : undefined,
              left: c[1]==='l' ? -2 : undefined, right: c[1]==='r' ? -2 : undefined,
              width: 7, height: 7,
              borderTop:    c[0]==='t' ? '2px solid #fbbf24' : undefined,
              borderBottom: c[0]==='b' ? '2px solid #fbbf24' : undefined,
              borderLeft:   c[1]==='l' ? '2px solid #fbbf24' : undefined,
              borderRight:  c[1]==='r' ? '2px solid #fbbf24' : undefined,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── データ ──────────────────────────────────────── */

const SHOOT_STEPS = [
  {
    n: 1, title: '部屋全体をゆっくり撮影',
    desc: '部屋全体が映るようにゆっくり横に動かします',
    point: '壁・床・天井・ドアが見えるように一周してください',
    imgKey: 'roomWide' as ImgKey, showZoom: false, showRec: true,
  },
  {
    n: 2, title: '壁紙の汚れ・剥がれを撮影',
    desc: '気になる壁紙の汚れや剥がれをアップで撮ります',
    point: '補修が必要な箇所はしっかり近づいて撮りましょう',
    imgKey: 'wallDamage' as ImgKey, showZoom: true, showRec: false,
  },
  {
    n: 3, title: '床の状態も撮影',
    desc: 'フローリングやCFの状態がわかるように撮ります',
    point: '床全体と、特に気になる箇所を映してください',
    imgKey: 'floor' as ImgKey, showZoom: false, showRec: false,
  },
];

const GOOD_TIPS = [
  { label: '明るい場所で撮る',   desc: '自然光が入る場所がおすすめ', imgKey: 'roomWide' as ImgKey,   filter: '', focusBrackets: false },
  { label: 'ゆっくり動かす',     desc: '急な動きは避けましょう',     imgKey: 'roomWide' as ImgKey,   filter: 'saturate(0.75) brightness(0.92)', focusBrackets: false },
  { label: '壁紙の傷を映す',     desc: '汚れ・剥がれはしっかりと',  imgKey: 'wallDamage' as ImgKey, filter: '', focusBrackets: true },
];

const BAD_TIPS = [
  { label: '暗すぎる',     desc: '照明をつけて明るい場所で撮りましょう', imgKey: 'roomWide' as ImgKey,   filter: 'brightness(0.42) saturate(0.55)' },
  { label: '速く動かしすぎ', desc: 'ゆっくり一定のスピードで動かして',   imgKey: 'roomWide' as ImgKey,   filter: 'blur(3px) brightness(1.1) saturate(0.75)' },
  { label: '近すぎる',     desc: '2〜3歩下がって全体を映して',         imgKey: 'wallDamage' as ImgKey, filter: 'blur(5px) brightness(0.9)' },
];

const FEATURES = [
  { label: '全国の職人と直接つながる', sub: '地域の職人から直接見積もり',
    d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { label: '安心の直接取引', sub: '仲介なしで適正価格',
    d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { label: '最短即日〜5日以内にお届け', sub: '多くの案件で5日以内にご回答',
    d: 'M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4 2' },
  { label: 'しつこい営業は一切なし', sub: '必要なときだけ利用できる',
    d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
];

/* ── ページ本体 ──────────────────────────────────── */

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <style>{CSS}</style>

      <div style={{ minHeight: '100vh', background: 'white' }}>

        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #f0f4f8',
          padding: '0 20px', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo-full.png" alt="PRO MATCH" style={{ height: 30, width: 'auto', display: 'block' }} />
          </div>
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20,
            padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#92400e', margin: 0 }}>安心の直接取引サービス</p>
              <p style={{ fontSize: 7.5, color: '#b45309', margin: 0 }}>お客満足度向上に取り組んでいます</p>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px 36px' }}>
          <div className="lg:flex lg:items-start lg:gap-10">

            {/* Left: copy */}
            <div className="lg:w-[320px] lg:flex-shrink-0 mb-10 lg:mb-0">
              <span style={{
                display: 'inline-block', background: '#eff6ff', color: '#1d4ed8',
                borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, marginBottom: 16,
              }}>30秒で完了・完全無料</span>

              <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25, color: '#0f172a', margin: '0 0 10px' }}>
                ショート動画で、<br />
                内装工事の<br />
                <span style={{ color: '#3b82f6' }}>概算確認。</span>
              </h1>

              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.65 }}>
                壁紙・床CFの現場動画を送るだけ。<br />
                ログイン不要・住所入力不要。しつこい営業なし。
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 24 }}>
                {[
                  { d: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z', text: 'ログイン不要・住所不要' },
                  { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', text: '動画で状態が伝わりやすい' },
                  { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', text: '細かい説明が苦手でもOK' },
                  { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', text: 'しつこい営業なし' },
                ].map(({ d, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: '#f0f4ff', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d={d}/>
                      </svg>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{text}</span>
                  </div>
                ))}
              </div>

              {/* ── 2 導線カード ─────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* お客様向け */}
                <button
                  onClick={() => navigate('/corporate')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px', borderRadius: 16, width: '100%',
                    background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
                    color: 'white', border: 'none', cursor: 'pointer', textAlign: 'left',
                    boxShadow: '0 4px 20px rgba(37,99,235,.35)',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 18,
                  }}>🎬</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, margin: 0, lineHeight: 1.35 }}>ショート動画で概算確認する</p>
                    <p style={{ fontSize: 10, opacity: .75, margin: '2px 0 0' }}>完全無料・ログイン不要・住所入力不要</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>

                {/* 職人向け */}
                <button
                  onClick={() => navigate('/for-pros')}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '13px 18px', borderRadius: 16, width: '100%',
                    background: '#0f172a', color: 'white',
                    border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 18, marginTop: 2,
                  }}>👷</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, margin: 0, lineHeight: 1.35 }}>職人さんはこちら</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', margin: '2px 0 7px' }}>職人登録無料・成約時のみ手数料</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <span style={{
                          fontSize: 8.5, background: 'rgba(59,130,246,.28)', color: '#93c5fd',
                          borderRadius: 4, padding: '2px 5px', flexShrink: 0, fontWeight: 700, lineHeight: 1.4,
                        }}>一般依頼</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', lineHeight: 1.4 }}>壁紙・床CFなど、お客様からの見積もり案件</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <span style={{
                          fontSize: 8.5, background: 'rgba(234,179,8,.2)', color: '#fde68a',
                          borderRadius: 4, padding: '2px 5px', flexShrink: 0, fontWeight: 700, lineHeight: 1.4,
                        }}>応援募集</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', lineHeight: 1.4 }}>職人同士で急ぎ現場・人手不足を助け合う</span>
                      </div>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,255,255,.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Right: phones */}
            <div className="flex-1 min-w-0">
              {/* step labels (desktop) */}
              <div className="hidden lg:grid lg:grid-cols-4 lg:gap-3 mb-3">
                {[
                  { n:1, title:'部屋を撮影',     sub:'ゆっくり一周するだけ' },
                  { n:2, title:'動画を送信',     sub:'30秒で完了' },
                  { n:3, title:'職人が確認',     sub:'内容をチェック' },
                  { n:4, title:'見積もりが届く', sub:'最短即日でお届け' },
                ].map(({ n, title, sub }) => (
                  <div key={n} style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#3b82f6', color: 'white',
                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>{n}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{title}</span>
                    </div>
                    <p style={{ fontSize: 10.5, color: '#64748b', margin: 0 }}>{sub}</p>
                  </div>
                ))}
              </div>

              {/* phones (desktop) */}
              <div className="hidden lg:flex lg:items-start lg:gap-3">
                <PhoneShell style={{ flex: 1 }}><PhoneRoom /></PhoneShell>
                <FlowArrow />
                <PhoneShell dark style={{ flex: 1 }}><PhoneUpload /></PhoneShell>
                <FlowArrow />
                <PhoneShell dark style={{ flex: 1 }}><PhoneCraftsman /></PhoneShell>
                <FlowArrow />
                <PhoneShell style={{ flex: 1 }}><PhoneEstimate /></PhoneShell>
              </div>

              {/* phones (mobile 2x2) */}
              <div className="grid grid-cols-2 gap-4 lg:hidden">
                {[
                  { label: '1 部屋を撮影',     dark: false, content: <PhoneRoom /> },
                  { label: '2 動画を送信',     dark: true,  content: <PhoneUpload /> },
                  { label: '3 職人が確認',     dark: true,  content: <PhoneCraftsman /> },
                  { label: '4 見積もりが届く', dark: false, content: <PhoneEstimate /> },
                ].map(({ label, dark, content }) => (
                  <div key={label}>
                    <p style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', marginBottom: 6, color: '#0f172a' }}>{label}</p>
                    <PhoneShell dark={dark}>{content}</PhoneShell>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WHY PRO MATCH */}
        <section style={{ background: '#f8fafc', padding: '52px 20px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#3b82f6',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
            }}>WHY PRO MATCH</p>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>
              動画だから、<span style={{ color: '#3b82f6' }}>職人に伝わりやすい。</span>
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
              写真や文章では伝わりにくい現場の状況も、動画なら職人が一目で判断できます。
            </p>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[
                {
                  icon: '🎬',
                  title: 'ショート動画で内装見積もりを依頼できる',
                  desc: '壁紙・床CFの現場を10〜30秒で撮影して送るだけ。写真や寸法がなくても職人が状況を判断できます。',
                },
                {
                  icon: '👷',
                  title: '直接職人さんとつながれる',
                  desc: '仲介業者なしで地域の職人と直接やりとり。中間マージンを抑えやすく、話が早く進みます。',
                },
                {
                  icon: '💰',
                  title: 'お客様は完全無料',
                  desc: '依頼・見積もり確認・職人との連絡、すべて無料です。成約後の工事代金もお客様と職人の直接取引です。',
                },
                {
                  icon: '🔒',
                  title: '住所入力・ログイン不要',
                  desc: '最初に住所を入力する必要はありません。まずは概算確認だけでOK。しつこい営業は一切ありません。',
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  background: 'white', borderRadius: 16, padding: '18px 20px',
                  boxShadow: '0 1px 6px rgba(0,0,0,.06)',
                }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{title}</p>
                    <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.55, margin: 0 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 20, background: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
              borderRadius: 16, padding: '18px 20px', border: '1px solid #dbeafe',
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#3b82f6', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', margin: '0 0 4px' }}>動画で依頼すると、職人の判断が早い</p>
                <p style={{ fontSize: 12, color: '#3b82f6', lineHeight: 1.55, margin: 0 }}>
                  現場の状況を動画で確認できるため、現地調査前に精度の高い概算をお伝えできます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ background: 'white', borderTop: '1px solid #f0f4f8', padding: '40px 20px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ label, sub, d }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#eff6ff', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={d}/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: '0 0 2px', lineHeight: 1.4 }}>{label}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ── Footer links ── */}
      <footer style={{ background: '#0f172a', color: '#64748b', textAlign: 'center', padding: '20px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 20px', marginBottom: 8 }}>
          {[
            { href: '/privacy', label: 'プライバシーポリシー' },
            { href: '/terms',   label: '利用規約' },
            { href: '/policy',  label: '料金ポリシー' },
            { href: '/support', label: 'お問い合わせ' },
            { href: '/craftsman/jobs', label: '職人の方はこちら' },
          ].map(({ href, label }) => (
            <a key={href} href={href}
              style={{ color: '#64748b', textDecoration: 'none', fontSize: 11 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#cbd5e1')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >{label}</a>
          ))}
        </div>
        <p style={{ fontSize: 10, color: '#334155', margin: 0 }}>© 2025 PRO MATCH</p>
      </footer>

    </>
  );
}
