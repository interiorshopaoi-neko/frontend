// ================================================================
// POST /api/upload-room-video
//
// 顧客の追加情報ページから送られてくる部屋動画用の
// Supabase Storage 署名付きアップロード URL を生成する。
//
// 動画は最大50MBになるため base64 JSON 経由では Vercel の
// リクエストボディ上限（4.5MB）を超える。そのため、
// Supabase Storage の Signed Upload URL を生成して返し、
// クライアントが直接 Supabase Storage に PUT する方式を採用する。
//
// セキュリティ:
//   - requestId は数字のみ許可（パストラバーサル防止）
//   - roomIndex  は数字のみ許可（パストラバーサル防止）
//   - mimeType   は video/mp4 | video/quicktime | video/webm のみ許可
//   - 保存パスはサーバー側で構築し、クライアントからは受け取らない
//   - contact情報は一切扱わない
//
// Body (application/json):
//   {
//     requestId: string,   // estimate_requests.id（数字のみ）
//     roomIndex: string,   // 部屋インデックス（数字のみ）
//     mimeType:  string,   // "video/mp4" | "video/quicktime" | "video/webm"
//   }
//
// Response:
//   { uploadUrl: string, publicUrl: string }
//   uploadUrl: クライアントが PUT でバイナリをアップロードする署名付きURL
//   publicUrl: アップロード完了後に公開されるURL
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim();

const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

const BUCKET = 'estimate-videos';

const ALLOWED_MIME = ['video/mp4', 'video/quicktime', 'video/webm'] as const;
type AllowedMime = typeof ALLOWED_MIME[number];

// requestId / roomIndex の許可パターン（数字のみ・合理的な桁数）
const RE_ID    = /^\d{1,10}$/;
const RE_INDEX = /^\d{1,5}$/;

// パスはサーバー側で完全に構築（クライアントから受け取らない）
function buildStoragePath(requestId: string, roomIndex: string): string {
  return `room-videos/${requestId}/${roomIndex}/${Date.now()}.mp4`;
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
    console.error('[upload-room-video] env missing');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { requestId, roomIndex, mimeType } = (req.body ?? {}) as {
    requestId?: string;
    roomIndex?: string;
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

  // mimeType: 許可された動画形式のみ
  if (!mimeType || !ALLOWED_MIME.includes(mimeType as AllowedMime)) {
    return res.status(400).json({
      error: `mimeType が不正です（mp4 / quicktime / webm のみ許可）: ${mimeType ?? '(未指定)'}`,
    });
  }

  // ── パス構築（クライアントからは受け取らない）──────────────────────────────

  const path = buildStoragePath(requestId, roomIndex);

  // ── Supabase Storage 署名付きアップロードURL生成 ────────────────────────────
  // POST /storage/v1/object/upload/sign/{bucket}/{path} で署名URLを取得。
  // クライアントはこの uploadUrl に直接 PUT することで Storage に保存できる。
  // RLS に依存せずサービスロールキーで認可済みURLを発行するため安全。

  try {
    const signApiUrl = `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`;
    const signRes    = await fetch(signApiUrl, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey':        SUPABASE_SERVICE_KEY,
        'Content-Type':  'application/json',
      },
    });

    if (!signRes.ok) {
      const errBody = await signRes.text().catch(() => '');
      console.error('[upload-room-video] signed URL generation error', signRes.status, errBody);
      return res.status(502).json({
        error: '動画のアップロードURLの生成に失敗しました',
        detail: `storage ${signRes.status}: ${errBody}`,
      });
    }

    const signData = await signRes.json() as {
      signedUrl?: string;
      token?:     string;
      url?:       string;
    };

    // Supabase が返す signedUrl / url のどちらかを使用
    const uploadUrl =
      signData.signedUrl ??
      signData.url ??
      `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}?token=${signData.token ?? ''}`;

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    console.info('[upload-room-video] signed URL ok requestId=%s roomIndex=%s path=%s', requestId, roomIndex, path);
    return res.status(200).json({ uploadUrl, publicUrl });

  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[upload-room-video] exception:', detail);
    return res.status(500).json({ error: '動画のアップロードURLの生成に失敗しました', detail });
  }
}
