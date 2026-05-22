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

import { Resend } from 'resend';

const SUPABASE_URL      = process.env.SUPABASE_URL
                       || process.env.VITE_SUPABASE_URL
                       || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
                       || process.env.VITE_SUPABASE_ANON_KEY
                       || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SITE_URL       = 'https://promatch-app.jp';

// ── 依頼者への連絡先開示通知メール ─────────────────────────────────────────────
async function sendUnlockNotification(params: {
  customerEmail: string;
  workType:      string;
  area:          string;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[check-billing] RESEND_API_KEY 未設定 — 通知メールをスキップ');
    return;
  }
  const resend = new Resend(RESEND_API_KEY);
  const { customerEmail, workType, area } = params;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0 40px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td style="background:#1e40af;border-radius:16px 16px 0 0;padding:28px 32px 24px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#93c5fd;text-transform:uppercase;">PRO MATCH</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">職人から連絡があります</p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:28px 32px 24px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;">
          ご依頼の <strong style="color:#1e40af;">${workType}</strong>（${area}）に対して、<br>
          職人が案件対応を開始しました。
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;padding:14px 18px;border:1px solid #bbf7d0;">
          <tr><td>
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#166534;">次にやること</p>
            <p style="margin:3px 0;font-size:13px;color:#166534;">・職人から直接メールが届く予定です</p>
            <p style="margin:3px 0;font-size:13px;color:#166534;">・返信でそのままやり取りできます</p>
            <p style="margin:3px 0;font-size:13px;color:#166534;">・日程や詳細を職人と直接調整してください</p>
            <p style="margin:10px 0 0;font-size:12px;color:#15803d;">不安なことがあればPRO MATCHサポートへご連絡ください。</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;font-weight:700;color:#64748b;">PRO MATCH — 内装職人マッチング</p>
        <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">このメールはシステムから自動送信されています。</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    '【PRO MATCH】職人から連絡があります',
    '',
    `ご依頼の ${workType}（${area}）に対して、職人が案件対応を開始しました。`,
    '',
    '・職人から直接メールが届く予定です',
    '・返信でそのままやり取りできます',
    '・日程や詳細を職人と直接調整してください',
    '',
    '不安なことがあればPRO MATCHサポートへご連絡ください。',
    '',
    'このメールはシステムから自動送信されています。',
  ].join('\n');

  try {
    const { error } = await resend.emails.send({
      from:    'PRO MATCH <noreply@promatch-app.jp>',
      to:      [customerEmail],
      subject: '【PRO MATCH】職人から連絡があります',
      html,
      text,
    });
    if (error) {
      console.error('[check-billing] 依頼者通知メール Resend error:', error);
    } else {
      console.log('[check-billing] 依頼者通知メール 送信成功:', customerEmail);
    }
  } catch (err) {
    console.error('[check-billing] 依頼者通知メール 例外:', err);
  }
}

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

          // ── Stripe 決済済み確認（contact_unlocks）────────────────────────────
          // Webhook 経由で contact_unlocks に paid レコードがある場合は
          // クレジット消費なしで連絡先を返す（無料枠ゼロでも開示可能）
          const _svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (_svcKey) {
            try {
              const paidLockRes = await fetch(
                `${SUPABASE_URL}/rest/v1/contact_unlocks` +
                `?craftsman_id=eq.${encodeURIComponent(craftsman_id)}` +
                `&estimate_request_id=eq.${encodeURIComponent(estimateRequestId)}` +
                `&unlock_type=eq.paid&select=id&limit=1`,
                {
                  headers: {
                    'apikey':        _svcKey,
                    'Authorization': `Bearer ${_svcKey}`,
                    'Accept':        'application/json',
                  },
                },
              );
              if (paidLockRes.ok) {
                const paidRows = await paidLockRes.json() as unknown[];
                if (paidRows.length > 0) {
                  // 決済済み → estimate_requests からメールを取得
                  const erPaidRes = await fetch(
                    `${SUPABASE_URL}/rest/v1/estimate_requests` +
                    `?id=eq.${encodeURIComponent(estimateRequestId)}` +
                    `&select=contact_method,contact_value&limit=1`,
                    {
                      headers: {
                        'apikey':        _svcKey,
                        'Authorization': `Bearer ${_svcKey}`,
                        'Accept':        'application/json',
                      },
                    },
                  );
                  if (erPaidRes.ok) {
                    const erPaidRows = await erPaidRes.json() as Array<{
                      contact_method: string | null;
                      contact_value:  string | null;
                    }>;
                    const erPaid = erPaidRows[0];
                    if (erPaid?.contact_method === 'メール' && erPaid.contact_value) {
                      console.log('[check-billing] stripe paid contact found', {
                        craftsman_id,
                        estimateRequestId,
                      });
                      res.status(200).json({
                        status:         'already_unlocked',
                        contact_method: erPaid.contact_method,
                        contact_value:  erPaid.contact_value.replace(/^mailto:/i, '').trim(),
                        free_reason:    null,
                      });
                      return;
                    }
                  }
                }
              }
            } catch (paidCheckErr) {
              // 失敗しても通常の RPC フローへフォールスルー
              console.warn('[check-billing] paid contact check skipped:', paidCheckErr);
            }
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

        // 新規 unlock 時のみ依頼者へ通知メールを送る（already_unlocked は二重送信防止でスキップ）
        if (row.result === 'ok') {
          // estimate_request の work_type / area を取得して通知メール送信（fire-and-forget）
          void (async () => {
            try {
              const sbHeaders = {
                'apikey':        SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Accept':        'application/json',
              };
              const appRes = await fetch(
                `${SUPABASE_URL}/rest/v1/job_applications?select=estimate_request_id&id=eq.${application_id}&limit=1`,
                { headers: sbHeaders },
              );
              if (appRes.ok) {
                const appRows = await appRes.json() as Array<{ estimate_request_id: string | null }>;
                const erIdStr = appRows?.[0]?.estimate_request_id;
                if (erIdStr) {
                  const erRes = await fetch(
                    `${SUPABASE_URL}/rest/v1/estimate_requests?select=work_type,area&id=eq.${erIdStr}&limit=1`,
                    { headers: sbHeaders },
                  );
                  if (erRes.ok) {
                    const erRows = await erRes.json() as Array<{ work_type?: string; area?: string }>;
                    await sendUnlockNotification({
                      customerEmail: row.contact_value!.replace(/^mailto:/i, '').trim(),
                      workType:      erRows?.[0]?.work_type ?? '内装工事',
                      area:          erRows?.[0]?.area     ?? '—',
                    });
                  }
                }
              }
            } catch (notifyErr) {
              console.error('[check-billing] 通知メール fire-and-forget 例外:', notifyErr);
            }
          })();
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
