import { Resend } from 'resend';

// Phase6-A: 職人が「今すぐ行けます」で実応募した直後に、
// 管理者 (interior.shop.aoi@gmail.com) へプレーンテキストでメール通知を送る。
// api/notify.ts の Resend 実装パターンを踏襲。失敗は呼び出し側で握りつぶされる
// (fire-and-forget) ため、応募保存自体には影響しない。

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_TO   = 'interior.shop.aoi@gmail.com';
const ADMIN_FROM = 'Aoi Interior <onboarding@resend.dev>';
const ADMIN_BASE_URL = 'https://promatch-app.jp';

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
    created_at,
  } = req.body ?? {};

  // demo 案件は呼び出し側でガード済み (JobsSwipeView の demo guard)
  // だが二重保険として server 側でも 'demo-' プレフィックスを弾く。
  if (typeof request_id === 'string' && request_id.startsWith('demo-')) {
    res.status(200).json({ ok: true, skipped: 'demo' });
    return;
  }

  const safeRequestId  = typeof request_id  === 'string' ? request_id  : '—';
  const safeCraftsman  = typeof craftsman_id === 'string' ? craftsman_id : '—';
  const safeWorkType   = typeof work_type   === 'string' ? work_type   : '—';
  const safeCity       = typeof city        === 'string' ? city        : '—';
  const safeMessage    = typeof message     === 'string' ? message     : '—';
  const safeCreatedAt  = typeof created_at  === 'string' ? created_at  : new Date().toISOString();

  const body = [
    '職人から新しい応募がありました。',
    '',
    `応募日時　：${safeCreatedAt}`,
    `工事内容　：${safeWorkType}`,
    `エリア　　：${safeCity}`,
    `メッセージ：${safeMessage}`,
    '',
    `request_id  : ${safeRequestId}`,
    `craftsman_id: ${safeCraftsman}`,
    '',
    '▼ 管理画面で確認',
    `${ADMIN_BASE_URL}/admin/dashboard`,
    '',
    '▼ この案件の応募一覧',
    `${ADMIN_BASE_URL}/request/${safeRequestId}/applications`,
  ].join('\n');

  try {
    const { error } = await resend.emails.send({
      from: ADMIN_FROM,
      to:   [ADMIN_TO],
      subject: '【PRO MATCH】職人から応募がありました',
      text: body,
    });

    if (error) {
      console.error('[notify-application] Resend error:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[notify-application] 送信エラー:', err);
    res.status(500).json({ error: String(err) });
  }
}
