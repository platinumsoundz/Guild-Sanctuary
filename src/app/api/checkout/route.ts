import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUNDLES = {
  tokens_100: { amount: 100, priceEnv: 'SANCTUARY_STRIPE_TEST_PRICE_TOKENS_100' },
  tokens_600: { amount: 500, priceEnv: 'SANCTUARY_STRIPE_TEST_PRICE_TOKENS_600' },
  tokens_1200: { amount: 1000, priceEnv: 'SANCTUARY_STRIPE_TEST_PRICE_TOKENS_1200' },
} as const;
type BundleId = keyof typeof BUNDLES;

function unavailable() {
  return NextResponse.json({ error: 'Test checkout is not configured. No payment has been taken.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (process.env.SANCTUARY_STRIPE_TEST_CHECKOUT_ENABLED !== 'true' ||
      !secret?.startsWith('sk_test_') ||
      !process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') ||
      !process.env.SANCTUARY_SITE_URL) return unavailable();

  let trustedOrigin: string;
  try { trustedOrigin = new URL(process.env.SANCTUARY_SITE_URL).origin; }
  catch { return unavailable(); }

  if (request.headers.get('origin') !== trustedOrigin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }

  if (!payload || typeof payload !== 'object' || !('bundleId' in payload)) {
    return NextResponse.json({ error: 'Choose a supported token bundle.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const bundleId = (payload as { bundleId?: unknown }).bundleId;
  if (typeof bundleId !== 'string' || !Object.hasOwn(BUNDLES, bundleId)) {
    return NextResponse.json({ error: 'Choose a supported token bundle.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const bundle = BUNDLES[bundleId as BundleId];
  const priceId = process.env[bundle.priceEnv];
  if (!priceId?.startsWith('price_')) return unavailable();

  let userId: string;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return NextResponse.json({ error: 'Sign in before starting checkout.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role,status')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError || !profile || profile.status !== 'active' ||
        !['vip', 'moderator', 'admin', 'developer', 'owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Wallet purchases are currently limited to active VIP members and above while test checkout is being verified.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
    userId = data.user.id;
  } catch { return unavailable(); }

  try {
    const stripe = new Stripe(secret);
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active || price.livemode || price.type !== 'one_time' || price.currency !== 'gbp' || price.unit_amount !== bundle.amount) return unavailable();

    const orderId = randomUUID();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      client_reference_id: userId,
      metadata: { sanctuary_order_id: orderId, sanctuary_user_id: userId, sanctuary_bundle_id: bundleId },
      payment_intent_data: { metadata: { sanctuary_order_id: orderId, sanctuary_user_id: userId, sanctuary_bundle_id: bundleId } },
      success_url: `${trustedOrigin}/?wallet=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${trustedOrigin}/?wallet=cancelled`,
      allow_promotion_codes: false,
    });
    if (!session.url) return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ url: session.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not start test checkout. No token grant has occurred.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
