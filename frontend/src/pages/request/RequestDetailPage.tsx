import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type RequestRow = {
  id: string;
  area: string | null;
  work_type: string | null;
  has_video: boolean | null;
  has_photos: boolean | null;
  video_url: string | null;
  customer_note: string | null;
  created_at: string | null;
  meta: Record<string, unknown> | null;
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [req, setReq] = useState<RequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || id === 'demo-1') {
      setReq({
        id: 'demo-1',
        area: '群馬県太田市',
        work_type: 'クロス張替え',
        has_video: false,
        has_photos: false,
        video_url: null,
        customer_note: 'これはデモ表示です。',
        created_at: new Date().toISOString(),
        meta: null,
      });
      setLoading(false);
      return;
    }
    supabase
      .from('estimate_requests')
      .select('id, area, work_type, has_video, has_photos, video_url, customer_note, created_at, meta')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[RequestDetailPage] fetch error:', error.message, error.code);
        }
        if (data) { setReq(data as RequestRow); }
        else { setNotFound(true); }
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

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
            すでに依頼が削除されているか、URLが異なる可能性があります。
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

  const rooms = (req.meta?.rooms as Array<{ name: string; workType: string; size: string; customName?: string }> | undefined) ?? [];
  const extraInfo = req.meta?.extra_info as Record<string, unknown> | undefined;
  const extraInfoNew = req.meta?.extraInfo as Record<string, unknown> | undefined;
  const roomAdditionalInfo = (req.meta?.roomAdditionalInfo as Array<{
    roomIndex: number;
    roomName: string;
    productNumber?: string;
    memo?: string;
    images?: string[];
  }> | undefined) ?? [];
  const createdDate = req.created_at
    ? new Date(req.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-extrabold text-slate-900">依頼状況</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ステータスカード */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🔵</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-emerald-800">募集中 — 職人が確認しています</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">対応可能な職人からメールで連絡が届きます</p>
          </div>
        </div>

        {/* 大きなCTA */}
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

        {/* 基本情報カード */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <p className="text-xs font-bold text-slate-400 mb-1">受付日時</p>
            <p className="text-sm font-bold text-slate-800">{createdDate ?? '—'}</p>
          </div>
          <div className="px-5 py-4 border-b border-slate-50">
            <p className="text-xs font-bold text-slate-400 mb-1">施工エリア</p>
            <p className="text-sm font-bold text-slate-800">{req.area ?? '—'}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-1">施工内容</p>
            <p className="text-sm font-bold text-slate-800">{req.work_type ?? '—'}</p>
          </div>
        </div>

        {/* 部屋情報 */}
        {rooms.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-3">部屋の情報</p>
            <div className="space-y-2">
              {rooms.map((room, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-700">{room.name}</span>
                  <span className="text-slate-500">{room.workType}{room.size ? `・${room.size}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* メモ */}
        {req.customer_note && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-2">備考・メモ</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{req.customer_note}</p>
          </div>
        )}

        {/* 動画・写真 */}
        {(req.has_video || req.has_photos) && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-2">添付ファイル</p>
            <div className="flex gap-2 flex-wrap">
              {req.has_video && (
                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                  🎬 動画あり
                </span>
              )}
              {req.has_photos && (
                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                  📷 写真あり
                </span>
              )}
            </div>
          </div>
        )}

        {/* 追加情報（旧フォーマット） */}
        {extraInfo && (extraInfo.furniture || extraInfo.timing || extraInfo.memo) && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-3">追加情報</p>
            <div className="space-y-1.5">
              {(extraInfo.furniture as string | undefined) && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">家具の状況</span>
                  <span className="font-bold text-slate-700">{extraInfo.furniture as string}</span>
                </div>
              )}
              {(extraInfo.timing as string | undefined) && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">希望時期</span>
                  <span className="font-bold text-slate-700">{extraInfo.timing as string}</span>
                </div>
              )}
              {(extraInfo.memo as string | undefined) && (
                <div className="text-sm">
                  <span className="text-slate-400">メモ</span>
                  <p className="text-slate-700 mt-0.5 leading-relaxed">{extraInfo.memo as string}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 追加情報（新フォーマット: アクセント・巾木など） */}
        {extraInfoNew && (extraInfoNew.accentPreference || extraInfoNew.softSokibariPreference) && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-3">ご希望</p>
            <div className="space-y-1.5">
              {(extraInfoNew.accentPreference as string | undefined) && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">✨ アクセントクロス</span>
                  <span className="font-bold text-slate-700">{extraInfoNew.accentPreference as string}</span>
                </div>
              )}
              {(extraInfoNew.softSokibariPreference as string | undefined) && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">📐 ソフト巾木</span>
                  <span className="font-bold text-slate-700">{extraInfoNew.softSokibariPreference as string}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 部屋別追加情報（写真・品番・メモ） */}
        {roomAdditionalInfo.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-50">
              <p className="text-xs font-bold text-slate-400">📸 部屋別 追加情報</p>
            </div>
            <div className="divide-y divide-slate-50">
              {roomAdditionalInfo.map((room, i) => (
                <div key={i} className="px-5 py-4 space-y-2">
                  <p className="text-sm font-extrabold text-slate-800">🏠 {room.roomName}</p>
                  {room.productNumber && (
                    <div className="text-sm">
                      <span className="text-slate-400">品番：</span>
                      <span className="font-bold text-slate-700">{room.productNumber}</span>
                    </div>
                  )}
                  {room.memo && (
                    <p className="text-sm text-slate-600 leading-relaxed">{room.memo}</p>
                  )}
                  {(room.images?.length ?? 0) > 0 && (
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      {room.images!.map((url, j) => (
                        <a key={j} href={url} target="_blank" rel="noreferrer">
                          <img
                            src={url}
                            alt={`${room.roomName} 写真${j + 1}`}
                            className="w-full aspect-square object-cover rounded-xl border border-slate-100"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
