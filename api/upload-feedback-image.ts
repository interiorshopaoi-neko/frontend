// ================================================================
// POST /api/upload-feedback-image
//
// フィードバックフォームのスクリーンショット添付用。
// service role key で Supabase Storage に保存し、公開URLを返す。
//
// セキュリティ:
//   - パスはサーバー側で構築（クライアントから受け取らない）
//   - jpg/png/webp のみ許可
//   - 5MB 以下のみ許可
//   - 動画 / PDF / EXE 等は拒否
//
// Body (application/json):
//   { base64: string, mimeType: "image/webp" | "image/jpeg" | "image/png" }
//
// Response:
//   { ok: true, publicUrl: string }
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://lboskhjidbqxwrenwjdr.supabase.co'
).trim();
const SUPABASE_SVC_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

const BUCKET    = 'estimate-videos'; // 既存bucketを流用（feedback-images/ prefix で分離）
const MAX_BYTES = 5 * 1024 * 1024;  // 5MB

const ALLOWED_MIME = ['image/webp', 'image/jpeg', 'image/jpg', 'image/png'] as const;
type AllowedMime = typeof ALLOWED_MIME[number];

const MIME_TO_EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
};

function randomHex(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SVC_KEY) {
    console.error('[upload-feedback-image] missing env');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const { base64, mimeType } = (req.body ?? {}) as Record<string, unknown>;

  // ── バリデーション ──────────────────────────────────────────────
  if (!base64 || typeof base64 !== 'string') {
    return res.status(400).json({ error: 'base64 is required' });
  }
  if (!mimeType || !ALLOWED_MIME.includes(mimeType as AllowedMime)) {
    return res.status(400).json({ error: 'mimeType must be image/webp, image/jpeg, or image/png' });
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 data' });
  }

  if (buf.length > MAX_BYTES) {
    return res.status(400).json({ error: '画像は5MB以下にしてください' });
  }
  if (buf.length === 0) {
    return res.status(400).json({ error: '画像データが空です' });
  }

  // ── パス構築（サーバー側のみ・クライアントから受け取らない）──────
  const ext  = MIME_TO_EXT[mimeType as string] ?? 'jpg';
  const path = `feedback-images/${Date.now()}-${randomHex(8)}.${ext}`;

  // ── Storage アップロード ────────────────────────────────────────
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const uploadRes = await fetch(uploadUrl, {
    method:  'POST',
    headers: {
      'apikey':         SUPABASE_SVC_KEY,
      'Authorization':  `Bearer ${SUPABASE_SVC_KEY}`,
      'Content-Type':   mimeType as string,
      'Cache-Control':  'max-age=3600',
      'x-upsert':       'true',
    },
    body: buf,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '');
    console.error('[upload-feedback-image] Storage upload failed:', uploadRes.status, errText);
    return res.status(502).json({ error: 'アップロードに失敗しました。スクショなしで送信してください。' });
  }

  // ── 公開URL生成 ─────────────────────────────────────────────────
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  return res.status(200).json({ ok: true, publicUrl });
}
