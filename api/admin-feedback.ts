// ================================================================
// GET  /api/admin-feedback         → feedback_reports 一覧取得
// PATCH /api/admin-feedback        → status / admin_note 更新
//
// 管理画面専用。service role key で Supabase に直接アクセス。
// RLS は service role でバイパスされるため、一般ユーザーは SELECT 不可。
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL     = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://lboskhjidbqxwrenwjdr.supabase.co'
).trim();
const SUPABASE_SVC_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

const ALLOWED_STATUSES = ['new', 'reviewing', 'done'] as const;
type AllowedStatus = typeof ALLOWED_STATUSES[number];

function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function sbHeaders(extra?: Record<string, string>) {
  return {
    'apikey':        SUPABASE_SVC_KEY,
    'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    ...extra,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!SUPABASE_URL || !SUPABASE_SVC_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  // ── GET: 一覧取得 ────────────────────────────────────────────
  if (req.method === 'GET') {
    const statusFilter = req.query.status as string | undefined;
    let url = `${SUPABASE_URL}/rest/v1/feedback_reports?order=created_at.desc&limit=200`;
    if (statusFilter && ALLOWED_STATUSES.includes(statusFilter as AllowedStatus)) {
      url += `&status=eq.${encodeURIComponent(statusFilter)}`;
    }

    const r = await fetch(url, { headers: sbHeaders() });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({ error: 'Supabase fetch failed', detail: text });
    }
    const data = await r.json();
    return res.status(200).json(data);
  }

  // ── PATCH: ステータス / 管理メモ更新 ─────────────────────────
  if (req.method === 'PATCH') {
    const { id, status, adminNote } = (req.body ?? {}) as {
      id?: string;
      status?: string;
      adminNote?: string;
    };

    if (!id || !isUUID(id)) {
      return res.status(400).json({ error: 'Invalid or missing id' });
    }

    const patch: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status as AllowedStatus)) {
        return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
      }
      patch.status = status;
    }
    if (adminNote !== undefined) {
      patch.admin_note = typeof adminNote === 'string' ? adminNote : null;
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'status または adminNote が必要です' });
    }

    const url = `${SUPABASE_URL}/rest/v1/feedback_reports?id=eq.${encodeURIComponent(id)}`;
    const r   = await fetch(url, {
      method:  'PATCH',
      headers: sbHeaders({ 'Prefer': 'return=representation' }),
      body:    JSON.stringify(patch),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({ error: 'Supabase update failed', detail: text });
    }
    const data = await r.json();
    return res.status(200).json({ ok: true, updated: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
