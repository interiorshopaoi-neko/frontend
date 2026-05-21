import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRooms, getRoomWorkSummary, getRoomDisplayName, getRoomDisplaySize } from '../../lib/requestMeta';
import { fetchRequestDetail, RequestNotFoundError, type RequestDetail } from '../../utils/requestApi';

// ── 型 ────────────────────────────────────────────────────────────────────────
// RequestDetail は utils/requestApi.ts で定義（contact_value / contact_method 除外済み）
type RequestRow = RequestDetail;

type RoomAdditionalEntry = {
  roomName:         string;
  workType?:        string;
  productNumber?:   string;
  note?:            string;
  photos?:          string[];
  videoUrl?:        string;
  addedByCustomer?: boolean;
};

// ── デモデータ ────────────────────────────────────────────────────────────────

const DEMO_REQ: RequestRow = {
  id:            'demo-1',
  area:          '群馬県太田市',
  work_type:     'クロス張替え',
  has_video:     false,
  has_photos:    false,
  video_url:     null,
  customer_note: 'これはデモ表示です。',
  created_at:    new Date().toISOString(),
  meta: {
    rooms: [
      { name: '寝室', workType: 'クロス', wallWorkScope: 'wall_ceiling', size: '8畳' },
      { name: 'LDK', workType: 'クロス', wallWorkScope: 'wall', size: '12畳' },
    ],
  },
};

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [req,      setReq]      = useState<RequestRow | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchErr, setFetchErr] = useState('');

  useEffect(() => {
    if (!id || id === 'demo-1') {
      setReq(DEMO_REQ);
      setLoading(false);
      return;
    }

    // service role proxy 経由で取得（RLS バイパス・contact 情報除外済み）
    fetchRequestDetail(id)
      .then(data => {
        setReq(data as RequestRow);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof RequestNotFoundError) {
          setNotFound(true);
        } else {
          setFetchErr(err instanceof Error ? err.message : 'ネットワークエラー。もう一度お試しください。');
        }
        setLoading(false);
      });
  }, [id]);

  // ── ローディング ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ── エラー ───────────────────────────────────────────────────────────────────
  if (fetchErr) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center gap-4">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm font-bold text-slate-700">{fetchErr}</p>
        <button onClick={() => window.location.reload()} className="text-blue-600 text-sm font-semibold underline">
          再読み込みする
        </button>
        {id && (
          <button
            onClick={() => navigate(`/request/${id}/extra-info`)}
            className="text-xs text-slate-400 underline"
          >
            追加情報ページへ
          </button>
        )}
      </div>
    );
  }

  // ── Not Found ────────────────────────────────────────────────────────────────
  if (notFound || !req) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <span className="text-2xl">🔍</span>
        </div>
        <div>
          <p className="text-base font-extrabold text-slate-700 mb-1">依頼が見つかりませんでした</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            URLが正しいか確認してください。<br />
            まだ依頼が処理中の場合、数秒後に再読み込みをお試しください。
          </p>
        </div>
        {id && !id.startsWith('demo') && (
          <button
            onClick={() => navigate(`/request/${id}/extra-info`)}
            className="text-xs text-blue-500 font-semibold underline"
          >
            追加情報ページで確認する
          </button>
        )}
        <button
          onClick={() => navigate('/')}
          className="w-full max-w-xs py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-sm"
        >
          トップへ戻る
        </button>
      </div>
    );
  }

  // ── データ整理 ───────────────────────────────────────────────────────────────

  const rooms            = getRooms(req.meta);
  const extraInfo        = req.meta?.extra_info       as Record<string, unknown> | undefined;
  const extraInfoNew     = req.meta?.extraInfo         as Record<string, unknown> | undefined;
  const roomAdditionalInfo = (req.meta?.roomAdditionalInfo ?? {}) as Record<string, RoomAdditionalEntry>;

  // 追加部屋（addedByCustomer: true のエントリ）
  const addedRooms = Object.entries(roomAdditionalInfo)
    .filter(([, v]) => v.addedByCustomer)
    .map(([k, v]) => ({ key: k, entry: v }));

  const createdDate = req.created_at
    ? new Date(req.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const isDemo = !id || id === 'demo-1';

  // ── 表示 ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ヘッダー */}
      <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600 transition flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-extrabold text-slate-900">依頼カルテ</h1>
      </div>

      {/* 3タブナビゲーション */}
      {!isDemo && (
        <nav className="bg-white border-b border-slate-200">
          <div className="flex max-w-lg mx-auto">
            <div className="flex-1 py-3 text-xs font-bold border-b-2 border-blue-600 text-blue-600 text-center">
              依頼内容
            </div>
            <button
              onClick={() => navigate(`/request/${id}/applications`)}
              className="flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition"
            >
              応募状況
            </button>
            <button
              onClick={() => navigate(`/request/${id}/extra-info`)}
              className="flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition"
            >
              追加情報
            </button>
          </div>
        </nav>
      )}

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ステータスカード */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🟢</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-emerald-800">募集中 — 職人が確認しています</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">対応可能な職人からメールで連絡が届きます</p>
          </div>
        </div>

        {/* 写真・情報追加 CTA */}
        <button
          onClick={() => navigate(`/request/${req.id}/extra-info`)}
          className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <span>📸</span> 写真・動画・情報を追加する →
        </button>

        {/* ブックマーク案内 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-base flex-shrink-0">🔖</span>
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-bold">このページをブックマークしておくと便利です。</span><br />
            依頼状況の確認・写真の追加をいつでも行えます。
          </p>
        </div>

        {/* 基本情報 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50 flex justify-between items-center">
            <p className="text-xs font-bold text-slate-400">受付日時</p>
            <p className="text-sm font-bold text-slate-800">{createdDate ?? '—'}</p>
          </div>
          <div className="px-5 py-3 border-b border-slate-50 flex justify-between items-center">
            <p className="text-xs font-bold text-slate-400">施工エリア</p>
            <p className="text-sm font-bold text-slate-800">{req.area ?? '—'}</p>
          </div>
          <div className="px-5 py-3 flex justify-between items-center">
            <p className="text-xs font-bold text-slate-400">施工内容</p>
            <p className="text-sm font-bold text-slate-800">{req.work_type ?? '—'}</p>
          </div>
        </div>

        {/* ── 部屋ごとのカルテカード（Phase 6）── */}
        {rooms.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 px-1">部屋の情報</p>
            {rooms.map((room, i) => {
              const key   = String(i);
              const extra = roomAdditionalInfo[key];
              const workParts = getRoomWorkSummary(room);
              const size      = getRoomDisplaySize(room);
              const name      = getRoomDisplayName(room);
              const conds     = room.condition ?? [];

              return (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* 部屋ヘッダー */}
                  <div className="bg-slate-900 px-4 py-3">
                    <p className="text-sm font-extrabold text-white">🏠 {name}</p>
                  </div>

                  <div className="px-4 py-3 space-y-2">
                    {/* 工事内容 */}
                    {workParts.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {workParts.map(w => (
                          <span key={w} className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                            {w}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* サイズ・状態 */}
                    {(size || conds.length > 0) && (
                      <div className="flex flex-wrap gap-1">
                        {size && (
                          <span className="text-[11px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
                            📐 {size}
                          </span>
                        )}
                        {conds.map(c => (
                          <span key={c} className="text-[11px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 追加済み動画 */}
                    {i === 0 && req.has_video && req.video_url && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 mb-1">メイン動画</p>
                        <video src={req.video_url} controls playsInline preload="none"
                          className="w-full rounded-xl bg-slate-900" style={{ maxHeight: '180px' }}>
                          動画を再生できません
                        </video>
                      </div>
                    )}

                    {/* 追加情報（部屋別）*/}
                    {extra && (
                      <div className="mt-1 pt-2 border-t border-slate-50 space-y-2">
                        {/* 追加動画 */}
                        {extra.videoUrl && (
                          <div>
                            <p className="text-[10px] font-bold text-blue-500 mb-1">🎬 追加動画</p>
                            <video src={extra.videoUrl} controls playsInline preload="none"
                              className="w-full rounded-xl bg-slate-900" style={{ maxHeight: '160px' }}>
                              動画を再生できません
                            </video>
                          </div>
                        )}

                        {/* 追加写真 */}
                        {(extra.photos?.length ?? 0) > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 mb-1">📸 写真 {extra.photos!.length}枚</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {extra.photos!.map((url, j) => (
                                <a key={j} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt={`写真${j + 1}`}
                                    className="w-full aspect-square object-cover rounded-xl border border-slate-100" loading="lazy" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 品番 */}
                        {extra.productNumber && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-slate-400 text-xs">品番：</span>
                            <span className="font-bold text-slate-700">{extra.productNumber}</span>
                          </div>
                        )}

                        {/* メモ */}
                        {extra.note && (
                          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl px-3 py-2">
                            {extra.note}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 追加部屋（Phase 6）── */}
        {addedRooms.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 px-1">追加された部屋</p>
            {addedRooms.map(({ key, entry }) => (
              <div key={key} className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                <div className="bg-violet-700 px-4 py-3 flex items-center gap-2">
                  <p className="text-sm font-extrabold text-white">➕ {entry.roomName}</p>
                  <span className="ml-auto text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">追加された部屋</span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {entry.workType && (
                    <span className="text-[11px] bg-violet-50 text-violet-600 font-semibold px-2 py-0.5 rounded-full inline-block">
                      {entry.workType}
                    </span>
                  )}
                  {(entry.photos?.length ?? 0) > 0 && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {entry.photos!.map((url, j) => (
                        <a key={j} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={`写真${j + 1}`}
                            className="w-full aspect-square object-cover rounded-xl border border-slate-100" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  )}
                  {entry.videoUrl && (
                    <video src={entry.videoUrl} controls playsInline preload="none"
                      className="w-full rounded-xl bg-slate-900" style={{ maxHeight: '160px' }} />
                  )}
                  {entry.note && (
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl px-3 py-2">{entry.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* メモ */}
        {req.customer_note && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-2">備考・メモ</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{req.customer_note}</p>
          </div>
        )}

        {/* 動画・写真（フラグ表示）*/}
        {(req.has_video || req.has_photos) && rooms.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-2">添付ファイル</p>
            <div className="flex gap-2 flex-wrap">
              {req.has_video && <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">🎬 動画あり</span>}
              {req.has_photos && <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">📷 写真あり</span>}
            </div>
          </div>
        )}

        {/* ご希望（新フォーマット）*/}
        {extraInfoNew && (extraInfoNew.accentPreference || extraInfoNew.softSokibariPreference) && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-3">ご希望</p>
            <div className="space-y-1.5">
              {extraInfoNew.accentPreference && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">✨ アクセントクロス</span>
                  <span className="font-bold text-slate-700">{extraInfoNew.accentPreference as string}</span>
                </div>
              )}
              {extraInfoNew.softSokibariPreference && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">📐 ソフト巾木</span>
                  <span className="font-bold text-slate-700">{extraInfoNew.softSokibariPreference as string}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 追加情報（旧フォーマット）*/}
        {extraInfo && (extraInfo.furniture || extraInfo.timing || extraInfo.parking) && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-3">追加情報</p>
            <div className="space-y-1.5">
              {extraInfo.furniture && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">家具の状況</span>
                  <span className="font-bold text-slate-700">{extraInfo.furniture as string}</span>
                </div>
              )}
              {extraInfo.parking && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">駐車場</span>
                  <span className="font-bold text-slate-700">{extraInfo.parking as string}</span>
                </div>
              )}
              {(extraInfo.material as string[] | undefined)?.length ? (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">材料希望</span>
                  <span className="font-bold text-slate-700">{(extraInfo.material as string[]).join('・')}</span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-white transition-all"
        >
          トップへ戻る
        </button>
      </div>
    </div>
  );
}
