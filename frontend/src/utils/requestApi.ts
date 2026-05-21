// ================================================================
// fetchRequestDetail — 共通依頼取得関数
//
// /api/request-detail?id=... を呼び RequestDetail を返す。
// RequestDetailPage / RequestExtraInfoPage 両方で使うことで
// 片方だけ動く状態をなくす。
//
// contact_value / contact_method は API 側で除外済み・ここでも扱わない。
//
// 注: API は select=* で返すため、実際のDB列名をそのまま受け取る。
//     estimate_requests の実在列に基づいた型定義にすること。
//     存在しない列（customer_note, has_video, has_photos）は型に含めない。
// ================================================================

export type RequestDetail = {
  id:            string;
  area?:         string | null;
  work_type?:    string | null;
  video_url?:    string | null;    // メイン動画URL（has_video の代用: non-null で動画あり）
  memo?:         string | null;    // 実DB列名（RPC: p_memo）。customer_note とは別物
  size_note?:    string | null;    // RPC: p_size_note
  timing?:       string | null;    // RPC: p_timing
  room_type?:    string | null;
  site_condition?: string | null;
  desire_type?:  string | null;
  meta?:         Record<string, unknown> | null;
  created_at?:   string | null;
  status?:       string | null;
  // contact_value / contact_method は API 側で除外済み・型にも含めない
  // 上記以外のDB列もそのまま通過するが、フロントは既知列のみ使う
  [key: string]: unknown;
};

export class RequestNotFoundError extends Error {
  status = 404;
  constructor() { super('依頼が見つかりませんでした'); }
}

export async function fetchRequestDetail(id: string | number): Promise<RequestDetail> {
  const strId = String(id).trim();
  if (!strId) throw new Error('id が指定されていません');

  const res = await fetch(`/api/request-detail?id=${encodeURIComponent(strId)}`);

  if (res.status === 404) throw new RequestNotFoundError();

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'サーバーエラーが発生しました' }));
    throw new Error(
      typeof body?.error === 'string' ? body.error : 'サーバーエラーが発生しました',
    );
  }

  const data: Record<string, unknown> = await res.json();

  if (data.error) throw new Error(String(data.error));

  // 念のため sensitive fields を除去（API 側でも除外済みだが二重保護）
  delete data.contact_value;
  delete data.contact_method;

  return data as RequestDetail;
}
