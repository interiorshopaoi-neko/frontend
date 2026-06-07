import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import BottomNav from '../../components/BottomNav';

// ─── Types ────────────────────────────────────────────────────────────────────

// Phase53: 現場レーダー（Phase57: buildingType/workCategory/siteStatus 追加）
type SiteRadar = {
  siteType?:        string;   // 旧フィールド（互換用）
  buildingType?:    string;
  workCategory?:    string;
  siteStatus?:      string;
  siteScale?:       string;
  crewSize?:        string;
  siteConditions?:  string[];
  accessCondition?: string;
  requiredTools?:   string[];
  toolNotes?:       string;
};

type HelpRequest = {
  id: string;
  work_date: string;
  area: string;
  work_type: string;
  people_needed: number;
  daily_rate: number;
  comment: string | null;
  craftsman_id: string | null;
  start_time: string | null;
  end_time: string | null;
  has_parking: boolean | null;
  required_tools: string | null;
  notes: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  status: string | null;
  expires_at: string | null;
};

type HelpApplication = {
  id: string;
  request_id: string;
  craftsman_id: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requester_completed: boolean;
  applicant_completed: boolean;
  created_at: string;
  updated_at: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** meta から siteRadar を安全に取り出す。古いデータ・null・parse 失敗はすべて null を返す */
function getSiteRadar(meta: Record<string, unknown> | null): SiteRadar | null {
  if (!meta || typeof meta !== 'object') return null;
  const r = meta['siteRadar'];
  if (!r || typeof r !== 'object') return null;
  return r as SiteRadar;
}

/** meta から helperImages を安全に取り出す */
function getHelperImages(meta: Record<string, unknown> | null): string[] {
  if (!meta || typeof meta !== 'object') return [];
  const imgs = meta['helperImages'];
  if (!Array.isArray(imgs)) return [];
  return imgs.filter((v): v is string => typeof v === 'string');
}

function getUserId(): string {
  const stored = localStorage.getItem('user');
  if (stored) {
    try { return String(JSON.parse(stored).id); } catch { /* ignore */ }
  }
  return localStorage.getItem('craftsman_guest_id') ?? '';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${m}/${day}（${weekdays[d.getDay()]}）`;
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** expires_at の超過、または expires_at が未設定で作業日が過去 → 期限切れ */
function isExpiredByTime(req: HelpRequest): boolean {
  if (req.expires_at) return new Date(req.expires_at) < new Date();
  return daysUntil(req.work_date) < 0;
}

function isRequestClosed(req: HelpRequest): boolean {
  if (req.status === 'closed' || req.status === 'completed' || req.status === 'hidden') return true;
  return isExpiredByTime(req);
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO: HelpRequest[] = [
  {
    id: 'demo-1',
    work_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    area: '太田市',
    work_type: 'クロス張替え（2LDK原状回復）',
    people_needed: 2,
    daily_rate: 18000,
    comment: '道具は貸し出せます。昼飯付きです。',
    craftsman_id: 'demo-owner',
    start_time: '08:00',
    end_time: '17:00',
    has_parking: true,
    required_tools: null,
    notes: null,
    meta: {
      siteRadar: {
        siteType: '空室',
        siteScale: '1日',
        crewSize: '2〜3人',
        siteConditions: ['駐車場あり', 'エレベーターあり', '糊付けスペースあり'],
        accessCondition: '乗り付け可能',
        requiredTools: ['腰道具', '脚立', 'パテ道具'],
        toolNotes: '糊付け機は現場にあります',
      },
    },
    created_at: new Date().toISOString(),
    status: 'recruiting',
    expires_at: null,
  },
  {
    id: 'demo-2',
    work_date: new Date(Date.now() + 172800000).toISOString().slice(0, 10),
    area: '伊勢崎市',
    work_type: '床CF張替え',
    people_needed: 1,
    daily_rate: 15000,
    comment: '半日で終わる量です。午前スタート希望。',
    craftsman_id: 'demo-other',
    start_time: '09:00',
    end_time: '13:00',
    has_parking: false,
    required_tools: null,
    notes: null,
    meta: null,  // 古いデータを模倣（meta なしでもエラーにならないことを確認）
    created_at: new Date().toISOString(),
    status: 'recruiting',
    expires_at: null,
  },
];

// ─── Detail Modal ─────────────────────────────────────────────────────────────

type DetailModalProps = {
  job: HelpRequest;
  applicantCount: number;
  myApplication: HelpApplication | null;
  onClose: () => void;
  onApply: (message: string) => Promise<void>;
  applying: boolean;
};

function HelperJobDetailModal({ job, applicantCount, myApplication, onClose, onApply, applying }: DetailModalProps) {
  const [message, setMessage] = useState('');
  const days = daysUntil(job.work_date);

  const alreadyApplied = myApplication !== null;
  const statusLabel: Record<HelpApplication['status'], string> = {
    pending:   '応募済み（承認待ち）',
    approved:  '承認されました！',
    rejected:  '今回は見送りとなりました',
    completed: '完了',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* ハンドル */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">助っ人募集の詳細</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 工事内容 */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 mb-4">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">{job.work_type}</h3>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {job.area}
            </p>
          </div>

          {/* 詳細グリッド */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-bold mb-1">作業日</p>
              <p className="text-sm font-extrabold text-slate-900">{formatDate(job.work_date)}</p>
              <p className="text-xs text-slate-400">
                {days === 0 ? '今日' : days > 0 ? `あと${days}日` : `${Math.abs(days)}日前`}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-bold mb-1">日当</p>
              <p className="text-xl font-extrabold text-slate-900">¥{job.daily_rate.toLocaleString()}</p>
              <p className="text-xs text-slate-400">/ 日</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-bold mb-1">作業時間</p>
              <p className="text-sm font-bold text-slate-900">
                {job.start_time && job.end_time ? `${job.start_time} 〜 ${job.end_time}` : '要相談'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-bold mb-1">募集人数</p>
              <p className="text-sm font-bold text-slate-900">{job.people_needed}名</p>
              <p className="text-xs text-slate-400">{applicantCount}名が応募中</p>
            </div>
          </div>

          {/* 駐車場 */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
              job.has_parking ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'
            }`}>
              {job.has_parking ? '🚗 駐車場あり' : '🚫 駐車場なし'}
            </span>
          </div>

          {/* 必要道具 */}
          {job.required_tools && (
            <div className="bg-yellow-50 rounded-xl px-3 py-2.5 mb-3">
              <p className="text-[10px] text-yellow-700 font-bold mb-1">持参道具</p>
              <p className="text-sm text-slate-700">{job.required_tools}</p>
            </div>
          )}

          {/* コメント */}
          {job.comment && (
            <p className="text-sm text-slate-600 bg-blue-50 rounded-xl px-3 py-2.5 mb-4 leading-relaxed">
              💬 {job.comment}
            </p>
          )}

          {/* 備考 */}
          {job.notes && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 mb-4 leading-relaxed">
              📝 {job.notes}
            </p>
          )}

          {/* 現場写真（モーダルでは最大3枚グリッド） */}
          {(() => {
            const imgs = getHelperImages(job.meta);
            if (imgs.length === 0) return null;
            return (
              <div className={`grid gap-2 mb-4 ${imgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {imgs.slice(0, 3).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`現場写真${i + 1}`}
                    className={`w-full object-cover rounded-xl ${imgs.length === 1 ? 'h-48' : 'h-32'}`}
                    loading="lazy"
                  />
                ))}
              </div>
            );
          })()}

          {/* 現場レーダー（詳細モーダルでは全項目を表示） */}
          {(() => {
            const radar = getSiteRadar(job.meta);
            if (!radar) return null;
            const hasAny = radar.buildingType || radar.workCategory || radar.siteStatus ||
              radar.siteType || radar.siteScale || radar.crewSize ||
              (radar.siteConditions?.length ?? 0) > 0 || radar.accessCondition ||
              (radar.requiredTools?.length ?? 0) > 0 || radar.toolNotes;
            if (!hasAny) return null;
            return (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3.5 mb-4">
                <p className="text-xs font-extrabold text-indigo-600 mb-3">📡 現場レーダー</p>
                <div className="space-y-2.5">
                  {(radar.buildingType || radar.siteType) && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-16 shrink-0">建物</span>
                      <span className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">{radar.buildingType ?? radar.siteType}</span>
                    </div>
                  )}
                  {radar.workCategory && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-16 shrink-0">工事</span>
                      <span className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">{radar.workCategory}</span>
                    </div>
                  )}
                  {radar.siteStatus && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-16 shrink-0">状態</span>
                      <span className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">{radar.siteStatus}</span>
                    </div>
                  )}
                  {radar.siteScale && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-16 shrink-0">作業規模</span>
                      <span className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">{radar.siteScale}</span>
                    </div>
                  )}
                  {radar.crewSize && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-16 shrink-0">人数感</span>
                      <span className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">{radar.crewSize}</span>
                    </div>
                  )}
                  {radar.siteConditions && radar.siteConditions.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-slate-400 w-16 shrink-0 mt-1">現場ルール</span>
                      <div className="flex flex-wrap gap-1.5">
                        {radar.siteConditions.map(c => (
                          <span key={c} className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {radar.accessCondition && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-16 shrink-0">搬入条件</span>
                      <span className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">{radar.accessCondition}</span>
                    </div>
                  )}
                  {radar.requiredTools && radar.requiredTools.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-slate-400 w-16 shrink-0 mt-1">必要道具</span>
                      <div className="flex flex-wrap gap-1.5">
                        {radar.requiredTools.map(t => (
                          <span key={t} className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {radar.toolNotes && (
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-slate-400 w-16 shrink-0 mt-0.5">補足</span>
                      <p className="text-xs text-slate-600 leading-relaxed">{radar.toolNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 応募済み表示 */}
          {alreadyApplied ? (
            <div className={`rounded-2xl p-4 mb-2 text-center ${
              myApplication.status === 'approved' ? 'bg-green-50 border border-green-200' :
              myApplication.status === 'rejected' ? 'bg-slate-100 border border-slate-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`font-extrabold text-sm ${
                myApplication.status === 'approved' ? 'text-green-700' :
                myApplication.status === 'rejected' ? 'text-slate-500' :
                'text-blue-700'
              }`}>
                {statusLabel[myApplication.status]}
              </p>
              {myApplication.status === 'approved' && (
                <p className="text-xs text-green-600 mt-1">
                  募集主からの連絡先確認は「案件管理」ページをご確認ください
                </p>
              )}
              {myApplication.status === 'pending' && (
                <p className="text-xs text-blue-500 mt-1">募集主が応募を確認次第、承認/拒否の通知が届きます</p>
              )}
            </div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="一言コメント（任意）例：道具は全て持参できます"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm mt-2 mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
                rows={3}
              />
              <button
                onClick={() => onApply(message)}
                disabled={applying}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-extrabold text-sm shadow-sm transition active:scale-[0.99] disabled:opacity-60"
              >
                {applying ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    送信中...
                  </span>
                ) : 'この助っ人募集に応募する'}
              </button>
              <p className="text-center text-xs text-slate-400 mt-2">
                応募後、募集主の承認をお待ちください
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Approval Management Modal ────────────────────────────────────────────────

type MyJobApplication = HelpApplication & {
  craftsman_name?: string;
  craftsman_email?: string;
};

type MyJobManageModalProps = {
  job: HelpRequest;
  applications: MyJobApplication[];
  onClose: () => void;
  onApprove: (appId: string) => Promise<void>;
  onReject: (appId: string) => Promise<void>;
  onComplete: (appId: string) => Promise<void>;
  processingId: string | null;
};

function MyJobManageModal({ job, applications, onClose, onApprove, onReject, onComplete, processingId }: MyJobManageModalProps) {
  const statusLabel: Record<HelpApplication['status'], string> = {
    pending:   '承認待ち',
    approved:  '承認済み',
    rejected:  '拒否済み',
    completed: '完了',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">応募管理</h2>
              <p className="text-xs text-slate-400">{job.work_type} / {formatDate(job.work_date)}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm">まだ応募がありません</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {applications.map(app => (
                <div key={app.id} className={`rounded-2xl border p-4 ${
                  app.status === 'approved' ? 'border-green-200 bg-green-50' :
                  app.status === 'rejected' ? 'border-slate-200 bg-slate-50' :
                  app.status === 'completed' ? 'border-emerald-200 bg-emerald-50' :
                  'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {app.craftsman_name ?? `職人 ${app.craftsman_id?.slice(0, 8) ?? '不明'}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(app.created_at).toLocaleDateString('ja-JP')} に応募
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      app.status === 'approved' ? 'bg-green-200 text-green-700' :
                      app.status === 'rejected' ? 'bg-slate-200 text-slate-500' :
                      app.status === 'completed' ? 'bg-emerald-200 text-emerald-700' :
                      'bg-blue-200 text-blue-700'
                    }`}>
                      {statusLabel[app.status]}
                    </span>
                  </div>

                  {app.message && (
                    <p className="text-xs text-slate-600 bg-white rounded-lg px-3 py-2 mb-3 leading-relaxed">
                      💬 {app.message}
                    </p>
                  )}

                  {/* 承認後: 連絡先開示 */}
                  {(app.status === 'approved' || app.status === 'completed') && app.craftsman_email && (
                    <div className="bg-white rounded-xl px-3 py-2.5 mb-3 border border-green-200">
                      <p className="text-[10px] text-green-600 font-bold mb-1">連絡先（承認後に開示）</p>
                      <a href={`mailto:${app.craftsman_email}`} className="text-sm font-bold text-blue-600 underline">
                        {app.craftsman_email}
                      </a>
                    </div>
                  )}

                  {/* 承認待ち: 承認/拒否ボタン */}
                  {app.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onApprove(app.id)}
                        disabled={processingId === app.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-xs font-extrabold transition active:scale-95"
                      >
                        {processingId === app.id ? '処理中...' : '✓ 承認する'}
                      </button>
                      <button
                        onClick={() => onReject(app.id)}
                        disabled={processingId === app.id}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-600 rounded-xl py-2.5 text-xs font-extrabold transition active:scale-95"
                      >
                        見送り
                      </button>
                    </div>
                  )}

                  {/* 承認済み: 完了ボタン */}
                  {app.status === 'approved' && (
                    <button
                      onClick={() => onComplete(app.id)}
                      disabled={processingId === app.id}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-xs font-extrabold transition active:scale-95"
                    >
                      {processingId === app.id ? '処理中...' : '✅ 作業完了にする'}
                    </button>
                  )}

                  {/* 完了: レビュー・利益記録 */}
                  {app.status === 'completed' && (
                    <div className="flex gap-2">
                      <a
                        href="/tools"
                        className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-xs font-extrabold text-center transition active:scale-95"
                      >
                        利益を記録
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HelpListPage() {
  const currentUserId = getUserId();

  const [requests,    setRequests]    = useState<HelpRequest[]>([]);
  const [appCounts,   setAppCounts]   = useState<Record<string, number>>({});
  const [myApps,      setMyApps]      = useState<Record<string, HelpApplication>>({});
  const [loading,     setLoading]     = useState(true);
  const [isDemo,      setIsDemo]      = useState(false);
  const [applying,    setApplying]    = useState(false);
  const [selectedJob, setSelectedJob] = useState<HelpRequest | null>(null);

  // 自分の募集管理モーダル
  const [manageJob,    setManageJob]    = useState<HelpRequest | null>(null);
  const [manageApps,   setManageApps]   = useState<MyJobApplication[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 募集オーナーアクション（終了/完了/削除）
  const [actioningId,  setActioningId]  = useState<string | null>(null);

  type FilterChip = 'すべて' | '急募' | '今日' | '明日' | '写真あり' | '空室' | '在宅' | '道具持参';
  const FILTER_CHIPS: FilterChip[] = ['すべて', '急募', '今日', '明日', '写真あり', '空室', '在宅', '道具持参'];
  const [activeFilter, setActiveFilter] = useState<FilterChip>('すべて');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('help_requests')
      .select('*')
      .order('work_date', { ascending: true });

    if (error || !data || data.length === 0) {
      if (import.meta.env.DEV) {
        setRequests(DEMO);
        setAppCounts({ 'demo-1': 2, 'demo-2': 1 });
        setIsDemo(true);
      }
      setLoading(false);
      return;
    }

    // hidden は職人側に表示しない
    setRequests((data as HelpRequest[]).filter(r => r.status !== 'hidden'));

    // 応募数を集計
    const ids = (data as HelpRequest[]).map(r => r.id);
    const { data: apps } = await supabase
      .from('help_applications')
      .select('*')
      .in('request_id', ids);

    if (apps) {
      const counts: Record<string, number> = {};
      const myAppMap: Record<string, HelpApplication> = {};
      for (const a of apps as HelpApplication[]) {
        counts[a.request_id] = (counts[a.request_id] ?? 0) + 1;
        if (a.craftsman_id && a.craftsman_id === currentUserId) {
          myAppMap[a.request_id] = a;
        }
      }
      setAppCounts(counts);
      setMyApps(myAppMap);
    }

    setLoading(false);
  }

  // 応募処理
  async function handleApply(job: HelpRequest, message: string) {
    if (!currentUserId) {
      alert('ログインが必要です');
      return;
    }
    setApplying(true);

    const { error } = await supabase.from('help_applications').insert({
      request_id:   job.id,
      craftsman_id: currentUserId,
      message:      message || null,
      status:       'pending',
    });

    setApplying(false);

    if (error) {
      if (error.code === '23505') {
        alert('すでにこの募集に応募しています');
      } else {
        alert('送信に失敗しました。もう一度お試しください。');
      }
      return;
    }

    // ローカルステート更新
    const newApp: HelpApplication = {
      id: 'temp-' + Date.now(),
      request_id: job.id,
      craftsman_id: currentUserId,
      message: message || null,
      status: 'pending',
      requester_completed: false,
      applicant_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMyApps(prev => ({ ...prev, [job.id]: newApp }));
    setAppCounts(prev => ({ ...prev, [job.id]: (prev[job.id] ?? 0) + 1 }));

    // 応募通知（fire-and-forget）
    fetch('/api/notify-helper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:         'application',
        request_id:   job.id,
        craftsman_id: currentUserId,
        work_type:    job.work_type,
        area:         job.area,
        work_date:    job.work_date,
        message:      message || null,
        requester_craftsman_id: job.craftsman_id,
      }),
    }).catch(() => {});

    alert('応募しました。募集主の承認をお待ちください。');
    setSelectedJob(null);
  }

  // 自分の募集の応募管理
  async function openManageModal(job: HelpRequest) {
    const { data } = await supabase
      .from('help_applications')
      .select('*')
      .eq('request_id', job.id)
      .order('created_at', { ascending: true });

    if (!data) { setManageApps([]); setManageJob(job); return; }

    // craftsman情報を取得
    const craftsmanIds = (data as HelpApplication[])
      .map(a => a.craftsman_id)
      .filter((id): id is string => id !== null);

    let craftsmanMap: Record<string, { name: string; email: string }> = {};
    if (craftsmanIds.length > 0) {
      const { data: craftsmenData } = await supabase
        .from('craftsmen')
        .select('user_id, full_name, email')
        .in('user_id', craftsmanIds);
      if (craftsmenData) {
        for (const c of craftsmenData as Array<{ user_id: string; full_name: string; email: string }>) {
          craftsmanMap[c.user_id] = { name: c.full_name, email: c.email };
        }
      }
    }

    const enriched: MyJobApplication[] = (data as HelpApplication[]).map(a => ({
      ...a,
      craftsman_name:  a.craftsman_id ? craftsmanMap[a.craftsman_id]?.name : undefined,
      craftsman_email: a.craftsman_id && (a.status === 'approved' || a.status === 'completed')
        ? craftsmanMap[a.craftsman_id]?.email
        : undefined,
    }));

    setManageApps(enriched);
    setManageJob(job);
  }

  async function handleApprove(appId: string) {
    setProcessingId(appId);
    const { error } = await supabase
      .from('help_applications')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', appId);
    setProcessingId(null);

    if (error) { alert('更新に失敗しました'); return; }

    setManageApps(prev => prev.map(a =>
      a.id === appId ? { ...a, status: 'approved' } : a
    ));

    // 承認通知（fire-and-forget）
    fetch('/api/notify-helper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'approved', application_id: appId }),
    }).catch(() => {});
  }

  async function handleReject(appId: string) {
    setProcessingId(appId);
    const { error } = await supabase
      .from('help_applications')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', appId);
    setProcessingId(null);

    if (error) { alert('更新に失敗しました'); return; }

    setManageApps(prev => prev.map(a =>
      a.id === appId ? { ...a, status: 'rejected' } : a
    ));
  }

  async function handleComplete(appId: string) {
    setProcessingId(appId);
    const { error } = await supabase
      .from('help_applications')
      .update({
        status: 'completed',
        requester_completed: true,
        applicant_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appId);
    setProcessingId(null);

    if (error) { alert('更新に失敗しました'); return; }

    setManageApps(prev => prev.map(a =>
      a.id === appId ? { ...a, status: 'completed', requester_completed: true, applicant_completed: true } : a
    ));
  }

  async function handleCloseRequest(reqId: string) {
    if (!confirm('この募集を終了しますか？')) return;
    setActioningId(reqId);
    const { error } = await supabase
      .from('help_requests')
      .update({ status: 'closed' })
      .eq('id', reqId);
    setActioningId(null);
    if (error) { alert('更新に失敗しました'); return; }
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'closed' } : r));
  }

  async function handleCompleteRequest(reqId: string) {
    if (!confirm('この募集を完了済みにしますか？')) return;
    setActioningId(reqId);
    const { error } = await supabase
      .from('help_requests')
      .update({ status: 'completed' })
      .eq('id', reqId);
    setActioningId(null);
    if (error) { alert('更新に失敗しました'); return; }
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'completed' } : r));
  }

  async function handleDeleteRequest(reqId: string) {
    if (!confirm('この募集を削除しますか？\n応募データも削除されます。')) return;
    setActioningId(reqId);
    const { error } = await supabase
      .from('help_requests')
      .delete()
      .eq('id', reqId);
    setActioningId(null);
    if (error) { alert('削除に失敗しました'); return; }
    setRequests(prev => prev.filter(r => r.id !== reqId));
  }

  function matchFilter(req: HelpRequest, chip: FilterChip): boolean {
    if (chip === 'すべて') return true;
    const days   = daysUntil(req.work_date);
    const radar  = getSiteRadar(req.meta);
    const imgs   = getHelperImages(req.meta);
    if (chip === '急募')   return days <= 2;
    if (chip === '今日')   return days === 0;
    if (chip === '明日')   return days === 1;
    if (chip === '写真あり') return imgs.length > 0;
    if (chip === '空室')   return radar?.siteType === '空室';
    if (chip === '在宅')   return radar?.siteType === '在宅';
    if (chip === '道具持参') return (radar?.requiredTools?.length ?? 0) > 0;
    return true;
  }

  const filteredRequests = [...requests]
    .filter(req => matchFilter(req, activeFilter))
    .sort((a, b) => {
      const aExpired = isRequestClosed(a);
      const bExpired = isRequestClosed(b);
      // 期限切れを後ろへ
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      // 同じ区分内：作業日が近い順、なければ作成日が新しい順
      const aDate = new Date(a.work_date || a.created_at || 0).getTime();
      const bDate = new Date(b.work_date || b.created_at || 0).getTime();
      return aDate - bDate;
    });

  function chipCount(chip: FilterChip): number {
    if (chip === 'すべて') return requests.length;
    return requests.filter(req => matchFilter(req, chip)).length;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-none">助っ人募集一覧</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">空き日に入れる仕事を探す</p>
            </div>
          </div>
          <a href="/craftsman/help" className="text-xs text-orange-500 font-extrabold hover:underline">
            ＋ 募集する
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
        {isDemo && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2">
            <span className="text-amber-500 text-xs">📋</span>
            <p className="text-xs text-amber-700 font-semibold">
              デモ表示中 — 実際の募集が登録されると切り替わります
            </p>
          </div>
        )}

        {/* フィルターチップ */}
        {!loading && requests.length > 0 && (
          <div className="mb-4 -mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {FILTER_CHIPS.map(chip => {
              const count  = chipCount(chip);
              const active = activeFilter === chip;
              return (
                <button
                  key={chip}
                  onClick={() => setActiveFilter(chip)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    active
                      ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                      : count === 0
                        ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-default'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
                  }`}
                  disabled={count === 0 && chip !== 'すべて'}
                >
                  {chip}
                  <span className={`text-[10px] ${active ? 'text-orange-100' : 'text-slate-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm border border-slate-200">
            読み込み中...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm border border-slate-200">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-bold text-slate-700 mb-4">募集中の案件はありません</p>
            <a
              href="/craftsman/help"
              className="inline-block bg-orange-500 text-white rounded-2xl px-6 py-2.5 text-sm font-extrabold"
            >
              最初に募集する
            </a>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-200">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm font-bold text-slate-700">「{activeFilter}」に該当する募集はありません</p>
            <button onClick={() => setActiveFilter('すべて')} className="mt-3 text-xs text-orange-500 font-bold underline">
              すべて表示
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(req => {
              const isMyPost    = currentUserId !== '' && req.craftsman_id === currentUserId;
              const myApp       = myApps[req.id] ?? null;
              const appCount    = appCounts[req.id] ?? 0;
              const days        = daysUntil(req.work_date);
              const isToday     = days === 0;
              const isTomorrow  = days === 1;
              const isUrgent    = days === 2;
              const isLastSlot  = req.people_needed === 1;
              const isCompleted = req.status === 'completed';
              const isManualClosed = req.status === 'closed';
              const isExpired   = !isCompleted && !isManualClosed && isExpiredByTime(req);
              const isClosed    = isCompleted || isManualClosed || isExpired;
              const isActioning = actioningId === req.id;
              const cardImgs    = getHelperImages(req.meta);

              return (
                <article key={req.id} className={`bg-white rounded-3xl shadow-sm overflow-hidden transition-opacity ${
                  isMyPost ? 'border-2 border-orange-300' : 'border border-slate-200'
                } ${isClosed ? 'opacity-50 grayscale' : ''}`}>
                  {/* 自分の募集バナー */}
                  {isMyPost && (
                    <div className="bg-gradient-to-r from-orange-400 to-amber-400 px-4 py-2.5">
                      <p className="text-white font-extrabold text-xs">📋 あなたの募集です</p>
                    </div>
                  )}

                  {/* 現場写真（1枚目） */}
                  {cardImgs.length > 0 && (
                    <img
                      src={cardImgs[0]}
                      alt="現場写真"
                      className="w-full h-40 object-cover"
                      loading="lazy"
                    />
                  )}

                  {/* ヘッダー */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500 font-extrabold text-sm">📅 {formatDate(req.work_date)}</span>
                    </div>
                    <span className="bg-orange-100 text-orange-700 text-xs font-extrabold px-2.5 py-1 rounded-full">
                      {req.people_needed}名募集
                    </span>
                  </div>

                  <div className="p-4">
                    {/* バッジ行 */}
                    {(isClosed || isToday || isTomorrow || isUrgent || isLastSlot || appCount > 0 || cardImgs.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {/* 状態バッジ */}
                        {isCompleted && (
                          <span className="bg-emerald-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
                            ✅ 作業完了
                          </span>
                        )}
                        {isManualClosed && !isCompleted && (
                          <span className="bg-slate-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
                            🔒 募集終了
                          </span>
                        )}
                        {isExpired && (
                          <span className="bg-amber-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
                            ⏰ 期限切れ
                          </span>
                        )}
                        {/* 緊急度バッジ（非クローズのみ） */}
                        {!isClosed && isToday && (
                          <span className="bg-red-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full animate-pulse">
                            🔥 今日
                          </span>
                        )}
                        {!isClosed && isTomorrow && (
                          <span className="bg-orange-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
                            📅 明日
                          </span>
                        )}
                        {!isClosed && isUrgent && (
                          <span className="bg-orange-400 text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
                            ⚡ 急募
                          </span>
                        )}
                        {!isClosed && isLastSlot && (
                          <span className="bg-red-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full animate-pulse">
                            🔥 残り1枠
                          </span>
                        )}
                        {/* 写真枚数バッジ */}
                        {cardImgs.length > 0 && (
                          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                            📷 写真{cardImgs.length}枚
                          </span>
                        )}
                        {/* 応募数バッジ */}
                        {appCount > 0 && (
                          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                            👀 {appCount}名が応募中
                          </span>
                        )}
                      </div>
                    )}

                    <h2 className="text-base font-extrabold text-slate-900 mb-1">{req.work_type}</h2>
                    <p className="text-sm text-slate-500 mb-3 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      {req.area}
                    </p>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">日当</p>
                        <p className="text-xl font-extrabold text-slate-900">
                          ¥{req.daily_rate.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-400">/ 日</p>
                    </div>

                    {req.comment && (
                      <p className="text-sm text-slate-600 bg-blue-50 rounded-xl px-3 py-2.5 mb-3 leading-relaxed">
                        💬 {req.comment}
                      </p>
                    )}

                    {/* 現場レーダー（カードではコンパクトに重要な情報だけ） */}
                    {(() => {
                      const radar = getSiteRadar(req.meta);
                      const PRIORITY_CONDITIONS = ['朝礼あり', '駐車場あり', '駐車場なし', 'エレベーターあり', '階段メイン', '荷物多め'];
                      // radarにない場合は has_parking フィールドで補完
                      const parkingFromField = req.has_parking != null
                        && !(radar?.siteConditions ?? []).some(c => c.includes('駐車場'))
                        ? (req.has_parking ? '🚗 駐車場あり' : '🚫 駐車場なし')
                        : null;
                      const chips = [
                        ...(radar ? [
                          radar.buildingType ?? radar.siteType,
                          radar.workCategory,
                          radar.siteStatus,
                          radar.siteScale,
                          ...(radar.siteConditions?.filter(c => PRIORITY_CONDITIONS.includes(c)) ?? []),
                          radar.accessCondition && radar.accessCondition !== '未確認'
                            ? radar.accessCondition : null,
                        ] : []),
                        parkingFromField,
                      ].filter(Boolean) as string[];
                      if (chips.length === 0 && (!radar || (radar.requiredTools ?? []).length === 0)) return null;
                      return (
                        <div className="mb-3">
                          <p className="text-[10px] text-indigo-500 font-bold mb-1.5">📡 現場情報</p>
                          {chips.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {chips.slice(0, 6).map(chip => (
                                <span
                                  key={chip}
                                  className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-100"
                                >
                                  {chip}
                                </span>
                              ))}
                              {chips.length > 6 && (
                                <span className="text-[10px] text-slate-400 py-1">+{chips.length - 6}</span>
                              )}
                            </div>
                          )}
                          {radar?.requiredTools && radar.requiredTools.length > 0 && (
                            <p className="text-[10px] text-slate-500 mt-1.5">
                              🔧 {radar.requiredTools.join('・')}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* CTAボタン */}
                    {isClosed ? (
                      <div className="w-full rounded-2xl py-3 text-sm font-extrabold text-center bg-slate-100 text-slate-400 select-none">
                        {isCompleted ? '✅ 作業完了' : isExpired ? '⏰ 期限切れ' : '🔒 募集終了'}
                      </div>
                    ) : isMyPost ? (
                      <button
                        onClick={() => openManageModal(req)}
                        className="w-full rounded-2xl py-3 text-sm font-extrabold shadow-sm bg-orange-100 text-orange-700 hover:bg-orange-200 transition active:scale-[0.99]"
                      >
                        応募を管理する（{appCount}件）
                      </button>
                    ) : myApp ? (
                      <button
                        onClick={() => setSelectedJob(req)}
                        className="w-full rounded-2xl py-3 text-sm font-extrabold shadow-sm bg-green-500 text-white"
                      >
                        {myApp.status === 'approved' ? '✓ 承認されました' :
                         myApp.status === 'rejected' ? '今回は見送り' :
                         myApp.status === 'completed' ? '✅ 完了' :
                         '応募済み（承認待ち）'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedJob(req)}
                        className="w-full rounded-2xl py-3 text-sm font-extrabold shadow-sm bg-orange-500 hover:bg-orange-600 text-white transition active:scale-[0.99]"
                      >
                        詳細を見る
                      </button>
                    )}

                    {/* オーナーアクション（本人のみ・終了していない場合） */}
                    {isMyPost && !isClosed && (
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => handleCloseRequest(req.id)}
                          disabled={isActioning}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition active:scale-95"
                        >
                          {isActioning ? '...' : '募集終了'}
                        </button>
                        <button
                          onClick={() => handleCompleteRequest(req.id)}
                          disabled={isActioning}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition active:scale-95"
                        >
                          {isActioning ? '...' : '完了'}
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          disabled={isActioning}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50 transition active:scale-95"
                        >
                          {isActioning ? '...' : '削除'}
                        </button>
                      </div>
                    )}

                    <p className="mt-1 text-center">
                      <a href="/support?type=report" className="text-[10px] text-slate-300 hover:text-red-400 transition-colors underline">問題を報告</a>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* 詳細確認モーダル */}
      {selectedJob && (
        <HelperJobDetailModal
          job={selectedJob}
          applicantCount={appCounts[selectedJob.id] ?? 0}
          myApplication={myApps[selectedJob.id] ?? null}
          onClose={() => setSelectedJob(null)}
          onApply={(msg) => handleApply(selectedJob, msg)}
          applying={applying}
        />
      )}

      {/* 応募管理モーダル */}
      {manageJob && (
        <MyJobManageModal
          job={manageJob}
          applications={manageApps}
          onClose={() => { setManageJob(null); setManageApps([]); }}
          onApprove={handleApprove}
          onReject={handleReject}
          onComplete={handleComplete}
          processingId={processingId}
        />
      )}

      {/* 不具合・改善報告 */}
      <div className="text-center py-3 pb-20">
        <a
          href="/feedback?from=/craftsman/help-list"
          className="text-[11px] text-slate-300 hover:text-slate-500 underline underline-offset-2 transition-colors"
        >
          🔧 不具合・改善を報告する
        </a>
      </div>

      <BottomNav />
    </div>
  );
}
