// ================================================================
// POST /api/stripe-webhook
//
// Stripe Checkout 完了後に連絡先開示を行う Webhook ハンドラ。
//
// 処理するイベント:
//   checkout.session.completed のみ。他は 200 で無視。
//
// 処理フロー:
//   1. Stripe 署名検証（rawBody 必須 → bodyParser: false）
//   2. session.metadata から craftsman_id / estimate_request_id 取得
//   3. stripe_payments を session_id で照会
//      → status='paid' なら即 200（冪等リターン）
//   4. unlock_contact RPC 呼び出し（SECURITY DEFINER・UNIQUE制約で二重保護）
//   5. stripe_payments.status を 'paid' に UPDATE
//   6. 200 返却
//
// 冪等設計:
//   - stripe_payments.status='paid' チェックで同一イベントの二重処理を防ぐ
//   - unlock_contact RPC の UNIQUE(craftsman_id, estimate_request_id) が最終防衛
//   - Stripe は 200 を受け取るまでリトライするため、全ステップは冪等に設計
//
// IMPORTANT: bodyParser を無効化しないと Stripe 署名検証が必ず失敗する。
// ================================================================

import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Stripe 署名検証のために rawBody が必要 — bodyParser を無効化
export const config = {
  api: {
    bodyParser: false,
  },
};

const SUPABASE_URL         = process.env.SUPABASE_URL
                          || process.env.VITE_SUPABASE_URL
                          || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY    = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// ── rawBody を Buffer として読む ──────────────────────────────────────────────
// bodyParser: false のとき req は Node.js の Readable stream になる
function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── stripe_payments 行を session_id で取得 ───────────────────────────────────
interface StripePaymentRow {
  id:                  string;  // UUID
  status:              string;
  craftsman_id:        string;
  estimate_request_id: string;
}

async function fetchPaymentBySessionId(
  sessionId: string,
): Promise<StripePaymentRow | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/stripe_payments` +
    `?stripe_session_id=eq.${encodeURIComponent(sessionId)}` +
    `&select=id,status,craftsman_id,estimate_request_id&limit=1`,
    {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Accept':        'application/json',
      },
    },
  );
  if (!res.ok) throw new Error(`stripe_payments fetch failed: ${res.status}`);
  const rows: StripePaymentRow[] = await res.json();
  return rows[0] ?? null;
}

// ── unlock_contact RPC 呼び出し ───────────────────────────────────────────────
interface UnlockResult {
  ok:              boolean;
  already_unlocked: boolean;
}

async function callUnlockContact(params: {
  craftsmanId:       string;
  estimateRequestId: string;
  paymentId:         string;   // stripe_payments.id (UUID as text)
}): Promise<UnlockResult> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/unlock_contact`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY!,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    },
    body: JSON.stringify({
      p_craftsman_id:        params.craftsmanId,
      p_estimate_request_id: params.estimateRequestId,
      p_unlock_type:         'paid',
      p_payment_id:          params.paymentId,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`unlock_contact RPC failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<UnlockResult>;
}

// ── stripe_payments.status を paid に更新 ─────────────────────────────────────
async function markPaymentAsPaid(sessionId: string): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/stripe_payments` +
    `?stripe_session_id=eq.${encodeURIComponent(sessionId)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({ status: 'paid' }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`stripe_payments PATCH failed: ${res.status} ${text}`);
  }
}

// ── checkout.session.completed の中核処理（テスト用にエクスポート）────────────
// この関数は署名検証済みの session オブジェクトを受け取る。
// 署名検証をスキップして直接呼ぶことで、Stripe CLI なしのテストが可能。
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<{ status: 'unlocked' | 'already_unlocked' | 'skipped'; reason?: string }> {

  const { craftsman_id, estimate_request_id } = session.metadata ?? {};

  if (!craftsman_id || !estimate_request_id) {
    console.warn('[stripe-webhook] metadata missing in session', { sessionId: session.id });
    return { status: 'skipped', reason: 'metadata_missing' };
  }

  const sessionId = session.id;

  // stripe_payments 行の取得（create-checkout-session で INSERT 済みのはず）
  const paymentRow = await fetchPaymentBySessionId(sessionId);

  if (paymentRow?.status === 'paid') {
    // 既に処理済み — 冪等リターン
    console.log('[stripe-webhook] already processed', { sessionId });
    return { status: 'already_unlocked' };
  }

  // stripe_payments 行が見つからない場合でも処理を継続
  // （create-checkout-session の INSERT が失敗した可能性があるが、決済は完了している）
  const paymentId = paymentRow?.id ?? sessionId; // フォールバックとして session_id を使う

  if (!paymentRow) {
    console.warn('[stripe-webhook] stripe_payments row not found, proceeding with unlock', {
      sessionId,
      craftsman_id,
      estimate_request_id,
    });
  }

  // unlock_contact RPC（UNIQUE制約で二重開示を防ぐ）
  const unlockResult = await callUnlockContact({
    craftsmanId:       craftsman_id,
    estimateRequestId: estimate_request_id,
    paymentId,
  });

  console.log('[stripe-webhook] unlock_contact result', {
    sessionId,
    craftsman_id,
    estimate_request_id,
    ...unlockResult,
  });

  // stripe_payments を paid に更新（RPC 成功後に実行 — リトライ安全）
  await markPaymentAsPaid(sessionId);

  return {
    status: unlockResult.already_unlocked ? 'already_unlocked' : 'unlocked',
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ── 環境変数チェック ───────────────────────────────────────────────────────
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] Missing env vars', {
      hasSupabaseUrl:      !!SUPABASE_URL,
      hasServiceKey:       !!SUPABASE_SERVICE_KEY,
      hasStripeSecret:     !!STRIPE_SECRET_KEY,
      hasWebhookSecret:    !!STRIPE_WEBHOOK_SECRET,
    });
    // 500 ではなく 400 を返す — Stripe がリトライしないようにする
    return res.status(400).json({ error: 'server misconfigured' });
  }

  // ── rawBody 読み取り（署名検証に必要）────────────────────────────────────
  let rawBody: Buffer;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    console.error('[stripe-webhook] failed to read body:', err);
    return res.status(400).json({ error: 'cannot read body' });
  }

  // ── Stripe 署名検証 ────────────────────────────────────────────────────────
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' });
  const sig = req.headers['stripe-signature'] as string | undefined;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig ?? '', STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] signature verification failed:', message);
    return res.status(400).json({ error: 'invalid signature' });
  }

  // ── イベントタイプフィルタ ──────────────────────────────────────────────────
  if (event.type !== 'checkout.session.completed') {
    // 他のイベントは無視して 200 を返す（Stripe にリトライさせない）
    return res.status(200).json({ received: true, handled: false });
  }

  // ── 中核処理 ───────────────────────────────────────────────────────────────
  try {
    const session = event.data.object as Stripe.Checkout.Session;
    const result  = await handleCheckoutCompleted(session);

    console.log('[stripe-webhook] completed', {
      eventId:   event.id,
      sessionId: session.id,
      ...result,
    });

    return res.status(200).json({ received: true, ...result });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] processing error:', message, { eventId: event.id });
    // 500 を返すと Stripe がリトライする — 一時的なエラー（DB 接続等）はリトライさせる
    return res.status(500).json({ error: 'processing failed' });
  }
}
