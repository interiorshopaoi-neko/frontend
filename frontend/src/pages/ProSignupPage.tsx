import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Video, Camera, ArrowRight, Zap } from 'lucide-react';

// ─── モック案件データ（LP用 / DBアクセスなし）────────────────────────────────

const STREAM_JOBS = [
  {
    id: 1,
    type: 'クロス張り替え',
    area: '神奈川県横浜市',
    price: '¥2〜3万',
    dist: '4.8km',
    urgency: '⚡ 今日希望',
    urgencyCls: 'bg-red-500',
    hasVideo: true,
    hasPhoto: true,
    img: '/homepage/wall-damage.jpg',
  },
  {
    id: 2,
    type: '床CF張り替え',
    area: '東京都世田谷区',
    price: '¥3〜5万',
    dist: '8.2km',
    urgency: '🔔 明日まで',
    urgencyCls: 'bg-orange-500',
    hasVideo: true,
    hasPhoto: true,
    img: '/homepage/floor.jpg',
  },
  {
    id: 3,
    type: 'クロス補修',
    area: '神奈川県川崎市',
    price: '¥1〜2万',
    dist: '6.1km',
    urgency: '📅 数日以内',
    urgencyCls: 'bg-amber-500',
    hasVideo: false,
    hasPhoto: true,
    img: '/homepage/room-wide.jpg',
  },
  {
    id: 4,
    type: '床全面張り替え',
    area: '東京都大田区',
    price: '¥5〜8万',
    dist: '11km',
    urgency: '💭 急ぎなし',
    urgencyCls: 'bg-slate-500',
    hasVideo: true,
    hasPhoto: true,
    img: '/homepage/floor.jpg',
  },
];

// ─── （ライブカウンター廃止 / 数字フェイク感を除去）─────────────────────────

// ─── フォンモック内のカード ───────────────────────────────────────────────────

function PhoneMock() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % 2), 3500);
    return () => clearInterval(id);
  }, []);

  const cards = [
    { type: 'クロス張り替え', area: '神奈川県', dist: '4.8km', price: '¥2〜3万', urgency: '⚡ 今日希望', urgCls: 'bg-red-500', idx: '1 / 17', img: '/homepage/room-wide.jpg' },
    { type: '床CF張り替え',   area: '東京都世田谷区', dist: '8.2km', price: '¥3〜5万', urgency: '🔔 明日まで', urgCls: 'bg-orange-500', idx: '2 / 17', img: '/homepage/floor.jpg' },
  ];

  const c = cards[slide];

  return (
    /* Phone frame */
    <div
      className="relative mx-auto flex-shrink-0"
      style={{
        width: 188,
        height: 378,
        borderRadius: 28,
        background: '#1a1a2e',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 6px #2a2a3e, 0 0 0 7px #111',
        overflow: 'hidden',
      }}
    >
      {/* Status bar */}
      <div className="flex justify-between items-center px-4 pt-2 pb-1" style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
        <span>9:41</span>
        <span>■■■ WiFi 100%</span>
      </div>

      {/* App header */}
      <div className="flex items-center justify-between px-3 pb-1.5">
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>職人向け案件</p>
          <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>空き日に入れる近場の仕事</p>
        </div>
        <div className="flex gap-1" style={{ fontSize: 8 }}>
          <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', padding: '2px 6px', borderRadius: 20 }}>一覧</span>
          <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: 20, fontWeight: 700 }}>▶ 動画</span>
        </div>
      </div>

      {/* Job card - animates between slides */}
      <div
        className="relative mx-2 overflow-hidden"
        style={{ height: 264, borderRadius: 16, background: '#0f172a' }}
      >
        {/* Real room photo */}
        <img
          key={c.img}
          src={c.img}
          alt={c.type}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* Gradient overlay — top dark for badges, bottom dark for text */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.88) 100%)',
          }}
        />

        {/* Top bar */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10">
          <span className={`${c.urgCls} text-white rounded-full px-2 py-0.5`} style={{ fontSize: 8, fontWeight: 800 }}>
            {c.urgency}
          </span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 20 }}>
            {c.idx}
          </span>
        </div>

        {/* Center: revenue */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none" style={{ paddingBottom: 68 }}>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 1, marginBottom: 2 }}>想定売上目安</p>
          <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{c.price}</p>
        </div>

        {/* Bottom: job info + CTA */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-2.5 pb-2.5">
          <div className="flex items-end justify-between mb-1.5">
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{c.type}</p>
              <div className="flex items-center gap-0.5">
                <MapPin size={8} color="rgba(255,255,255,0.5)" />
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>{c.area} / {c.dist}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={9} color="#fff" />
              </div>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={9} color="#fff" />
              </div>
            </div>
          </div>
          <button style={{ width: '100%', background: '#3b82f6', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 10, padding: '7px 0', border: 'none' }}>
            対応できます
          </button>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex justify-around items-center px-2 mt-1.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', height: 36 }}>
        {[
          { label: '案件', emoji: '💼', active: true },
          { label: '管理', emoji: '📋', active: false },
          { label: '応援', emoji: '🤝', active: false },
          { label: 'マイページ', emoji: '👤', active: false },
        ].map(({ label, emoji, active }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span style={{ fontSize: 12 }}>{emoji}</span>
            <span style={{ fontSize: 7, color: active ? '#3b82f6' : 'rgba(255,255,255,0.3)', fontWeight: active ? 700 : 400 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stream job card ─────────────────────────────────────────────────────────

function StreamCard({ job }: { job: (typeof STREAM_JOBS)[number] }) {
  return (
    <div
      className="flex-shrink-0 relative overflow-hidden rounded-2xl"
      style={{ width: 160, height: 220, background: '#0f172a' }}
    >
      {/* Real room photo */}
      <img
        src={job.img}
        alt={job.type}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      {/* Top badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start z-10">
        <span className={`${job.urgencyCls} text-white rounded-full px-2 py-0.5`} style={{ fontSize: 9, fontWeight: 800 }}>
          {job.urgency}
        </span>
        <div className="flex gap-1">
          {job.hasVideo && <Video size={11} color="rgba(255,255,255,0.7)" />}
          {job.hasPhoto && <Camera size={11} color="rgba(255,255,255,0.7)" />}
        </div>
      </div>

      {/* Center price */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none" style={{ paddingBottom: 52 }}>
        <p style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{job.price}</p>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-3 pb-3">
        <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{job.type}</p>
        <div className="flex items-center gap-1">
          <MapPin size={9} color="rgba(255,255,255,0.55)" />
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}>{job.area}</p>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>📍 {job.dist}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ProSignupPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}
      <div
        className="relative pb-10 overflow-hidden"
        style={{
          background: 'linear-gradient(170deg, #0a0a1a 0%, #111827 60%, #0f172a 100%)',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Nav */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2">
          <img src="/logo-full.svg" alt="PRO MATCH" className="h-7 object-contain brightness-200" />
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-white/50 hover:text-white/80 transition font-medium"
          >
            ログイン
          </button>
        </div>

        {/* Live indicator */}
        <div className="relative z-10 flex justify-center mt-4 mb-5">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-xs text-white/70 font-semibold">
              近くの案件を確認できます
            </span>
          </div>
        </div>

        {/* Phone mock + headline layout */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-5">

          {/* Headline above phone */}
          <div className="text-center">
            <h1 className="text-3xl font-black leading-tight tracking-tight">
              今日も近くで<br />
              <span className="text-blue-400">仕事が待っています</span>
            </h1>
            <p className="text-sm text-white/50 mt-2 font-medium">
              動画で見て → 3秒で判断 → 即応募
            </p>
          </div>

          {/* Phone mock */}
          <PhoneMock />

          {/* CTA */}
          <div className="w-full max-w-xs">
            <button
              onClick={() => navigate('/register')}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-black text-base py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30"
            >
              今すぐ無料で始める
              <ArrowRight size={18} />
            </button>
            <p className="text-center text-[11px] text-white/30 mt-2.5">
              登録・案件閲覧・応募 すべて無料
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          LIVE JOB STREAM
      ═══════════════════════════════════════ */}
      <div className="bg-slate-950 pt-8 pb-6">
        <div className="flex items-center gap-2 px-5 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
          </span>
          <p className="text-sm font-black text-white">今流れている案件</p>
          <span className="text-xs text-white/30">リアルタイム更新</span>
        </div>

        {/* Horizontal scroll */}
        <div
          className="flex gap-3 overflow-x-auto px-5 pb-2"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {STREAM_JOBS.map((job) => (
            <StreamCard key={job.id} job={job} />
          ))}
          {/* See more card */}
          <div
            className="flex-shrink-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 cursor-pointer"
            style={{ width: 160, height: 220 }}
            onClick={() => navigate('/register')}
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <ArrowRight size={18} className="text-blue-400" />
            </div>
            <p className="text-xs text-white/50 text-center px-4">登録して<br/>全件見る</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          HOW IT WORKS（3ステップ）
      ═══════════════════════════════════════ */}
      <div className="bg-slate-900 px-5 py-8">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4 text-center">
          How it works
        </p>
        <div className="flex gap-4">
          {[
            { num: '01', icon: '🎬', title: '動画で現場確認', sub: '現地行く前に\n状況が分かる' },
            { num: '02', icon: '⚡', title: '3秒で判断',     sub: '気に入ったら\n右スワイプだけ' },
            { num: '03', icon: '✅', title: '即応募・即返答', sub: '成約したら\n工事日を決める' },
          ].map(({ num, icon, title, sub }) => (
            <div key={num} className="flex-1 flex flex-col items-center text-center">
              <p className="text-[9px] font-black text-blue-500/60 mb-1.5">{num}</p>
              <span className="text-2xl mb-1.5">{icon}</span>
              <p className="text-xs font-black text-white leading-tight mb-1">{title}</p>
              <p className="text-[10px] text-white/35 leading-relaxed whitespace-pre-line">{sub}</p>
            </div>
          ))}
        </div>
        {/* Connector line */}
        <div className="flex items-center justify-center mt-4 gap-2">
          {[0, 1].map((i) => (
            <ArrowRight key={i} size={12} className="text-blue-500/30" />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          PROOF NUMBERS
      ═══════════════════════════════════════ */}
      <div
        className="px-5 py-8"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)' }}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { num: '初回2件', unit: '無料', sub: '登録後すぐ\n応募できる' },
            { num: '¥0',     unit: '登録費',sub: '案件閲覧・\n応募も無料' },
            { num: '¥500〜', unit: '成約時のみ', sub: '成約しなければ\nコストゼロ' },
          ].map(({ num, unit, sub }) => (
            <div key={unit} className="flex flex-col items-center">
              <p className="text-xl font-black text-white leading-none">{num}</p>
              <p className="text-[10px] font-bold text-blue-200 mt-0.5">{unit}</p>
              <p className="text-[9px] text-blue-300/70 mt-1.5 leading-relaxed whitespace-pre-line">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          VOICE (空気感テキスト)
      ═══════════════════════════════════════ */}
      <div className="bg-slate-950 px-6 py-8">
        <div className="space-y-4">
          {[
            { text: '"空き日に近所でサクッと1件入った"', sub: '横浜市 / クロス職人' },
            { text: '"動画で状況分かるから行くか判断できる"', sub: '世田谷区 / 床職人' },
            { text: '"営業しなくていいのが一番助かる"', sub: '川崎市 / 内装職人' },
          ].map(({ text, sub }) => (
            <div key={sub} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-sm">
                👷
              </div>
              <div>
                <p className="text-sm text-white/75 font-medium leading-snug">{text}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          BOTTOM CTA (sticky feel)
      ═══════════════════════════════════════ */}
      <div
        className="px-5 pt-8 pb-12"
        style={{ background: 'linear-gradient(170deg, #0a0a1a 0%, #030712 100%)' }}
      >
        <div className="flex items-center justify-center gap-1.5 mb-5">
          <Zap size={14} className="text-blue-400" />
          <p className="text-sm font-black text-white">今から登録できます</p>
        </div>

        <button
          onClick={() => navigate('/register')}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-black text-base py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 mb-3"
        >
          職人として無料登録する
          <ArrowRight size={18} />
        </button>

        <p className="text-center text-[11px] text-white/25 mb-6">
          登録・案件閲覧・応募 すべて無料 / 成約時のみ ¥500〜¥5,000
        </p>

        <p className="text-center text-xs text-white/30">
          すでにアカウントをお持ちの方は{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-white/60 font-bold hover:text-white transition underline underline-offset-2"
          >
            ログイン
          </button>
        </p>
      </div>

    </div>
  );
}
