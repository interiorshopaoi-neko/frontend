import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type EstimateRequest = {
  id: string;
  work_type: string | null;
  area: string | null; city?: string | null;
  room_size: string | null;
  urgency: string | null;
  preferred_date: string | null;
  customer_note: string | null;
  created_at: string;
};

type CraftsmanInfo = {
  user_id: string;
  shop_name: string | null;
  full_name: string | null;
  experience_years: number | null;
  work_types: string[] | null;
  has_car: boolean | null;
  has_tools: boolean | null;
  bio: string | null;
  profile_image_url: string | null;
};

type Application = {
  id: string;
  craftsman_id: string | null;
  price: number | null;
  message: string | null;
  is_contracted: boolean | null;
  created_at: string;
  craftsman: CraftsmanInfo | null;
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_REQUEST: EstimateRequest = {
  id: 'demo-req-1',
  work_type: 'クロス張替え',
  area: '太田市',
  room_size: '6畳',
  urgency: 'soon',
  preferred_date: '3日以内',
  customer_note: '壁一面に汚れがあります。退去後の原状回復をお願いしたいです。',
  created_at: new Date(Date.now() - 86400000).toISOString(),
};

const DEMO_APPS: Application[] = [
  {
    id: 'demo-app-1',
    craftsman_id: 'craftsman-1',
    price: 32000,
    message: '原状回復は得意分野です。翌日から対応可能です。お気軽にご相談ください。',
    is_contracted: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    craftsman: {
      user_id: 'craftsman-1',
      shop_name: '田中内装',
      full_name: '田中 健二',
      experience_years: 12,
      work_types: ['クロス', '床', 'CF'],
      has_car: true,
      has_tools: true,
      bio: '群馬県内を中心に12年間内装工事を専門にしています。丁寧・迅速な施工が強みです。',
      profile_image_url: null,
    },
  },
  {
    id: 'demo-app-2',
    craftsman_id: 'craftsman-2',
    price: 27000,
    message: '週末も対応可能です。写真を確認したうえで正確な見積もりを提示できます。',
    is_contracted: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    craftsman: {
      user_id: 'craftsman-2',
      shop_name: null,
      full_name: '山本 幸雄',
      experience_years: 7,
      work_types: ['クロス', '補修'],
      has_car: true,
      has_tools: false,
      bio: null,
      profile_image_url: null,
    },
  },
  {
    id: 'demo-app-3',
    craftsman_id: 'craftsman-3',
    price: 38000,
    message: '20年の経験があります。仕上がりの品質に自信があります。アフターフォローも対応します。',
    is_contracted: false,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    craftsman: {
      user_id: 'craftsman-3',
      shop_name: '阿久津リフォーム',
      full_name: '阿久津 誠',
      experience_years: 20,
      work_types: ['クロス', '床', 'CF', '補修'],
      has_car: true,
      has_tools: true,
      bio: 'ベテラン職人として20年以上活動。品質保証付きの施工が強みです。',
      profile_image_url: null,
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const URGENCY_LABEL: Record<string, string> = {
  today:    '今日中に希望',
  tomorrow: '明日まで希望',
  soon:     '数日以内',
  normal:   '急ぎではない',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ src, letter }: { src: string | null; letter: string }) {
  const [ok, setOk] = useState(!!src);
  if (src && ok) {
    return (
      <img src={src} alt="" className="w-full h-full object-cover" onError={() => setOk(false)} />
    );
  }
  return <span className="text-xl font-extrabold text-slate-400">{letter}</span>;
}

function Chip({ children, color = 'slate' }: { children: React.ReactNode; color?: 'slate' | 'blue' | 'green' }) {
  const cls = {
    slate: 'bg-slate-100 text-slate-600',
    blue:  'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
  }[color];
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>
      {children}
    </span>
  );
}

// ─── Confirmation sheet ───────────────────────────────────────────────────────

function ConfirmSheet({
  app,
  onConfirm,
  onClose,
  loading,
}: {
  app: Application;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const name = app.craftsman?.shop_name || app.craftsman?.full_name || '職人さん';
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl px-6 pt-6 pb-10 max-w-2xl mx-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
        <h3 className="text-lg font-extrabold text-slate-900 mb-1 text-center">
          この職人に依頼しますか？
        </h3>
        <p className="text-sm text-slate-500 text-center mb-6">
          {name} さんを選択します
        </p>

        <div className="rounded-2xl bg-slate-50 px-4 py-4 mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">概算金額</span>
            <span className="font-extrabold text-slate-900">
              {app.price != null ? `¥${app.price.toLocaleString()}` : '未入力'}
            </span>
          </div>
          <div className="flex items-start justify-between text-xs">
            <span className="text-slate-400">連絡先について</span>
            <span className="text-slate-500 text-right max-w-[60%]">
              成約後にお互いの連絡先を共有します
            </span>
          </div>
        </div>

        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3.5 font-extrabold text-base shadow-sm shadow-blue-200 transition active:scale-[0.98] disabled:opacity-60 mb-3"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              処理中...
            </span>
          ) : 'この職人に依頼する'}
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RequestApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request,       setRequest]       = useState<EstimateRequest | null>(null);
  const [apps,          setApps]          = useState<Application[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [isDemo,        setIsDemo]        = useState(false);
  const [confirming,    setConfirming]    = useState<Application | null>(null);
  const [contracting,   setContracting]   = useState(false);
  const [contractedId,  setContractedId]  = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      // 依頼を取得
      const { data: reqData } = await supabase
        .from('estimate_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      // 応募を取得
      const { data: appData, error: appError } = await supabase
        .from('job_applications')
        .select('*')
        .eq('estimate_request_id', id)
        .order('created_at', { ascending: true });

      if (appError || !reqData) {
        setRequest(DEMO_REQUEST);
        setApps(DEMO_APPS);
        setIsDemo(true);
        setLoading(false);
        return;
      }

      setRequest(reqData as EstimateRequest);

      if (!appData || appData.length === 0) {
        setApps([]);
        setLoading(false);
        return;
      }

      // 職人情報を個別取得してマージ（RPC経由 / email等個人情報は取得しない）
      const craftsmanIds = [...new Set(appData.map(a => a.craftsman_id).filter(Boolean))];
      const { data: craftsmenData } = await supabase
        .rpc('get_craftsmen_by_ids', { p_user_ids: craftsmanIds });

      const craftsmenMap = Object.fromEntries(
        (craftsmenData ?? []).map(c => [c.user_id, c as CraftsmanInfo])
      );

      setApps(
        appData.map(a => ({
          ...a,
          craftsman: craftsmenMap[a.craftsman_id] ?? null,
        })) as Application[]
      );
      setLoading(false);
    })();
  }, [id]);

  async function handleContract() {
    if (!confirming) return;
    setContracting(true);

    if (!isDemo) {
      const { error } = await supabase
        .from('job_applications')
        .update({ is_contracted: true, contracted_at: new Date().toISOString() })
        .eq('id', confirming.id);

      if (error) {
        alert('エラーが発生しました。もう一度お試しください。');
        setContracting(false);
        return;
      }

      // 成約通知メール（職人へ）— fire-and-forget。成約保存には影響しない
      fetch('/api/notify-contracted', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          request_id:     id,
          application_id: confirming.id,
        }),
      }).catch(err => console.warn('[notify-contracted] fire-and-forget error:', err));
    }

    setContractedId(confirming.id);
    setApps(prev => prev.map(a => ({ ...a, is_contracted: a.id === confirming.id })));
    setContracting(false);
    setConfirming(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const minPrice = Math.min(...apps.filter(a => a.price != null).map(a => a.price!));
  const contracted = apps.find(a => a.is_contracted);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <p className="text-sm font-extrabold text-slate-900 leading-none">応募確認</p>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">職人を比較して選んでください</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-16">

        {/* デモバナー */}
        {isDemo && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-amber-500">📋</span>
            <p className="text-xs text-amber-700 font-semibold">
              デモ表示中 — 実際の依頼が登録されると実データが表示されます
            </p>
          </div>
        )}

        {/* 成約完了バナー */}
        {contractedId && (
          <div className="mb-4 rounded-2xl bg-green-50 border border-green-200 px-4 py-4">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              <p className="text-sm font-extrabold text-green-800">成約しました！</p>
            </div>
            <p className="text-xs text-green-700 leading-relaxed ml-7">
              職人さんが確認次第、連絡先をお互いに共有します。<br />
              それまでは個人情報は開示されません。
            </p>
          </div>
        )}

        {/* 依頼内容カード */}
        {request && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">依頼内容</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] text-slate-400">工事内容</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{request.work_type ?? '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] text-slate-400">エリア</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{request.area ?? request.city ?? '—'}</p>
              </div>
              {request.room_size && (
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-400">部屋サイズ</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">{request.room_size}</p>
                </div>
              )}
              {request.urgency && (
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-400">希望時期</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {URGENCY_LABEL[request.urgency] ?? request.urgency}
                  </p>
                </div>
              )}
            </div>
            {request.customer_note && (
              <p className="text-xs text-slate-600 bg-blue-50 rounded-xl px-3 py-2 leading-relaxed">
                💬 {request.customer_note}
              </p>
            )}
          </div>
        )}

        {/* 応募件数バナー */}
        <div className={`rounded-2xl px-4 py-3 mb-4 flex items-center justify-between ${
          apps.length > 0 ? 'bg-blue-600 shadow-sm shadow-blue-200' : 'bg-slate-200'
        }`}>
          <div>
            <p className={`text-xs font-bold ${apps.length > 0 ? 'text-blue-200' : 'text-slate-500'}`}>
              現在の応募状況
            </p>
            <p className={`text-lg font-extrabold ${apps.length > 0 ? 'text-white' : 'text-slate-600'}`}>
              {apps.length}件 の応募が届いています
            </p>
          </div>
          {apps.length > 0 && (
            <div className="text-right">
              <p className="text-[11px] text-blue-200">最安値</p>
              <p className="text-base font-extrabold text-white">
                ¥{minPrice.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* 応募カード一覧 */}
        {apps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
            <p className="text-3xl mb-2">⏳</p>
            <p className="text-sm font-bold text-slate-700 mb-1">まだ応募がありません</p>
            <p className="text-xs text-slate-400">職人からの応募をお待ちください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map(app => {
              const c           = app.craftsman;
              const displayName = c?.shop_name || c?.full_name || '職人さん';
              const avatarLetter = displayName.charAt(0);
              const isLowest    = app.price === minPrice && app.price != null;
              const isChosen    = app.is_contracted;
              const alreadyContracted = !!contracted && !isChosen;

              return (
                <article
                  key={app.id}
                  className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition ${
                    isChosen ? 'border-green-300 ring-2 ring-green-200' : 'border-slate-200'
                  }`}
                >
                  {/* カードヘッダー */}
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start gap-3 mb-3">
                      {/* アバター */}
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                        <Avatar src={c?.profile_image_url ?? null} letter={avatarLetter} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <h2 className="text-base font-extrabold text-slate-900">{displayName}</h2>
                          {isChosen && (
                            <span className="bg-green-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              ✓ 選択済み
                            </span>
                          )}
                        </div>
                        {c?.full_name && c.shop_name && (
                          <p className="text-xs text-slate-500">担当：{c.full_name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {c?.experience_years != null && (
                            <Chip color="blue">内装歴 {c.experience_years}年</Chip>
                          )}
                          {c?.has_car && <Chip color="green">🚗 車あり</Chip>}
                          {c?.has_tools && <Chip color="green">🔧 道具あり</Chip>}
                        </div>
                      </div>
                    </div>

                    {/* 対応工事 */}
                    {c?.work_types && c.work_types.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {c.work_types.map(wt => (
                          <Chip key={wt}>{wt}</Chip>
                        ))}
                      </div>
                    )}

                    {/* 一言bio */}
                    {c?.bio && (
                      <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">
                        {c.bio}
                      </p>
                    )}

                    {/* 金額 */}
                    <div className={`rounded-2xl px-4 py-3 mb-3 flex items-center justify-between ${
                      isLowest ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50'
                    }`}>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">概算金額</p>
                        <p className={`text-xl font-extrabold ${isLowest ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {app.price != null ? `¥${app.price.toLocaleString()}` : '要相談'}
                        </p>
                      </div>
                      {isLowest && (
                        <span className="bg-emerald-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
                          最安値
                        </span>
                      )}
                    </div>

                    {/* メッセージ */}
                    {app.message && (
                      <div className="bg-blue-50 rounded-xl px-3 py-2.5 mb-3">
                        <p className="text-[10px] text-blue-500 font-bold mb-1">職人からのメッセージ</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{app.message}</p>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 mb-3">
                      {formatDate(app.created_at)} 応募
                    </p>
                  </div>

                  {/* アクションボタン */}
                  <div className="border-t border-slate-100 px-4 py-3 flex gap-2">
                    <a
                      href={c?.user_id ? `/craftsman/profile/${c.user_id}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-xs font-bold transition active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                      プロフィールを見る
                    </a>
                    {isChosen ? (
                      <div className="flex-1 flex items-center justify-center bg-green-50 border border-green-200 rounded-xl py-2.5 text-xs font-extrabold text-green-700">
                        ✓ この職人に依頼中
                      </div>
                    ) : (
                      <button
                        onClick={() => !alreadyContracted && setConfirming(app)}
                        disabled={alreadyContracted}
                        className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold transition active:scale-95 ${
                          alreadyContracted
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200'
                        }`}
                      >
                        この職人にお願いする
                      </button>
                    )}
                  </div>

                  {/* 成約後ガイダンス */}
                  {isChosen && (
                    <div className="border-t border-green-100 bg-green-50 px-4 py-3">
                      <ul className="space-y-1">
                        <li className="text-[11px] text-green-800 font-bold leading-relaxed">📧 まずはメールで日程・詳細を調整してください</li>
                        <li className="text-[11px] text-slate-500 leading-relaxed">🔒 電話番号・LINEは表示されません</li>
                        <li className="text-[11px] text-slate-500 leading-relaxed">⭐ 工事完了後にレビューを依頼できます</li>
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* 注意書き */}
        <div className="mt-6 rounded-2xl bg-slate-100 px-4 py-3">
          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            🔒 電話番号・住所などの個人情報は成約後に当事者間で共有されます。<br />
            成約前に個人情報が公開されることはありません。
          </p>
        </div>
      </div>

      {/* 確認ボトムシート */}
      {confirming && (
        <ConfirmSheet
          app={confirming}
          onConfirm={handleContract}
          onClose={() => setConfirming(null)}
          loading={contracting}
        />
      )}
    </div>
  );
}
