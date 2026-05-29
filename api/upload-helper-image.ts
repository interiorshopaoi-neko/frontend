// ================================================================
// POST /api/upload-helper-image
//
// 助っ人募集の現場写真を service role でアップロードする。
// クライアント側 Supabase Auth セッションの状態に依存しないため安定。
//
// 既存の upload-room-image.ts / upload-feedback-image.ts と同じパターン。
//
// Body (application/json):
//   { base64: string, mimeType: string, index: number }
//   - base64  : 圧縮済み画像の base64 文字列
//   - mimeType: "image/webp" | "image/jpeg" | "image/png"
//   - index   : 0〜2 の整数（同一投稿内での重複パス防止用）
//
// Response:
//   200 { ok: true,  publicUrl: string }
//   400 { ok: false, error: string }
//   500 { ok: false, error: string }
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://lboskhjidbqxwrenwjdr.supabase.co'
).trim();
const SUPABASE_SVC_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

const BUCKET    = 'estimate-videos';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME = ['image/webp', 'image/jpeg', 'image/jpg', 'image/png'] as const;
type AllowedMime = typeof ALLOWED_MIME[number];

const MIME_EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ ok: false, error: 'Method not allowed' });

  if (!SUPABASE_URL || !SUPABASE_SVC_KEY) {
    console.error('[upload-helper-image] missing env');
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }

  const { base64, mimeType, index } =
    (req.body ?? {}) as { base64?: unknown; mimeType?: unknown; index?: unknown };

  // ── バリデーション ──────────────────────────────────────────────
  if (!base64 || typeof base64 !== 'string') {
    return res.status(400).json({ ok: false, error: 'base64 is required' });
  }
  if (!mimeType || !ALLOWED_MIME.includes(mimeType as AllowedMime)) {
    return res.status(400).json({ ok: false, error: 'mimeType must be image/webp, image/jpeg, or image/png' });
  }
  const idx = typeof index === 'number' ? index : parseInt(String(index ?? '0'), 10);
  if (isNaN(idx) || idx < 0 || idx > 9) {
    return res.status(400).json({ ok: false, error: 'index must be 0–9' });
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid base64 data' });
  }
  if (buf.length === 0) {
    return res.status(400).json({ ok: false, error: '画像データが空です' });
  }
  if (buf.length > MAX_BYTES) {
    return res.status(400).json({ ok: false, error: '画像は5MB以下にしてください' });
  }

  // ── パス生成（サーバー側のみ・クライアントから受け取らない）────
  const ts   = Date.now();
  const ext  = MIME_EXT[mimeType as string] ?? 'webp';
  const path = `helper-images/${ts}/${idx}.${ext}`;

  // ── Storage アップロード（service role）──────────────────────────
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const uploadRes = await fetch(uploadUrl, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
      'apikey':        SUPABASE_SVC_KEY,
      'Content-Type':  mimeType as string,
      'x-upsert':      'false',
    },
    body: buf,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '');
    console.error('[upload-helper-image] Storage upload failed:', {
      status: uploadRes.status,
      path,
      error:  errText,
    });
    return res.status(502).json({ ok: false, error: '写真のアップロードに失敗しました。通信状態を確認して、もう一度お試しください。' });
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  return res.status(200).json({ ok: true, publicUrl });
}
