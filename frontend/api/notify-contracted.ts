import { Resend } from 'resend';

// 成約確定後に職人へ通知を送る。
// fire-and-forget 前提: エラーは 200 + { contractedOk: false } で返す。成約保存には影響しない。

const resend = new Resend(process.env.RESEND_API_KEY);

const CRAFTSMAN_FROM = 'PRO MATCH <noreply@promatch-app.jp>';
const ADMIN_TO       = 'interior.shop.aoi@gmail.com';
const ADMIN_FROM     = 'Aoi Interior <onboarding@resend.dev>';
const SITE_URL       = 'https://promatch-app.jp';

// Supabase REST（anon key — SECURITY DEFINER 関数経由で craftsman email を取得）
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

function buildCraftsmanHtml(params: {
  craftsmanName: string;
  workType:      string;
  area:          string;
  dashboardUrl:  string;
}): string {
  const { craftsmanName, workType, area, dashboardUrl } = params;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>依頼者があなたを選択しました</title>
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
        <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">依頼者があなたを選択しました</p>
      </td></tr>

      <!-- 本文 -->
      <tr><td style="background:#ffffff;padding:28px 32px 20px;">
        <p style="margin:0 0 20px;font-size:15px;color:#1e293b;line-height:1.7;">
          ${escHtml(craftsmanName)} さん、おめでとうございます！<br>
          <strong style="color:#1e40af;">${escHtml(workType)}</strong>（${escHtml(area)}）の<br>
          依頼者があなたを選択しました。
        </p>
      </td></tr>

      <!-- 連絡先確認の案内 -->
      <tr><td style="background:#ffffff;padding:0 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#f0fdf4;border-radius:12px;padding:14px 18px;border:1px solid #bbf7d0;">
          <tr><td>
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#166534;">連絡先の確認方法</p>
            <p style="margin:0;font-size:13px;color:#15803d;line-height:1.8;">
              案件管理画面を開き、成約済み案件の<br>
              「連絡先を確認する」ボタンから依頼者の連絡先をご確認ください。<br>
              <strong>初回2件まで無料</strong>でご確認いただけます。
            </p>
          </td></tr>
        </table>
      </td></tr>

      <!-- CTA -->
      <tr><td style="background:#ffffff;padding:0 32px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr><td align="center" style="padding:0 0 12px;">
            <a href="${escHtml(dashboardUrl)}"
               style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:12px;letter-spacing:0.02em;">
              案件管理を開く →
            </a>
          </td></tr>
        </table>
      </td></tr>

      <!-- 安心ポイント -->
      <tr><td style="background:#ffffff;padding:0 32px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#eff6ff;border-radius:12px;padding:16px 20px;">
          <tr><td>
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#3b82f6;letter-spacing:0.08em;text-transform:uppercase;">PRO MATCH からのお願い</p>
            <table cellpadding="0" cellspacing="0" role="presentation">
              ${['✅ 案件管理画面から「連絡先を確認する」で連絡先を取得してください',
                 '✅ 連絡先は成約済みの案件のみ開示されます',
                 '✅ 工事完了後は「工事完了を報告する」をお忘れなく',
                 '✅ 不明点はダッシュボードのお問い合わせよりご連絡ください',
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
          心当たりのない場合は無視してください。
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildCraftsmanText(params: {
  craftsmanName: string;
  workType:      string;
  area:          string;
  dashboardUrl:  string;
}): string {
  const { craftsmanName, workType, area, dashboardUrl } = params;
  return [
    '【PRO MATCH】依頼者があなたを選択しました',
    '',
    `${craftsmanName} さん、おめでとうございます！`,
    `${workType}（${area}）の依頼者があなたを選択しました。`,
    '',
    '【連絡先の確認方法】',
    '案件管理画面を開き、成約済み案件の',
    '「連絡先を確認する」ボタンから依頼者の連絡先をご確認ください。',
    '初回2件まで無料でご確認いただけます。',
    '',
    '▼ 案件管理を開く',
    dashboardUrl,
    '',
    '── PRO MATCH からのお願い ──',
    '・「連絡先を確認する」ボタンから連絡先を取得してください',
    '・連絡先は成約済みの案件のみ開示されます',
    '・工事完了後は「工事完了を報告する」をお忘れなく',
    '・不明点はダッシュボードのお問い合わせよりご連絡ください',
    '',
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
    console.error('[notify-contracted] 環境変数 SUPABASE_URL / SUPABASE_ANON_KEY が未設定');
    res.status(500).json({ error: 'missing env' });
    return;
  }

  const { request_id, application_id } = req.body ?? {};

  if (!application_id) {
    res.status(400).json({ error: 'application_id is required' });
    return;
  }

  // demo 案件スキップ
  if (
    (typeof application_id === 'string' && application_id.startsWith('demo-')) ||
    (typeof request_id    === 'string' && request_id.startsWith('demo-'))
  ) {
    res.status(200).json({ ok: true, skipped: 'demo' });
    return;
  }

  const sbHeaders = {
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json',
  };

  let contractedOk = false;
  let adminOk      = false;

  try {
    // ── Step 1: estimate_requests から work_type / area を取得 ─────────────────
    const numReqId = Number(request_id);
    const reqIdParam = Number.isFinite(numReqId) && numReqId > 0 ? numReqId : null;

    let workType = '内装工事';
    let area     = '—';

    if (reqIdParam) {
      const reqRes = await fetch(
        `${SUPABASE_URL}/rest/v1/estimate_requests?select=work_type,area&id=eq.${reqIdParam}&limit=1`,
        { headers: sbHeaders },
      );
      if (reqRes.ok) {
        const rows = await reqRes.json() as Array<{ work_type?: string; area?: string }>;
        workType = rows?.[0]?.work_type ?? workType;
        area     = rows?.[0]?.area     ?? area;
      }
    }

    // ── Step 2: SECURITY DEFINER RPC で craftsman email / 名前を取得 ───────────
    const rpcRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_craftsman_email_for_contracted`,
      {
        method:  'POST',
        headers: sbHeaders,
        body:    JSON.stringify({ p_application_id: application_id }),
      },
    );

    if (!rpcRes.ok) {
      const errText = await rpcRes.text();
      console.error('[notify-contracted] RPC error:', rpcRes.status, errText);
      res.status(200).json({ ok: true, contractedOk: false, adminOk: false, reason: 'rpc_error' });
      return;
    }

    const rpcRows = await rpcRes.json() as Array<{
      craftsman_email?: string;
      shop_name?:       string;
      full_name?:       string;
    }>;
    const craftsmanRow = rpcRows?.[0];

    if (!craftsmanRow?.craftsman_email || !craftsmanRow.craftsman_email.includes('@')) {
      console.warn('[notify-contracted] craftsman email 取得失敗または空:', craftsmanRow);
      res.status(200).json({ ok: true, contractedOk: false, adminOk: false, reason: 'no_email' });
      return;
    }

    const craftsmanEmail = craftsmanRow.craftsman_email.replace(/^mailto:/i, '').trim();
    const craftsmanName  = craftsmanRow.shop_name || craftsmanRow.full_name || '職人さん';
    const dashboardUrl   = `${SITE_URL}/craftsman/dashboard`;

    const emailParams = { craftsmanName, workType, area, dashboardUrl };

    // ── Step 3: 職人へ成約通知メール ─────────────────────────────────────────
    try {
      const { error: craftErr } = await resend.emails.send({
        from:    CRAFTSMAN_FROM,
        to:      [craftsmanEmail],
        subject: '【PRO MATCH】依頼者があなたを選択しました',
        html:    buildCraftsmanHtml(emailParams),
        text:    buildCraftsmanText(emailParams),
      });

      if (craftErr) {
        console.error('[notify-contracted] 職人メール Resend error:', craftErr);
      } else {
        contractedOk = true;
        console.log('[notify-contracted] 職人通知 送信成功:', craftsmanEmail);
      }
    } catch (err) {
      console.error('[notify-contracted] 職人メール 例外:', err);
    }

    // ── Step 4: 管理者通知（プレーンテキスト） ────────────────────────────────
    try {
      const { error: adminErr } = await resend.emails.send({
        from: ADMIN_FROM,
        to:   [ADMIN_TO],
        subject: '【PRO MATCH】成約が発生しました',
        text: [
          '成約が発生しました。',
          '',
          `工事内容    : ${workType}`,
          `エリア      : ${area}`,
          `application_id: ${application_id}`,
          `request_id    : ${request_id ?? '—'}`,
          `職人名        : ${craftsmanName}`,
          `職人メール    : ${craftsmanEmail}`,
          '',
          `▼ 管理画面`,
          `${SITE_URL}/admin/dashboard`,
        ].join('\n'),
      });
      if (adminErr) {
        console.error('[notify-contracted] 管理者メール Resend error:', adminErr);
      } else {
        adminOk = true;
      }
    } catch (err) {
      console.error('[notify-contracted] 管理者メール 例外:', err);
    }

  } catch (err) {
    console.error('[notify-contracted] 予期しないエラー:', err);
  }

  res.status(200).json({ ok: true, contractedOk, adminOk });
}
