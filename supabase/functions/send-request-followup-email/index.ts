import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  email: string;
  requestId: string;
  customerName?: string;
}

function buildHtml(siteUrl: string, logoUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>お見積もり募集を継続しますか？</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- ヘッダー -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#2563eb 100%);padding:36px 32px 32px;text-align:center;">
              <img
                src="${logoUrl}"
                alt="PRO MATCH"
                width="140"
                style="display:block;margin:0 auto 20px;height:auto;"
                onerror="this.style.display='none'"
              />
              <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;line-height:1.5;letter-spacing:-0.01em;">
                お見積もり募集を継続しますか？
              </h1>
              <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">
                内装職人マッチングサービス
              </p>
            </td>
          </tr>

          <!-- 本文 -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;">
                いつも PRO MATCH をご利用いただきありがとうございます。
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#1e293b;line-height:1.7;">
                現在のご依頼について、<strong>現在も職人募集を継続しますか？</strong>
              </p>

              <!-- CTA ボタン -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 12px;">
                    <a href="${siteUrl}"
                      style="display:block;background:#2563eb;color:#ffffff;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
                      ✓ &nbsp;引き続き募集する
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="${siteUrl}"
                      style="display:block;background:#f1f5f9;color:#64748b;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;border:1px solid #e2e8f0;">
                      募集を終了する
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- フッター -->
          <tr>
            <td style="padding:24px 32px 32px;text-align:center;border-top:1px solid #f1f5f9;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#64748b;">PRO MATCH</p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">内装工事の見積もりマッチングサービス</p>
              <p style="margin:10px 0 0;font-size:11px;color:#cbd5e1;">このメールは PRO MATCH から自動送信されています。</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'noreply@promatch-app.jp';
    const siteUrl   = (Deno.env.get('SITE_URL') ?? 'https://promatch-app.jp').replace(/\/$/, '');

    if (!resendKey) {
      console.warn('[send-request-followup-email] RESEND_API_KEY が未設定のためスキップ');
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const payload: Payload = await req.json();
    const { email, requestId } = payload;

    console.log('[send-request-followup-email] payload受信 requestId:', requestId ?? '(なし)', 'email存在:', !!email);

    if (!email || !email.includes('@')) {
      console.error('[send-request-followup-email] 無効なメールアドレス requestId:', requestId ?? '(なし)', 'email存在:', !!email);
      return new Response(JSON.stringify({ error: 'invalid email' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const logoUrl = `${siteUrl}/logo-full.png`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `PRO MATCH（内装職人マッチング） <${fromEmail}>`,
        to: [email],
        subject: '【PRO MATCH】お見積もり募集を継続しますか？',
        html: buildHtml(siteUrl, logoUrl),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[send-request-followup-email] Resend error:', res.status, body);
      return new Response(JSON.stringify({ error: 'resend failed', status: res.status }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    console.log('[send-request-followup-email] 送信成功:', data.id, 'requestId:', requestId);
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[send-request-followup-email] 予期しないエラー:', err);
    return new Response(JSON.stringify({ error: 'unexpected error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
