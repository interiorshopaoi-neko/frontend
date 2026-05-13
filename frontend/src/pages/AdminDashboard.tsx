import { useEffect, useState, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { TrendingUp, TrendingDown, DollarSign, Users, Star, Lightbulb, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AdminLogin, AdminNav, AdminUnauthorized, isAdminRole } from './admin/shared';

// ── Types (DB連携時はAPIレスポンスをこの型にマップする) ───────────────────────

type AnalyticsData = {
  conversionRate: number;
  averagePrice:   number;
  averageProfit:  number;
  dropOffRate:    number;
};

type Feedback = {
  message:   string;
  sentiment: 'positive' | 'negative';
};

type ImprovementSuggestion = {
  title:  string;
  impact: 'high' | 'medium' | 'low';
};

// ── Display-only extensions ───────────────────────────────────────────────────

type FeedbackDisplay      = Feedback      & { id: number; rating: number; date: string; workType: string };
type SuggestionDisplay    = ImprovementSuggestion & { reason: string; action: string };

// ── Demo data ─────────────────────────────────────────────────────────────────
// TODO: API連携してリアルデータ取得

const DEMO_ANALYTICS: AnalyticsData = {
  conversionRate: 35,
  averagePrice:   95000,
  averageProfit:  32000,
  dropOffRate:    42,
};

const KPI_DATA = [
  { label: '成約率',           value: `${DEMO_ANALYTICS.conversionRate}%`,                        trend: +5,  icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: '平均見積もり金額', value: `¥${DEMO_ANALYTICS.averagePrice.toLocaleString()}`,          trend: +8,  icon: DollarSign,   color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
  { label: '平均利益',         value: `¥${DEMO_ANALYTICS.averageProfit.toLocaleString()}`,         trend: +3,  icon: TrendingUp,   color: 'text-blue-600',    bg: 'bg-blue-50'    },
  { label: '離脱率',           value: `${DEMO_ANALYTICS.dropOffRate}%`,                            trend: -2,  icon: TrendingDown, color: 'text-rose-600',    bg: 'bg-rose-50'    },
];

const AB_TEST = {
  name: '価格表示パターンA vs B',
  metric: '成約率',
  variants: [
    {
      id: 'A' as const,
      label: 'パターンA',
      description: '幅表示（¥36,000〜¥46,000）',
      convRate: 35,
      sessions: 612,
      color: 'bg-indigo-500',
      badge: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'B' as const,
      label: 'パターンB',
      description: '中央値表示（目安 ¥41,000）',
      convRate: 42,
      sessions: 588,
      color: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-700',
    },
  ],
  winner: 'B' as const,
  significance: 94,
} as const;

// TODO: 自動分析ロジック追加
const JOB_DATA = [
  { workType: '壁紙の張り替え', count: 48, avgPrice: 88000,  convRate: 38 },
  { workType: '床材の張り替え', count: 31, avgPrice: 112000, convRate: 29 },
  { workType: '壁紙 + 床材',   count: 17, avgPrice: 185000, convRate: 41 },
];

const AREA_DATA = [
  { label: '人気エリア', value: '太田市' },
  { label: '多い工事',   value: '壁紙＋床' },
  { label: '平均工期',   value: '1.5日' },
];

const FUNNEL_DATA = [
  { step: 'ページ訪問',     count: 1200, pct: 100 },
  { step: '見積もり開始',   count:  840, pct:  70 },
  { step: '写真アップロード', count: 504, pct:  42 },
  { step: '職人確認済み',   count:  378, pct:  31 },
  { step: '成約',           count:  252, pct:  21 },
];

const FEEDBACK_DATA: FeedbackDisplay[] = [
  { id: 1, rating: 5, message: 'すぐに返事が来て安心できました。金額も予算内で助かりました。',   sentiment: 'positive', date: '2026-04-20', workType: '壁紙'    },
  { id: 2, rating: 4, message: '写真だけで見積もりが出るのが便利。ただ最初の画面が少しわかりにくい。', sentiment: 'positive', date: '2026-04-18', workType: '床材'    },
  { id: 3, rating: 5, message: '職人さんの説明が丁寧で信頼できました。また依頼したいです。',     sentiment: 'positive', date: '2026-04-15', workType: '壁紙+床材' },
  { id: 4, rating: 3, message: '金額が思ったより高かった。もう少し相場を事前に教えてほしい。',   sentiment: 'negative', date: '2026-04-12', workType: '壁紙'    },
];

// TODO: AI改善提案エンジン
const SUGGESTIONS: SuggestionDisplay[] = [
  {
    impact: 'high',
    title:  '写真アップロード前の離脱を改善',
    reason: '見積もり開始→写真アップまでの離脱が28%。ステップ数の多さが原因と推測。',
    action: 'アップロードをオプション化し、まず概算を先に提示するフローへ変更',
  },
  {
    impact: 'high',
    title:  '床材の成約率を改善（29%→35%目標）',
    reason: '壁紙と比べ成約率が9pt低い。価格帯の高さと施工イメージが伝わりにくい可能性。',
    action: 'ビフォーアフター写真の掲載、床材の施工事例を案件詳細に追加',
  },
  {
    impact: 'medium',
    title:  '初回訪問→見積もり開始率の向上（70%→80%目標）',
    reason: 'ランディングページで概算体験が完結するが、フォーム入力への誘導が弱い。',
    action: 'CTA文言を「無料で概算を見る」→「30秒で見積もり」に変更してA/Bテスト',
  },
  {
    impact: 'low',
    title:  '★3以下のレビューへのフォローアップ',
    reason: '「金額が高かった」「わかりにくい」コメントが複数。放置すると口コミ悪化リスク。',
    action: 'ネガティブレビュー投稿後24h以内に自動メッセージを送信する仕組みを追加',
  },
  {
    impact: 'high',
    title:  '価格説明UIを強化すると離脱率が下がる可能性',
    reason: '見積もり金額の根拠が伝わりにくく、「高い」と感じたユーザーが離脱している可能性。',
    action: '価格の内訳（材料費・施工費・移動費）を段階的に展開できるUIを追加',
  },
  {
    impact: 'medium',
    title:  '低価格プラン追加でCV改善の余地あり',
    reason: '現状プランは中〜高価格帯のみ。予算が限られるユーザー層が取りこぼされている。',
    action: 'スタンダード壁紙のみの単品プランを追加し、入口を広げる',
  },
  {
    impact: 'medium',
    title:  '利益表示をさらに強調すべき',
    reason: '職人向けの受注判断カードは実装済みだが、数値の視認性がまだ低い。',
    action: '利益額を大きく表示し、時給換算も併記して判断をより直感的にする',
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const IMPACT_STYLE: Record<ImprovementSuggestion['impact'], string> = {
  high:   'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-slate-100 text-slate-600',
};

const IMPACT_LABEL: Record<ImprovementSuggestion['impact'], string> = {
  high:   '優先度：高',
  medium: '優先度：中',
  low:    '優先度：低',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold text-gray-800 mb-3">{children}</h2>;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function useAutoAlerts(analytics: AnalyticsData): string[] {
  return useMemo(() => {
    const alerts: string[] = [];
    if (analytics.dropOffRate > 40)      alerts.push(`離脱率が急増しています（現在 ${analytics.dropOffRate}%）`);
    if (analytics.conversionRate < 40)   alerts.push(`成約率が目標を下回っています（現在 ${analytics.conversionRate}%）`);
    if (analytics.averageProfit < 30000) alerts.push(`平均利益が低下しています（現在 ¥${analytics.averageProfit.toLocaleString()}）`);
    return alerts;
  }, [analytics]);
}

function AdminDashboardContent() {
  const alerts = useAutoAlerts(DEMO_ANALYTICS);

  return (
    <div>
    <AdminNav />
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">管理ダッシュボード</h1>
        <p className="text-sm text-gray-400 mt-0.5">デモデータ表示中 · 将来的にDB連携予定</p>
      </div>

      {/* 自動アラート */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(msg => (
            <div key={msg} className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
              <Bell size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-rose-700">{msg}</p>
            </div>
          ))}
        </div>
      )}

      {/* ① KPIダッシュボード ───────────────────────────────────────────── */}
      <section>
        <SectionTitle>① KPIダッシュボード</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {KPI_DATA.map(({ label, value, trend, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
                <Icon size={16} className={color} />
              </div>
              <p className="text-xs text-gray-400 font-medium">{label}</p>
              <p className={`text-xl font-extrabold mt-0.5 ${color}`}>{value}</p>
              <p className={`text-[11px] mt-1 font-semibold ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}pt（前月比）
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ② 案件データ分析 ──────────────────────────────────────────────── */}
      <section>
        <SectionTitle>② 案件データ分析</SectionTitle>

        {/* 工事種別テーブル */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden mb-3">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-500 mb-2">工事種別ごとの実績</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[340px]">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400">
                <th className="text-left px-4 py-2 font-semibold whitespace-nowrap">工事内容</th>
                <th className="text-right px-4 py-2 font-semibold whitespace-nowrap">件数</th>
                <th className="text-right px-4 py-2 font-semibold whitespace-nowrap">平均金額</th>
                <th className="text-right px-4 py-2 font-semibold whitespace-nowrap">成約率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {JOB_DATA.map(({ workType, count, avgPrice, convRate }) => (
                <tr key={workType}>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{workType}</td>
                  <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">{count}</td>
                  <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">¥{avgPrice.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${convRate >= 35 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {convRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* エリアサマリー */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-3">エリアサマリー</p>
          <div className="grid grid-cols-3 gap-3">
            {AREA_DATA.map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ファネル */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
          <p className="text-xs font-semibold text-gray-500 mb-3">コンバージョンファネル</p>
          <div className="space-y-2">
            {FUNNEL_DATA.map(({ step, count, pct }) => (
              <div key={step}>
                <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                  <span>{step}</span>
                  <span className="font-semibold text-gray-700">{count.toLocaleString()}人 ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ③ ユーザーフィードバック ──────────────────────────────────────── */}
      <section>
        <SectionTitle>③ ユーザーフィードバック</SectionTitle>
        <div className="space-y-3">
          {FEEDBACK_DATA.map(({ id, rating, message, date, workType }) => (
            <div key={id} className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{workType}</span>
                  <span>{date}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
            </div>
          ))}
        </div>

        {/* 評価サマリー */}
        <div className="mt-3 bg-indigo-50 rounded-2xl p-4 flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-extrabold text-indigo-700">4.2</p>
            <p className="text-[11px] text-indigo-400 font-medium">平均評価</p>
          </div>
          <div className="flex-1 space-y-1">
            {[5,4,3,2,1].map(star => {
              const cnt = FEEDBACK_DATA.filter(f => f.rating === star).length;
              const pct = Math.round(cnt / FEEDBACK_DATA.length * 100);
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[11px] text-indigo-400 w-3">{star}</span>
                  <div className="flex-1 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-indigo-400 w-6 text-right">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ⑤ A/Bテスト ──────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>⑤ A/Bテスト</SectionTitle>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">{AB_TEST.name}</p>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
              勝者：パターン{AB_TEST.winner}
            </span>
          </div>

          {/* バー比較 */}
          <div className="space-y-3">
            {AB_TEST.variants.map(v => (
              <div key={v.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${v.badge}`}>{v.label}</span>
                    <span className="text-xs text-gray-400">{v.description}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{v.convRate}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${v.color} rounded-full transition-all`} style={{ width: `${v.convRate}%` }} />
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{v.sessions.toLocaleString()} セッション</p>
              </div>
            ))}
          </div>

          {/* 統計的有意性 */}
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">統計的信頼度</p>
            <p className={`text-sm font-bold ${AB_TEST.significance >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {AB_TEST.significance}%
              <span className="text-xs font-normal text-slate-400 ml-1">
                {AB_TEST.significance >= 95 ? '（採用推奨）' : '（継続観察）'}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ④ 自動改善提案 ───────────────────────────────────────────────── */}
      <section>
        <SectionTitle>④ 自動改善提案</SectionTitle>
        <div className="space-y-3">
          {SUGGESTIONS.map(({ impact, title, reason, action }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lightbulb size={14} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${IMPACT_STYLE[impact]}`}>
                      {IMPACT_LABEL[impact]}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-800">{title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{reason}</p>
                  <div className="mt-2 bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-700">対応案：</span>{action}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [session,   setSession]   = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  if (!authReady) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-slate-400 animate-pulse">確認中...</p></div>;
  if (!session) return <AdminLogin />;
  if (!isAdminRole(session)) return <AdminUnauthorized />;
  return <AdminDashboardContent />;
}
