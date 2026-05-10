import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Video,
  Wallet,
  Users,
  Gift,
  BellRing,
  ShieldCheck,
  Lock,
  Play,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  HelpingHand,
  Clock,
  ChevronUp,
  Wrench,
  Hammer,
  Calculator,
  StickyNote,
  CalendarDays,
  Bot,
  Radio,
} from 'lucide-react';
import { FEE_TABLE } from '../constants/fees';

/* ───────────────────── データ ───────────────────── */

const CORE_BENEFITS = [
  {
    icon: MapPin,
    title: '空き日に、近場の仕事が入る',
    desc: 'エリア・対応工事・空き日に合う案件だけ通知。遠方の現調に走り回る必要はありません。',
    badge: '近場',
  },
  {
    icon: Video,
    title: '動画で現場を事前確認',
    desc: 'ショート動画で部屋の状態を確認できるので、現調のムダが減ります。応募する前に判断OK。',
    badge: 'ムダなし',
  },
  {
    icon: Wallet,
    title: '想定売上の目安が見える',
    desc: '工事内容と部屋情報から、想定売上のレンジを表示。利益が合う案件だけ選べます。',
    badge: '透明',
  },
  {
    icon: HelpingHand,
    title: '応援の募集・参加もできる',
    desc: '人手が足りない日は応援募集。空いてる日は応援参加。職人同士で繋がれます。',
    badge: 'β',
  },
] as const;

const REVENUE_GUIDE = [
  { label: 'クロス張り替え', range: '3〜6万円前後',         note: '6畳〜10畳程度の目安' },
  { label: '床工事',         range: '5〜10万円前後',        note: 'CF・フロアタイル等' },
  { label: '応援（日当）',   range: '18,000〜25,000円前後', note: '内容・拘束時間で変動' },
] as const;

const PREVIEW_JOBS = [
  {
    workType: 'クロス張替え',
    city: '太田市',
    distance: '4.8km',
    size: '6畳',
    urgencyLabel: '今日〜明日',
    urgencyTone: 'urgent' as const,
    fresh: '15分前',
  },
  {
    workType: '床補修',
    city: '伊勢崎市',
    distance: '12.3km',
    size: '8畳',
    urgencyLabel: '3日以内',
    urgencyTone: 'soon' as const,
    fresh: '1時間前',
  },
  {
    workType: 'クロス補修',
    city: '前橋市',
    distance: '7.1km',
    size: '4.5畳',
    urgencyLabel: '来週以降',
    urgencyTone: 'normal' as const,
    fresh: '今日',
  },
] as const;

/* ショート動画デモのスライドデータ */
const VIDEO_DEMO = {
  front: {
    workType: 'クロス張替え',
    city: '太田市',
    distance: '4.8km',
    size: '6畳',
    revenue: '¥4〜6万',
    urgencyLabel: '⚡ 今日希望',
    fresh: '15分前',
    bg: 'linear-gradient(135deg,#1f2937 0%,#0f172a 60%,#020617 100%)',
  },
  back: {
    workType: '床補修',
    city: '伊勢崎市',
    distance: '12km',
    revenue: '¥6〜9万',
    bg: 'linear-gradient(135deg,#1e293b 0%,#0b1220 100%)',
  },
} as const;

const STEPS = [
  { n: 1, title: '無料で職人登録',     desc: 'メール認証だけ。30秒で完了します。' },
  { n: 2, title: 'ショート動画で案件チェック', desc: '近場の動画案件と詳細が届きます。気になる案件だけ確認。' },
  { n: 3, title: '応募 → 成約',         desc: '応募は無料。成約時のみ手数料が発生します。' },
] as const;

const FAQS = [
  {
    q: '動画は誰が撮るんですか？',
    a: 'お客様が撮影します。職人は届いた動画を見るだけで、現調に行く前に状況を判断できます。',
  },
  {
    q: '応募するだけで料金はかかりますか？',
    a: 'いいえ。登録・案件閲覧・応募はすべて無料です。料金は成約時のみ発生します。',
  },
  {
    q: 'しつこい営業電話は来ませんか？',
    a: '営業電話は一切ありません。連絡はアプリ内通知が中心です。',
  },
  {
    q: '工事代金はどう受け取りますか？',
    a: '工事代金はお客様と直接やり取りします。PRO MATCHは工事代金をお預かりしません。',
  },
  {
    q: 'キャンセルされた場合は？',
    a: '成約に至らなければ手数料は発生しません。リスクなく案件を試せます。',
  },
] as const;

/* 便利ツール（順次拡張） */
const TOOLS = [
  { icon: Calculator,   label: '簡単見積',       note: '近日' },
  { icon: Wallet,       label: '日当メモ',       note: '近日' },
  { icon: Hammer,       label: '材料計算',       note: '近日' },
  { icon: StickyNote,   label: '現場メモ',       note: '近日' },
  { icon: CalendarDays, label: '空き日管理',     note: '近日' },
  { icon: Bot,          label: 'AI見積サポート', note: '順次開発中・予定' },
] as const;

/* ───────────────────── 小コンポーネント ───────────────────── */

function UrgencyBadge({ tone, label }: { tone: 'urgent' | 'soon' | 'normal'; label: string }) {
  const cls =
    tone === 'urgent' ? 'bg-rose-50 text-rose-600 border-rose-100'
    : tone === 'soon' ? 'bg-amber-50 text-amber-700 border-amber-100'
    : 'bg-slate-50 text-slate-500 border-slate-100';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>
      <Clock size={10} />
      {label}
    </span>
  );
}

function PreviewJobCard({ job }: { job: typeof PREVIEW_JOBS[number] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold mb-0.5">{job.fresh}</p>
            <p className="text-sm font-bold text-slate-900 leading-tight">{job.workType}</p>
          </div>
          <UrgencyBadge tone={job.urgencyTone} label={job.urgencyLabel} />
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} className="text-slate-400" />
            {job.city}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-slate-700">{job.distance}</span>
          <span className="text-slate-300">·</span>
          <span>{job.size}</span>
        </div>
      </div>

      <div className="relative border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex items-center gap-2 select-none" aria-hidden>
          <div className="flex-1 h-7 rounded-md bg-slate-200/70 blur-[2px]" />
          <div className="w-16 h-7 rounded-md bg-slate-200/70 blur-[2px]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-white/55 backdrop-blur-[1px]">
          <Lock size={12} className="text-slate-500" />
          <span className="text-[11px] font-bold text-slate-600">登録すると、動画・詳細・応募が見られます</span>
        </div>
      </div>
    </div>
  );
}

/* ── ショート動画デモのカード（手前・大）── */
function VideoDemoFront() {
  const j = VIDEO_DEMO.front;
  return (
    <div
      className="relative rounded-[28px] overflow-hidden shadow-2xl border border-white/10"
      style={{
        aspectRatio: '9 / 16',
        background: j.bg,
      }}
    >
      {/* 装飾：subtle ノイズ／ライト */}
      <div className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(99,102,241,0.18), transparent 55%)',
        }}
      />
      {/* 上下グラデマスク */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 30%, transparent 50%, rgba(0,0,0,0.85) 100%)' }}
      />

      {/* 動画プレースホルダーの中央アイコン（薄く） */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Video size={68} className="text-white/8" strokeWidth={1.5} />
      </div>

      {/* トップバー */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-white shadow flex items-center gap-1">
            🔥 新着
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow">
            {j.urgencyLabel}
          </span>
        </div>
        <span className="text-white/60 text-[10px] font-mono bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
          1 / 18
        </span>
      </div>

      {/* 中央：希少性 + 想定売上 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none gap-3 px-4 pb-32">
        <div className="flex items-center gap-1.5">
          <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-xl animate-pulse">
            🔥 残り1枠
          </span>
          <span className="bg-orange-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-xl">
            ⚡ 早い人優先
          </span>
        </div>

        <div className="text-center bg-black/40 backdrop-blur-xl rounded-2xl px-6 py-3.5 border border-white/10 shadow-2xl">
          <p className="text-white/60 text-[9px] font-bold uppercase tracking-[0.18em] mb-1">想定売上目安</p>
          <p className="text-white font-black leading-none tabular-nums text-[44px]"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
          >
            {j.revenue}
          </p>
        </div>

        <span className="bg-black/40 backdrop-blur text-white/85 text-[10px] font-bold px-2.5 py-1 rounded-full">
          本日中に決まります
        </span>
      </div>

      {/* ボトム：案件情報 + ボタン */}
      <div className="absolute left-3 right-3 bottom-3 z-10">
        <p className="text-white text-[15px] font-extrabold leading-tight mb-1 drop-shadow">{j.workType}</p>
        <div className="flex items-center gap-2 text-[10.5px] mb-3 flex-wrap">
          <span className="text-white/75 inline-flex items-center gap-0.5">
            <MapPin size={10} /> {j.city}
          </span>
          <span className="text-blue-300 font-bold">約{j.distance}</span>
          <span className="text-white/55">📐 {j.size}</span>
          <span className="text-white/40 ml-auto">🕐 {j.fresh}</span>
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-xl bg-white/10 backdrop-blur border border-white/20 py-2.5 text-white/85 text-[11px] font-bold inline-flex items-center justify-center gap-1"
            disabled
          >
            <ChevronUp size={12} /> スキップ
          </button>
          <button
            className="flex-[2] rounded-xl bg-blue-600 py-2.5 text-white text-[12px] font-extrabold shadow-lg"
            disabled
          >
            今すぐ行けます
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-white/40">→ 右スワイプで即応募</p>
      </div>

      {/* 右端ドットインジケーター */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
        <span className="w-1 h-5 rounded-full bg-white" />
        <span className="w-1 h-1 rounded-full bg-white/35" />
        <span className="w-1 h-1 rounded-full bg-white/35" />
      </div>

      {/* ロックバナー（薄く・最下部） */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[170%] z-20 pointer-events-none">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2.5 py-1 border border-white/10">
          <Lock size={10} className="text-white/80" />
          <span className="text-[9.5px] font-bold text-white/80">動画は登録後に再生</span>
        </span>
      </div>
    </div>
  );
}

/* ── ショート動画デモのカード（奥・チラ見せ）── */
function VideoDemoBack() {
  const j = VIDEO_DEMO.back;
  return (
    <div
      className="relative rounded-[24px] overflow-hidden shadow-xl border border-white/5"
      style={{ aspectRatio: '9 / 16', background: j.bg }}
    >
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 40%, rgba(0,0,0,0.7) 100%)' }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Video size={50} className="text-white/8" strokeWidth={1.5} />
      </div>
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/80 text-white shadow">🔔 明日まで</span>
        <span className="text-white/40 text-[9px] font-mono bg-black/30 px-1.5 py-0.5 rounded-full">2 / 18</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="text-center bg-black/40 backdrop-blur rounded-xl px-4 py-2 border border-white/10">
          <p className="text-white/55 text-[8px] font-bold uppercase tracking-widest mb-0.5">想定売上目安</p>
          <p className="text-white font-black text-[28px] leading-none">{j.revenue}</p>
        </div>
      </div>
      <div className="absolute left-3 right-3 bottom-3">
        <p className="text-white text-[12px] font-extrabold leading-tight mb-0.5">{j.workType}</p>
        <div className="flex items-center gap-2 text-[10px] text-white/65">
          <MapPin size={9} />
          {j.city}
          <span className="text-blue-300 font-bold">約{j.distance}</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── ページ本体 ───────────────────── */

export default function ProSignupPage() {
  const navigate = useNavigate();

  // 職人LPから来たことを Register.tsx に伝え、role 初期値を 'craftsman' にし、
  // 登録完了後の遷移先を /craftsman/jobs（動画で探す画面）に切り替える。
  const proLpState = { defaultRole: 'craftsman' as const, fromProLp: true };
  const goRegister = () => navigate('/register', { state: proLpState });
  // 未登録向けの公開案件ボードはまだ用意できていないため、
  // 動画・詳細・応募の導線は登録ページへ集約する（個人情報の漏えい防止）。
  const goPreview  = () => navigate('/register', { state: proLpState });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          <img src="/logo-full.png" alt="PRO MATCH" className="h-7 object-contain" />
          <button
            onClick={() => navigate('/login', { state: proLpState })}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            ログイン
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-7 pb-28">

        {/* ───────── Hero ───────── */}
        <section className="mb-9">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-1 mb-3 shadow-sm">
            <Video size={11} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-wide">SHORT VIDEO MATCHING · β受付中</span>
          </div>

          <h1 className="text-[30px] leading-[1.18] font-black text-slate-900 mb-3 tracking-tight">
            空き日に、<br />
            <span className="text-blue-600">ショート動画</span>で<br />
            仕事を探す。
          </h1>

          <p className="text-[13px] text-slate-600 leading-relaxed mb-5">
            現場動画・想定売上・距離を見て、<br />
            対応できそうな案件だけ応募できます。
          </p>

          {/* β特典バッジ群 */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {[
              '最初の2成約 手数料0円',
              '応募はずっと無料',
              '紹介成功で +1件無料',
            ].map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm"
              >
                <CheckCircle2 size={11} className="text-emerald-500" />
                {t}
              </span>
            ))}
          </div>

          {/* デュアルCTA */}
          <button
            onClick={goPreview}
            className="w-full py-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-black text-[15px] transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            <Video size={16} strokeWidth={2.5} />
            ショート動画で案件を見る
            <ArrowRight size={16} />
          </button>
          <button
            onClick={goRegister}
            className="w-full mt-2.5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-900 font-bold text-sm border border-slate-200 transition-all"
          >
            無料で職人登録する（30秒）
          </button>

          <p className="text-center text-[11px] text-slate-400 mt-3">
            登録・案件閲覧・応募はすべて無料 / 営業電話なし
          </p>
        </section>

        {/* ───────── ★ ショート動画案件デモ（黒セクション・差別化の核） ───────── */}
        <section className="-mx-5 mb-10 relative overflow-hidden bg-black">
          {/* 装飾光 */}
          <div className="pointer-events-none absolute -top-20 -left-16 w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.25), transparent 65%)' }}
          />
          <div className="pointer-events-none absolute -bottom-24 -right-10 w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22), transparent 65%)' }}
          />

          <div className="relative px-5 pt-10 pb-9">
            {/* eyebrow */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 px-2.5 py-1 mb-3">
              <Radio size={10} className="text-emerald-400" />
              <span className="text-[10px] font-black tracking-widest text-white/85">SHORT VIDEO</span>
              <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                動画案件、順次公開中
              </span>
            </div>

            <h2 className="text-white text-[24px] font-black leading-snug mb-2">
              動画で見て、<br />
              応募する。
            </h2>
            <p className="text-white/65 text-[12px] leading-relaxed mb-7">
              現場の状況・部屋・距離・想定売上が、1スワイプで分かる。<br />
              現調のムダが減って、空き日が埋まります。
            </p>

            {/* スタックモック：手前カード + 奥のチラ見せ */}
            <div className="relative mx-auto" style={{ maxWidth: 280 }}>
              {/* 奥のカード（背後・少し回転＋透過） */}
              <div className="absolute -right-6 top-3 w-[78%] origin-top-right opacity-70"
                style={{ transform: 'rotate(5deg) scale(0.85)' }}
              >
                <VideoDemoBack />
              </div>
              {/* 手前のカード */}
              <div className="relative">
                <VideoDemoFront />
              </div>
            </div>

            {/* 機能ハイライト：3点 */}
            <div className="grid grid-cols-3 gap-2 mt-7">
              {[
                { label: '近場',   sub: 'エリア順',    color: 'text-blue-300' },
                { label: '想定売上', sub: '事前に見える', color: 'text-emerald-300' },
                { label: '即応募',   sub: '右スワイプ',   color: 'text-amber-300' },
              ].map(({ label, sub, color }) => (
                <div key={label} className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2.5 text-center backdrop-blur">
                  <p className={`text-[12px] font-extrabold ${color}`}>{label}</p>
                  <p className="text-[9.5px] text-white/55 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={goPreview}
              className="w-full mt-7 py-3.5 rounded-2xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-black text-[14px] transition-all flex items-center justify-center gap-2 shadow-xl"
            >
              <Video size={15} strokeWidth={2.5} />
              ショート動画で案件を見る
              <ArrowRight size={15} />
            </button>
            <p className="text-center text-[10px] text-white/40 mt-2.5">
              動画・詳細・応募は登録後にご利用いただけます
            </p>
          </div>
        </section>

        {/* ───────── PRO MATCHでできること（3本柱・NEW） ───────── */}
        <section className="mb-10">
          <div className="mb-3 px-0.5">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">What you can do</p>
            <h2 className="text-[18px] font-black text-slate-900 leading-tight">
              PRO MATCHでできること
            </h2>
            <p className="text-[11.5px] text-slate-500 mt-1">職人のための、3つの柱。</p>
          </div>

          <div className="space-y-2.5">
            {/* A. お客様案件 */}
            <div className="rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50/60 to-white px-4 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
                  <Video size={20} className="text-white" strokeWidth={2.4} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-black text-blue-600 tracking-wide">A</span>
                    <p className="text-[14px] font-black text-slate-900 leading-tight">一般のお客様案件に応募</p>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    お客様から届く内装工事案件に、ショート動画つきで応募できます。<br />
                    壁紙・床・補修まで、近場の案件が中心です。
                  </p>
                </div>
              </div>
            </div>

            {/* B. 応援マッチング */}
            <div className="rounded-2xl border-2 border-amber-100 bg-gradient-to-br from-amber-50/60 to-white px-4 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30">
                  <HelpingHand size={20} className="text-white" strokeWidth={2.4} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-black text-amber-600 tracking-wide">B</span>
                    <p className="text-[14px] font-black text-slate-900 leading-tight">職人同士の応援マッチング</p>
                    <span className="rounded-md bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-[1px] text-[9px] font-black">β</span>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    人手が足りない日は応援募集。空いてる日は応援参加。<br />
                    日当ベースで、職人同士で組めます。
                  </p>
                </div>
              </div>
            </div>

            {/* C. 便利ツール */}
            <div className="rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white px-4 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30">
                  <Wrench size={20} className="text-white" strokeWidth={2.4} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-black text-indigo-600 tracking-wide">C</span>
                    <p className="text-[14px] font-black text-slate-900 leading-tight">職人向け便利ツールが増える</p>
                    <span className="rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-[1px] text-[9px] font-black">順次拡張中</span>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed mb-3">
                    現場で本当に使えるツールを、職人と一緒に増やしていきます。
                  </p>
                </div>
              </div>

              {/* ツールチップス */}
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {TOOLS.map(({ icon: Icon, label, note }) => (
                  <div key={label} className="rounded-lg bg-white border border-indigo-100 px-1.5 py-2 text-center">
                    <Icon size={14} className="text-indigo-600 mx-auto mb-1" strokeWidth={2.2} />
                    <p className="text-[10px] font-bold text-slate-800 leading-tight">{label}</p>
                    <p className="text-[8.5px] text-indigo-500 font-semibold mt-0.5 leading-tight">{note}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed">
                ※ 一部機能は順次開発中・予定です。リリース時期は前後する場合があります。
              </p>
            </div>
          </div>
        </section>

        {/* ───────── 登録前プレビュー ───────── */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-3 px-0.5">
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Preview</p>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                いま届いている案件の一部
              </h2>
            </div>
            <span className="text-[10px] text-slate-400">登録前でも雰囲気が見られます</span>
          </div>

          <div className="space-y-2.5">
            {PREVIEW_JOBS.map((j, i) => (
              <PreviewJobCard key={i} job={j} />
            ))}
          </div>

          <button
            onClick={goRegister}
            className="w-full mt-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-[13px] transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            登録して動画・詳細を見る
            <ArrowRight size={14} />
          </button>
        </section>

        {/* ───────── コア体験 4つ ───────── */}
        <section className="mb-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">
            職人が使うべき理由
          </p>
          <div className="space-y-2.5">
            {CORE_BENEFITS.map(({ icon: Icon, title, desc, badge }) => (
              <div
                key={title}
                className="flex gap-3.5 items-start bg-white border border-slate-100 rounded-2xl px-4 py-4 shadow-sm"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Icon size={18} className="text-blue-600" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-[13px] font-bold text-slate-900 leading-tight">{title}</p>
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 rounded px-1 py-[1px]">
                      {badge}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── β特典バナー ───────── */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-600 to-violet-600 px-5 py-6 text-white shadow-xl shadow-blue-600/25">
            {/* 装飾 */}
            <div className="pointer-events-none absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-2 -bottom-10 w-28 h-28 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            <div className="relative">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 mb-2.5">
                <Sparkles size={11} />
                <span className="text-[10px] font-black tracking-wide">β期間 限定特典</span>
              </div>
              <h3 className="text-[19px] font-black leading-snug mb-3">
                いま登録すると、<br />
                手数料がかからない期間があります。
              </h3>

              <div className="space-y-2.5">
                {[
                  { icon: Gift,      title: '最初の2成約 手数料0円',       desc: '安心して試せる初期サポート。' },
                  { icon: Users,     title: '紹介成功で +1件 無料',         desc: '仲間を1人紹介するごとに無料枠が増えます。' },
                  { icon: BellRing,  title: '紹介経由の登録は優先通知',     desc: '案件が公開された瞬間にいち早く通知されます。' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                      <Icon size={14} className="text-white" strokeWidth={2.2} />
                    </div>
                    <div>
                      <p className="text-[13px] font-black leading-tight">{title}</p>
                      <p className="text-[11px] text-blue-100 leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-blue-100/80 mt-4 leading-relaxed">
                ※ β期間中の特典です。一部機能は順次拡張中です。
              </p>
            </div>
          </div>
        </section>

        {/* ───────── 想定売上の目安 ───────── */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-3 px-0.5">
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Revenue Guide</p>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                想定売上の目安
              </h2>
            </div>
            <span className="text-[10px] text-slate-400">あくまで目安です</span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            {REVENUE_GUIDE.map(({ label, range, note }, i) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-slate-900 leading-tight">{label}</p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">{note}</p>
                </div>
                <span className="text-[13px] font-extrabold text-slate-900 whitespace-nowrap">{range}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed px-0.5">
            ※ 実際の金額は、現場状況・施工内容・地域により変動します。確定金額ではありません。
          </p>
        </section>

        {/* ───────── 料金（成果報酬） ───────── */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-3 px-0.5">
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Pricing</p>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                料金は成約時のみ
              </h2>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-emerald-50/60 border-b border-emerald-100/80 flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-600" strokeWidth={2.2} />
              <p className="text-[11.5px] font-bold text-emerald-800">
                登録・閲覧・応募は無料 / 成約しなければ料金は0円
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {FEE_TABLE.map(({ label, feeLabel }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[12px] text-slate-600">{label}</span>
                  <span className="text-[13px] font-bold text-slate-900">{feeLabel}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100">
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                ※ 工事代金はお客様と直接やり取りします。PRO MATCHは工事代金をお預かりしません。
              </p>
            </div>
          </div>
        </section>

        {/* ───────── 使い方3ステップ ───────── */}
        <section className="mb-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">
            使い方は3ステップ
          </p>
          <div className="space-y-2.5">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="flex gap-3 items-start bg-white border border-slate-100 rounded-2xl px-4 py-4 shadow-sm">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[13px] font-black">
                  {n}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[13px] font-bold text-slate-900 leading-tight mb-1">{title}</p>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── FAQ ───────── */}
        <section className="mb-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">
            よくある質問
          </p>
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex items-start gap-2 px-4 py-3.5 cursor-pointer list-none">
                  <span className="text-blue-600 font-black text-[13px] mt-px">Q.</span>
                  <span className="flex-1 text-[12.5px] font-bold text-slate-800 leading-snug">{q}</span>
                  <span className="text-slate-300 text-[14px] transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="px-4 pb-3.5 pl-9">
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">{a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ───────── Final CTA ───────── */}
        <section className="mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-5 py-7 text-center shadow-xl">
            {/* 装飾光 */}
            <div className="pointer-events-none absolute -top-16 -left-8 w-48 h-48 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.25), transparent 65%)' }}
            />
            <div className="pointer-events-none absolute -bottom-16 -right-6 w-48 h-48 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22), transparent 65%)' }}
            />

            <div className="relative">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur border border-white/15 px-2.5 py-0.5 mb-3">
                <Play size={10} className="text-white" />
                <span className="text-[10px] font-black tracking-wide text-white">いま登録で β特典つき</span>
              </div>
              <h3 className="text-[20px] font-black text-white leading-snug mb-1.5">
                空き日が、仕事になる。
              </h3>
              <p className="text-[12px] text-slate-300 mb-5 leading-relaxed">
                動画で見て、応募する。<br />
                最初の2成約は手数料0円で始められます。
              </p>
              <button
                onClick={goPreview}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-black text-[14px] transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Video size={15} strokeWidth={2.5} />
                ショート動画で案件を見る
                <ArrowRight size={15} />
              </button>
              <button
                onClick={goRegister}
                className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-[13.5px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <Sparkles size={14} strokeWidth={2.5} />
                2成約無料で登録する
              </button>
              <p className="text-[10px] text-white/40 mt-3">
                登録は30秒・営業電話なし
              </p>
            </div>
          </div>
        </section>

        {/* ───────── フッターリンク ───────── */}
        <footer className="text-center">
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400">
            <button onClick={() => navigate('/terms')}   className="hover:text-slate-600">利用規約</button>
            <span className="text-slate-200">|</span>
            <button onClick={() => navigate('/privacy')} className="hover:text-slate-600">プライバシー</button>
            <span className="text-slate-200">|</span>
            <button onClick={() => navigate('/legal')}   className="hover:text-slate-600">特商法表記</button>
          </div>
          <p className="text-[10px] text-slate-300 mt-3">© PRO MATCH</p>
        </footer>

      </main>
    </div>
  );
}
