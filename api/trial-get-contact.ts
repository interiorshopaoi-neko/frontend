// ================================================================
// POST /api/trial-get-contact
//
// 試験運用モード専用の連絡先取得エンドポイント。
// contact_disclosures / unlock_contact RPC を使わず、
// service role で estimate_requests.contact_value を直接返す。
//
// ⚠️ セキュリティ上の注意:
//   - contact_disclosures に記録を残さないため、誰がいつ閲覧したかの
//     監査ログが残らない。試験運用限定。
//   - 正式版切替時は TRIAL_FREE_ACCESS = false にすること。
//     このエンドポイントは呼ばれなくなる（削除しなくても安全）。
//   - craftsman_id の認証は行っていない（anon 呼び出し可）。
//     試験運用のみで利用すること。
//
// Body: { craftsman_id: string, estimate_request_id: string }
// Response: { status: 'ok', email: string } | { status: 'no_email' }
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://lboskhjidbqxwrenwjdr.supabase.co'
).trim();
const SUPABASE_SVC_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

function sbHeaders() {
  return {
    'apikey':        SUPABASE_SVC_KEY,
    'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SUPABASE_URL || !SUPABASE_SVC_KEY) {
    console.error('[trial-get-contact] missing env');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const { estimate_request_id } = (req.body ?? {}) as Record<string, unknown>;

  if (!estimate_request_id || typeof estimate_request_id !== 'string') {
    return res.status(400).json({ error: 'estimate_request_id is required' });
  }

  // service role で contact_value を直接取得
  const url = `${SUPABASE_URL}/rest/v1/estimate_requests`
    + `?id=eq.${encodeURIComponent(estimate_request_id)}`
    + `&select=contact_value`;

  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    console.error('[trial-get-contact] Supabase error:', r.status, text);
    return res.status(502).json({ error: 'DB取得に失敗しました' });
  }

  const rows = await r.json() as Array<{ contact_value: string | null }>;
  if (!rows.length || !rows[0].contact_value) {
    return res.status(200).json({ status: 'no_email' });
  }

  // contact_value は "mailto:xxx@xxx.com" 形式の場合があるので正規化
  const raw   = rows[0].contact_value;
  const email = raw.replace(/^mailto:/i, '').trim();

  if (!email) return res.status(200).json({ status: 'no_email' });

  return res.status(200).json({ status: 'ok', email });
}
