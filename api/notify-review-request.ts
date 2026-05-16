import { Resend } from 'resend';

// 職人が「工事完了を報告する」後に、依頼者へレビュー依頼メールを送る。
// fire-and-forget 前提: エラーは 200 + { customerOk: false } で返す。DB 更新には影響しない。

const resend = new Resend(process.env.RESEND_API_KEY);

const CUSTOMER_FROM = 'PRO MATCH <noreply@promatch-app.jp>';
const ADMIN_TO      = 'interior.shop.aoi@gmail.com';
const ADMIN_FROM    = 'Aoi Interior <onboarding@resend.dev>';
const SITE_URL      = 'https://promatch-app.jp';

const SUPABASE_URL      = process.env.SUPABASE_URL
                       || process.env.VITE_SUPABASE_URL
                       || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
                       || process.env.VITE_SUPABASE_ANON_KEY
                       || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ─── HTML テンプレート ────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCustomerHtml(params: {
  workType:  string;
  area:      string;
  reviewUrl: string;
}): string {
  const { workType, area, reviewUrl } = params;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>工事完了の確認とレビューをお願いします</title>
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
        <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">工事完了のご確認と<br>レビューのお願い</p>
      </td></tr>

      <!-- 本文 -->
      <tr><td style="background:#ffffff;padding:28px 32px 16px;">
        <p style="margin:0 0 8px;font-size:18px;font-weight:800;color:#1e293b;line-height:1.4;">
          工事はいかがでしたか？
        </p>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">
          ご依頼の <strong style="color:#1e40af;">${escHtml(workType)}</strong>（${escHtml(area)}）の<br>
          工事完了の報告が届きました。<br>
          よかった点・気になった点を 1 分で教えてください。<br>
          レビューは職人の信用と次の依頼者への大切な参考になります。
        </p>
      </td></tr>

      <!-- CTA -->
      <tr><td style="background:#ffffff;padding:0 32px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr><td align="center">
            <a href="${escHtml(reviewUrl)}"
               style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:18px 40px;border-radius:12px;letter-spacing:0.02em;">
              ⭐ 1分でレビューを書く →
            </a>
          </td></tr>
          <tr><td align="center" style="padding-top:10px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">レビューの投稿は任意です。強制ではありません。</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- 安心ポイント -->
      <tr><td style="background:#ffffff;padding:0 32px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#eff6ff;border-radius:12px;padding:16px 20px;">
          <tr><td>
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#3b82f6;letter-spacing:0.08em;text-transform:uppercase;">レビューについて</p>
            <table cellpadding="0" cellspacing="0" role="presentation">
              ${['✅ レビューは1分で完了します',
                 '✅ 職人の信用と次の依頼者への参考になります',
                 '✅ 投稿後、職人プロフィールに評価が反映されます',
                 '✅ 個人情報は表示されません',
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
          レビューの投稿は任意です。強制ではありません。
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildCustomerText(params: {
  workType:  string;
  area:      string;
  reviewUrl: string;
}): string {
  const { workType, area, reviewUrl } = params;
  return [
    '【PRO MATCH】工事完了の確認とレビューをお願いします',
    '',
    '工事はいかがでしたか？',
    '',
    `ご依頼の ${workType}（${area}）の工事完了の報告が届きました。`,
    'よかった点・気になった点を 1 分で教えてください。',
    'レビューは職人の信用と次の依頼者への大切な参考になります。',
    '',
    '▼ 1分でレビューを書く',
    reviewUrl,
    '',
    '── レビューについて ──',
    '・レビューは1分で完了します',
    '・職人の信用と次の依頼者への参考になります',
    '・投稿後、職人プロフィールに評価が反映されます',
    '・個人情報は表示されません',
    '',
    'レビューの投稿は任意です。強制ではありません。',
    'このメールはシステムから自動送信されています。',
  ].join('\n');
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[notify-review-request] 環境変数 SUPABASE_URL / SUPABASE_ANON_KEY が未設定');
    res.status(500).json({ error: 'missing env' });
    return;
  }

  const { request_id, application_id } = req.body ?? {};

  if (!request_id) {
    res.status(400).json({ error: 'request_id is required' });
    return;
  }

  // demo 案件スキップ
  if (
    (typeof request_id    === 'string' && request_id.startsWith('demo-')) ||
    (typeof application_id === 'string' && application_id?.startsWith('demo-'))
  ) {
    res.status(200).json({ ok: true, skipped: 'demo' });
    return;
  }

  const sbHeaders = {
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json',
  };

  let customerOk = false;
  let adminOk    = false;

  try {
    // ── estimate_requests から contact_value / work_type / area を取得 ──────────
    const numReqId = Number(request_id);
    const idParam  = Number.isFinite(numReqId) && numReqId > 0 ? numReqId : null;

    if (!idParam) {
      console.warn('[notify-review-request] request_id が数値でない:', request_id);
      res.status(200).json({ ok: true, customerOk: false, adminOk: false, reason: 'invalid_request_id' });
      return;
    }

    const reqRes = await fetch(
      `${SUPABASE_URL}/rest/v1/estimate_requests?select=work_type,area,contact_value,contact_method&id=eq.${idParam}&limit=1`,
      { headers: sbHeaders },
    );

    if (!reqRes.ok) {
      console.error('[notify-review-request] estimate_requests 取得失敗:', reqRes.status, await reqRes.text());
      res.status(200).json({ ok: true, customerOk: false, adminOk: false, reason: 'fetch_error' });
      return;
    }

    const rows = await reqRes.json() as Array<{
      work_type?:      string;
      area?:           string;
      contact_value?:  string;
      contact_method?: string;
    }>;
    const row = rows?.[0];

    const workType = row?.work_type ?? '内装工事';
    const area     = row?.area     ?? '—';
    const rawEmail = row?.contact_value ?? '';
    const customerEmail = rawEmail.replace(/^mailto:/i, '').trim();

    const reviewUrl = `${SITE_URL}/request/${idParam}/review`;

    // ── 依頼者へレビュー依頼メール ───────────────────────────────────────────
    if (customerEmail && customerEmail.includes('@') && row?.contact_method === 'メール') {
      try {
        const { error: custErr } = await resend.emails.send({
          from:    CUSTOMER_FROM,
          to:      [customerEmail],
          subject: '【PRO MATCH】工事完了の確認とレビューをお願いします',
          html:    buildCustomerHtml({ workType, area, reviewUrl }),
          text:    buildCustomerText({ workType, area, reviewUrl }),
        });
        if (custErr) {
          console.error('[notify-review-request] 依頼者メール Resend error:', custErr);
        } else {
          customerOk = true;
          console.log('[notify-review-request] 依頼者レビュー依頼メール 送信成功:', customerEmail);
        }
      } catch (err) {
        console.error('[notify-review-request] 依頼者メール 例外:', err);
      }
    } else {
      console.log('[notify-review-request] 依頼者メールスキップ: contact_method が メール でないか無効:', row?.contact_method, customerEmail);
    }

    // ── 管理者通知（プレーンテキスト） ────────────────────────────────────────
    try {
      const { error: adminErr } = await resend.emails.send({
        from: ADMIN_FROM,
        to:   [ADMIN_TO],
        subject: '【PRO MATCH】工事完了報告が届きました',
        text: [
          '工事完了報告が届きました。',
          '',
          `工事内容      : ${workType}`,
          `エリア        : ${area}`,
          `request_id    : ${request_id}`,
          `application_id: ${application_id ?? '—'}`,
          '',
          `▼ 管理画面`,
          `${SITE_URL}/admin/dashboard`,
        ].join('\n'),
      });
      if (adminErr) {
        console.error('[notify-review-request] 管理者メール Resend error:', adminErr);
      } else {
        adminOk = true;
      }
    } catch (err) {
      console.error('[notify-review-request] 管理者メール 例外:', err);
    }

  } catch (err) {
    console.error('[notify-review-request] 予期しないエラー:', err);
  }

  res.status(200).json({ ok: true, customerOk, adminOk });
}
