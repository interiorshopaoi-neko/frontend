// ================================================================
// POST /api/get-contact-email
//
// contact_unlocks で開示確認済みの案件のメールアドレスを返す。
// 未開示の場合は status:'not_unlocked' を返す（エラーではない）。
// メール以外の連絡方法の場合は status:'no_email' を返す。
//
// Body:
//   { craftsman_id: string, estimate_request_id: string }
//   ※ estimate_request_id は bigint を text で渡す（例: "42"）
//
// Response (200):
//   { status: 'ok',          email: string }
//   { status: 'not_unlocked' }
//   { status: 'no_email' }
//
// Response (400): { error: string }
// Response (500): { error: string, detail?: string }
//
// セキュリティ:
//   - SUPABASE_SERVICE_ROLE_KEY で RLS バイパス
//   - メール以外（電話・LINE）は返さない
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// 末尾スラッシュを除去して /rest/v1 のダブルスラッシュを防ぐ
const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).replace(/\/$/, '');

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function sbHeaders() {
  return {
    'apikey':        SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Accept':        'application/json',
  };
}

// fetch して ok でなければレスポンスボディごと throw する
async function sbFetch(url: string): Promise<unknown[]> {
  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) {
    const body = await r.text().catch(() => '(body read error)');
    throw new Error(`supabase ${r.status}: ${body}`);
  }
  return r.json() as Promise<unknown[]>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ── 環境変数チェック ───────────────────────────────────────────────────────
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[get-contact-email] env missing', {
      SUPABASE_URL:         SUPABASE_URL  ? '✓' : '✗ MISSING',
      SUPABASE_SERVICE_KEY: SUPABASE_SERVICE_KEY ? '✓' : '✗ MISSING',
      // 候補キー名を全列挙してどれが存在するか確認
      env_keys_present: Object.keys(process.env).filter(k =>
        k.includes('SUPABASE') || k.includes('SERVICE')
      ),
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

  console.info('[get-contact-email] start', {
    craftsmanId,
    estimateRequestId,
    supabaseUrlPrefix: SUPABASE_URL.slice(0, 30),
    serviceKeyPrefix:  SUPABASE_SERVICE_KEY.slice(0, 10),
  });

  try {
    // ── Step 1: contact_unlocks で開示確認 ──────────────────────────────────
    // RLS enabled / ポリシーなし → service_role key が必須
    const unlockUrl =
      `${SUPABASE_URL}/rest/v1/contact_unlocks` +
      `?craftsman_id=eq.${encodeURIComponent(craftsmanId)}` +
      `&estimate_request_id=eq.${encodeURIComponent(estimateRequestId)}` +
      `&select=id&limit=1`;

    console.info('[get-contact-email] step1 url', unlockUrl);
    const unlockRows = await sbFetch(unlockUrl);
    console.info('[get-contact-email] step1 rows', unlockRows.length);

    if (unlockRows.length === 0) {
      return res.status(200).json({ status: 'not_unlocked' });
    }

    // ── Step 2: estimate_requests からメールを取得 ───────────────────────────
    // estimate_requests.id は BIGINT。PostgREST は "42" を bigint にキャストする。
    const erUrl =
      `${SUPABASE_URL}/rest/v1/estimate_requests` +
      `?id=eq.${encodeURIComponent(estimateRequestId)}` +
      `&select=contact_method,contact_value&limit=1`;

    console.info('[get-contact-email] step2 url', erUrl);
    const erRows = await sbFetch(erUrl) as Array<{
      contact_method: string | null;
      contact_value:  string | null;
    }>;
    console.info('[get-contact-email] step2 rows', erRows.length, erRows[0]?.contact_method);

    const row = erRows[0];
    if (!row || row.contact_method !== 'メール' || !row.contact_value) {
      return res.status(200).json({ status: 'no_email' });
    }

    const email = row.contact_value.replace(/^mailto:/i, '').trim();
    if (!email) {
      return res.status(200).json({ status: 'no_email' });
    }

    console.info('[get-contact-email] ok, returning email (masked)', email.slice(0, 3) + '***');
    return res.status(200).json({ status: 'ok', email });

  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[get-contact-email] error:', detail);
    return res.status(500).json({ error: '連絡先の取得に失敗しました', detail });
  }
}
