import { Resend } from 'resend';

// 助っ人通知の統合ハンドラ。
// body.type === 'application': 応募通知（応募者 → 募集主）
// body.type === 'approved'   : 承認通知（募集主 → 応募者）
// ※ Vercel Hobby の 12 関数上限対策として notify-helper-application / notify-helper-approved を統合

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_FROM     = 'Aoi Interior <onboarding@resend.dev>';
const CRAFTSMAN_FROM = 'PRO MATCH <noreply@promatch-app.jp>';
const ADMIN_TO       = 'interior.shop.aoi@gmail.com';
const SITE_URL       = 'https://promatch-app.jp';

const SUPABASE_URL      = process.env.SUPABASE_URL
                       || process.env.VITE_SUPABASE_URL
                       || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
                       || process.env.VITE_SUPABASE_ANON_KEY
                       || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getAdminNotificationEnabled(key: string): Promise<boolean> {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_notification_settings?select=${key}&id=eq.1&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY!, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!r.ok) return true;
    const rows = await r.json() as Array<Record<string, boolean>>;
    return rows?.[0]?.[key] !== false;
  } catch {
    return true;
  }
}

async function getCraftsmanContact(userId: string): Promise<{ email?: string; full_name?: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_craftsman_contact`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ p_user_id: userId }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ email?: string; full_name?: string } | null>;
}

// ── type=application ──────────────────────────────────────────────────────────

async function handleApplication(body: Record<string, unknown>, res: any) {
  const {
    request_id,
    craftsman_id,
    work_type,
    area,
    work_date,
    message,
    requester_craftsman_id,
  } = body;

  console.log('[notify-helper] application received:', {
    request_id:             request_id ?? null,
    applicant_craftsman_id: craftsman_id ?? null,
    owner_craftsman_id:     requester_craftsman_id ?? null,
  });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: 'missing env' }); return;
  }

  const safeWorkType = String(work_type ?? '—');
  const safeArea     = String(area ?? '—');
  const safeWorkDate = String(work_date ?? '—');
  const safeMessage  = String(message ?? '（コメントなし）');
  const listUrl      = `${SITE_URL}/craftsman/help-list`;

  let adminOk = false;
  let ownerOk = false;
  let ownerReason = 'not_attempted';
  let ownerEmail  = '';

  const adminEnabled = await getAdminNotificationEnabled('notify_helper_application');
  if (adminEnabled) {
    try {
      await resend.emails.send({
        from:    ADMIN_FROM,
        to:      [ADMIN_TO],
        subject: '【PRO MATCH】助っ人募集に応募がありました',
        text: [
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
          `▼ 助っ人一覧`,
          listUrl,
        ].join('\n'),
      });
      adminOk = true;
    } catch (err) {
      console.error('[notify-helper] application 管理者通知失敗:', err);
    }
  } else {
    adminOk = true;
  }

  if (!requester_craftsman_id || typeof requester_craftsman_id !== 'string') {
    ownerReason = 'no_owner_uid';
  } else {
    try {
      const contact = await getCraftsmanContact(requester_craftsman_id);
      ownerEmail = contact?.email ?? '';
      if (!ownerEmail || !ownerEmail.includes('@')) {
        ownerReason = ownerEmail ? 'email_invalid_format' : 'email_empty';
      } else {
        const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"></head>
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
応募がありました。「助っ人一覧」から応募を確認・承認してください。
</p>
<p style="margin:0 0 8px;font-size:13px;color:#475569;">応募者のコメント：</p>
<p style="margin:0 0 20px;background:#f8fafc;border-radius:8px;padding:12px 16px;font-size:14px;color:#334155;">
${escHtml(safeMessage)}</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:0 0 28px;">
<a href="${listUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:12px;">応募を確認する →</a>
</td></tr></table>
<p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">連絡は必ずメールで。電話・LINEは使用しないでください。</p>
</td></tr>
<tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:11px;color:#94a3b8;">PRO MATCH — 内装職人マッチング</p>
</td></tr></table></td></tr></table>
</body></html>`;

        await resend.emails.send({
          from:    CRAFTSMAN_FROM,
          to:      [ownerEmail],
          subject: '【PRO MATCH】助っ人応募が届きました',
          html,
          text: `助っ人募集（${safeWorkType} / ${safeArea}）に応募がありました。\n応募者コメント：${safeMessage}\n\n▼ 応募を確認\n${listUrl}`,
        });
        ownerOk     = true;
        ownerReason = 'sent';
      }
    } catch (err: any) {
      ownerReason = 'exception';
      console.error('[notify-helper] application 募集主通知失敗:', err?.message ?? err);
    }
  }

  res.status(200).json({ adminOk, ownerOk, ownerReason, ownerEmail: ownerEmail || null });
}

// ── type=approved ─────────────────────────────────────────────────────────────

async function handleApproved(body: Record<string, unknown>, res: any) {
  const { application_id } = body;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: 'missing env' }); return;
  }
  if (!application_id) {
    res.status(400).json({ error: 'application_id required' }); return;
  }

  try {
    const appRes = await fetch(
      `${SUPABASE_URL}/rest/v1/help_applications?select=*&id=eq.${encodeURIComponent(String(application_id))}&limit=1`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!appRes.ok) {
      res.status(200).json({ ok: false, reason: 'app fetch failed' }); return;
    }
    const appRows = await appRes.json() as Array<{ craftsman_id?: string; request_id?: string }>;
    const appRow  = appRows?.[0];
    if (!appRow) {
      res.status(200).json({ ok: false, reason: 'application not found' }); return;
    }

    const { craftsman_id: applicantId, request_id } = appRow;

    let workType = '内装工事', area = '', workDate = '', requesterCraftsmanId = '';
    if (request_id) {
      const reqRes = await fetch(
        `${SUPABASE_URL}/rest/v1/help_requests?select=work_type,area,work_date,craftsman_id&id=eq.${encodeURIComponent(request_id)}&limit=1`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } },
      );
      if (reqRes.ok) {
        const rows = await reqRes.json() as Array<{ work_type?: string; area?: string; work_date?: string; craftsman_id?: string }>;
        const r = rows?.[0];
        if (r) { workType = r.work_type ?? workType; area = r.area ?? ''; workDate = r.work_date ?? ''; requesterCraftsmanId = r.craftsman_id ?? ''; }
      }
    }

    if (!applicantId) {
      res.status(200).json({ ok: false, reason: 'no applicant craftsman_id' }); return;
    }

    const applicantContact  = await getCraftsmanContact(applicantId);
    const applicantEmail    = applicantContact?.email ?? '';
    const requesterContact  = requesterCraftsmanId ? await getCraftsmanContact(requesterCraftsmanId) : null;
    const requesterEmail    = requesterContact?.email ?? '';

    let applicantOk = false, applicantReason = 'not_sent';
    if (!applicantEmail || !applicantEmail.includes('@')) {
      applicantReason = applicantEmail ? 'email_invalid_format' : 'email_empty';
    } else {
      const listUrl = `${SITE_URL}/craftsman/help-list`;
      const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0 40px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
<tr><td style="background:#16a34a;border-radius:16px 16px 0 0;padding:28px 32px 24px;text-align:center;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#bbf7d0;">PRO MATCH</p>
<p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">応募が承認されました！</p>
</td></tr>
<tr><td style="background:#ffffff;padding:28px 32px;">
<p style="margin:0 0 20px;font-size:15px;color:#1e293b;line-height:1.7;">
<strong>${escHtml(workType)}</strong>（${escHtml(area)}）の助っ人募集があなたの応募を承認しました。<br>
以下の連絡先から募集主に連絡を取り、作業日程を確認してください。
</p>
${requesterEmail ? `
<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
<p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#16a34a;">募集主の連絡先（承認後に開示）</p>
<a href="mailto:${escHtml(requesterEmail)}" style="font-size:16px;font-weight:800;color:#1d4ed8;text-decoration:underline;">${escHtml(requesterEmail)}</a>
<p style="margin:8px 0 0;font-size:11px;color:#64748b;">作業日 ${escHtml(workDate)} までに連絡を取ってください</p>
</div>` : `
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
<p style="margin:0;font-size:13px;color:#64748b;">連絡先は「助っ人一覧」ページでご確認ください</p>
</div>`}
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<a href="${listUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:12px;">助っ人一覧を見る →</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:11px;color:#94a3b8;">PRO MATCH — 内装職人マッチング</p>
</td></tr></table></td></tr></table>
</body></html>`;

      try {
        await resend.emails.send({
          from:    CRAFTSMAN_FROM,
          to:      [applicantEmail],
          subject: '【PRO MATCH】助っ人応募が承認されました',
          html,
          text: [
            `【PRO MATCH】助っ人応募が承認されました`,
            '',
            `${workType}（${area}）の助っ人募集があなたの応募を承認しました。`,
            '',
            requesterEmail ? `募集主の連絡先: ${requesterEmail}` : '連絡先は助っ人一覧ページでご確認ください',
            workDate ? `作業日: ${workDate}` : '',
            '',
            `▼ 助っ人一覧`,
            `${SITE_URL}/craftsman/help-list`,
          ].filter(Boolean).join('\n'),
        });
        applicantOk = true; applicantReason = 'sent';
      } catch (err: any) {
        applicantReason = 'resend_error';
        console.error('[notify-helper] approved 応募者送信失敗:', err?.message ?? err);
      }
    }

    res.status(200).json({ ok: applicantOk, applicantOk, applicantReason, requesterEmailFound: Boolean(requesterEmail) });

  } catch (err: any) {
    console.error('[notify-helper] approved 例外:', err?.message ?? err);
    res.status(200).json({ ok: false, applicantOk: false, applicantReason: 'exception' });
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const type = req.body?.type as string | undefined;
  if (type === 'application') return handleApplication(req.body, res);
  if (type === 'approved')    return handleApproved(req.body, res);

  res.status(400).json({ error: 'type must be "application" or "approved"' });
}
