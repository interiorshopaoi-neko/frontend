// ================================================================
// POST /api/upload-room-image
//
// 顧客の追加情報ページから送られてくる部屋写真を
// service role key を使って Supabase Storage に保存する。
//
// anon クライアントから直接 Storage にアップロードすると
// Storage RLS にブロックされるため、このサーバー経由で保存する。
//
// Body (application/json):
//   {
//     id:       string,   // estimate_requests.id
//     roomKey:  string,   // "0", "1", "added_0" など
//     base64:   string,   // base64エンコードされた画像バイナリ
//     mimeType: string,   // "image/webp" | "image/jpeg" | "image/png"
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

const BUCKET     = 'estimate-videos';
const MAX_BYTES  = 8 * 1024 * 1024;  // 8MB（圧縮後の上限、念のため）

const ALLOWED_MIME = ['image/webp', 'image/jpeg', 'image/jpg', 'image/png'] as const;
type AllowedMime = typeof ALLOWED_MIME[number];

function mimeToExt(mime: AllowedMime): string {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/png')  return 'png';
  return 'jpg';
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

  const { id, roomKey, base64, mimeType } = (req.body ?? {}) as {
    id?:       string;
    roomKey?:  string;
    base64?:   string;
    mimeType?: string;
  };

  if (!id || !roomKey || !base64 || !mimeType) {
    return res.status(400).json({ error: 'id / roomKey / base64 / mimeType が必要です' });
  }

  if (!ALLOWED_MIME.includes(mimeType as AllowedMime)) {
    return res.status(400).json({ error: `mimeType が不正です: ${mimeType}` });
  }

  // base64 → Buffer
  let buf: Buffer;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    return res.status(400).json({ error: 'base64 のデコードに失敗しました' });
  }

  if (buf.length > MAX_BYTES) {
    return res.status(400).json({
      error: `圧縮後の画像サイズが上限を超えています（${(buf.length / 1024 / 1024).toFixed(1)}MB > ${MAX_BYTES / 1024 / 1024}MB）`,
    });
  }

  const ext  = mimeToExt(mimeType as AllowedMime);
  // CorporateRequest と同系統のパス（room-images/）
  const path = `room-images/${id}/${roomKey}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

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
    console.info('[upload-room-image] ok id=', id, 'roomKey=', roomKey, 'bytes=', buf.length, 'path=', path);
    return res.status(200).json({ publicUrl });

  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[upload-room-image] exception:', detail);
    return res.status(500).json({ error: '画像のアップロードに失敗しました', detail });
  }
}
