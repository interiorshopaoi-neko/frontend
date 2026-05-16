import { Resend } from 'resend';

// レビュー投稿後に職人へ通知メールを送る。
// fire-and-forget 前提: エラーは 200 + { craftsmanOk: false } で返す。

const resend = new Resend(process.env.RESEND_API_KEY);

const CRAFTSMAN_FROM = 'PRO MATCH <noreply@promatch-app.jp>';
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

function buildHtml(params: { craftsmanName: string; rating: number; comment: string | null; profileUrl: string }): string {
  const { craftsmanName, rating, comment, profileUrl } = params;
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0 40px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr><td style="background:#1e40af;border-radius:16px 16px 0 0;padding:28px 32px 24px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#93c5fd;text-transform:uppercase;">PRO MATCH</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">お客様からレビューが届きました</p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:28px 32px 20px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;">
          ${escHtml(craftsmanName)} さん、<br>お客様からレビューが投稿されました。
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-radius:12px;padding:16px 20px;border:1px solid #fde68a;">
          <tr><td>
            <p style="margin:0 0 8px;font-size:20px;color:#d97706;letter-spacing:2px;">${escHtml(stars(rating))}</p>
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;">評価: ${rating}/5</p>
            ${comment
              ? `<p style="margin:8px 0 0;font-size:13px;color:#78350f;line-height:1.6;border-top:1px solid #fde68a;padding-top:8px;">"${escHtml(comment)}"</p>`
              : '<p style="margin:8px 0 0;font-size:12px;color:#b45309;">コメントなし</p>'
            }
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:13px;color:#475569;line-height:1.6;">
          レビューはプロフィールに反映されました。<br>
          積み重ねたレビューが次の受注につながります。
        </p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:0 32px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${escHtml(profileUrl)}"
               style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:12px;">
              プロフィールを確認する →
            </a>
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
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[notify-review-posted] 環境変数未設定');
    res.status(200).json({ ok: true, craftsmanOk: false, reason: 'missing_env' });
    return;
  }

  const { craftsman_id, estimate_request_id, rating, comment } = req.body ?? {};

  if (!craftsman_id || !estimate_request_id) {
    res.status(400).json({ error: 'craftsman_id and estimate_request_id are required' });
    return;
  }

  // demo スキップ
  if (String(craftsman_id).startsWith('demo-') || String(estimate_request_id).startsWith('demo-')) {
    res.status(200).json({ ok: true, skipped: 'demo' });
    return;
  }

  const sbHeaders = {
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json',
  };

  let craftsmanOk = false;

  try {
    // SECURITY DEFINER RPC で職人メール取得
    const rpcRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_craftsman_email_for_contracted`,
      {
        method:  'POST',
        headers: sbHeaders,
        body:    JSON.stringify({ p_application_id: req.body?.application_id ?? '' }),
      },
    );

    let craftsmanEmail = '';
    let craftsmanName  = '職人さん';
    let userId = craftsman_id;

    if (rpcRes.ok) {
      const rpcRows = await rpcRes.json() as Array<{
        craftsman_email?: string;
        shop_name?:       string;
        full_name?:       string;
      }>;
      const row = rpcRows?.[0];
      if (row?.craftsman_email?.includes('@')) {
        craftsmanEmail = row.craftsman_email.replace(/^mailto:/i, '').trim();
        craftsmanName  = row.shop_name || row.full_name || '職人さん';
      }
    }

    // RPC で取得できない場合は craftsmen テーブルから直接取得（anon SELECT ポリシーが許可している場合）
    if (!craftsmanEmail) {
      const cRes = await fetch(
        `${SUPABASE_URL}/rest/v1/craftsmen?select=email,shop_name,full_name&user_id=eq.${craftsman_id}&limit=1`,
        { headers: sbHeaders },
      );
      if (cRes.ok) {
        const cRows = await cRes.json() as Array<{ email?: string; shop_name?: string; full_name?: string }>;
        const cRow = cRows?.[0];
        if (cRow?.email?.includes('@')) {
          craftsmanEmail = cRow.email.replace(/^mailto:/i, '').trim();
          craftsmanName  = cRow.shop_name || cRow.full_name || '職人さん';
        }
      }
    }

    if (!craftsmanEmail) {
      console.warn('[notify-review-posted] 職人メール取得失敗 craftsman_id:', craftsman_id);
      res.status(200).json({ ok: true, craftsmanOk: false, reason: 'no_email' });
      return;
    }

    const profileUrl = `${SITE_URL}/craftsman/profile/${userId}`;
    const safeRating  = typeof rating === 'number' ? rating : parseInt(String(rating)) || 0;
    const safeComment = typeof comment === 'string' && comment.trim() ? comment.trim() : null;

    const { error } = await resend.emails.send({
      from:    CRAFTSMAN_FROM,
      to:      [craftsmanEmail],
      subject: '【PRO MATCH】お客様からレビューが届きました',
      html:    buildHtml({ craftsmanName, rating: safeRating, comment: safeComment, profileUrl }),
      text: [
        '【PRO MATCH】お客様からレビューが届きました',
        '',
        `${craftsmanName} さん、お客様からレビューが投稿されました。`,
        '',
        `評価: ${stars(safeRating)} (${safeRating}/5)`,
        safeComment ? `コメント: "${safeComment}"` : 'コメント: なし',
        '',
        'レビューはプロフィールに反映されました。',
        '',
        `▼ プロフィールを確認する`,
        profileUrl,
        '',
        'このメールはシステムから自動送信されています。',
      ].join('\n'),
    });

    if (error) {
      console.error('[notify-review-posted] Resend error:', error);
    } else {
      craftsmanOk = true;
      console.log('[notify-review-posted] 職人通知 送信成功:', craftsmanEmail);
    }
  } catch (err) {
    console.error('[notify-review-posted] 予期しないエラー:', err);
  }

  res.status(200).json({ ok: true, craftsmanOk });
}
