import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const tokenBundles = {
  tokens_100: { tokens: 100, amount: 100 },
  tokens_600: { tokens: 600, amount: 500 },
  tokens_1200: { tokens: 1200, amount: 1000 },
} as const;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY ?? '';
  if (!secretKey.startsWith('sk_test_') || !webhookSecret.startsWith('whsec_')
      || !supabaseUrl.startsWith('https://') || !supabaseSecret) {
    return NextResponse.json({ error: 'Stripe test webhook is not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });

  const rawBody = await request.text();
  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 });
  }
  if (event.livemode) return NextResponse.json({ error: 'Live Stripe events are not accepted by this test endpoint.' }, { status: 400 });

  const admin = createSupabaseAdmin(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId || charge.amount_refunded < charge.amount) return NextResponse.json({ received: true });
    const { error } = await admin.schema('private').rpc('revoke_refunded_stripe_entitlement', {
      requested_payment_intent_id: paymentIntentId,
    });
    if (error) return NextResponse.json({ error: 'Refund entitlement update failed.' }, { status: 500 });
    return NextResponse.json({ received: true });
  }

  if (event.type !== 'checkout.session.completed'
      && event.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== 'paid') return NextResponse.json({ received: true, pending: true });
  const metadata = session.metadata;
  const userId = metadata?.user_id;
  const purchaseType = metadata?.sanctuary_purchase;
  if (session.mode !== 'payment' || !userId || !isUuid(userId)
      || session.client_reference_id !== userId || session.currency !== 'gbp'
      || !session.amount_total) {
    return NextResponse.json({ error: 'Paid Checkout Session failed account and currency validation.' }, { status: 400 });
  }

  if (purchaseType === 'token_bundle') {
    const bundleId = metadata?.bundle_id as keyof typeof tokenBundles | undefined;
    if (!bundleId || !(bundleId in tokenBundles) || session.amount_total !== tokenBundles[bundleId].amount) {
      return NextResponse.json({ error: 'Token purchase did not match an approved bundle.' }, { status: 400 });
    }
    const { error: tokenError } = await admin.rpc('record_token_bundle_purchase', {
      requested_event_id: event.id,
      requested_event_type: event.type,
      requested_session_id: session.id,
      requested_user_id: userId,
      requested_bundle_id: bundleId,
      requested_amount_total: session.amount_total,
      requested_currency: session.currency,
      requested_livemode: event.livemode,
    });
    if (tokenError) return NextResponse.json({ error: 'Token purchase fulfilment failed.' }, { status: 500 });
  } else if (purchaseType === 'community_donation') {
    const approvedAmount = Number(metadata?.donation_amount);
    if (![100, 500, 1000, 2500].includes(approvedAmount) || session.amount_total !== approvedAmount) {
      return NextResponse.json({ error: 'Donation amount did not match an approved contribution option.' }, { status: 400 });
    }
  } else {
    return NextResponse.json({ received: true });
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent : session.payment_intent?.id ?? null;
  const { error: entitlementError } = await admin.schema('private').rpc('record_stripe_payment_entitlement', {
    requested_event_id: event.id,
    requested_session_id: session.id,
    requested_payment_intent_id: paymentIntentId,
    requested_user_id: userId,
    requested_purchase_type: purchaseType,
    requested_amount_total: session.amount_total,
    requested_currency: session.currency,
  });
  if (entitlementError) return NextResponse.json({ error: 'VIP entitlement could not be recorded.' }, { status: 500 });

  return NextResponse.json({ received: true });
}
