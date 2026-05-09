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
} from 'lucide-react';
import { FEE_TABLE } from '../constants/fees';

/* ───────────────────── データ ───────────────────── */

const CORE_BENEFITS = [
  {
    icon: MapPin,
    title: '空き日に、近場の仕事が入る',
    desc: 'エリア・対応工事・空き日に合う案件だけ通知。遠方の現調に走り回る必要はありません。',
  },
  {
    icon: Video,
    title: '動画で現場を事前確認',
    desc: '部屋の状態をショート動画で確認できるので、現調のムダが減ります。応募する前に判断OK。',
  },
  {
    icon: Wallet,
    title: '想定売上の目安が見える',
    desc: '工事内容と部屋情報から、想定売上のレンジを表示。利益が合う案件だけ選べます。',
  },
  {
    icon: HelpingHand,
    title: '応援の募集・参加もできる',
    desc: '人手が足りない日は応援募集。空いてる日は応援参加。職人同士で繋がれます。',
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

const STEPS = [
  { n: 1, title: '無料で職人登録',     desc: 'メール認証だけ。30秒で完了します。' },
  { n: 2, title: '案件をチェック',     desc: '近場の案件と動画が届きます。気になる案件だけ詳細を確認。' },
  { n: 3, title: '応募 → 成約',         desc: '応募は無料。成約時のみ手数料が発生します。' },
] as const;

const FAQS = [
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
      {/* 上：案件サマリ（見える） */}
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

      {/* 下：動画・詳細・応募（ロック） */}
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

/* ───────────────────── ページ本体 ───────────────────── */

export default function ProSignupPage() {
  const navigate = useNavigate();

  const goRegister = () => navigate('/register');
  const goPreview  = () => navigate('/pro/jobs');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          <img src="/logo-full.svg" alt="PRO MATCH" className="h-7 object-contain" />
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            ログイン
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-7 pb-28">

        {/* ───────── Hero ───────── */}
        <section className="mb-9">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 mb-3">
            <Sparkles size={11} />
            <span className="text-[10px] font-bold tracking-wide">FOR PROFESSIONALS · β受付中</span>
          </div>

          <h1 className="text-[26px] leading-[1.25] font-black text-slate-900 mb-3">
            空き日に、<br />
            <span className="text-blue-600">近場の仕事</span>が入る。
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            動画で現場を事前確認できるから、現調のムダが減る。<br />
            内装職人のための、新しい案件マッチング。
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
            className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-[15px] transition-all shadow-md flex items-center justify-center gap-2"
          >
            無料で案件を見る
            <ArrowRight size={16} />
          </button>
          <button
            onClick={goRegister}
            className="w-full mt-2.5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-900 font-bold text-sm border border-slate-200 transition-all"
          >
            職人登録する（無料・30秒）
          </button>

          <p className="text-center text-[11px] text-slate-400 mt-3">
            登録・案件閲覧・応募はすべて無料 / 営業電話なし
          </p>
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
            {CORE_BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-3.5 items-start bg-white border border-slate-100 rounded-2xl px-4 py-4 shadow-sm"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Icon size={18} className="text-blue-600" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 leading-tight mb-1">{title}</p>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── β特典バナー ───────── */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 px-5 py-6 text-white shadow-lg">
            {/* 装飾 */}
            <div className="pointer-events-none absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-2 -bottom-10 w-28 h-28 rounded-full bg-white/5" />

            <div className="relative">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-2 py-0.5 mb-2.5">
                <Sparkles size={11} />
                <span className="text-[10px] font-bold tracking-wide">β期間 限定特典</span>
              </div>
              <h3 className="text-lg font-black leading-snug mb-3">
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
                      <p className="text-[13px] font-bold leading-tight">{title}</p>
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

        {/* ───────── 応援マッチング ───────── */}
        <section className="mb-10">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <HelpingHand size={17} className="text-amber-600" strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-extrabold text-slate-900 leading-tight">応援マッチング</p>
                  <span className="rounded-md bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-[1px] text-[9px] font-bold">β</span>
                </div>
                <p className="text-[10.5px] text-slate-400 mt-0.5">職人同士で組める新しい働き方</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
                <p className="text-[11px] font-bold text-slate-700 mb-1">応援を募集する</p>
                <p className="text-[10.5px] text-slate-500 leading-relaxed">人手が足りない日に、近くの職人を呼べる。</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
                <p className="text-[11px] font-bold text-slate-700 mb-1">応援に入る</p>
                <p className="text-[10.5px] text-slate-500 leading-relaxed">空いてる日に、日当ベースで参加できる。</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
              ※ 機能は順次拡張中です。利用条件はアプリ内でご案内します。
            </p>
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
          <div className="rounded-2xl bg-slate-900 px-5 py-7 text-center shadow-lg">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 mb-3">
              <Play size={10} className="text-white" />
              <span className="text-[10px] font-bold text-white">いま登録で β特典つき</span>
            </div>
            <h3 className="text-lg font-black text-white leading-snug mb-1.5">
              空き日が、仕事になる。
            </h3>
            <p className="text-[12px] text-slate-300 mb-5 leading-relaxed">
              動画つき案件と、最初の2成約無料で始めましょう。
            </p>
            <button
              onClick={goRegister}
              className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-bold text-[14px] transition-all flex items-center justify-center gap-2"
            >
              職人登録する
              <ArrowRight size={15} />
            </button>
            <button
              onClick={goPreview}
              className="w-full mt-2 py-3 rounded-xl bg-white/0 hover:bg-white/5 text-white font-bold text-[12.5px] border border-white/15 transition-all"
            >
              まず無料で案件を見る
            </button>
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
