import { Resend } from 'resend';

// Phase47: 助っ人承認通知
// 募集主が応募を承認した際に応募者へ通知するAPI
// 承認後に募集主の連絡先（メール）を開示する

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_FROM     = 'Aoi Interior <onboarding@resend.dev>';   // 管理者通知専用
const CRAFTSMAN_FROM = 'PRO MATCH <noreply@promatch-app.jp>';   // 職人向け（認証済みドメイン）
const SITE_URL     = 'https://promatch-app.jp';

const SUPABASE_URL      = process.env.SUPABASE_URL
                       || process.env.VITE_SUPABASE_URL
                       || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
                       || process.env.VITE_SUPABASE_ANON_KEY
                       || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { application_id } = req.body ?? {};

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: 'missing env' });
    return;
  }
  if (!application_id) {
    res.status(400).json({ error: 'application_id required' });
    return;
  }

  try {
    // 1. help_applications から情報取得
    const appRes = await fetch(
      `${SUPABASE_URL}/rest/v1/help_applications?select=*&id=eq.${encodeURIComponent(application_id)}&limit=1`,
      {
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );

    if (!appRes.ok) {
      console.error('[notify-helper-approved] help_applications 取得失敗:', appRes.status);
      res.status(200).json({ ok: false, reason: 'app fetch failed' });
      return;
    }

    const appRows = await appRes.json() as Array<{
      craftsman_id?: string;
      request_id?: string;
      message?: string;
    }>;
    const appRow = appRows?.[0];
    if (!appRow) {
      res.status(200).json({ ok: false, reason: 'application not found' });
      return;
    }

    const { craftsman_id: applicantId, request_id } = appRow;

    // 2. help_requests から工事情報と募集主IDを取得
    let workType = '内装工事';
    let area = '';
    let workDate = '';
    let requesterCraftsmanId = '';

    if (request_id) {
      const reqRes = await fetch(
        `${SUPABASE_URL}/rest/v1/help_requests?select=work_type,area,work_date,craftsman_id&id=eq.${encodeURIComponent(request_id)}&limit=1`,
        {
          headers: {
            'apikey':        SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        },
      );
      if (reqRes.ok) {
        const reqRows = await reqRes.json() as Array<{
          work_type?: string;
          area?: string;
          work_date?: string;
          craftsman_id?: string;
        }>;
        const reqRow = reqRows?.[0];
        if (reqRow) {
          workType              = reqRow.work_type ?? workType;
          area                  = reqRow.area ?? '';
          workDate              = reqRow.work_date ?? '';
          requesterCraftsmanId  = reqRow.craftsman_id ?? '';
        }
      }
    }

    // 3. 応募者のメールを取得（SECURITY DEFINER RPC 経由 — anon でも RLS バイパス）
    if (!applicantId) {
      res.status(200).json({ ok: false, reason: 'no applicant craftsman_id' });
      return;
    }

    const applicantRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_craftsman_contact`,
      {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ p_user_id: applicantId }),
      },
    );

    let applicantEmail = '';
    if (applicantRes.ok) {
      const contact = await applicantRes.json() as { email?: string } | null;
      applicantEmail = contact?.email ?? '';
      console.log('[notify-helper-approved] 応募者contact:', { applicantId, applicantEmail: applicantEmail || '(なし)' });
    } else {
      console.error('[notify-helper-approved] 応募者RPC失敗:', applicantRes.status);
    }

    // 4. 募集主のメールを取得（連絡先開示用 — 同じくRPC経由）
    let requesterEmail = '';
    if (requesterCraftsmanId) {
      const requesterRes = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/get_craftsman_contact`,
        {
          method: 'POST',
          headers: {
            'apikey':        SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({ p_user_id: requesterCraftsmanId }),
        },
      );
      if (requesterRes.ok) {
        const contact = await requesterRes.json() as { email?: string } | null;
        requesterEmail = contact?.email ?? '';
        console.log('[notify-helper-approved] 募集主contact:', { requesterCraftsmanId, requesterEmail: requesterEmail || '(なし)' });
      } else {
        console.error('[notify-helper-approved] 募集主RPC失敗:', requesterRes.status);
      }
    }

    // 5. 応募者へ承認通知メール（連絡先開示）
    let applicantOk     = false;
    let applicantReason = 'not_sent';

    if (!applicantEmail || !applicantEmail.includes('@')) {
      applicantReason = applicantEmail ? 'email_invalid_format' : 'email_empty';
      console.warn('[notify-helper-approved] 応募者メール送信スキップ:', {
        applicantReason,
        applicantId,
      });
    } else {
      const listUrl = `${SITE_URL}/craftsman/help-list`;

      const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>助っ人応募が承認されました</title></head>
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
<p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">連絡はメールで。電話・LINEは使用しないでください。</p>
</div>
` : `
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
<p style="margin:0;font-size:13px;color:#64748b;">連絡先は「助っ人一覧」ページでご確認ください</p>
</div>
`}
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:0 0 8px;">
<a href="${listUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:12px;">
助っ人一覧を見る →
</a>
</td></tr>
</table>
</td></tr>
<tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:11px;color:#94a3b8;">PRO MATCH — 内装職人マッチング</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

      const text = [
        `【PRO MATCH】助っ人応募が承認されました`,
        '',
        `${workType}（${area}）の助っ人募集があなたの応募を承認しました。`,
        '',
        requesterEmail ? `募集主の連絡先: ${requesterEmail}` : '連絡先は助っ人一覧ページでご確認ください',
        workDate ? `作業日: ${workDate}` : '',
        '',
        `▼ 助っ人一覧`,
        `${SITE_URL}/craftsman/help-list`,
      ].filter(Boolean).join('\n');

      try {
        const sendResult = await resend.emails.send({
          from:    CRAFTSMAN_FROM,   // 認証済みドメインから送信
          to:      [applicantEmail],
          subject: '【PRO MATCH】助っ人応募が承認されました',
          html,
          text,
        });
        applicantOk     = true;
        applicantReason = 'sent';
        console.log('[notify-helper-approved] 応募者通知 OK:', { to: applicantEmail, result: sendResult });
      } catch (sendErr: any) {
        applicantReason = 'resend_error';
        console.error('[notify-helper-approved] 応募者Resend送信失敗:', {
          to:    applicantEmail,
          error: sendErr?.message ?? sendErr,
        });
      }
    }

    const responseBody = {
      ok:             applicantOk,
      applicantOk,
      applicantReason,
      requesterEmailFound: Boolean(requesterEmail),
    };
    console.log('[notify-helper-approved] response:', responseBody);
    res.status(200).json(responseBody);

  } catch (err: any) {
    console.error('[notify-helper-approved] 例外:', err?.message ?? err);
    res.status(200).json({ ok: false, applicantOk: false, applicantReason: 'exception' });
  }
}
