// ================================================================
// POST /api/create-checkout-session
//
// 連絡先開示のための Stripe Checkout Session を作成する。
//
// Body:
//   { craftsman_id: string, estimate_request_id: string (uuid) }
//
// Response:
//   200: { ok: true, checkout_url: string }
//   200: { ok: true, already_unlocked: true }  — 既に開示済み
//   400: { error: string }                      — バリデーションエラー
//   500: { error: '決済処理に失敗しました' }
//
// 設計:
//   - Stripe Session 作成 → stripe_payments (status:'pending') INSERT → checkout_url 返却
//   - unlock_contact() 呼び出しは Webhook Phase で行う（このファイルでは行わない）
//   - stripe_payments / contact_unlocks は RLS=有効・ポリシーなしのため
//     SUPABASE_SERVICE_ROLE_KEY を使用（サーバーサイドのみ）
// ================================================================

import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL           = process.env.SUPABASE_URL
                            || process.env.VITE_SUPABASE_URL
                            || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY      = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID        = process.env.STRIPE_PRICE_CONTACT_UNLOCK;
const SITE_URL               = process.env.SITE_URL || 'https://promatch-app.jp';

// ── contact_unlocks 開示済み確認（service role key で RLS バイパス）────────────
async function isAlreadyUnlocked(
  craftsmanId: string,
  estimateRequestId: string,
): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contact_unlocks` +
    `?craftsman_id=eq.${encodeURIComponent(craftsmanId)}` +
    `&estimate_request_id=eq.${encodeURIComponent(estimateRequestId)}` +
    `&select=id&limit=1`,
    {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Accept':        'application/json',
      },
    },
  );
  if (!res.ok) throw new Error(`contact_unlocks check failed: ${res.status}`);
  const rows: unknown[] = await res.json();
  return rows.length > 0;
}

// ── stripe_payments pending INSERT ───────────────────────────────────────────
async function insertPendingPayment(params: {
  craftsmanId:       string;
  estimateRequestId: string;
  stripeSessionId:   string;
  amount:            number;
}): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/stripe_payments`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY!,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      craftsman_id:        params.craftsmanId,
      estimate_request_id: params.estimateRequestId,
      stripe_session_id:   params.stripeSessionId,
      amount:              params.amount,
      currency:            'jpy',
      status:              'pending',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`stripe_payments INSERT failed: ${res.status} ${text}`);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ── 環境変数チェック ───────────────────────────────────────────────────────
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
    console.error('[create-checkout-session] Missing env vars', {
      hasSupabaseUrl:  !!SUPABASE_URL,
      hasServiceKey:   !!SUPABASE_SERVICE_KEY,
      hasStripeSecret: !!STRIPE_SECRET_KEY,
      hasPriceId:      !!STRIPE_PRICE_ID,
    });
    return res.status(500).json({ error: '決済処理に失敗しました' });
  }

  // ── 入力バリデーション ─────────────────────────────────────────────────────
  const { craftsman_id, estimate_request_id } = req.body ?? {};

  if (!craftsman_id || typeof craftsman_id !== 'string' || craftsman_id.trim() === '') {
    return res.status(400).json({ error: 'craftsman_id は必須です' });
  }
  if (!estimate_request_id || typeof estimate_request_id !== 'string' || estimate_request_id.trim() === '') {
    return res.status(400).json({ error: 'estimate_request_id は必須です' });
  }

  const craftsmanId       = craftsman_id.trim();
  const estimateRequestId = estimate_request_id.trim();

  try {
    // ── 開示済み確認（冪等早期リターン）──────────────────────────────────────
    const alreadyUnlocked = await isAlreadyUnlocked(craftsmanId, estimateRequestId);
    if (alreadyUnlocked) {
      return res.status(200).json({ ok: true, already_unlocked: true });
    }

    // ── Stripe Checkout Session 作成 ─────────────────────────────────────────
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' });

    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price:    STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: {
        craftsman_id:        craftsmanId,
        estimate_request_id: estimateRequestId,
      },
      success_url: `${SITE_URL}/craftsman/applications?paid=1`,
      cancel_url:  `${SITE_URL}/craftsman/applications`,
    });

    if (!session.url) {
      throw new Error('Stripe session.url が null です');
    }

    // ── stripe_payments pending INSERT ───────────────────────────────────────
    await insertPendingPayment({
      craftsmanId,
      estimateRequestId,
      stripeSessionId: session.id,
      amount:          session.amount_total ?? 0,
    });

    return res.status(200).json({ ok: true, checkout_url: session.url });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[create-checkout-session] error:', message);
    return res.status(500).json({ error: '決済処理に失敗しました' });
  }
}
