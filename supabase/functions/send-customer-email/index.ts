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
  request_id?: number | string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatJST(date: Date): string {
  return date.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/** HTML エスケープ（XSS防止） */
function esc(s: string | undefined | null): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 依頼内容の1行（値がない場合は出力しない） */
function detailRow(label: string, value: string | undefined): string {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:10px 20px;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:10px;color:#94a3b8;font-weight:700;display:block;margin-bottom:2px;letter-spacing:0.06em;text-transform:uppercase;">${esc(label)}</span>
        <span style="font-size:14px;color:#1e293b;font-weight:600;">${esc(value)}</span>
      </td>
    </tr>`;
}

// ─── HTML テンプレート ────────────────────────────────────────────────────────

function buildHtml(p: {
  area: string;
  workType: string;
  roomType?: string;
  roomSize?: string;
  timing?: string;
  sentAt: string;
  siteUrl: string;
  requestId?: number | string;
}): string {
  const { area, workType, roomType, roomSize, timing, sentAt, siteUrl, requestId } = p;

  // CTA ボタン群（request_id がある場合のみ表示）
  const ctaHtml = requestId ? `
      <!-- CTAボタン群 -->
      <tr><td style="background:#ffffff;padding:8px 32px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr><td align="center" style="padding:0 0 12px;">
            <a href="${esc(siteUrl)}/request/${esc(String(requestId))}/applications"
               style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:12px;letter-spacing:0.02em;">
              応募状況を確認する →
            </a>
          </td></tr>
          <tr><td align="center">
            <a href="${esc(siteUrl)}/request/${esc(String(requestId))}/extra-info"
               style="display:inline-block;background:#f8fafc;color:#475569;font-size:13px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:12px;border:1.5px solid #e2e8f0;">
              ✏️ 追加情報を入力する（任意）
            </a>
            <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;text-align:center;">部屋の広さ・家具状況を追加すると見積もり精度が上がります</p>
          </td></tr>
        </table>
      </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>見積もり依頼を受け付けました</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
       style="background:#f1f5f9;padding:24px 0 40px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="max-width:560px;margin:0 auto;">

      <!-- ヘッダー -->
      <tr><td style="background:#1e40af;border-radius:16px 16px 0 0;padding:28px 32px 24px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#93c5fd;text-transform:uppercase;">PRO MATCH</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">見積もり依頼を受け付けました</p>
        <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">内装職人マッチングサービス</p>
      </td></tr>

      <!-- 受付バッジ -->
      <tr><td style="background:#ffffff;padding:24px 32px 20px;text-align:center;">
        <span style="display:inline-block;background:#d1fae5;color:#065f46;font-size:13px;font-weight:700;padding:8px 20px;border-radius:100px;letter-spacing:0.04em;">
          ✓ &nbsp;受付完了
        </span>
        <p style="margin:14px 0 0;font-size:15px;color:#1e293b;line-height:1.7;">
          <strong style="color:#1e40af;">${esc(workType)}</strong>（${esc(area)}）の<br>
          ご依頼を受け付けました。<br>
          対応可能な職人から順次ご連絡いたします。
        </p>
      </td></tr>

      <!-- 依頼内容カード -->
      <tr><td style="background:#ffffff;padding:0 32px 24px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;">依頼内容</p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          ${detailRow('施工内容', workType)}
          ${detailRow('エリア', area)}
          ${detailRow('部屋タイプ', roomType)}
          ${detailRow('部屋サイズ', roomSize)}
          ${detailRow('希望時期', timing)}
          <tr>
            <td style="padding:10px 20px;">
              <span style="font-size:10px;color:#94a3b8;font-weight:700;display:block;margin-bottom:2px;letter-spacing:0.06em;text-transform:uppercase;">受付日時</span>
              <span style="font-size:14px;color:#1e293b;font-weight:600;">${esc(sentAt)}</span>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- 今後の流れ -->
      <tr><td style="background:#ffffff;padding:0 32px 24px;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;">今後の流れ</p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr><td style="padding:0 0 14px;">
            <table cellpadding="0" cellspacing="0" role="presentation"><tr>
              <td style="width:30px;vertical-align:top;padding-top:1px;">
                <span style="display:inline-block;width:22px;height:22px;background:#1d4ed8;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#fff;">✓</span>
              </td>
              <td>
                <p style="margin:0;font-size:11px;font-weight:700;color:#1d4ed8;">今日</p>
                <p style="margin:2px 0 0;font-size:13px;color:#1e293b;font-weight:600;">依頼を受け付けました</p>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:0 0 14px;">
            <table cellpadding="0" cellspacing="0" role="presentation"><tr>
              <td style="width:30px;vertical-align:top;padding-top:1px;">
                <span style="display:inline-block;width:22px;height:22px;background:#e2e8f0;border-radius:50%;"></span>
              </td>
              <td>
                <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;">順次</p>
                <p style="margin:2px 0 0;font-size:13px;color:#475569;">対応可能な職人から応募が届きます<br><span style="font-size:11px;color:#94a3b8;">早ければ当日中に届くこともあります</span></p>
              </td>
            </tr></table>
          </td></tr>
          <tr><td>
            <table cellpadding="0" cellspacing="0" role="presentation"><tr>
              <td style="width:30px;vertical-align:top;padding-top:1px;">
                <span style="display:inline-block;width:22px;height:22px;background:#e2e8f0;border-radius:50%;"></span>
              </td>
              <td>
                <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;">マッチング後</p>
                <p style="margin:2px 0 0;font-size:13px;color:#475569;">気に入った職人を選んで成約</p>
              </td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>

      <!-- 募集期間について -->
      <tr><td style="background:#ffffff;padding:0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 18px;">
          <tr><td>
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;">募集期間について</p>
            <p style="margin:0;font-size:13px;color:#166534;line-height:1.7;">
              職人からの応募は、<strong>投稿から5日間を目安</strong>に受け付けます。<br>
              5日後を目安に、継続するか確認させていただく場合があります。<br>
              追加の写真や動画は、メール内のリンクからいつでも送れます。
            </p>
          </td></tr>
        </table>
      </td></tr>

      ${ctaHtml}

      <!-- 安心ポイント -->
      <tr><td style="background:#ffffff;padding:0 32px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#eff6ff;border-radius:12px;padding:16px 20px;">
          <tr><td>
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#3b82f6;letter-spacing:0.08em;text-transform:uppercase;">安心ポイント</p>
            <table cellpadding="0" cellspacing="0" role="presentation">
              ${['✅ お客様のご利用は完全無料です',
                 '✅ しつこい営業連絡はありません',
                 '✅ 断っても一切費用はかかりません',
                 '✅ 応募が届いたらメールでお知らせします',
                 '✅ 開示されるのはメールアドレスのみです',
                ].map(t => `<tr><td style="font-size:13px;color:#1e40af;padding:3px 0;line-height:1.5;">${t}</td></tr>`).join('')}
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- フッター -->
      <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#64748b;">PRO MATCH — 内装職人マッチング</p>
        <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
          このメールはシステムから自動送信されています。<br>
          迷惑メールフォルダに届いた場合はご確認ください。
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── プレーンテキスト版（フォールバック） ─────────────────────────────────────

function buildText(p: {
  area: string;
  workType: string;
  roomType?: string;
  roomSize?: string;
  timing?: string;
  sentAt: string;
  siteUrl: string;
  requestId?: number | string;
}): string {
  const { area, workType, roomType, roomSize, timing, sentAt, siteUrl, requestId } = p;
  const lines = [
    '【PRO MATCH】見積もり依頼を受け付けました',
    '',
    `${workType}（${area}）のご依頼を受け付けました。`,
    '対応可能な職人から順次ご連絡いたします。',
    '',
    '── 依頼内容 ──',
    `施工内容：${workType}`,
    `エリア　：${area}`,
  ];
  if (roomType) lines.push(`部屋タイプ：${roomType}`);
  if (roomSize) lines.push(`部屋サイズ：${roomSize}`);
  if (timing)   lines.push(`希望時期　：${timing}`);
  lines.push(`受付日時　：${sentAt}`);

  if (requestId) {
    lines.push(
      '',
      '── 確認・追加情報 ──',
      `▼ 応募状況を確認する`,
      `${siteUrl}/request/${requestId}/applications`,
      '',
      `▼ 追加情報を入力する（任意）`,
      `${siteUrl}/request/${requestId}/extra-info`,
    );
  }

  lines.push(
    '',
    '── 募集期間について ──',
    '職人からの応募は、投稿から5日間を目安に受け付けます。',
    '5日後を目安に、継続するか確認させていただく場合があります。',
    '追加の写真や動画は、メール内のリンクからいつでも送れます。',
  );

  lines.push(
    '',
    '── 安心ポイント ──',
    '・お客様のご利用は完全無料です',
    '・断っても一切費用はかかりません',
    '・しつこい営業連絡はありません',
    '・応募が届いたらメールでお知らせします',
    '・開示されるのはメールアドレスのみです',
    '',
    'このメールはシステムから自動送信されています。',
  );
  return lines.join('\n');
}

// ─── Handler ─────────────────────────────────────────────────────────────────

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
    const { to: toRaw, area, work_type, room_type, room_size, timing, request_id } = payload;

    // trim して空白・改行を除去
    const to = (toRaw ?? '').trim();

    if (!to || !to.includes('@')) {
      console.error('[send-customer-email] invalid email:', JSON.stringify(toRaw));
      return new Response(JSON.stringify({
        ok: false, emailSent: false, reason: 'invalid_email', targetEmail: to,
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    console.log('[send-customer-email] Resend 送信開始 →', to, '/ request_id:', request_id);

    const sentAt = formatJST(new Date());
    const params = {
      area, workType: work_type,
      roomType: room_type, roomSize: room_size, timing,
      sentAt, siteUrl, requestId: request_id,
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     `PRO MATCH（内装職人マッチング） <${fromEmail}>`,
        to:       [to],
        reply_to: to,
        subject:  '見積もり依頼を受け付けました｜PRO MATCH',
        html:     buildHtml(params),
        text:     buildText(params),
      }),
    });

    const resBody = await res.text();

    if (!res.ok) {
      console.error('[send-customer-email] Resend error:', res.status, resBody, '/ to:', to);
      return new Response(JSON.stringify({
        ok: false, emailSent: false,
        reason: 'resend_error',
        targetEmail: to,
        resendStatus: res.status,
        resendDetail: resBody,
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    let resendData: { id?: string } = {};
    try { resendData = JSON.parse(resBody); } catch { /* ignore */ }

    console.log('[send-customer-email] 送信成功 id:', resendData.id, '/ to:', to);
    return new Response(JSON.stringify({
      ok: true, emailSent: true,
      reason: 'sent',
      targetEmail: to,
      resendId: resendData.id ?? null,
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[send-customer-email] 予期しないエラー:', err);
    return new Response(JSON.stringify({
      ok: false, emailSent: false, reason: 'unexpected_error',
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
