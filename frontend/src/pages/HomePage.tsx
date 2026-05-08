import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

/* ─────────── 型・データ ─────────── */
type TipKey = 'bright' | 'slow' | 'focus' | 'dark' | 'fast' | 'blurry';
type StepAnim = 'pan' | 'zoom' | 'floor';

const GOOD_TIPS: { label: string; desc: string; key: TipKey }[] = [
  { label: '明るい場所で撮る',   desc: '自然光が入る場所がおすすめ',   key: 'bright' },
  { label: 'ゆっくり動かす',     desc: '急な動きは避けましょう',       key: 'slow'   },
  { label: '気になる箇所を映す', desc: '傷や汚れをしっかりと',         key: 'focus'  },
];
const BAD_TIPS: { label: string; desc: string; key: TipKey }[] = [
  { label: '暗すぎる',         desc: '見えにくくなります',   key: 'dark'   },
  { label: '速く動きすぎ',     desc: 'ブレてしまいます',     key: 'fast'   },
  { label: '近すぎ・ぼやける', desc: '全体がわかりません',   key: 'blurry' },
];
const SHOOT_STEPS: { n: number; title: string; desc: string; point: string; anim: StepAnim }[] = [
  {
    n: 1, title: '部屋を一周ゆっくり撮影',
    desc: '部屋全体が映るように\nゆっくり横に動かします',
    point: '壁・床・天井・ドアが見えるように\n一周してください',
    anim: 'pan',
  },
  {
    n: 2, title: '気になる箇所を近くで撮影',
    desc: '傷・汚れ・剥がれなど\n気になる部分をアップで',
    point: '補修が必要な箇所は\nしっかり近づいて撮りましょう',
    anim: 'zoom',
  },
  {
    n: 3, title: '床の状態も撮影',
    desc: '床材の種類や状態が\nわかるように撮ります',
    point: '床全体と、特に気になる箇所を\n映してください',
    anim: 'floor',
  },
];
const FEATURES = [
  { label: '全国の職人と直接つながる', sub: '地域の職人から直接見積もり',       iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { label: '安心の直接取引',          sub: '仲介なしで適正費格',               iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { label: '最短即日〜5日以内にお届け', sub: '多くの案件で5日以内にご回答',     iconPath: 'M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4 2' },
  { label: 'しつこい営業は一切なし',   sub: '必要なときだけ利用できる',          iconPath: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
];

/* ─────────── 室内シーン（共通） ─────────── */
function RoomScene({ panAnim = false }: { panAnim?: boolean }) {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden',
      animation: panAnim ? 'heroPan 12s ease-in-out infinite' : undefined }}>
      {/* 天井 */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'15%',
        background:'linear-gradient(180deg,#ffffff 0%,#f8f4ee 100%)' }}/>
      {/* 壁（窓側から暖かい光） */}
      <div style={{ position:'absolute', top:'15%', left:0, right:0, bottom:'28%',
        background:'radial-gradient(ellipse 75% 110% at 18% 35%, #fff8f0 0%, #f5ece0 45%, #ede3d2 100%)' }}/>
      {/* 窓の光 */}
      <div style={{ position:'absolute', top:'15%', left:'22%', width:'28%', bottom:'28%',
        background:'linear-gradient(105deg,rgba(255,248,200,0.22) 0%,transparent 70%)' }}/>
      {/* 幅木 */}
      <div style={{ position:'absolute', bottom:'28%', left:0, right:0, height:2,
        background:'#d0c8bc' }}/>
      {/* 床 */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'28%',
        background:'linear-gradient(180deg,#c8a87c 0%,#b89060 50%,#a87e4c 100%)' }}>
        <div style={{ position:'absolute', inset:0,
          background:'repeating-linear-gradient(90deg,transparent 0,transparent 17px,rgba(0,0,0,0.055) 17px,rgba(0,0,0,0.055) 18px)' }}/>
      </div>
      {/* 窓 */}
      <div style={{ position:'absolute', top:'18%', left:'7%', width:22, height:30,
        background:'linear-gradient(150deg,#eef6ff 0%,#c4dff0 100%)',
        border:'1.5px solid #aec8de', borderRadius:2,
        boxShadow:'0 0 16px 6px rgba(180,218,255,0.45)' }}>
        <div style={{ position:'absolute', top:'47%', left:0, right:0, height:1.5, background:'rgba(160,200,220,0.6)' }}/>
        <div style={{ position:'absolute', left:'47%', top:0, bottom:0, width:1.5, background:'rgba(160,200,220,0.6)' }}/>
      </div>
      {/* ソファ */}
      <div style={{ position:'absolute', bottom:'28%', left:'32%', width:44, height:16,
        filter:'drop-shadow(0 4px 8px rgba(70,40,15,0.28))' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'55%',
          background:'linear-gradient(180deg,#d0b08e 0%,#c4a080 100%)',
          borderRadius:'3px 3px 0 0' }}/>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'48%',
          background:'linear-gradient(180deg,#b89468 0%,#a88050 100%)' }}/>
        <div style={{ position:'absolute', top:'8%', bottom:'42%', left:'49%', width:1,
          background:'rgba(100,60,20,0.18)' }}/>
      </div>
      {/* 植物（参考画像にあるグリーン） */}
      <div style={{ position:'absolute', bottom:'28%', right:'6%', width:14, height:20,
        display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:14, height:14, borderRadius:'50% 50% 50% 50% / 60% 60% 40% 40%',
          background:'radial-gradient(ellipse at 40% 40%,#4ade80 0%,#16a34a 60%,#15803d 100%)',
          marginBottom:-2 }}/>
        <div style={{ width:4, height:8, background:'#78350f', borderRadius:2 }}/>
      </div>
      {/* 薄いシミ */}
      <div style={{ position:'absolute', top:'30%', right:'14%', width:12, height:8,
        background:'rgba(175,152,115,0.28)',
        borderRadius:'42% 58% 55% 45% / 52% 44% 56% 48%' }}/>
      {/* ビネット */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 88% 88% at 50% 45%, transparent 42%, rgba(0,0,0,0.10) 100%)' }}/>
    </div>
  );
}

/* ─────────── 3ステップ 横長サムネイル ─────────── */
function LandscapeContent({ anim }: { anim: StepAnim }) {
  if (anim === 'pan') return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      <RoomScene panAnim />
      {/* ファインダー枠 */}
      {(['tl','tr','bl','br'] as const).map(c => (
        <div key={c} style={{
          position:'absolute',
          top:    c[0]==='t' ? 8 : undefined, bottom: c[0]==='b' ? 8 : undefined,
          left:   c[1]==='l' ? 8 : undefined, right:  c[1]==='r' ? 8 : undefined,
          width:12, height:12,
          borderTop:    c[0]==='t' ? '2px solid rgba(255,255,255,0.85)' : undefined,
          borderBottom: c[0]==='b' ? '2px solid rgba(255,255,255,0.85)' : undefined,
          borderLeft:   c[1]==='l' ? '2px solid rgba(255,255,255,0.85)' : undefined,
          borderRight:  c[1]==='r' ? '2px solid rgba(255,255,255,0.85)' : undefined,
        }}/>
      ))}
      {/* REC */}
      <div style={{ position:'absolute', top:8, right:10, display:'flex', alignItems:'center', gap:3,
        background:'rgba(0,0,0,0.5)', borderRadius:10, padding:'2px 7px' }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:'#ef4444', display:'inline-block',
          animation:'recBlink 1.4s ease-in-out infinite' }}/>
        <span style={{ fontSize:7, fontWeight:700, color:'#fff' }}>REC</span>
      </div>
    </div>
  );

  if (anim === 'zoom') return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden',
      background:'radial-gradient(ellipse 70% 60% at 55% 40%,#f8f2e8 0%,#ede4d4 60%,#e0d4c0 100%)' }}>
      {/* 壁面 */}
      <div style={{ position:'absolute', top:0, bottom:0, left:'38%', width:1.5, background:'rgba(180,160,130,0.3)' }}/>
      <div style={{ position:'absolute', top:0, bottom:0, left:'76%', width:1.5, background:'rgba(180,160,130,0.3)' }}/>
      {/* シミ */}
      <div style={{ position:'absolute', top:'22%', left:'25%', width:'42%', height:'28%',
        background:'rgba(185,160,120,0.48)',
        borderRadius:'45% 55% 52% 48% / 50% 48% 52% 50%' }}/>
      <div style={{ position:'absolute', top:'46%', left:'22%', width:'50%', height:2,
        background:'rgba(155,128,90,0.38)' }}/>
      {/* フォーカス枠 */}
      <div style={{ position:'absolute', top:'14%', left:'12%', right:'12%', bottom:'14%',
        border:'2px solid rgba(251,191,36,0.88)', borderRadius:8 }}>
        {(['tl','tr','bl','br'] as const).map(c => (
          <div key={c} style={{
            position:'absolute',
            top:    c[0]==='t' ? -2 : undefined, bottom: c[0]==='b' ? -2 : undefined,
            left:   c[1]==='l' ? -2 : undefined, right:  c[1]==='r' ? -2 : undefined,
            width:10, height:10,
            borderTop:    c[0]==='t' ? '3px solid #fbbf24' : undefined,
            borderBottom: c[0]==='b' ? '3px solid #fbbf24' : undefined,
            borderLeft:   c[1]==='l' ? '3px solid #fbbf24' : undefined,
            borderRight:  c[1]==='r' ? '3px solid #fbbf24' : undefined,
          }}/>
        ))}
      </div>
    </div>
  );

  // floor
  return (
    <div style={{ position:'absolute', inset:0,
      background:'linear-gradient(180deg,#c8a87c 0%,#b89060 40%,#a07040 100%)' }}>
      {/* 床板横ライン */}
      <div style={{ position:'absolute', inset:0,
        background:'repeating-linear-gradient(0deg,rgba(0,0,0,0.06) 0,rgba(0,0,0,0.06) 1px,transparent 1px,transparent 22px)' }}/>
      {/* 床板縦ライン */}
      <div style={{ position:'absolute', inset:0,
        background:'repeating-linear-gradient(90deg,rgba(0,0,0,0.03) 0,rgba(0,0,0,0.03) 1px,transparent 1px,transparent 52px)' }}/>
      {/* 光沢 */}
      <div style={{ position:'absolute', top:0, left:'8%', width:'45%', height:'32%',
        background:'linear-gradient(180deg,rgba(255,255,255,0.10) 0%,transparent 100%)' }}/>
      {/* 傷・シミ */}
      <div style={{ position:'absolute', top:'38%', left:'22%', width:'24%', height:'8%',
        background:'rgba(140,100,55,0.35)', borderRadius:3 }}/>
      <div style={{ position:'absolute', top:'55%', left:'50%', width:'18%', height:'5%',
        background:'rgba(150,110,60,0.28)', borderRadius:2, transform:'rotate(-12deg)' }}/>
      {/* ファインダー */}
      <div style={{ position:'absolute', top:'12%', left:'8%', right:'8%', bottom:'12%',
        border:'1.5px solid rgba(255,255,255,0.5)', borderRadius:6 }}>
        {(['tl','tr','bl','br'] as const).map(c => (
          <div key={c} style={{
            position:'absolute',
            top:    c[0]==='t' ? -1 : undefined, bottom: c[0]==='b' ? -1 : undefined,
            left:   c[1]==='l' ? -1 : undefined, right:  c[1]==='r' ? -1 : undefined,
            width:9, height:9,
            borderTop:    c[0]==='t' ? '2px solid rgba(255,255,255,0.85)' : undefined,
            borderBottom: c[0]==='b' ? '2px solid rgba(255,255,255,0.85)' : undefined,
            borderLeft:   c[1]==='l' ? '2px solid rgba(255,255,255,0.85)' : undefined,
            borderRight:  c[1]==='r' ? '2px solid rgba(255,255,255,0.85)' : undefined,
          }}/>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Good/Bad 写真サムネイル風 ─────────── */
function PhotoThumb({ tipKey }: { tipKey: TipKey }) {
  if (tipKey === 'bright') return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      <RoomScene />
    </div>
  );

  if (tipKey === 'slow') return (
    <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#e8eeff 0%,#d0d8f8 100%)',
      display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:6 }}>
      <div style={{ position:'relative', width:'55%', aspectRatio:'9/16', borderRadius:8,
        background:'linear-gradient(180deg,#c8cce8 0%,#9ea4c8 100%)',
        border:'2px solid #8890c0', boxShadow:'0 4px 12px rgba(80,90,160,0.2)' }}>
        <div style={{ position:'absolute', inset:'15% 20%', background:'#b0b8e0', borderRadius:3 }}/>
        <div style={{ position:'absolute', bottom:'18%', left:'50%', transform:'translateX(-50%)',
          width:12, height:12, borderRadius:'50%', background:'#8890c0' }}/>
      </div>
      {/* ゆっくり矢印 */}
      <div style={{ display:'flex', alignItems:'center', gap:3 }}>
        <div style={{ width:24, height:2, background:'#6366f1', borderRadius:1 }}/>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5h6M6 2l3 3-3 3" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );

  if (tipKey === 'focus') return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden',
      background:'radial-gradient(ellipse at 60% 40%,#f8f2e8 0%,#ede4d4 100%)' }}>
      {/* 壁面 */}
      <div style={{ position:'absolute', inset:0,
        background:'radial-gradient(ellipse 70% 60% at 55% 40%,#f8f2e8 0%,#ede4d4 100%)' }}/>
      <div style={{ position:'absolute', top:'20%', left:'20%', width:'42%', height:'28%',
        background:'rgba(185,160,120,0.44)',
        borderRadius:'45% 55% 52% 48% / 50% 48% 52% 50%' }}/>
      {/* フォーカス枠 */}
      <div style={{ position:'absolute', top:'15%', left:'15%', right:'15%', bottom:'20%',
        border:'2px solid rgba(251,191,36,0.9)', borderRadius:6 }}>
        {(['tl','tr','bl','br'] as const).map(c => (
          <div key={c} style={{
            position:'absolute',
            top:    c[0]==='t' ? -2 : undefined, bottom: c[0]==='b' ? -2 : undefined,
            left:   c[1]==='l' ? -2 : undefined, right:  c[1]==='r' ? -2 : undefined,
            width:8, height:8,
            borderTop:    c[0]==='t' ? '2.5px solid #fbbf24' : undefined,
            borderBottom: c[0]==='b' ? '2.5px solid #fbbf24' : undefined,
            borderLeft:   c[1]==='l' ? '2.5px solid #fbbf24' : undefined,
            borderRight:  c[1]==='r' ? '2.5px solid #fbbf24' : undefined,
          }}/>
        ))}
      </div>
    </div>
  );

  if (tipKey === 'dark') return (
    <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,#10121e 0%,#0a0c18 100%)',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      {/* 暗い窓の輪郭 */}
      <div style={{ position:'absolute', top:'10%', left:'8%', width:'22%', height:'30%',
        background:'#161824', border:'1px solid #1e2030', borderRadius:2 }}/>
      {/* 月 */}
      <div style={{ position:'absolute', top:'8%', right:'12%',
        width:16, height:16, borderRadius:'50%', background:'#e2e8f0', opacity:0.35 }}/>
      {/* 暗いソファのシルエット */}
      <div style={{ position:'absolute', bottom:'22%', left:'28%', width:'45%', height:'16%',
        background:'#181a28', borderRadius:3 }}/>
    </div>
  );

  if (tipKey === 'fast') return (
    <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#fff5f5 0%,#fee2e2 100%)',
      overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {/* 速い動きのブラー表現 */}
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{
          position:'absolute', left:`${10+i*15}%`, top:`${25+i*8}%`,
          width:`${55-i*8}%`, height:3,
          background:`rgba(239,68,68,${0.7-i*0.12})`,
          borderRadius:2, transform:`rotate(${-3+i}deg)`
        }}/>
      ))}
      <svg style={{ position:'absolute', right:'8%', top:'50%', transform:'translateY(-50%)' }}
        width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 10h12M12 5l5 5-5 5" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );

  // blurry
  return (
    <div style={{ position:'absolute', inset:0,
      background:'radial-gradient(ellipse 70% 60% at 55% 40%,#f8f2e8 0%,#ede4d4 100%)',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      {/* ぼかし同心円 */}
      <div style={{ position:'absolute', top:'18%', left:'18%', width:'64%', height:'64%',
        borderRadius:'50%', background:'rgba(180,155,115,0.12)',
        boxShadow:'0 0 0 12px rgba(175,150,110,0.10),0 0 0 24px rgba(170,145,105,0.07),0 0 0 36px rgba(165,140,100,0.05)' }}/>
      <div style={{ width:'28%', aspectRatio:'1', borderRadius:'50%',
        background:'rgba(170,142,105,0.45)' }}/>
    </div>
  );
}

/* ─────────── Hero4ステップ大型モック ─────────── */
function HeroPhoneContent({ step }: { step: 1 | 2 | 3 | 4 }) {
  if (step === 1) return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      <RoomScene panAnim />
      {/* ファインダー */}
      {(['tl','tr','bl','br'] as const).map(c => (
        <div key={c} style={{
          position:'absolute',
          top:    c[0]==='t' ? 8 : undefined, bottom: c[0]==='b' ? 8 : undefined,
          left:   c[1]==='l' ? 8 : undefined, right:  c[1]==='r' ? 8 : undefined,
          width:14, height:14,
          borderTop:    c[0]==='t' ? '2px solid rgba(255,255,255,0.92)' : undefined,
          borderBottom: c[0]==='b' ? '2px solid rgba(255,255,255,0.92)' : undefined,
          borderLeft:   c[1]==='l' ? '2px solid rgba(255,255,255,0.92)' : undefined,
          borderRight:  c[1]==='r' ? '2px solid rgba(255,255,255,0.92)' : undefined,
        }}/>
      ))}
      {/* REC */}
      <div style={{ position:'absolute', top:10, right:10, display:'flex', alignItems:'center', gap:3,
        background:'rgba(0,0,0,0.52)', borderRadius:10, padding:'3px 8px' }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:'#ef4444', display:'inline-block',
          animation:'recBlink 1.4s ease-in-out infinite' }}/>
        <span style={{ fontSize:7, fontWeight:700, color:'#fff' }}>REC</span>
      </div>
      {/* ラベル＋録画ボタン */}
      <div style={{ position:'absolute', bottom:10, left:0, right:0, display:'flex', flexDirection:'column',
        alignItems:'center', gap:5 }}>
        <span style={{ fontSize:7, color:'rgba(0,0,0,0.7)', fontWeight:600,
          background:'rgba(255,255,255,0.88)', borderRadius:10, padding:'3px 10px' }}>
          部屋を一周しながら撮影中...
        </span>
        <div style={{ width:18, height:18, borderRadius:'50%',
          border:'2px solid rgba(255,255,255,0.8)', background:'rgba(239,68,68,0.9)',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:7, height:7, borderRadius:1, background:'white' }}/>
        </div>
      </div>
    </div>
  );

  if (step === 2) return (
    <div style={{ position:'absolute', inset:0,
      background:'radial-gradient(ellipse at 50% 50%,#0f1a2e 0%,#060c18 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
      {/* パーティクル */}
      {[10,25,45,60,75,85,15,40,65,80].map((l, i) => (
        <div key={i} style={{ position:'absolute', left:`${l}%`, top:`${10+i*8}%`,
          width:2, height:2, borderRadius:'50%', background:'rgba(255,255,255,0.15)' }}/>
      ))}
      {/* 送信アイコン大 */}
      <div style={{ position:'relative', width:64, height:64 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%',
          border:'1.5px solid rgba(99,102,241,0.25)',
          animation:'heroZoom 2.5s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', inset:4, borderRadius:'50%',
          background:'linear-gradient(135deg,rgba(59,130,246,0.4),rgba(99,102,241,0.3))',
          border:'2px solid rgba(99,102,241,0.65)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 0 28px rgba(99,102,241,0.35)' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 19V9M10 13l4-4 4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="5" y="21" width="18" height="2" rx="1" fill="rgba(255,255,255,0.4)"/>
          </svg>
        </div>
      </div>
      <div style={{ width:'68%', height:3, background:'rgba(255,255,255,0.08)', borderRadius:4 }}>
        <div style={{ width:'82%', height:'100%',
          background:'linear-gradient(90deg,#6366f1,#3b82f6)', borderRadius:4 }}/>
      </div>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.95)', margin:'0 0 3px' }}>送信完了！</p>
        <p style={{ fontSize:7.5, color:'rgba(255,255,255,0.45)', margin:0 }}>職人に共有しました</p>
      </div>
    </div>
  );

  if (step === 3) return (
    <div style={{ position:'absolute', inset:0,
      background:'linear-gradient(180deg,#0f172a 0%,#1a2540 100%)',
      display:'flex', flexDirection:'column' }}>
      {/* 職人シルエット */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <svg style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
          width:'75%', height:'90%' }} viewBox="0 0 80 120" fill="none">
          {/* 胴体 */}
          <rect x="18" y="50" width="44" height="62" rx="4" fill="#1e293b"/>
          {/* 頭 */}
          <circle cx="40" cy="35" r="18" fill="#243040"/>
          {/* バンダナ */}
          <path d="M24 28 Q40 22 56 28 L54 34 Q40 29 26 34Z" fill="#334155"/>
          {/* 目（薄く） */}
          <ellipse cx="33" cy="35" r="2.5" ry="1.8" fill="rgba(255,255,255,0.12)"/>
          <ellipse cx="47" cy="35" r="2.5" ry="1.8" fill="rgba(255,255,255,0.12)"/>
          {/* 腕 */}
          <rect x="4"  y="58" width="16" height="32" rx="8" fill="#1a2535"/>
          <rect x="60" y="58" width="16" height="32" rx="8" fill="#1a2535"/>
          {/* 手元のスマホ */}
          <rect x="28" y="94" width="24" height="16" rx="3" fill="#2d3f55"/>
          <rect x="30" y="96" width="20" height="12" rx="2" fill="#3b4f68"/>
          <rect x="31" y="97" width="18" height="8" rx="1" fill="#4a6080"/>
        </svg>
        {/* チャットバブル */}
        <div style={{ position:'absolute', top:'15%', right:'8%',
          background:'rgba(255,255,255,0.10)', borderRadius:10, padding:'6px 10px',
          border:'1px solid rgba(255,255,255,0.14)',
          backdropFilter:'blur(4px)' }}>
          <div style={{ display:'flex', gap:3 }}>
            {([0,0.3,0.6] as const).map((d, i) => (
              <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#60a5fa',
                display:'inline-block', animation:`heroDots 1.4s ease-in-out ${d}s infinite` }}/>
            ))}
          </div>
        </div>
      </div>
      {/* ステータス */}
      <div style={{ padding:'8px 12px',
        background:'rgba(0,0,0,0.35)', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.92)', margin:'0 0 2px' }}>
          内容を確認中...
        </p>
        <p style={{ fontSize:7, color:'rgba(255,255,255,0.42)', margin:0 }}>
          対応可能な職人が確認しています
        </p>
      </div>
    </div>
  );

  // step 4: 見積書
  return (
    <div style={{ position:'absolute', inset:0, background:'#f8fafc',
      display:'flex', flexDirection:'column' }}>
      {/* 小ヘッダー */}
      <div style={{ background:'white', padding:'5px 8px', borderBottom:'1px solid #f0f4f8',
        display:'flex', alignItems:'center', gap:4 }}>
        <div style={{ width:14, height:14, borderRadius:'50%',
          background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M5 1L9 8H1L5 1Z" fill="white"/>
          </svg>
        </div>
        <span style={{ fontSize:6, fontWeight:700, color:'#1e293b' }}>お見積もり</span>
      </div>
      {/* 金額エリア */}
      <div style={{ padding:'8px 10px 5px', borderBottom:'1px solid #f1f5f9' }}>
        <p style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:0, letterSpacing:'-0.04em' }}>
          ¥92,000<span style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>〜</span>
        </p>
        <p style={{ fontSize:6.5, color:'#64748b', margin:'2px 0 0' }}>壁紙張り替え・6畳</p>
      </div>
      {/* チェックリスト */}
      <div style={{ padding:'6px 10px', flex:1 }}>
        {(['壁紙張替', '床材確認', '下地補修'] as const).map(item => (
          <div key={item} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 0',
            borderBottom:'1px solid #f8fafc' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}>
              <circle cx="7" cy="7" r="7" fill="#22c55e"/>
              <path d="M4 7l2 2 4-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize:8, fontWeight:500, color:'#374151' }}>{item}</span>
          </div>
        ))}
      </div>
      {/* 下部CTA */}
      <div style={{ padding:'8px 10px' }}>
        <div style={{ borderRadius:10, background:'linear-gradient(90deg,#2563eb,#4f46e5)',
          padding:'8px 0', display:'flex', flexDirection:'column', alignItems:'center',
          boxShadow:'0 4px 14px rgba(37,99,235,0.35)' }}>
          <div style={{ width:20, height:20, borderRadius:'50%',
            background:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.6)',
            display:'flex', alignItems:'center', justifyContent:'center', marginBottom:3 }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ fontSize:7, fontWeight:700, color:'white', margin:0 }}>見積もりが届きました！</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────── 矢印 ─────────── */
function FlowArrow() {
  return (
    <div style={{ flexShrink:0, width:24, display:'flex', alignItems:'center', justifyContent:'center',
      paddingTop:'5rem' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 10h14M11 5l5 5-5 5" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

/* ─────────── メインコンポーネント ─────────── */
export default function HomePage() {
  const navigate = useNavigate();
  const handleStart = () => navigate('/corporate');

  const HERO_STEPS = [
    { step: 1 as const, title:'部屋を撮影',     sub:'ゆっくり一周するだけ' },
    { step: 2 as const, title:'動画を送信',     sub:'30秒で完了'           },
    { step: 3 as const, title:'職人が確認',     sub:'内容をチェック'       },
    { step: 4 as const, title:'見積もりが届く', sub:'最短即日でお届け'     },
  ];

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
          50%  { transform: scale(1.08); }
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
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-5px); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>

      {/* ── Topbar ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100/80">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="7" fill="#3b82f6"/>
              <path d="M8 23 L16 9 L24 23Z" fill="white" opacity="0.95"/>
              <rect x="12" y="19" width="8" height="4" fill="#3b82f6"/>
            </svg>
            <span className="font-extrabold text-slate-900 text-[15px] tracking-tight">PRO MATCH</span>
          </div>
          <div className="hidden sm:flex items-start gap-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-bold text-amber-800 leading-tight">安心の直接取引サービス</span>
            <div className="w-px h-3 bg-amber-200 mx-1 mt-0.5"/>
            <span className="text-[10px] text-amber-600 leading-tight">必要満足度率向上に取り組んでいます</span>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-5 pt-10 pb-8 lg:flex lg:items-center lg:gap-8 lg:pt-14 lg:pb-12">

        {/* 左：テキスト・CTA (38%) */}
        <div className="lg:w-[38%] flex-shrink-0 mb-10 lg:mb-0">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block"/>
            30秒で完了・完全無料
          </div>

          <h1 className="text-[2.0rem] lg:text-[2.5rem] font-black text-slate-900 leading-[1.15] tracking-tight mb-4">
            ショート動画で、<br />
            職人から<span className="text-blue-600">直接</span><br />
            見積もりが届く。
          </h1>

          <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
            部屋を撮るだけで、壁紙・床の見積もりが届きます。
          </p>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {([
              { icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10', label:'写真や寸法は不要' },
              { icon:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', label:'現場説明も不要' },
              { icon:'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', label:'説明文はいりません' },
              { icon:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label:'しつこい営業なし' },
            ] as const).map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-blue-500" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon}/>
                </svg>
                <span className="text-[11px] font-medium text-slate-700 leading-tight">{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-extrabold text-base shadow-lg shadow-blue-200/80 transition-all mb-2"
          >
            30秒で見積もりする →
          </button>
          <p className="text-xs text-slate-400 text-center lg:text-left">お客様は完全無料・ログイン不要</p>
        </div>

        {/* 右：4ステップ大型フロー (62%) */}
        <div className="flex-1 min-w-0">

          {/* モバイル */}
          <div className="grid grid-cols-2 gap-3 lg:hidden max-w-xs mx-auto">
            {HERO_STEPS.map(({ step, title }, i) => (
              <div key={step} className="flex flex-col items-center gap-1">
                <div style={{ width:'100%', aspectRatio:'9/16', borderRadius:14,
                  border:'2px solid #1e2938', background:'#111827', position:'relative', overflow:'hidden',
                  boxShadow:'0 6px 20px rgba(0,0,0,0.2)' }}>
                  <HeroPhoneContent step={step}/>
                  <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                    width:'36%', height:4, background:'#111827', borderRadius:'0 0 4px 4px', zIndex:10 }}/>
                </div>
                <span className="text-[8px] font-semibold text-slate-500">{i+1}. {title}</span>
              </div>
            ))}
          </div>

          {/* デスクトップ */}
          <div className="hidden lg:flex items-start">
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <div className="text-center h-12 flex flex-col justify-center px-1">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <span className="text-xs font-bold text-slate-800">部屋を撮影</span>
                </div>
                <p className="text-[9px] text-slate-400">ゆっくり一周するだけ</p>
              </div>
              <div style={{ width:'100%', aspectRatio:'9/16', borderRadius:18, border:'2.5px solid #1e2938',
                background:'#111827', position:'relative', overflow:'hidden',
                boxShadow:'0 10px 32px rgba(0,0,0,0.22)', animation:'phoneFloat 3.2s ease-in-out infinite' }}>
                <HeroPhoneContent step={1}/>
                <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                  width:'38%', height:5, background:'#111827', borderRadius:'0 0 5px 5px', zIndex:10 }}/>
              </div>
            </div>
            <FlowArrow />
            {/* Step 2 */}
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <div className="text-center h-12 flex flex-col justify-center px-1">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <span className="text-xs font-bold text-slate-800">動画を送信</span>
                </div>
                <p className="text-[9px] text-slate-400">30秒で完了</p>
              </div>
              <div style={{ width:'100%', aspectRatio:'9/16', borderRadius:18, border:'2.5px solid #1e2938',
                background:'#111827', position:'relative', overflow:'hidden',
                boxShadow:'0 10px 32px rgba(0,0,0,0.22)', animation:'phoneFloat 3.5s ease-in-out infinite', animationDelay:'0.3s' }}>
                <HeroPhoneContent step={2}/>
                <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                  width:'38%', height:5, background:'#111827', borderRadius:'0 0 5px 5px', zIndex:10 }}/>
              </div>
            </div>
            <FlowArrow />
            {/* Step 3 */}
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <div className="text-center h-12 flex flex-col justify-center px-1">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <span className="text-xs font-bold text-slate-800">職人が確認</span>
                </div>
                <p className="text-[9px] text-slate-400">内容をチェック</p>
              </div>
              <div style={{ width:'100%', aspectRatio:'9/16', borderRadius:18, border:'2.5px solid #1e2938',
                background:'#111827', position:'relative', overflow:'hidden',
                boxShadow:'0 10px 32px rgba(0,0,0,0.22)', animation:'phoneFloat 3.8s ease-in-out infinite', animationDelay:'0.6s' }}>
                <HeroPhoneContent step={3}/>
                <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                  width:'38%', height:5, background:'#111827', borderRadius:'0 0 5px 5px', zIndex:10 }}/>
              </div>
            </div>
            <FlowArrow />
            {/* Step 4 */}
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <div className="text-center h-12 flex flex-col justify-center px-1">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">4</span>
                  <span className="text-xs font-bold text-slate-800">見積もりが届く</span>
                </div>
                <p className="text-[9px] text-slate-400">最短即日でお届け</p>
              </div>
              <div style={{ width:'100%', aspectRatio:'9/16', borderRadius:18, border:'2.5px solid #1e2938',
                background:'#111827', position:'relative', overflow:'hidden',
                boxShadow:'0 10px 32px rgba(0,0,0,0.22)', animation:'phoneFloat 4.1s ease-in-out infinite', animationDelay:'0.9s' }}>
                <HeroPhoneContent step={4}/>
                <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                  width:'38%', height:5, background:'#111827', borderRadius:'0 0 5px 5px', zIndex:10 }}/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW TO SHOOT + キレイに撮るコツ（2カラム） ── */}
      <section className="px-5 py-14" style={{ background:'linear-gradient(180deg,#f0f4ff 0%,#eaeffa 100%)' }}>
        <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12">

          {/* 左：撮り方3ステップ */}
          <div>
            <div className="mb-8">
              <span className="inline-block bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full mb-2 tracking-widest">HOW TO SHOOT</span>
              <h2 className="text-xl font-black text-slate-900 mb-1">
                撮り方はかんたん <span className="text-blue-600">3ステップ</span>
              </h2>
              <p className="text-xs text-slate-500">スマホで撮るだけ。難しい操作はありません。</p>
            </div>

            <div className="flex flex-col gap-4">
              {SHOOT_STEPS.map(step => (
                <div key={step.n} className="bg-white rounded-2xl overflow-hidden shadow-sm"
                  style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04)' }}>
                  {/* 横長サムネイル */}
                  <div className="relative" style={{ aspectRatio:'16/9', background:'#f0ebe4' }}>
                    <LandscapeContent anim={step.anim}/>
                  </div>
                  {/* テキスト */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">{step.n}</span>
                      <h3 className="text-sm font-extrabold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-2 whitespace-pre-line">{step.desc}</p>
                    <div className="bg-indigo-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] font-bold text-indigo-500 mb-0.5">◆ ポイント</p>
                      <p className="text-[10px] text-slate-600 leading-relaxed whitespace-pre-line">{step.point}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右：キレイに撮るコツ */}
          <div className="mt-10 lg:mt-0">
            <h2 className="text-xl font-black text-slate-900 mb-6">キレイに撮るコツ</h2>

            {/* Good */}
            <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
              style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(16,185,129,0.06)', border:'1px solid #d1fae5' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2.5 6.5l3 3 5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-extrabold text-emerald-700">Good</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {GOOD_TIPS.map(({ label, desc, key }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="relative rounded-xl overflow-hidden bg-slate-100"
                      style={{ aspectRatio:'4/3' }}>
                      <PhotoThumb tipKey={key}/>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-700 leading-tight">{label}</p>
                    <p className="text-[9px] text-slate-400 leading-tight">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bad */}
            <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
              style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(239,68,68,0.06)', border:'1px solid #fee2e2' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M3 3l7 7M10 3l-7 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="font-extrabold text-red-600">Bad</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {BAD_TIPS.map(({ label, desc, key }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="relative rounded-xl overflow-hidden bg-slate-800"
                      style={{ aspectRatio:'4/3' }}>
                      <PhotoThumb tipKey={key}/>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-700 leading-tight">{label}</p>
                    <p className="text-[9px] text-slate-400 leading-tight">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 動画メリット */}
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex items-start gap-2.5">
              <span className="text-lg mt-0.5 flex-shrink-0">✨</span>
              <div>
                <p className="text-sm font-extrabold text-indigo-700 mb-0.5">動画だから、伝わりやすい！</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  職人は動画を見ることで、現場の状況を正確に把握でき、<br className="hidden sm:block"/>
                  精度の高い見積もりをお届けできます。
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 特徴4点 横並びストリップ ── */}
      <section className="px-5 py-10 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ label, sub, iconPath }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={iconPath}/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900 leading-tight mb-0.5">{label}</p>
                <p className="text-xs text-slate-400 leading-tight">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="px-5 py-16 text-center"
        style={{ background:'linear-gradient(160deg,#1d4ed8 0%,#2563eb 55%,#1e40af 100%)' }}
      >
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-extrabold text-white mb-2 leading-snug">撮れたら、そのまま送るだけ</h2>
          <p className="text-sm text-blue-200/90 mb-7">現在は無料でご利用いただけます</p>
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-yellow-900 font-extrabold text-base shadow-xl shadow-blue-900/30 transition-all"
          >
            ショート動画で見積もりする
          </button>
          <p className="text-xs text-blue-300/80 mt-4">ログイン不要・登録なし・無料</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-5 pb-24 text-center border-t border-slate-100 bg-white space-y-2">
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
