import { Resend } from 'resend';

// Phase47: 助っ人応募通知
// 応募者が応募した際に募集主へ通知するAPI
// Phase51: ログ強化・ownerOk/adminOk レスポンス追加

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_FROM   = 'Aoi Interior <onboarding@resend.dev>';
const ADMIN_TO     = 'interior.shop.aoi@gmail.com';
const SITE_URL     = 'https://promatch-app.jp';

const SUPABASE_URL      = process.env.SUPABASE_URL
                       || process.env.VITE_SUPABASE_URL
                       || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
                       || process.env.VITE_SUPABASE_ANON_KEY
                       || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 管理者通知設定を取得（失敗時はデフォルト true）
async function getAdminNotificationEnabled(key: string): Promise<boolean> {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_notification_settings?select=${key}&id=eq.1&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY!, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!r.ok) return true;
    const rows = await r.json() as Array<Record<string, boolean>>;
    return rows?.[0]?.[key] !== false;
  } catch {
    return true;
  }
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const {
    request_id,
    craftsman_id,
    work_type,
    area,
    work_date,
    message,
    requester_craftsman_id,
  } = req.body ?? {};

  // ── ログ: 受信パラメータ ──────────────────────────────────
  console.log('[notify-helper-application] received:', {
    request_id:             request_id ?? null,
    applicant_craftsman_id: craftsman_id ?? null,
    owner_craftsman_id:     requester_craftsman_id ?? null,
  });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: 'missing env' });
    return;
  }

  const safeWorkType = String(work_type ?? '—');
  const safeArea     = String(area ?? '—');
  const safeWorkDate = String(work_date ?? '—');
  const safeMessage  = String(message ?? '（コメントなし）');
  const listUrl      = `${SITE_URL}/craftsman/help-list`;

  let adminOk     = false;
  let ownerOk     = false;
  let ownerReason = 'not_attempted';
  let ownerEmail  = '';

  // ── 管理者通知（設定がONの場合のみ）─────────────────────────
  const adminEnabled = await getAdminNotificationEnabled('notify_helper_application');
  if (adminEnabled) {
    const adminBody = [
      '助っ人募集に新しい応募がありました。',
      '',
      `工事内容　：${safeWorkType}`,
      `エリア　　：${safeArea}`,
      `作業日　　：${safeWorkDate}`,
      `応募者ID　：${craftsman_id ?? '—'}`,
      `募集主ID　：${requester_craftsman_id ?? '—'}`,
      `メッセージ：${safeMessage}`,
      `request_id：${request_id ?? '—'}`,
      '',
      '▼ 助っ人一覧',
      listUrl,
    ].join('\n');

    try {
      const result = await resend.emails.send({
        from:    ADMIN_FROM,
        to:      [ADMIN_TO],
        subject: '【PRO MATCH】助っ人募集に応募がありました',
        text:    adminBody,
      });
      adminOk = true;
      console.log('[notify-helper-application] 管理者通知 OK:', result);
    } catch (err) {
      console.error('[notify-helper-application] 管理者通知失敗:', err);
    }
  } else {
    adminOk = true; // OFFは成功扱い（意図的スキップ）
    console.log('[notify-helper-application] 管理者通知 OFF (設定)');
  }

  // ── 募集主への通知（管理者設定に関係なく必ず試みる）──────────
  if (!requester_craftsman_id || typeof requester_craftsman_id !== 'string') {
    ownerReason = 'no_owner_uid';
    console.warn('[notify-helper-application] 募集主IDが未指定:', { requester_craftsman_id });
  } else {
    try {
      // craftsmen テーブルからメールを取得
      // SECURITY DEFINER RPC 経由でメール取得（anon key でも RLS バイパス）
      const sbRes = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/get_craftsman_contact`,
        {
          method: 'POST',
          headers: {
            'apikey':        SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({ p_user_id: requester_craftsman_id }),
        },
      );

      if (!sbRes.ok) {
        const errBody = await sbRes.text().catch(() => '');
        ownerReason = `craftsmen_rpc_failed_${sbRes.status}`;
        console.error('[notify-helper-application] get_craftsman_contact RPC 失敗:', sbRes.status, errBody);
      } else {
        const contact = await sbRes.json() as { email?: string; full_name?: string } | null;
        ownerEmail = contact?.email ?? '';
        const ownerName = contact?.full_name ?? '';

        console.log('[notify-helper-application] craftsmen 取得:', {
          owner_uid:    requester_craftsman_id,
          owner_email:  ownerEmail || '(なし)',
          owner_name:   ownerName  || '(なし)',
          rows_count:   rows.length,
        });

        if (!ownerEmail) {
          ownerReason = contact === null
            ? 'craftsmen_row_not_found'
            : 'email_empty';
          console.error('[notify-helper-application] 募集主メール取得不能:', ownerReason, { requester_craftsman_id });
        } else if (!ownerEmail.includes('@')) {
          ownerReason = 'email_invalid_format';
          console.error('[notify-helper-application] 募集主メール形式不正:', ownerEmail);
        } else {
          // メール送信
          const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>助っ人応募が届きました</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0 40px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
<tr><td style="background:#ea580c;border-radius:16px 16px 0 0;padding:28px 32px 24px;text-align:center;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#fed7aa;">PRO MATCH</p>
<p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">助っ人応募が届きました</p>
</td></tr>
<tr><td style="background:#ffffff;padding:28px 32px;">
<p style="margin:0 0 20px;font-size:15px;color:#1e293b;line-height:1.7;">
あなたの助っ人募集（<strong>${escHtml(safeWorkType)}</strong> / ${escHtml(safeArea)}）に<br>
応募がありました。<br>「助っ人一覧」から応募を確認・承認してください。
</p>
<p style="margin:0 0 8px;font-size:13px;color:#475569;">応募者のコメント：</p>
<p style="margin:0 0 20px;background:#f8fafc;border-radius:8px;padding:12px 16px;font-size:14px;color:#334155;">
${escHtml(safeMessage)}
</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:0 0 28px;">
<a href="${listUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:12px;">
応募を確認する →
</a>
</td></tr>
</table>
<p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
連絡は必ずメールで。電話・LINEは使用しないでください。
</p>
</td></tr>
<tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:11px;color:#94a3b8;">PRO MATCH — 内装職人マッチング</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

          try {
            const ownerResult = await resend.emails.send({
              from:    ADMIN_FROM,
              to:      [ownerEmail],
              subject: '【PRO MATCH】助っ人応募が届きました',
              html,
              text: `助っ人募集（${safeWorkType} / ${safeArea}）に応募がありました。\n応募者コメント：${safeMessage}\n\n▼ 応募を確認\n${listUrl}`,
            });
            ownerOk     = true;
            ownerReason = 'sent';
            console.log('[notify-helper-application] 募集主通知 OK:', {
              to:     ownerEmail,
              result: ownerResult,
            });
          } catch (sendErr: any) {
            ownerReason = 'resend_error';
            console.error('[notify-helper-application] 募集主Resend送信失敗:', {
              to:    ownerEmail,
              error: sendErr?.message ?? sendErr,
            });
          }
        }
      }
    } catch (err: any) {
      ownerReason = 'exception';
      console.error('[notify-helper-application] 募集主通知 例外:', err?.message ?? err);
    }
  }

  const responseBody = {
    adminOk,
    ownerOk,
    ownerReason,
    ownerEmail: ownerEmail || null,
  };
  console.log('[notify-helper-application] response:', responseBody);
  res.status(200).json(responseBody);
}
