// ================================================================
// GET /api/request-detail?id=xxx
//
// estimate_requests の1行を service role key で取得して返す。
// contact_value / contact_method は絶対に返さない。
// RLS をバイパスするため anon クライアントの代わりに使う。
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim();

const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

function sbHeaders() {
  return {
    'apikey':        SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Accept':        'application/json',
  };
}

async function sbFetch(url: string): Promise<unknown[]> {
  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) {
    const body = await r.text().catch(() => '(body read error)');
    throw new Error(`supabase ${r.status}: ${body}`);
  }
  return r.json() as Promise<unknown[]>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[request-detail] env missing');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id) || !id.trim()) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  const trimmedId = id.trim();

  try {
    // select: 絶対に contact_value / contact_method を含めない
    // has_video / has_photos は本番DBに存在しない列のため除外
    // has_video は video_url の non-null で代用（フロント側で処理）
    const url =
      `${SUPABASE_URL}/rest/v1/estimate_requests` +
      `?id=eq.${encodeURIComponent(trimmedId)}` +
      `&select=id,area,work_type,video_url,customer_note,created_at,meta` +
      `&limit=1`;

    console.info('[request-detail] fetching id=', trimmedId);
    const rows = await sbFetch(url) as Array<Record<string, unknown>>;

    if (rows.length === 0) {
      console.info('[request-detail] not found id=', trimmedId);
      return res.status(404).json({ error: 'Not found' });
    }

    const row = rows[0];

    // 念のため sensitive fields を削除（select に含めていないが二重保護）
    delete row.contact_value;
    delete row.contact_method;

    console.info('[request-detail] ok id=', trimmedId);
    return res.status(200).json(row);

  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[request-detail] error:', detail);
    return res.status(500).json({ error: '依頼情報の取得に失敗しました', detail });
  }
}
