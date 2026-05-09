import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  to: string;
  area: string;
  work_type: string;
  room_type?: string;
  room_size?: string;
  timing?: string;
}

function formatJST(date: Date): string {
  return date.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function row(label: string, value: string | undefined): string {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:12px 20px;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:11px;color:#94a3b8;font-weight:700;display:block;margin-bottom:3px;">${label}</span>
        <span style="font-size:14px;color:#1e293b;font-weight:600;">${value}</span>
      </td>
    </tr>`;
}

function buildHtml(
  area: string,
  workType: string,
  roomType: string | undefined,
  roomSize: string | undefined,
  timing: string | undefined,
  sentAt: string,
  logoUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>見積もり依頼を受け付けました</title>
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
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.45;letter-spacing:-0.01em;">
                見積もり依頼を受け付けました
              </h1>
              <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">
                内装職人マッチングサービス
              </p>
            </td>
          </tr>

          <!-- 受付完了バッジ -->
          <tr>
            <td style="padding:28px 32px 0;text-align:center;">
              <span style="display:inline-block;background:#d1fae5;color:#065f46;font-size:13px;font-weight:700;padding:8px 20px;border-radius:100px;letter-spacing:0.04em;">
                ✓ &nbsp;受付完了
              </span>
            </td>
          </tr>

          <!-- 依頼内容カード -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;">依頼内容</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                ${row('施工内容', workType)}
                ${row('エリア', area)}
                ${row('部屋タイプ', roomType)}
                ${row('部屋サイズ', roomSize)}
                ${row('希望時期', timing)}
                <tr>
                  <td style="padding:12px 20px;">
                    <span style="font-size:11px;color:#94a3b8;font-weight:700;display:block;margin-bottom:3px;">送信日時</span>
                    <span style="font-size:14px;color:#1e293b;font-weight:600;">${sentAt}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 今後の流れ -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;">今後の流れ</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 0 16px;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:30px;vertical-align:top;padding-top:1px;">
                      <span style="display:inline-block;width:22px;height:22px;background:#10b981;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;color:#fff;">✓</span>
                    </td>
                    <td>
                      <p style="margin:0;font-size:11px;font-weight:700;color:#059669;">今日</p>
                      <p style="margin:3px 0 0;font-size:13px;color:#1e293b;font-weight:600;">依頼を受け付けました</p>
                    </td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:0 0 16px;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:30px;vertical-align:top;padding-top:1px;">
                      <span style="display:inline-block;width:22px;height:22px;background:#e2e8f0;border-radius:50%;"></span>
                    </td>
                    <td>
                      <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;">順次</p>
                      <p style="margin:3px 0 0;font-size:13px;color:#475569;">内容を確認後、対応可能な職人から順次ご連絡いたします</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">早ければ当日中に連絡が来る場合があります</p>
                    </td>
                  </tr></table>
                </td></tr>
                <tr><td>
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:30px;vertical-align:top;padding-top:1px;">
                      <span style="display:inline-block;width:22px;height:22px;background:#e2e8f0;border-radius:50%;"></span>
                    </td>
                    <td>
                      <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;">マッチング後</p>
                      <p style="margin:3px 0 0;font-size:13px;color:#475569;">職人の連絡先（メール・電話）をお知らせします</p>
                    </td>
                  </tr></table>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- 安心メッセージ -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:12px;">
                <tr><td style="padding:6px 18px;">
                  <p style="margin:0;font-size:13px;color:#065f46;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp; お客様のご利用は完全無料です</p>
                </td></tr>
                <tr><td style="padding:6px 18px;">
                  <p style="margin:0;font-size:13px;color:#065f46;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp; しつこい営業連絡はありません</p>
                </td></tr>
                <tr><td style="padding:6px 18px;">
                  <p style="margin:0;font-size:13px;color:#065f46;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp; 断っても一切費用はかかりません</p>
                </td></tr>
                <tr><td style="padding:6px 18px 12px;">
                  <p style="margin:0;font-size:13px;color:#065f46;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp; 工事代金は職人と直接やりとりします（運営は預かりません）</p>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- 迷惑メール注記 -->
          <tr>
            <td style="padding:16px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
                <tr><td style="padding:12px 16px;">
                  <p style="margin:0;font-size:12px;color:#92400e;">
                    📬&nbsp; 迷惑メールフォルダに届く場合があります。ご確認ください。
                  </p>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- フッター -->
          <tr>
            <td style="padding:32px;text-align:center;border-top:1px solid #f1f5f9;margin-top:8px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#64748b;">PRO MATCH</p>
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
      console.warn('[send-customer-email] RESEND_API_KEY が未設定のためスキップ');
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const payload: Payload = await req.json();
    const { to, area, work_type, room_type, room_size, timing } = payload;

    if (!to || !to.includes('@')) {
      return new Response(JSON.stringify({ error: 'invalid email' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const sentAt  = formatJST(new Date());
    const logoUrl = 'https://frontend-alpha-gray-75.vercel.app/logo-full.png';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `PRO MATCH（内装職人マッチング） <${fromEmail}>`,
        to: [to],
        reply_to: to,
        subject: '見積もり依頼を受け付けました｜PRO MATCH',
        html: buildHtml(area, work_type, room_type, room_size, timing, sentAt, logoUrl),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[send-customer-email] Resend error:', res.status, body);
      return new Response(JSON.stringify({ error: 'resend failed', status: res.status }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    console.log('[send-customer-email] 送信成功:', data.id);
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[send-customer-email] 予期しないエラー:', err);
    return new Response(JSON.stringify({ error: 'unexpected error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
