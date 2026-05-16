import { Resend } from 'resend';

// Phase47: 助っ人応募通知
// 応募者が応募した際に募集主へ通知するAPI

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_FROM   = 'Aoi Interior <onboarding@resend.dev>';
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

  const {
    request_id,
    craftsman_id,
    work_type,
    area,
    work_date,
    message,
    requester_craftsman_id,
  } = req.body ?? {};

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: 'missing env' });
    return;
  }

  const safeWorkType = String(work_type ?? '—');
  const safeArea     = String(area ?? '—');
  const safeWorkDate = String(work_date ?? '—');
  const safeMessage  = String(message ?? '（コメントなし）');
  const listUrl      = `${SITE_URL}/craftsman/help-list`;

  // 管理者通知
  const adminBody = [
    '助っ人募集に新しい応募がありました。',
    '',
    `工事内容　：${safeWorkType}`,
    `エリア　　：${safeArea}`,
    `作業日　　：${safeWorkDate}`,
    `応募者ID　：${craftsman_id ?? '—'}`,
    `メッセージ：${safeMessage}`,
    `request_id：${request_id ?? '—'}`,
    '',
    '▼ 助っ人一覧',
    listUrl,
  ].join('\n');

  try {
    await resend.emails.send({
      from:    ADMIN_FROM,
      to:      ['interior.shop.aoi@gmail.com'],
      subject: '【PRO MATCH】助っ人募集に応募がありました',
      text:    adminBody,
    });
  } catch (err) {
    console.error('[notify-helper-application] 管理者通知失敗:', err);
  }

  // 募集主への通知（craftsman_id → craftsmenテーブルのemail取得）
  if (requester_craftsman_id && typeof requester_craftsman_id === 'string') {
    try {
      const sbRes = await fetch(
        `${SUPABASE_URL}/rest/v1/craftsmen?select=email,name&user_id=eq.${encodeURIComponent(requester_craftsman_id)}&limit=1`,
        {
          headers: {
            'apikey':        SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        },
      );

      if (sbRes.ok) {
        const rows = await sbRes.json() as Array<{ email?: string; name?: string }>;
        const requesterEmail = rows?.[0]?.email;

        if (requesterEmail && requesterEmail.includes('@')) {
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
</td></tr>
<tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:11px;color:#94a3b8;">PRO MATCH — 内装職人マッチング</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

          await resend.emails.send({
            from:    ADMIN_FROM,
            to:      [requesterEmail],
            subject: '【PRO MATCH】助っ人応募が届きました',
            html,
            text: `助っ人募集（${safeWorkType} / ${safeArea}）に応募がありました。\n応募者コメント：${safeMessage}\n\n▼ 応募を確認\n${listUrl}`,
          });
        }
      }
    } catch (err) {
      console.error('[notify-helper-application] 募集主通知失敗:', err);
    }
  }

  res.status(200).json({ ok: true });
}
