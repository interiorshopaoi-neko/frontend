import { Resend } from 'resend';

// Phase6-A+B: 職人が応募した直後に
//   A) 管理者 (interior.shop.aoi@gmail.com) へ応募通知
//   B) 依頼者 (contact_value) へ「応募が届きました」通知
// 失敗は呼び出し側で握りつぶされる (fire-and-forget)。応募保存には影響しない。

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_TO       = 'interior.shop.aoi@gmail.com';
const ADMIN_FROM     = 'Aoi Interior <onboarding@resend.dev>';        // 管理者通知用（テスト送信元）
const CUSTOMER_FROM  = 'PRO MATCH <noreply@promatch-app.jp>';         // 依頼者通知用（本番ドメイン）
const SITE_URL       = 'https://promatch-app.jp';

// Supabase REST (anon key — estimate_requests に anon SELECT ポリシーが設定済み)
// Vercel に設定済みの環境変数名に合わせてフォールバック順で読む
const SUPABASE_URL      = process.env.SUPABASE_URL
                       || process.env.VITE_SUPABASE_URL
                       || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
                       || process.env.VITE_SUPABASE_ANON_KEY
                       || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function sanitizeEmail(raw: string | undefined | null): string {
  if (!raw) return '';
  return String(raw).replace(/^mailto:/i, '').trim();
}

// ─── HTML メールテンプレート（依頼者向け） ─────────────────────────────────────
function buildCustomerHtml(params: {
  workType: string;
  area:     string;
  appUrl:   string;
}): string {
  const { workType, area, appUrl } = params;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>職人から応募が届きました</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
       style="background:#f1f5f9;padding:24px 0 40px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="max-width:560px;margin:0 auto;">

      <!-- ロゴ・ヘッダー -->
      <tr><td style="background:#1e40af;border-radius:16px 16px 0 0;padding:28px 32px 24px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#93c5fd;text-transform:uppercase;">PRO MATCH</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">職人から応募が届きました</p>
      </td></tr>

      <!-- 本文カード -->
      <tr><td style="background:#ffffff;padding:28px 32px 8px;">

        <p style="margin:0 0 20px;font-size:15px;color:#1e293b;line-height:1.7;">
          ご依頼の <strong style="color:#1e40af;">${escHtml(workType)}</strong>（${escHtml(area)}）に<br>
          職人から応募が届きました。<br>
          内容を確認して、気に入った職人を選んでください。
        </p>

        <!-- CTA ボタン -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr><td align="center" style="padding:4px 0 28px;">
            <a href="${appUrl}"
               style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:12px;letter-spacing:0.02em;">
              応募状況を確認する →
            </a>
          </td></tr>
        </table>

      </td></tr>

      <!-- 安心ポイント -->
      <tr><td style="background:#ffffff;padding:0 32px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#eff6ff;border-radius:12px;padding:16px 20px;">
          <tr><td>
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#3b82f6;letter-spacing:0.08em;text-transform:uppercase;">安心ポイント</p>
            <table cellpadding="0" cellspacing="0" role="presentation">
              ${['✅ お客様のご利用は完全無料です',
                 '✅ 断っても一切費用はかかりません',
                 '✅ 工事代金は職人と直接お支払い（PRO MATCHは預かりません）',
                 '✅ しつこい営業連絡はありません',
                 '✅ 開示されるのはメールアドレスのみです',
                ].map(t => `<tr><td style="font-size:13px;color:#1e40af;padding:3px 0;line-height:1.5;">${t}</td></tr>`).join('')}
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- フッター -->
      <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#64748b;">PRO MATCH — 内装職人マッチング</p>
        <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
          このメールはシステムから自動送信されています。<br>
          心当たりのない場合は無視してください。
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** HTML エスケープ（XSS防止） */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  // 環境変数チェック — どちらか欠けていたら即 500
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[notify-application] 環境変数 SUPABASE_URL / SUPABASE_ANON_KEY が未設定');
    res.status(500).json({ error: 'missing env: SUPABASE_URL or SUPABASE_ANON_KEY' });
    return;
  }

  const {
    request_id,
    craftsman_id,
    message,
    work_type,
    city,
    area,       // SwipeView は area で送る。city は旧フィールド名（両対応）
    created_at,
  } = req.body ?? {};

  // demo 案件は呼び出し側でガード済みだが二重保険
  if (typeof request_id === 'string' && request_id.startsWith('demo-')) {
    res.status(200).json({ ok: true, skipped: 'demo' });
    return;
  }

  const safeRequestId  = String(request_id  ?? '—');
  const safeCraftsman  = String(craftsman_id ?? '—');
  const safeWorkType   = String(work_type    ?? '—');
  const safeArea       = String(area ?? city ?? '—');   // area 優先、旧 city もフォールバック
  const safeMessage    = String(message      ?? '—');
  const safeCreatedAt  = typeof created_at === 'string' ? created_at : new Date().toISOString();
  const appUrl         = `${SITE_URL}/request/${safeRequestId}/applications`;

  // ── A) 管理者通知（プレーンテキスト — 内部確認用なので簡潔に） ──────────────
  const adminBody = [
    '職人から新しい応募がありました。',
    '',
    `応募日時　：${safeCreatedAt}`,
    `工事内容　：${safeWorkType}`,
    `エリア　　：${safeArea}`,
    `メッセージ：${safeMessage}`,
    '',
    `request_id  : ${safeRequestId}`,
    `craftsman_id: ${safeCraftsman}`,
    '',
    '▼ 管理画面で確認',
    `${SITE_URL}/admin/dashboard`,
    '',
    '▼ この案件の応募一覧',
    appUrl,
  ].join('\n');

  let adminOk = false;
  try {
    const { error } = await resend.emails.send({
      from:    ADMIN_FROM,
      to:      [ADMIN_TO],
      subject: '【PRO MATCH】職人から応募がありました',
      text:    adminBody,
    });
    if (error) {
      console.error('[notify-application] 管理者メール Resend error:', error);
    } else {
      adminOk = true;
    }
  } catch (err) {
    console.error('[notify-application] 管理者メール送信例外:', err);
  }

  // ── B) 依頼者通知（HTML メール） ─────────────────────────────────────────────
  let customerOk = false;
  try {
    const numId = Number(safeRequestId);
    const idParam = Number.isFinite(numId) && numId > 0 ? numId : null;

    if (idParam !== null) {
      const sbRes = await fetch(
        `${SUPABASE_URL}/rest/v1/estimate_requests?select=contact_value,contact_method&id=eq.${idParam}&limit=1`,
        {
          headers: {
            'apikey':        SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        },
      );

      if (sbRes.ok) {
        const rows = await sbRes.json() as Array<{ contact_value?: string; contact_method?: string }>;
        const row = rows?.[0];
        const customerEmail = sanitizeEmail(row?.contact_value);

        if (customerEmail && customerEmail.includes('@') && row?.contact_method === 'メール') {

          // プレーンテキスト版（HTMLメーラー未対応デバイス向けフォールバック）
          const customerText = [
            `【PRO MATCH】職人から応募が届きました`,
            '',
            `ご依頼の ${safeWorkType}（${safeArea}）に職人から応募が届きました。`,
            '内容を確認して、気に入った職人を選んでください。',
            '',
            `▼ 応募状況を確認する`,
            appUrl,
            '',
            '── 安心ポイント ──',
            '・お客様のご利用は完全無料です',
            '・断っても一切費用はかかりません',
            '・工事代金は職人と直接お支払い（PRO MATCHは預かりません）',
            '・しつこい営業連絡はありません',
            '・開示されるのはメールアドレスのみです',
            '',
            'このメールはシステムから自動送信されています。',
          ].join('\n');

          const { error: custErr } = await resend.emails.send({
            from:    CUSTOMER_FROM,
            to:      [customerEmail],
            subject: '【PRO MATCH】職人から応募が届きました',
            html:    buildCustomerHtml({ workType: safeWorkType, area: safeArea, appUrl }),
            text:    customerText,
          });

          if (custErr) {
            console.error('[notify-application] 依頼者メール Resend error:', custErr);
          } else {
            customerOk = true;
            console.log('[notify-application] 依頼者通知 送信成功:', customerEmail);
          }
        } else {
          console.log('[notify-application] 依頼者通知スキップ: contact_method が メール でないか無効なアドレス');
        }
      } else {
        console.error('[notify-application] estimate_requests 取得失敗:', sbRes.status, await sbRes.text());
      }
    } else {
      console.warn('[notify-application] request_id が数値でないため依頼者通知をスキップ:', safeRequestId);
    }
  } catch (err) {
    console.error('[notify-application] 依頼者通知 例外（応募は保存済み）:', err);
  }

  // 管理者通知が失敗しても 200 を返す（応募保存はすでに完了している）
  res.status(200).json({ ok: true, adminOk, customerOk });
}
