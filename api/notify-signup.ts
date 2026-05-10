import { Resend } from 'resend';

// Phase6-B: 新規職人登録（craftsman role の signUp 成功 + craftsmen 行作成）直後に、
// 管理者 (interior.shop.aoi@gmail.com) へプレーンテキストでメール通知を送る。
// api/notify.ts / api/notify-application.ts の Resend 実装パターンを踏襲。
// 失敗は呼び出し側の fire-and-forget で握りつぶされるため、register 成功 UX には影響しない。

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_TO   = 'interior.shop.aoi@gmail.com';
const ADMIN_FROM = 'Aoi Interior <onboarding@resend.dev>';
const ADMIN_BASE_URL = 'https://frontend-alpha-gray-75.vercel.app';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const {
    user_id,
    name,
    email,
    role,
    created_at,
  } = req.body ?? {};

  // customer 誤通知を server 側でも二重防御。craftsman 以外は通知しない。
  if (role !== 'craftsman') {
    res.status(200).json({ ok: true, skipped: 'non-craftsman role' });
    return;
  }

  const safeUserId    = typeof user_id    === 'string' ? user_id    : '—';
  const safeName      = typeof name       === 'string' ? name       : '—';
  const safeEmail     = typeof email      === 'string' ? email      : '—';
  const safeRole      = typeof role       === 'string' ? role       : '—';
  const safeCreatedAt = typeof created_at === 'string' ? created_at : new Date().toISOString();

  const body = [
    '新しい職人登録がありました。',
    '',
    `登録日時：${safeCreatedAt}`,
    `名前　　：${safeName}`,
    `email　 ：${safeEmail}`,
    `role　　：${safeRole}`,
    `user_id ：${safeUserId}`,
    '',
    '▼ 管理画面で確認',
    `${ADMIN_BASE_URL}/admin/dashboard`,
  ].join('\n');

  try {
    const { error } = await resend.emails.send({
      from: ADMIN_FROM,
      to:   [ADMIN_TO],
      subject: '【PRO MATCH】新しい職人登録がありました',
      text: body,
    });

    if (error) {
      console.error('[notify-signup] Resend error:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[notify-signup] 送信エラー:', err);
    res.status(500).json({ error: String(err) });
  }
}
