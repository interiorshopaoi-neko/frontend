// ================================================================
// POST /api/upload-room-image
//
// 顧客の追加情報ページから送られてくる部屋写真を
// service role key を使って Supabase Storage に保存する。
//
// anon クライアントから直接 Storage にアップロードすると
// Storage RLS にブロックされるため、このサーバー経由で保存する。
//
// セキュリティ:
//   - requestId は数字のみ許可（パストラバーサル防止）
//   - roomIndex  は数字のみ許可（パストラバーサル防止）
//   - mimeType   は image/jpeg | image/png | image/webp のみ許可
//   - ファイルサイズ上限 5MB
//   - 保存パスはサーバー側で構築し、クライアントからは受け取らない
//
// Body (application/json):
//   {
//     requestId: string,   // estimate_requests.id（数字のみ）
//     roomIndex: string,   // 部屋インデックス（数字のみ）
//     base64:    string,   // base64エンコードされた画像バイナリ
//     mimeType:  string,   // "image/webp" | "image/jpeg" | "image/png"
//   }
//
// Response:
//   { publicUrl: string }
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim();

const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

const BUCKET    = 'estimate-videos';
const MAX_BYTES = 5 * 1024 * 1024;  // 5MB

const ALLOWED_MIME = ['image/webp', 'image/jpeg', 'image/jpg', 'image/png'] as const;
type AllowedMime = typeof ALLOWED_MIME[number];

// requestId / roomIndex の許可パターン（数字のみ・合理的な桁数）
const RE_ID    = /^\d{1,10}$/;
const RE_INDEX = /^\d{1,5}$/;

// パスはサーバー側で完全に構築（クライアントから受け取らない）
function buildStoragePath(requestId: string, roomIndex: string): string {
  return `room-images/${requestId}/${roomIndex}/${Date.now()}.webp`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[upload-room-image] env missing');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { requestId, roomIndex, base64, mimeType } = (req.body ?? {}) as {
    requestId?: string;
    roomIndex?: string;
    base64?:    string;
    mimeType?:  string;
  };

  // ── バリデーション ──────────────────────────────────────────────────────────

  // requestId: 数字のみ
  if (!requestId || !RE_ID.test(requestId)) {
    return res.status(400).json({ error: 'requestId は1〜10桁の数字のみ有効です' });
  }

  // roomIndex: 数字のみ
  if (!roomIndex || !RE_INDEX.test(roomIndex)) {
    return res.status(400).json({ error: 'roomIndex は1〜5桁の数字のみ有効です' });
  }

  // mimeType: 許可された画像形式のみ
  if (!mimeType || !ALLOWED_MIME.includes(mimeType as AllowedMime)) {
    return res.status(400).json({
      error: `mimeType が不正です（jpeg / png / webp のみ許可）: ${mimeType ?? '(未指定)'}`,
    });
  }

  // base64: 必須
  if (!base64) {
    return res.status(400).json({ error: 'base64 が必要です' });
  }

  // base64 → Buffer
  let buf: Buffer;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    return res.status(400).json({ error: 'base64 のデコードに失敗しました' });
  }

  // ファイルサイズ: 5MB 以下
  if (buf.length > MAX_BYTES) {
    return res.status(400).json({
      error: `ファイルサイズが上限を超えています（${(buf.length / 1024 / 1024).toFixed(1)}MB > ${MAX_BYTES / 1024 / 1024}MB）`,
    });
  }

  // ── パス構築（クライアントからは受け取らない）──────────────────────────────

  const path = buildStoragePath(requestId, roomIndex);

  // ── Supabase Storage アップロード ──────────────────────────────────────────

  try {
    const storageUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
    const uploadRes  = await fetch(storageUrl, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey':        SUPABASE_SERVICE_KEY,
        'Content-Type':  mimeType,
        'x-upsert':      'false',
      },
      body: buf,
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text().catch(() => '');
      console.error('[upload-room-image] storage error', uploadRes.status, errBody);
      return res.status(502).json({
        error: '画像のアップロードに失敗しました',
        detail: `storage ${uploadRes.status}: ${errBody}`,
      });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    console.info('[upload-room-image] ok requestId=%s roomIndex=%s bytes=%d', requestId, roomIndex, buf.length);
    return res.status(200).json({ publicUrl });

  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[upload-room-image] exception:', detail);
    return res.status(500).json({ error: '画像のアップロードに失敗しました', detail });
  }
}
