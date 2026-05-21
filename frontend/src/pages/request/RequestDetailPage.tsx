import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type RequestRow = {
  id: string;
  area: string | null;
  work_type: string | null;
  contact_method: string | null;
  contact_value: string | null;
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
        contact_method: 'メール',
        contact_value: '—',
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
      .select('id, area, work_type, contact_method, contact_value, has_video, has_photos, video_url, customer_note, created_at, meta')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); }
        else { setReq(data as RequestRow); }
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-slate-500 text-sm mb-4">依頼が見つかりませんでした。</p>
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 text-sm font-bold"
        >
          トップへ戻る
        </button>
      </div>
    );
  }

  const rooms = (req.meta?.rooms as Array<{ name: string; workType: string; size: string }> | undefined) ?? [];
  const extraInfo = req.meta?.extra_info as Record<string, unknown> | undefined;
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
        <h1 className="text-base font-extrabold text-slate-900">依頼内容の確認</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
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
          <div className="px-5 py-4 border-b border-slate-50">
            <p className="text-xs font-bold text-slate-400 mb-1">施工内容</p>
            <p className="text-sm font-bold text-slate-800">{req.work_type ?? '—'}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-1">ご連絡方法</p>
            <p className="text-sm font-bold text-slate-800">
              {req.contact_method ?? '—'}
              {req.contact_value ? `（${req.contact_value}）` : ''}
            </p>
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

        {/* 追加情報 */}
        {extraInfo && Object.keys(extraInfo).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-bold text-slate-400 mb-3">追加情報（品番・希望など）</p>
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

        {/* 追加情報CTA */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-blue-800 mb-1">📸 写真・品番・希望内容を追加できます</p>
          <p className="text-[11px] text-blue-600 leading-relaxed mb-3">
            品番・URL・参考写真などを送ると、職人がより正確な概算を出せます。
          </p>
          <button
            onClick={() => navigate(`/request/${req.id}/extra-info`)}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm transition-all"
          >
            写真・品番・希望を追加する →
          </button>
        </div>

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
