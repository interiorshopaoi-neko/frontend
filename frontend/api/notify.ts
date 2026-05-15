import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const {
    area,
    work_type,
    contact_method,
    contact_value,
    created_at,
  } = req.body ?? {};

  const body = [
    '新しい見積もり依頼が届きました。',
    '',
    `受付日時　：${created_at    ?? '—'}`,
    `施工エリア：${area          ?? '—'}`,
    `施工内容　：${work_type     ?? '—'}`,
    `連絡方法　：${contact_method ?? '—'}`,
    `連絡先　　：${contact_value  ?? '—'}`,
    '',
    '▼ 管理画面で確認',
    'https://promatch-app.jp/admin/requests',
  ].join('\n');

  try {
    const { error } = await resend.emails.send({
      from: 'PRO MATCH 管理 <noreply@promatch-app.jp>',
      to:   ['interior.shop.aoi@gmail.com'],
      subject: '新しい見積もり依頼が届きました',
      text: body,
    });

    if (error) {
      console.error('[notify] Resend error:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[notify] 送信エラー:', err);
    res.status(500).json({ error: String(err) });
  }
}
