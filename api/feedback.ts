// ================================================================
// POST /api/feedback
//
// 利用者からの不具合・改善報告を受け取る。
// 1. feedback_reports テーブルに保存（service role key 使用）
// 2. 運営者へメール通知（失敗してもDB保存成功なら 200 を返す）
//
// セキュリティ:
//   - 運営者メールアドレスはフロントに出さない（サーバーサイドのみ）
//   - category / message は必須バリデーション
//   - contactEmail は任意・簡易フォーマットチェックのみ
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const RESEND_API_KEY = (process.env.RESEND_API_KEY ?? '').trim();
const SUPABASE_URL   = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://lboskhjidbqxwrenwjdr.supabase.co'
).trim();
const SUPABASE_SVC_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

// 運営者メールアドレス（フロントには出さない）
const ADMIN_EMAIL = 'interior.shop.aoi@gmail.com';

function sbHeaders() {
  return {
    'apikey':        SUPABASE_SVC_KEY,
    'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  };
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SVC_KEY) {
    console.error('[feedback] missing env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const {
    category,
    message,
    contactEmail,
    pageUrl,
    userRole,
    userId,
    screenshotUrl,
    meta,
  } = (req.body ?? {}) as Record<string, unknown>;

  // ── バリデーション ──────────────────────────────────────────────
  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ error: 'category は必須です' });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message は必須です' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'message は2000文字以内にしてください' });
  }
  const contactEmailStr = typeof contactEmail === 'string' ? contactEmail.trim() : '';
  if (contactEmailStr && !isValidEmail(contactEmailStr)) {
    return res.status(400).json({ error: 'メールアドレスの形式が正しくありません' });
  }

  const categoryStr     = category.trim();
  const messageStr      = message.trim();
  const pageUrlStr      = typeof pageUrl       === 'string' ? pageUrl.trim()       : '';
  const userRoleStr     = typeof userRole      === 'string' ? userRole.trim()      : '';
  const userIdStr       = typeof userId        === 'string' ? userId.trim()        : '';
  const screenshotUrlStr = typeof screenshotUrl === 'string' ? screenshotUrl.trim() : '';
  const metaObj         = meta && typeof meta === 'object' && !Array.isArray(meta)
    ? meta as Record<string, unknown>
    : {};

  // ── DB 保存 ────────────────────────────────────────────────────
  // ── admin_settings でメール通知ON/OFF確認 ─────────────────────
  let emailNotificationEnabled = true; // デフォルトはON
  try {
    const settingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_settings?key=eq.feedback_email_notification&select=value`,
      { headers: sbHeaders() },
    );
    if (settingRes.ok) {
      const rows = await settingRes.json() as Array<{ value: { enabled?: boolean } }>;
      if (rows.length > 0) {
        emailNotificationEnabled = rows[0].value?.enabled !== false;
      }
    }
  } catch (e) {
    console.warn('[feedback] admin_settings fetch failed, defaulting to email ON:', e);
  }

  const insertBody = {
    category:       categoryStr,
    message:        messageStr,
    contact_email:  contactEmailStr    || null,
    page_url:       pageUrlStr         || null,
    user_role:      userRoleStr        || null,
    user_id:        userIdStr          || null,
    screenshot_url: screenshotUrlStr   || null,
    meta:           metaObj,
    status:         'new',
  };
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/feedback_reports`, {
    method:  'POST',
    headers: sbHeaders(),
    body: JSON.stringify(insertBody),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text().catch(() => '(empty)');
    // 実際の Supabase エラーを Vercel Logs に出力して診断しやすくする
    console.error(
      '[feedback] DB insert failed',
      '\n  status:', insertRes.status,
      '\n  body:'  , insertBody,
      '\n  supabase error:', errText,
    );
    // テーブル未作成の場合は 404 / "relation does not exist" が errText に入る
    const isTableMissing = errText.includes('does not exist') || insertRes.status === 404;
    const userMsg = isTableMissing
      ? '一時的にご利用できません。しばらく経ってから再度お試しください。'
      : 'お気持ちは届いていますが、保存に失敗しました。時間をおいて再試行してください。';
    return res.status(500).json({ error: userMsg });
  }

  // ── 運営者へメール通知（admin_settingsでONの場合のみ）──────────
  if (emailNotificationEnabled) {
    try {
      if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
      const resend = new Resend(RESEND_API_KEY);
      const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      const viewport = metaObj.viewport as { width?: number; height?: number } | undefined;
      const userAgent = typeof metaObj.userAgent === 'string' ? metaObj.userAgent : '';

      await resend.emails.send({
        from:    'Aoi Interior <onboarding@resend.dev>',
        to:      [ADMIN_EMAIL],
        subject: '【PRO MATCH】改善報告が届きました',
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#1e293b;margin-bottom:16px">改善報告</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;background:#f8fafc;font-weight:bold;width:120px">種類</td>
                  <td style="padding:8px;border-bottom:1px solid #e2e8f0">${categoryStr}</td></tr>
              <tr><td style="padding:8px;background:#f8fafc;font-weight:bold;vertical-align:top">内容</td>
                  <td style="padding:8px;border-bottom:1px solid #e2e8f0;white-space:pre-wrap">${messageStr}</td></tr>
              <tr><td style="padding:8px;background:#f8fafc;font-weight:bold">連絡先</td>
                  <td style="padding:8px;border-bottom:1px solid #e2e8f0">${contactEmailStr || '（なし）'}</td></tr>
              <tr><td style="padding:8px;background:#f8fafc;font-weight:bold">ページURL</td>
                  <td style="padding:8px;border-bottom:1px solid #e2e8f0">${pageUrlStr || '（なし）'}</td></tr>
              <tr><td style="padding:8px;background:#f8fafc;font-weight:bold">利用者種別</td>
                  <td style="padding:8px;border-bottom:1px solid #e2e8f0">${userRoleStr || '（不明）'}</td></tr>
              ${screenshotUrlStr ? `
              <tr><td style="padding:8px;background:#f8fafc;font-weight:bold">スクショ</td>
                  <td style="padding:8px;border-bottom:1px solid #e2e8f0">
                    <a href="${screenshotUrlStr}" style="color:#2563eb">画像を開く</a>
                  </td></tr>` : ''}
              ${userAgent ? `
              <tr><td style="padding:8px;background:#f8fafc;font-weight:bold">UA</td>
                  <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:11px">${userAgent}</td></tr>` : ''}
              ${viewport ? `
              <tr><td style="padding:8px;background:#f8fafc;font-weight:bold">Viewport</td>
                  <td style="padding:8px;border-bottom:1px solid #e2e8f0">${viewport.width ?? '?'}×${viewport.height ?? '?'}</td></tr>` : ''}
              <tr><td style="padding:8px;background:#f8fafc;font-weight:bold">投稿日時</td>
                  <td style="padding:8px">${now}</td></tr>
            </table>
            <p style="margin-top:20px">
              <a href="https://promatch-app.jp/admin/feedback" style="color:#2563eb">
                → 管理画面で確認する
              </a>
            </p>
          </div>
        `,
        text: [
          '【PRO MATCH】改善報告が届きました',
          '',
          `種類: ${categoryStr}`,
          `内容:\n${messageStr}`,
          `連絡先: ${contactEmailStr || 'なし'}`,
          `ページURL: ${pageUrlStr || 'なし'}`,
          `利用者種別: ${userRoleStr || '不明'}`,
          screenshotUrlStr ? `スクショ: ${screenshotUrlStr}` : '',
          userAgent ? `UA: ${userAgent}` : '',
          viewport ? `Viewport: ${viewport.width}×${viewport.height}` : '',
          `投稿日時: ${now}`,
          '',
          '管理画面: https://promatch-app.jp/admin/feedback',
        ].filter(Boolean).join('\n'),
      });
    } catch (emailErr) {
      console.error('[feedback] email notification failed:', emailErr);
      // メール失敗はログのみ。フロントへは成功を返す。
    }
  } else {
    console.log('[feedback] email notification skipped (disabled in admin_settings)');
  }

  return res.status(200).json({ ok: true });
}
