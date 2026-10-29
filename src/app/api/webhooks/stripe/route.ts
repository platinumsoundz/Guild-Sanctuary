import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUNDLES = {
  tokens_100: { amount: 100, priceEnv: 'SANCTUARY_STRIPE_TEST_PRICE_TOKENS_100' },
  tokens_600: { amount: 500, priceEnv: 'SANCTUARY_STRIPE_TEST_PRICE_TOKENS_600' },
  tokens_1200: { amount: 1000, priceEnv: 'SANCTUARY_STRIPE_TEST_PRICE_TOKENS_1200' },
} as const;
type BundleId = keyof typeof BUNDLES;

function response(status: number, body: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (process.env.SANCTUARY_STRIPE_TEST_CHECKOUT_ENABLED !== 'true' ||
      !secret?.startsWith('sk_test_') || !webhookSecret?.startsWith('whsec_') ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return response(503, { error: 'Stripe test webhook is not configured.' });
  }
  const signature = request.headers.get('stripe-signature');
  if (!signature) return response(400, { error: 'Missing Stripe signature.' });

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(secret);
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch { return response(400, { error: 'Invalid Stripe webhook signature.' }); }

  if (event.livemode) return response(400, { error: 'Live-mode events are not accepted.' });
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    return response(200, { received: 'true' });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.mode === 'payment' && session.payment_status !== 'paid') {
    // Completed but unpaid sessions are not fulfillment events; acknowledge without granting entitlements.
    return response(200, { received: 'true' });
  }

  if (session.metadata?.sanctuary_purchase === 'community_donation') {
    const userId = session.metadata.sanctuary_user_id;
    const amount = Number(session.metadata.sanctuary_donation_amount);
    const validUserId = typeof userId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
    if (session.mode !== 'payment' || session.payment_status !== 'paid' || !session.id ||
        !validUserId || session.client_reference_id !== userId ||
        session.currency !== 'usd' || session.amount_total !== amount ||
        ![500, 1000, 2500].includes(amount)) {
      return response(400, { error: 'Donation session did not meet fulfillment requirements.' });
    }
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await supabase.rpc('record_sanctuary_donation', {
        requested_event_id: event.id,
        requested_event_type: event.type,
        requested_session_id: session.id,
        requested_user_id: userId,
        requested_amount_total: amount,
        requested_currency: session.currency,
        requested_livemode: event.livemode,
      });
      if (error) return response(500, { error: 'Donation could not be recorded; webhook should retry.' });
      return response(200, { received: 'true' });
    } catch {
      return response(500, { error: 'Donation processing failed; webhook should retry.' });
    }
  }

  if (session.mode !== 'payment' || session.payment_status !== 'paid' || !session.id ||
      session.currency !== 'gbp' || session.amount_total === null ||
      !session.metadata?.sanctuary_order_id || !session.metadata?.sanctuary_user_id ||
      !session.metadata?.sanctuary_bundle_id ||
      session.client_reference_id !== session.metadata.sanctuary_user_id) {
    return response(400, { error: 'Checkout session did not meet fulfillment requirements.' });
  }

  const bundleId = session.metadata.sanctuary_bundle_id;
  if (!Object.hasOwn(BUNDLES, bundleId)) return response(400, { error: 'Unknown bundle.' });
  const bundle = BUNDLES[bundleId as BundleId];
  try {
    const stripe = new Stripe(secret);
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
    if (lineItems.data.length !== 1) return response(400, { error: 'Unexpected checkout line items.' });
    const line = lineItems.data[0];
    const expectedPriceId = process.env[bundle.priceEnv];
    const actualPriceId = typeof line.price === 'string' ? line.price : line.price?.id;
    if (!expectedPriceId || actualPriceId !== expectedPriceId || line.quantity !== 1 ||
        session.amount_total !== bundle.amount || line.amount_total !== bundle.amount || line.currency !== 'gbp') {
      return response(400, { error: 'Payment does not match the configured bundle.' });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.rpc('record_token_bundle_purchase', {
      requested_event_id: event.id,
      requested_event_type: event.type,
      requested_session_id: session.id,
      requested_user_id: session.metadata.sanctuary_user_id,
      requested_bundle_id: bundleId,
      requested_amount_total: session.amount_total,
      requested_currency: session.currency,
      requested_livemode: event.livemode,
    });
    if (error) return response(500, { error: 'Token fulfillment could not be recorded; webhook should retry.' });
    return response(200, { received: 'true' });
  } catch { return response(500, { error: 'Webhook processing failed; webhook should retry.' }); }
}
