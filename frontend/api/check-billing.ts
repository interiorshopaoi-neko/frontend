// ================================================================
// POST /api/check-billing
//
// 成約済み application に対して無料クレジットを消費して連絡先を返す。
// Stripe なし MVP: 無料枠があれば即開示、なければ payment_required。
//
// Body:
//   { application_id: string (uuid), craftsman_id: string }
//
// Response (200):
//   { status: 'ok',               contact_method, contact_value, free_reason }
//   { status: 'already_unlocked', contact_method, contact_value }
//   { status: 'payment_required' }
//   { status: 'not_contracted' }
//   { status: 'error', message: string }
//
// 安全性:
//   - claim_free_credit_and_get_contact() は SECURITY DEFINER
//   - craftsman_id の一致チェックを RPC 内部で実施
//   - UNIQUE(application_id) で二重課金防止
//   - FOR UPDATE で同時アクセス防止
// ================================================================

const SUPABASE_URL      = process.env.SUPABASE_URL
                       || process.env.VITE_SUPABASE_URL
                       || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
                       || process.env.VITE_SUPABASE_ANON_KEY
                       || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[check-billing] 環境変数 SUPABASE_URL / SUPABASE_ANON_KEY が未設定');
    res.status(500).json({ status: 'error', message: 'server_config_error' });
    return;
  }

  const { application_id, craftsman_id } = req.body ?? {};

  // ── バリデーション ────────────────────────────────────────────────────────────
  if (!application_id || typeof application_id !== 'string') {
    res.status(400).json({ status: 'error', message: 'application_id is required' });
    return;
  }
  if (!craftsman_id || typeof craftsman_id !== 'string') {
    res.status(400).json({ status: 'error', message: 'craftsman_id is required' });
    return;
  }

  // UUID 形式チェック（簡易）
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(application_id)) {
    res.status(400).json({ status: 'error', message: 'invalid application_id format' });
    return;
  }

  // demo 案件はスキップ（実課金しない）
  if (application_id.startsWith('demo-') || craftsman_id.startsWith('demo-')) {
    res.status(200).json({
      status:         'ok',
      contact_method: 'メール',
      contact_value:  'demo@example.com',
      free_reason:    'initial_credits',
    });
    return;
  }

  // ── メール以外の連絡先はクレジット消費前にブロック ──────────────────────────────
  // application → estimate_request の contact_method を確認してからRPCを呼ぶ
  try {
    const preCheckRes = await fetch(
      `${SUPABASE_URL}/rest/v1/job_applications?select=estimate_request_id&id=eq.${application_id}&limit=1`,
      {
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept':        'application/json',
        },
      },
    );
    if (preCheckRes.ok) {
      const appRows = await preCheckRes.json() as Array<{ estimate_request_id: string | null }>;
      const estimateRequestId = appRows?.[0]?.estimate_request_id;
      if (estimateRequestId) {
        const erRes = await fetch(
          `${SUPABASE_URL}/rest/v1/estimate_requests?select=contact_method&id=eq.${estimateRequestId}&limit=1`,
          {
            headers: {
              'apikey':        SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Accept':        'application/json',
            },
          },
        );
        if (erRes.ok) {
          const erRows = await erRes.json() as Array<{ contact_method: string | null }>;
          const contactMethod = erRows?.[0]?.contact_method;
          if (contactMethod && contactMethod !== 'メール') {
            // メール以外はクレジットを消費せずに non_email を返す
            console.log('[check-billing] non-email contact_method detected before RPC:', contactMethod);
            res.status(200).json({
              status:         'already_unlocked',
              contact_method: contactMethod,
              contact_value:  null,
              non_email:      true,
            });
            return;
          }
        }
      }
    }
  } catch (preCheckErr) {
    // pre-check 失敗時はRPCに委ねる（保守的フォールスルー）
    console.warn('[check-billing] pre-check failed, proceeding to RPC:', preCheckErr);
  }

  // ── SECURITY DEFINER RPC 呼び出し ────────────────────────────────────────────
  try {
    const rpcRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/claim_free_credit_and_get_contact`,
      {
        method:  'POST',
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type':  'application/json',
          'Accept':        'application/json',
        },
        body: JSON.stringify({
          p_application_id: application_id,
          p_craftsman_id:   craftsman_id,
        }),
      },
    );

    if (!rpcRes.ok) {
      const errText = await rpcRes.text();
      console.error('[check-billing] RPC error:', rpcRes.status, errText);
      res.status(500).json({ status: 'error', message: 'rpc_error' });
      return;
    }

    const rows = await rpcRes.json() as Array<{
      result:         string;
      contact_method: string | null;
      contact_value:  string | null;
      free_reason:    string | null;
    }>;

    const row = rows?.[0];
    if (!row) {
      console.error('[check-billing] RPC returned empty rows');
      res.status(500).json({ status: 'error', message: 'empty_rpc_result' });
      return;
    }

    switch (row.result) {
      case 'ok':
      case 'already_unlocked': {
        // メール以外は開示しない（phone/LINE は現在非対応）
        if (row.contact_method !== 'メール' || !row.contact_value) {
          // 連絡先はあるが非メール形式 → 担当者対応フラグを返す
          res.status(200).json({
            status:         row.result,
            contact_method: row.contact_method ?? null,
            contact_value:  null,          // 電話・LINE は秘匿
            non_email:      true,          // フロントにメール非対応を伝える
            free_reason:    row.free_reason ?? null,
          });
          return;
        }
        res.status(200).json({
          status:         row.result,
          contact_method: row.contact_method,
          contact_value:  row.contact_value,
          free_reason:    row.free_reason ?? null,
        });
        return;
      }

      case 'no_credits':
        res.status(200).json({ status: 'payment_required' });
        return;

      case 'not_contracted':
        res.status(200).json({ status: 'not_contracted' });
        return;

      case 'error':
      default:
        console.error('[check-billing] RPC returned error result:', row);
        res.status(500).json({ status: 'error', message: 'rpc_returned_error' });
        return;
    }
  } catch (err) {
    console.error('[check-billing] unexpected error:', err);
    res.status(500).json({ status: 'error', message: 'internal_error' });
  }
}
