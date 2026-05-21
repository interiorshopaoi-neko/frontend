// ================================================================
// POST /api/request-meta
//
// estimate_requests.meta を service role key で安全に更新する。
// anon には UPDATE ポリシーがないため、このエンドポイント経由で更新する。
//
// Body:
//   {
//     id: string,                   // estimate_requests.id
//     metaUpdate: {
//       roomAdditionalInfo?: Record<string, RoomAdditionalEntry>,
//       extraInfo?:          Record<string, unknown>,
//       extra_info?:         Record<string, unknown>,
//     }
//   }
//
// 既存 meta を読んで additive merge してから更新する。
// rooms / roomMedia / thumbnail_url などは絶対に上書きしない。
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim();

const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

function sbHeaders(extra: Record<string, string> = {}) {
  return {
    'apikey':        SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Accept':        'application/json',
    'Content-Type':  'application/json',
    ...extra,
  };
}

async function sbFetch(url: string): Promise<unknown[]> {
  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) {
    const body = await r.text().catch(() => '(body read error)');
    throw new Error(`supabase ${r.status}: ${body}`);
  }
  return r.json() as Promise<unknown[]>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[request-meta] env missing');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { id, metaUpdate } = req.body as {
    id: string;
    metaUpdate: {
      roomAdditionalInfo?: Record<string, unknown>;
      extraInfo?:          Record<string, unknown>;
      extra_info?:         Record<string, unknown>;
    };
  };

  if (!id || !metaUpdate) {
    return res.status(400).json({ error: 'Missing id or metaUpdate' });
  }

  try {
    // ── Step 1: 既存 meta を取得 ─────────────────────────────────────────
    const fetchUrl =
      `${SUPABASE_URL}/rest/v1/estimate_requests` +
      `?id=eq.${encodeURIComponent(String(id))}` +
      `&select=meta&limit=1`;

    console.info('[request-meta] fetching existing meta for id=', id);
    const rows = await sbFetch(fetchUrl) as Array<{ meta: Record<string, unknown> | null }>;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const existingMeta: Record<string, unknown> = rows[0].meta ?? {};

    // ── Step 2: Additive merge ────────────────────────────────────────────
    // 保護対象キー（絶対に上書きしない）
    const PROTECTED_KEYS = ['rooms', 'roomMedia', 'thumbnail_url', 'wallpaper_preference',
      'wallpaper_accent_preferences', 'extra_info_legacy'];

    const merged: Record<string, unknown> = { ...existingMeta };

    // roomAdditionalInfo: object merge（既存エントリを保持しつつ新エントリを追加/上書き）
    if (metaUpdate.roomAdditionalInfo !== undefined) {
      const existing = (existingMeta.roomAdditionalInfo as Record<string, unknown> | null) ?? {};
      merged.roomAdditionalInfo = { ...existing, ...metaUpdate.roomAdditionalInfo };
    }

    // extraInfo: object merge
    if (metaUpdate.extraInfo !== undefined) {
      const existing = (existingMeta.extraInfo as Record<string, unknown> | null) ?? {};
      merged.extraInfo = { ...existing, ...metaUpdate.extraInfo };
    }

    // extra_info: object merge
    if (metaUpdate.extra_info !== undefined) {
      const existing = (existingMeta.extra_info as Record<string, unknown> | null) ?? {};
      merged.extra_info = { ...existing, ...metaUpdate.extra_info };
    }

    // 保護キーが消えていないか確認（念のため）
    for (const key of PROTECTED_KEYS) {
      if (existingMeta[key] !== undefined && merged[key] === undefined) {
        merged[key] = existingMeta[key];
      }
    }

    // ── Step 3: 更新 ─────────────────────────────────────────────────────
    const updateUrl =
      `${SUPABASE_URL}/rest/v1/estimate_requests` +
      `?id=eq.${encodeURIComponent(String(id))}`;

    console.info('[request-meta] updating meta for id=', id);
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: sbHeaders({ 'Prefer': 'return=minimal' }),
      body:    JSON.stringify({ meta: merged }),
    });

    if (!updateRes.ok) {
      const body = await updateRes.text().catch(() => '');
      throw new Error(`supabase UPDATE ${updateRes.status}: ${body}`);
    }

    console.info('[request-meta] ok id=', id);
    return res.status(200).json({ ok: true });

  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[request-meta] error:', detail);
    return res.status(500).json({ error: 'メタ情報の更新に失敗しました', detail });
  }
}
