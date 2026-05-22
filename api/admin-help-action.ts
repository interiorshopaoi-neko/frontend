// ================================================================
// POST /api/admin-help-action
//
// 管理者専用 — help_requests のステータスを安全に更新する。
// Service Role Key で直接 Supabase へ PATCH する。
//
// セキュリティ:
//   - action は whitelist 検証（改ざん不可）
//   - id は UUID 形式チェック（SQLインジェクション防止）
//   - 自動職人通知・メール送信は一切しない
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim();

const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

// 許可するステータス値のみ
const ALLOWED_STATUSES = ['recruiting', 'closed', 'completed', 'hidden'] as const;
type AllowedStatus = typeof ALLOWED_STATUSES[number];

// UUID v4 形式チェック（簡易）
function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function sbHeaders() {
  return {
    'apikey':        SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'Prefer':        'return=representation',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const { id, action } = req.body as { id?: string; action?: string };

  // 入力検証
  if (!id || typeof id !== 'string' || !isUUID(id)) {
    return res.status(400).json({ error: 'Invalid or missing id' });
  }
  if (!action || !ALLOWED_STATUSES.includes(action as AllowedStatus)) {
    return res.status(400).json({ error: `Invalid action. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
  }

  const url = `${SUPABASE_URL}/rest/v1/help_requests?id=eq.${encodeURIComponent(id)}&select=id,status`;

  const patchRes = await fetch(url, {
    method:  'PATCH',
    headers: sbHeaders(),
    body:    JSON.stringify({ status: action }),
  });

  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => '');
    return res.status(502).json({ error: 'Supabase update failed', detail: text });
  }

  const data = await patchRes.json().catch(() => []);
  return res.status(200).json({ ok: true, updated: data });
}
