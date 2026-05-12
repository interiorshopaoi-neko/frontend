import { Resend } from 'resend';

// Phase6-A+B: 職人が応募した直後に
//   A) 管理者 (interior.shop.aoi@gmail.com) へ応募通知
//   B) 依頼者 (contact_value) へ「応募が届きました」通知
// 失敗は呼び出し側で握りつぶされる (fire-and-forget)。応募保存には影響しない。

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_TO   = 'interior.shop.aoi@gmail.com';
const ADMIN_FROM = 'Aoi Interior <onboarding@resend.dev>';
const SITE_URL   = 'https://promatch-app.jp';

// Supabase REST (anon key — estimate_requests に anon SELECT ポリシーが設定済み)
const SUPABASE_URL     = 'https://lboskhjidbqxwrenwjdr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_v2U-RibzTmtIOJnY3f5pyw_aRDL4dJG';

function sanitizeEmail(raw: string | undefined | null): string {
  if (!raw) return '';
  return String(raw).replace(/^mailto:/i, '').trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).end();
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

  // ── A) 管理者通知（既存動作を維持） ────────────────────────────────────────
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
      from: ADMIN_FROM,
      to:   [ADMIN_TO],
      subject: '【PRO MATCH】職人から応募がありました',
      text: adminBody,
    });
    if (error) {
      console.error('[notify-application] 管理者メール Resend error:', error);
    } else {
      adminOk = true;
    }
  } catch (err) {
    console.error('[notify-application] 管理者メール送信例外:', err);
  }

  // ── B) 依頼者通知（新規追加） ────────────────────────────────────────────────
  // estimate_requests から contact_value を取得（anon SELECT ポリシーで読める）
  let customerOk = false;
  try {
    // request_id が数値か文字列かを吸収して Supabase に渡す
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
          const customerBody = [
            '職人から応募が届きました。',
            '',
            '以下のページで応募内容を確認し、気に入った職人を選んで成約できます。',
            '',
            `▼ 応募状況を確認する`,
            appUrl,
            '',
            '─────────────────────────────',
            '■ PRO MATCH（内装職人マッチング）',
            '・お客様のご利用は完全無料です',
            '・しつこい営業連絡はありません',
            '・断っても一切費用はかかりません',
            '─────────────────────────────',
            'このメールはシステムから自動送信されています。',
          ].join('\n');

          const { error: custErr } = await resend.emails.send({
            from:    ADMIN_FROM,
            to:      [customerEmail],
            subject: '【PRO MATCH】職人から応募が届きました',
            text:    customerBody,
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
