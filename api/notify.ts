import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── 環境変数 ─────────────────────────────────────────────────────────────────
// CRAFTSMAN_AUTO_NOTIFY_ENABLED=true のときだけ実送信。未設定/false → Dry Run のみ。
// CRAFTSMAN_AUTO_NOTIFY_LIMIT: 最大送信人数（デフォルト5、安全制限）

const SUPABASE_URL      = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_SVC_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';

const AUTO_NOTIFY_ENABLED = process.env.CRAFTSMAN_AUTO_NOTIFY_ENABLED === 'true';
const RAW_LIMIT           = parseInt(process.env.CRAFTSMAN_AUTO_NOTIFY_LIMIT ?? '', 10);
const AUTO_NOTIFY_LIMIT   = Number.isFinite(RAW_LIMIT) && RAW_LIMIT > 0 ? RAW_LIMIT : 5;

// ─── 型 ──────────────────────────────────────────────────────────────────────

type SelectedCraftsman = {
  id:     string;
  email:  string;
  name:   string;
  reason: string;
};

// ─── 推奨職人の選択（純粋データ関数）────────────────────────────────────────
// service_role key で RLS をバイパスして craftsmen を取得し、
// area × work_type でフロントの isRecommendedCraftsman と同一ロジックでマッチング。

async function selectRecommendedCraftsmen(area: string, workType: string): Promise<{
  selected: SelectedCraftsman[];
  skippedCount: number;
}> {
  if (!SUPABASE_URL || !SUPABASE_SVC_KEY) {
    console.warn('[craftsman-notify] SUPABASE env missing — skipping craftsman selection');
    return { selected: [], skippedCount: 0 };
  }

  const url =
    `${SUPABASE_URL}/rest/v1/craftsmen` +
    `?select=user_id,email,full_name,shop_name,service_area,work_types` +
    `&notification_enabled=eq.true` +
    `&email=not.is.null` +
    `&email=neq.` +
    `&limit=500`;

  const r = await fetch(url, {
    headers: {
      'apikey':        SUPABASE_SVC_KEY,
      'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
      'Accept':        'application/json',
    },
  });

  if (!r.ok) {
    throw new Error(`craftsmen fetch ${r.status}: ${await r.text().catch(() => '')}`);
  }

  const craftsmen = await r.json() as Array<{
    user_id:      string;
    email:        string | null;
    full_name:    string | null;
    shop_name:    string | null;
    service_area: string | null;
    work_types:   string[] | null;
  }>;

  const selected: SelectedCraftsman[] = [];
  let skippedCount = 0;

  for (const c of craftsmen) {
    const cArea  = c.service_area ?? '';
    const cTypes = c.work_types   ?? [];

    const areaOk = cArea.length > 0 && (area.includes(cArea) || cArea.includes(area));
    const typeOk = cTypes.length > 0 && cTypes.some(t => workType.includes(t) || t.includes(workType));

    if (areaOk && typeOk && c.email) {
      const matched = cTypes.filter(t => workType.includes(t) || t.includes(workType));
      selected.push({
        id:     c.user_id,
        email:  c.email,
        name:   c.shop_name || c.full_name || '(名称未設定)',
        reason: [`${cArea}エリア`, ...matched.map(t => `${t}対応`)].join(' / '),
      });
    } else {
      skippedCount++;
    }
  }

  return { selected, skippedCount };
}

// ─── 職人通知のメイン制御（Dry Run / 実送信） ────────────────────────────────
// Phase 5: レスポンス後に呼ばれる（非ブロッキング）。失敗しても例外を投げない。

async function runCraftsmanNotify(
  area:      string,
  workType:  string,
  requestId: string | undefined,
  extraPayload?: Record<string, unknown>,
) {
  const mode = AUTO_NOTIFY_ENABLED ? 'send' : 'dry-run';

  // ── 推奨職人を取得 ────────────────────────────────────────────────────────
  let selected: SelectedCraftsman[] = [];
  let skippedCount = 0;
  try {
    ({ selected, skippedCount } = await selectRecommendedCraftsmen(area, workType));
  } catch (e) {
    console.warn('[craftsman-notify] craftsmen fetch failed (non-fatal):', String(e));
    return;
  }

  // ── Dry Run: ログだけ出す ─────────────────────────────────────────────────
  if (mode === 'dry-run') {
    console.log('[craftsman-notify]', {
      mode:                   'dry-run',
      requestId:              requestId ?? '(unknown)',
      area,
      workType,
      selectedCraftsmenCount: selected.length,
      skippedCount,
      selectedCraftsmen:      selected.map(c => ({ id: c.id, name: c.name, reason: c.reason })),
    });
    return;
  }

  // ── 実送信: 安全制限チェック ──────────────────────────────────────────────
  if (selected.length === 0) {
    console.warn('[craftsman-notify] mode=send selectedCraftsmenCount=0 — no craftsmen matched, skipping', {
      requestId: requestId ?? '(unknown)', area, workType,
    });
    return;
  }

  const targets = selected.slice(0, AUTO_NOTIFY_LIMIT);
  let sentCount   = 0;
  let failedCount = 0;
  const failures: string[] = [];

  console.log('[craftsman-notify]', {
    mode:                   'send',
    requestId:              requestId ?? '(unknown)',
    area,
    workType,
    selectedCraftsmenCount: selected.length,
    limit:                  AUTO_NOTIFY_LIMIT,
    sendingCount:           targets.length,
  });

  const edgeFnUrl = `${SUPABASE_URL}/functions/v1/send-craftsman-notification`;
  const authKey   = SUPABASE_ANON_KEY || SUPABASE_SVC_KEY;

  for (const c of targets) {
    try {
      const fnRes = await fetch(edgeFnUrl, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${authKey}`,
          'apikey':        authKey,
        },
        body: JSON.stringify({
          to:             c.email,
          work_type:      workType,
          area,
          has_video:      false,
          has_photos:     false,
          has_floor_plan: false,
          ...extraPayload,
        }),
      });

      if (!fnRes.ok) {
        const body = await fnRes.text().catch(() => '(body error)');
        throw new Error(`${fnRes.status}: ${body.slice(0, 200)}`);
      }

      sentCount++;
      // メールアドレス全文はログに出さない（ドメインのみ）
      console.log('[craftsman-notify] sent', {
        craftsmanId: c.id,
        name:        c.name,
        emailDomain: c.email.split('@')[1] ?? '?',
        reason:      c.reason,
      });
    } catch (e) {
      failedCount++;
      failures.push(`${c.name}: ${String(e)}`);
      // 1人失敗しても他の人へ続行
      console.warn('[craftsman-notify] send failed (continuing)', {
        craftsmanId: c.id,
        name:        c.name,
        error:       String(e),
      });
    }
  }

  console.log('[craftsman-notify] done', {
    mode:                   'send',
    requestId:              requestId ?? '(unknown)',
    selectedCraftsmenCount: selected.length,
    sentCount,
    failedCount,
    limit:                  AUTO_NOTIFY_LIMIT,
    ...(failures.length > 0 ? { failures } : {}),
  });
}

// ─── メインハンドラ ───────────────────────────────────────────────────────────

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
    request_id,   // 呼び出し元が渡せば requestId としてログに出す
  } = req.body ?? {};

  const body = [
    '新しい見積もり依頼が届きました。',
    '',
    `受付日時　：${created_at     ?? '—'}`,
    `施工エリア：${area           ?? '—'}`,
    `施工内容　：${work_type      ?? '—'}`,
    `連絡方法　：${contact_method ?? '—'}`,
    `連絡先　　：${contact_value  ?? '—'}`,
    '',
    '▼ 管理画面で確認',
    'https://promatch-app.jp/admin/requests',
  ].join('\n');

  try {
    // Phase 5 Step 1: 運営通知メールを送る（最重要・従来通り）
    const { error } = await resend.emails.send({
      from:    'PRO MATCH 管理 <noreply@promatch-app.jp>',
      to:      ['interior.shop.aoi@gmail.com'],
      subject: '新しい見積もり依頼が届きました',
      text:    body,
    });

    if (error) {
      console.error('[notify] Resend error:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    // Phase 5 Step 2: 運営通知完了後、即レスポンスを返す
    res.status(200).json({ ok: true });

    // Phase 5 Step 3: 非ブロッキングで職人通知を走らせる
    // 失敗しても res は既に返っているので案件投稿・運営通知には影響しない
    void runCraftsmanNotify(area ?? '', work_type ?? '', request_id);

  } catch (err) {
    console.error('[notify] 送信エラー:', err);
    res.status(500).json({ error: String(err) });
  }
}
