import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const donationAmounts = new Set([100, 500, 1000, 2500]);

function getStripeTestConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
  const enabled = process.env.SANCTUARY_STRIPE_TEST_CHECKOUT_ENABLED === 'true'
    && secretKey.startsWith('sk_test_');
  const appBaseUrl = process.env.SANCTUARY_SITE_URL ?? process.env.APP_BASE_URL ?? '';
  let origin = '';
  try {
    const parsed = new URL(appBaseUrl);
    if (parsed.protocol === 'https:' && parsed.pathname === '/' && !parsed.search && !parsed.hash) origin = parsed.origin;
  } catch { /* invalid configuration remains disabled */ }
  return { enabled: enabled && Boolean(origin), secretKey, origin };
}

export async function GET() {
  const config = getStripeTestConfig();
  return NextResponse.json({
    stripeDonationUrl: null,
    stripeTipsEnabled: config.enabled,
    stripeTestMode: config.enabled,
    lemonSqueezyCheckoutUrl: null,
    monzoContributionUrl: null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const config = getStripeTestConfig();
  if (!config.enabled) {
    return NextResponse.json({ error: 'Sanctuary Stripe test checkout is not configured.' }, { status: 503 });
  }
  if (request.headers.get('origin') !== config.origin) {
    return NextResponse.json({ error: 'Checkout requests must come from the configured Sanctuary site.' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in to your Sanctuary account before contributing.' }, { status: 401 });
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('status').eq('id', user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: 'Your account could not be verified.' }, { status: 500 });
  if (!profile || profile.status !== 'active') {
    return NextResponse.json({ error: 'An active Sanctuary account is required.' }, { status: 403 });
  }

  let body: { option?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid checkout request.' }, { status: 400 });
  }
  const amount = body.option === 'tip_1_gbp' ? 100
    : body.option === 'tip_5_gbp' ? 500
    : body.option === 'tip_10_gbp' ? 1000
    : body.option === 'tip_25_gbp' ? 2500 : 0;
  if (!donationAmounts.has(amount)) {
    return NextResponse.json({ error: 'Choose one of the available GBP contribution amounts.' }, { status: 400 });
  }

  try {
    const stripe = new Stripe(config.secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: amount,
          product_data: { name: 'Support The Sanctuary' },
        },
      }],
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        sanctuary_purchase: 'community_donation',
        user_id: user.id,
        donation_amount: String(amount),
      },
      payment_intent_data: {
        metadata: {
          sanctuary_purchase: 'community_donation',
          user_id: user.id,
        },
      },
      success_url: `${config.origin}/support-the-community?tip=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.origin}/support-the-community?tip=cancelled`,
    });
    if (!session.url) return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Secure Stripe test checkout could not be started.' }, { status: 502 });
  }
}
