// ================================================================
// POST /api/get-contact-email
//
// contact_unlocks で開示確認済みの案件のメールアドレスを返す。
// 未開示の場合は status:'not_unlocked' を返す（エラーではない）。
// メール以外の連絡方法の場合は status:'no_email' を返す。
//
// Body:
//   { craftsman_id: string, estimate_request_id: string (uuid) }
//
// Response (200):
//   { status: 'ok',          email: string }   — 開示済みメールアドレス
//   { status: 'not_unlocked' }                 — contact_unlocks に行なし
//   { status: 'no_email' }                     — contact_method が メール 以外
//
// Response (400):
//   { error: string }   — 入力エラー
//
// Response (500):
//   { error: string }   — サーバーエラー
//
// セキュリティ:
//   - SUPABASE_SERVICE_ROLE_KEY で contact_unlocks を確認してから返す
//   - メール以外（電話・LINE）は返さない
//   - contact_value の mailto: プレフィックスを除去して返す
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL        = process.env.SUPABASE_URL
                         || process.env.VITE_SUPABASE_URL
                         || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseHeaders() {
  return {
    'apikey':        SUPABASE_SERVICE_KEY!,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Accept':        'application/json',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[get-contact-email] Missing env vars', {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_SERVICE_KEY,
    });
    return res.status(500).json({ error: 'サーバー設定エラーです' });
  }

  const { craftsman_id, estimate_request_id } = req.body ?? {};

  if (!craftsman_id || typeof craftsman_id !== 'string' || craftsman_id.trim() === '') {
    return res.status(400).json({ error: 'craftsman_id は必須です' });
  }
  if (!estimate_request_id || typeof estimate_request_id !== 'string' || estimate_request_id.trim() === '') {
    return res.status(400).json({ error: 'estimate_request_id は必須です' });
  }

  const craftsmanId       = craftsman_id.trim();
  const estimateRequestId = estimate_request_id.trim();

  try {
    // ── Step 1: contact_unlocks で開示確認 ──────────────────────────────────
    const unlockRes = await fetch(
      `${SUPABASE_URL}/rest/v1/contact_unlocks` +
      `?craftsman_id=eq.${encodeURIComponent(craftsmanId)}` +
      `&estimate_request_id=eq.${encodeURIComponent(estimateRequestId)}` +
      `&select=id&limit=1`,
      { headers: supabaseHeaders() },
    );
    if (!unlockRes.ok) {
      throw new Error(`contact_unlocks check failed: ${unlockRes.status}`);
    }
    const unlockRows: unknown[] = await unlockRes.json();
    if (unlockRows.length === 0) {
      return res.status(200).json({ status: 'not_unlocked' });
    }

    // ── Step 2: estimate_requests からメールを取得 ───────────────────────────
    const erRes = await fetch(
      `${SUPABASE_URL}/rest/v1/estimate_requests` +
      `?id=eq.${encodeURIComponent(estimateRequestId)}` +
      `&select=contact_method,contact_value&limit=1`,
      { headers: supabaseHeaders() },
    );
    if (!erRes.ok) {
      throw new Error(`estimate_requests fetch failed: ${erRes.status}`);
    }
    const erRows = await erRes.json() as Array<{
      contact_method: string | null;
      contact_value:  string | null;
    }>;

    const row = erRows[0];
    if (!row || row.contact_method !== 'メール' || !row.contact_value) {
      return res.status(200).json({ status: 'no_email' });
    }

    // mailto: プレフィックス除去
    const email = row.contact_value.replace(/^mailto:/i, '').trim();
    if (!email) {
      return res.status(200).json({ status: 'no_email' });
    }

    return res.status(200).json({ status: 'ok', email });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[get-contact-email] error:', message);
    return res.status(500).json({ error: '連絡先の取得に失敗しました' });
  }
}
