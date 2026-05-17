import { Resend } from 'resend';

// レビュー通知の統合ハンドラ。
// body.type === 'request': 依頼者へレビュー依頼メール（工事完了報告後）+ 管理者通知
// body.type === 'posted' : 職人へレビュー投稿通知メール
// ※ Vercel Hobby の 12 関数上限対策として notify-review-request / notify-review-posted を統合

const resend = new Resend(process.env.RESEND_API_KEY);

const CRAFTSMAN_FROM = 'PRO MATCH <noreply@promatch-app.jp>';
const CUSTOMER_FROM  = 'PRO MATCH <noreply@promatch-app.jp>';
const ADMIN_FROM     = 'Aoi Interior <onboarding@resend.dev>';
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

function stars(n: number): string {
  return '★'.repeat(Math.max(0, Math.min(5, n))) + '☆'.repeat(Math.max(0, 5 - Math.min(5, n)));
}

// ── type=request ──────────────────────────────────────────────────────────────

async function handleRequest(body: Record<string, unknown>, res: any) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[notify-review] request 環境変数未設定');
    res.status(500).json({ error: 'missing env' }); return;
  }

  const { request_id, application_id } = body;
  if (!request_id) {
    res.status(400).json({ error: 'request_id is required' }); return;
  }

  if (
    (typeof request_id     === 'string' && request_id.startsWith('demo-')) ||
    (typeof application_id === 'string' && application_id?.startsWith('demo-'))
  ) {
    res.status(200).json({ ok: true, skipped: 'demo' }); return;
  }

  const sbHeaders = {
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json',
  };

  const numReqId = Number(request_id);
  const idParam  = Number.isFinite(numReqId) && numReqId > 0 ? numReqId : null;
  if (!idParam) {
    res.status(200).json({ ok: true, customerOk: false, adminOk: false, reason: 'invalid_request_id' }); return;
  }

  let customerOk = false, adminOk = false;
  try {
    const reqRes = await fetch(
      `${SUPABASE_URL}/rest/v1/estimate_requests?select=work_type,area,contact_value,contact_method&id=eq.${idParam}&limit=1`,
      { headers: sbHeaders },
    );
    if (!reqRes.ok) {
      res.status(200).json({ ok: true, customerOk: false, adminOk: false, reason: 'fetch_error' }); return;
    }

    const rows = await reqRes.json() as Array<{ work_type?: string; area?: string; contact_value?: string; contact_method?: string }>;
    const row  = rows?.[0];
    const workType      = row?.work_type ?? '内装工事';
    const area          = row?.area ?? '—';
    const customerEmail = (row?.contact_value ?? '').replace(/^mailto:/i, '').trim();
    const reviewUrl     = `${SITE_URL}/request/${idParam}/review`;

    if (customerEmail && customerEmail.includes('@') && row?.contact_method === 'メール') {
      const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0 40px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
<tr><td style="background:#1e40af;border-radius:16px 16px 0 0;padding:28px 32px 24px;text-align:center;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#93c5fd;">PRO MATCH</p>
<p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">工事完了のご確認と<br>レビューのお願い</p>
</td></tr>
<tr><td style="background:#ffffff;padding:28px 32px 16px;">
<p style="margin:0 0 8px;font-size:18px;font-weight:800;color:#1e293b;">工事はいかがでしたか？</p>
<p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">
ご依頼の <strong style="color:#1e40af;">${escHtml(workType)}</strong>（${escHtml(area)}）の工事完了の報告が届きました。<br>
よかった点・気になった点を 1 分で教えてください。
</p>
</td></tr>
<tr><td style="background:#ffffff;padding:0 32px 28px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<a href="${escHtml(reviewUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:18px 40px;border-radius:12px;">⭐ 1分でレビューを書く →</a>
</td></tr>
<tr><td align="center" style="padding-top:10px;">
<p style="margin:0;font-size:12px;color:#94a3b8;">レビューの投稿は任意です。強制ではありません。</p>
</td></tr></table>
</td></tr>
<tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:12px;font-weight:700;color:#64748b;">PRO MATCH — 内装職人マッチング</p>
</td></tr></table></td></tr></table>
</body></html>`;
      try {
        const { error } = await resend.emails.send({
          from: CUSTOMER_FROM, to: [customerEmail],
          subject: '【PRO MATCH】工事完了の確認とレビューをお願いします',
          html,
          text: [
            '【PRO MATCH】工事完了の確認とレビューをお願いします', '',
            `ご依頼の ${workType}（${area}）の工事完了の報告が届きました。`, '',
            '▼ 1分でレビューを書く', reviewUrl, '',
            'レビューの投稿は任意です。',
          ].join('\n'),
        });
        if (error) { console.error('[notify-review] request 依頼者Resendエラー:', error); }
        else        { customerOk = true; }
      } catch (err) { console.error('[notify-review] request 依頼者送信例外:', err); }
    }

    try {
      const { error } = await resend.emails.send({
        from: ADMIN_FROM, to: [ADMIN_TO],
        subject: '【PRO MATCH】工事完了報告が届きました',
        text: [
          '工事完了報告が届きました。', '',
          `工事内容      : ${workType}`,
          `エリア        : ${area}`,
          `request_id    : ${request_id}`,
          `application_id: ${application_id ?? '—'}`, '',
          `▼ 管理画面`, `${SITE_URL}/admin/dashboard`,
        ].join('\n'),
      });
      if (error) { console.error('[notify-review] request 管理者Resendエラー:', error); }
      else        { adminOk = true; }
    } catch (err) { console.error('[notify-review] request 管理者送信例外:', err); }

  } catch (err) { console.error('[notify-review] request 例外:', err); }

  res.status(200).json({ ok: true, customerOk, adminOk });
}

// ── type=posted ───────────────────────────────────────────────────────────────

async function handlePosted(body: Record<string, unknown>, res: any) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[notify-review] posted 環境変数未設定');
    res.status(200).json({ ok: true, craftsmanOk: false, reason: 'missing_env' }); return;
  }

  const { craftsman_id, estimate_request_id, rating, comment, application_id } = body;

  if (!craftsman_id || !estimate_request_id) {
    res.status(400).json({ error: 'craftsman_id and estimate_request_id are required' }); return;
  }
  if (String(craftsman_id).startsWith('demo-') || String(estimate_request_id).startsWith('demo-')) {
    res.status(200).json({ ok: true, skipped: 'demo' }); return;
  }

  const sbHeaders = {
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json',
  };

  let craftsmanOk = false;
  try {
    let craftsmanEmail = '', craftsmanName = '職人さん';

    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_craftsman_email_for_contracted`, {
      method: 'POST', headers: sbHeaders,
      body: JSON.stringify({ p_application_id: application_id ?? '' }),
    });
    if (rpcRes.ok) {
      const rows = await rpcRes.json() as Array<{ craftsman_email?: string; shop_name?: string; full_name?: string }>;
      const row  = rows?.[0];
      if (row?.craftsman_email?.includes('@')) {
        craftsmanEmail = row.craftsman_email.replace(/^mailto:/i, '').trim();
        craftsmanName  = row.shop_name || row.full_name || '職人さん';
      }
    }

    if (!craftsmanEmail) {
      const cRes = await fetch(
        `${SUPABASE_URL}/rest/v1/craftsmen?select=email,shop_name,full_name&user_id=eq.${craftsman_id}&limit=1`,
        { headers: sbHeaders },
      );
      if (cRes.ok) {
        const rows = await cRes.json() as Array<{ email?: string; shop_name?: string; full_name?: string }>;
        const row  = rows?.[0];
        if (row?.email?.includes('@')) {
          craftsmanEmail = row.email.replace(/^mailto:/i, '').trim();
          craftsmanName  = row.shop_name || row.full_name || '職人さん';
        }
      }
    }

    if (!craftsmanEmail) {
      res.status(200).json({ ok: true, craftsmanOk: false, reason: 'no_email' }); return;
    }

    const safeRating  = typeof rating === 'number' ? rating : parseInt(String(rating)) || 0;
    const safeComment = typeof comment === 'string' && comment.trim() ? comment.trim() : null;
    const profileUrl  = `${SITE_URL}/craftsman/profile/${craftsman_id}`;

    const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0 40px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
<tr><td style="background:#1e40af;border-radius:16px 16px 0 0;padding:28px 32px 24px;text-align:center;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#93c5fd;">PRO MATCH</p>
<p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">お客様からレビューが届きました</p>
</td></tr>
<tr><td style="background:#ffffff;padding:28px 32px 20px;">
<p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;">${escHtml(craftsmanName)} さん、<br>お客様からレビューが投稿されました。</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-radius:12px;padding:16px 20px;border:1px solid #fde68a;">
<tr><td>
<p style="margin:0 0 8px;font-size:20px;color:#d97706;letter-spacing:2px;">${escHtml(stars(safeRating))}</p>
<p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;">評価: ${safeRating}/5</p>
${safeComment
  ? `<p style="margin:8px 0 0;font-size:13px;color:#78350f;line-height:1.6;border-top:1px solid #fde68a;padding-top:8px;">"${escHtml(safeComment)}"</p>`
  : '<p style="margin:8px 0 0;font-size:12px;color:#b45309;">コメントなし</p>'}
</td></tr></table>
</td></tr>
<tr><td style="background:#ffffff;padding:0 32px 28px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<a href="${escHtml(profileUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:12px;">プロフィールを確認する →</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:12px;font-weight:700;color:#64748b;">PRO MATCH — 内装職人マッチング</p>
</td></tr></table></td></tr></table>
</body></html>`;

    const { error } = await resend.emails.send({
      from:    CRAFTSMAN_FROM,
      to:      [craftsmanEmail],
      subject: '【PRO MATCH】お客様からレビューが届きました',
      html,
      text: [
        '【PRO MATCH】お客様からレビューが届きました', '',
        `${craftsmanName} さん、お客様からレビューが投稿されました。`, '',
        `評価: ${stars(safeRating)} (${safeRating}/5)`,
        safeComment ? `コメント: "${safeComment}"` : 'コメント: なし', '',
        `▼ プロフィールを確認する`, profileUrl,
      ].join('\n'),
    });
    if (error) { console.error('[notify-review] posted Resendエラー:', error); }
    else        { craftsmanOk = true; }

  } catch (err) { console.error('[notify-review] posted 例外:', err); }

  res.status(200).json({ ok: true, craftsmanOk });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const type = req.body?.type as string | undefined;
  if (type === 'request') return handleRequest(req.body, res);
  if (type === 'posted')  return handlePosted(req.body, res);

  res.status(400).json({ error: 'type must be "request" or "posted"' });
}
