// ================================================================
// fetchRequestDetail — 共通依頼取得関数
//
// /api/request-detail?id=... を呼び RequestDetail を返す。
// RequestDetailPage / RequestExtraInfoPage 両方で使うことで
// 片方だけ動く状態をなくす。
//
// contact_value / contact_method は API 側で除外済み・ここでも扱わない。
// ================================================================

export type RequestDetail = {
  id:            string;
  area:          string | null;
  work_type:     string | null;
  // has_video / has_photos は本番DBに存在しない列のため除外済み
  // has_video の代用: video_url !== null で判定
  video_url:     string | null;
  customer_note: string | null;
  created_at:    string | null;
  meta:          Record<string, unknown> | null;
  // contact_value / contact_method は絶対に含めない
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
