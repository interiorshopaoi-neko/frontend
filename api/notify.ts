import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Dry-run: 「もし自動通知なら誰が対象か」をログだけ出す ───────────────────
// 実際の送信は行わない。service_role key で RLS をバイパスして craftsmen を取得。

const SUPABASE_URL      = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_SVC_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

async function runDryRun(area: string, workType: string, requestId?: string) {
  if (!SUPABASE_URL || !SUPABASE_SVC_KEY) {
    console.warn('[dry-run] SUPABASE env missing — skipping');
    return;
  }
  try {
    const url = `${SUPABASE_URL}/rest/v1/craftsmen` +
      `?select=user_id,full_name,shop_name,service_area,work_types` +
      `&notification_enabled=eq.true` +
      `&email=not.is.null` +
      `&limit=500`;

    const r = await fetch(url, {
      headers: {
        'apikey':        SUPABASE_SVC_KEY,
        'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
        'Accept':        'application/json',
      },
    });
    if (!r.ok) {
      console.warn('[dry-run] craftsmen fetch failed:', r.status);
      return;
    }

    const craftsmen = await r.json() as Array<{
      user_id: string; full_name: string | null; shop_name: string | null;
      service_area: string | null; work_types: string[] | null;
    }>;

    const selected: Array<{ id: string; name: string; reason: string }> = [];
    let skipped = 0;

    for (const c of craftsmen) {
      const cArea  = c.service_area ?? '';
      const cTypes = c.work_types   ?? [];
      const areaOk = cArea.length > 0 && (area.includes(cArea) || cArea.includes(area));
      const typeOk = cTypes.length > 0 && cTypes.some(t => workType.includes(t) || t.includes(workType));

      if (areaOk && typeOk) {
        const matchedTypes = cTypes.filter(t => workType.includes(t) || t.includes(workType));
        selected.push({
          id:     c.user_id,
          name:   c.shop_name || c.full_name || '(名称未設定)',
          reason: [`${cArea}エリア`, ...matchedTypes.map(t => `${t}対応`)].join(' / '),
        });
      } else {
        skipped++;
      }
    }

    console.log('[dry-run] recommended craftsmen', {
      requestId:              requestId ?? '(unknown)',
      area,
      workType,
      selectedCraftsmenCount: selected.length,
      skippedCount:           skipped,
      selectedCraftsmen:      selected,
    });
  } catch (e) {
    console.warn('[dry-run] query failed (non-fatal):', String(e));
  }
}

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
    // Dry-run: 非ブロッキング。レスポンス後にログだけ出す（送信しない）
    void runDryRun(area ?? '', work_type ?? '');
  } catch (err) {
    console.error('[notify] 送信エラー:', err);
    res.status(500).json({ error: String(err) });
  }
}
