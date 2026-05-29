// ================================================================
// POST /api/trial-get-contact
//
// 試験運用モード専用の連絡先取得エンドポイント。
// contact_disclosures / unlock_contact RPC を使わず、
// service role で estimate_requests.contact_value を直接返す。
//
// ⚠️ セキュリティ上の注意:
//   - contact_disclosures に記録を残さないため、監査ログが残らない。
//     試験運用限定。
//   - 正式版切替時は TRIAL_FREE_ACCESS = false にすること。
//     このエンドポイントは呼ばれなくなる（削除しなくても安全）。
//
// アクセス条件（必須）:
//   1. craftsman_id が job_applications に存在する
//   2. estimate_request_id が一致する
//   3. job_applications.is_contracted = true（成約済み）
//   上記を満たさなければ 403 を返す。
//
// Body: { craftsman_id: string, estimate_request_id: string }
// Response:
//   200 { status: 'ok', email: string }
//   200 { status: 'no_email' }
//   400 { error: string }
//   403 { error: string }
//   500 { error: string }
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

  const { craftsman_id, estimate_request_id } =
    (req.body ?? {}) as Record<string, unknown>;

  if (!craftsman_id || typeof craftsman_id !== 'string' || !craftsman_id.trim()) {
    return res.status(400).json({ error: 'craftsman_id is required' });
  }
  if (!estimate_request_id || typeof estimate_request_id !== 'string' || !estimate_request_id.trim()) {
    return res.status(400).json({ error: 'estimate_request_id is required' });
  }

  const cid = craftsman_id.trim();
  const eid = estimate_request_id.trim();

  // ── Step 1: 成約確認（job_applications.is_contracted = true）───────────────
  // craftsman_id + estimate_request_id + is_contracted=true の3条件が揃わないと 403。
  // service role でも意図的な条件チェックを行う（RLSバイパスに頼らない設計）。
  const appUrl =
    `${SUPABASE_URL}/rest/v1/job_applications` +
    `?craftsman_id=eq.${encodeURIComponent(cid)}` +
    `&estimate_request_id=eq.${encodeURIComponent(eid)}` +
    `&is_contracted=eq.true` +
    `&select=id&limit=1`;

  const appRes = await fetch(appUrl, { headers: sbHeaders() });
  if (!appRes.ok) {
    const text = await appRes.text().catch(() => '');
    console.error('[trial-get-contact] job_applications check failed:', appRes.status, text);
    return res.status(500).json({ error: 'DB確認に失敗しました' });
  }

  const appRows = await appRes.json() as Array<{ id: string }>;
  if (appRows.length === 0) {
    // 応募なし / 成約前 / 他人の request_id すべて 403
    console.warn('[trial-get-contact] 403: no contracted application', { cid: cid.slice(0, 8), eid });
    return res.status(403).json({ error: '成約済みの応募が確認できません' });
  }

  // ── Step 2: 連絡先取得 ────────────────────────────────────────────────────
  const erUrl =
    `${SUPABASE_URL}/rest/v1/estimate_requests` +
    `?id=eq.${encodeURIComponent(eid)}` +
    `&select=contact_value&limit=1`;

  const erRes = await fetch(erUrl, { headers: sbHeaders() });
  if (!erRes.ok) {
    const text = await erRes.text().catch(() => '');
    console.error('[trial-get-contact] estimate_requests fetch failed:', erRes.status, text);
    return res.status(502).json({ error: 'DB取得に失敗しました' });
  }

  const erRows = await erRes.json() as Array<{ contact_value: string | null }>;
  if (!erRows.length || !erRows[0].contact_value) {
    return res.status(200).json({ status: 'no_email' });
  }

  // contact_value は "mailto:xxx@xxx.com" 形式の場合があるので正規化
  const email = erRows[0].contact_value.replace(/^mailto:/i, '').trim();
  if (!email) return res.status(200).json({ status: 'no_email' });

  return res.status(200).json({ status: 'ok', email });
}
