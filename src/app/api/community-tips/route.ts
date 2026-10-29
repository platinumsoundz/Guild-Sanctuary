import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTRIBUTIONS = {
  tip_5_usd: { amount: 500, label: '$5' },
  tip_10_usd: { amount: 1000, label: '$10' },
  tip_25_usd: { amount: 2500, label: '$25' },
} as const;
type ContributionId = keyof typeof CONTRIBUTIONS;

function getDonationMode(): 'test' | 'live' | null {
  const mode = process.env.SANCTUARY_STRIPE_DONATION_MODE;
  const secret = process.env.STRIPE_SECRET_KEY ?? '';
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
  const testEnabled = process.env.SANCTUARY_STRIPE_TEST_CHECKOUT_ENABLED === 'true'
    && mode !== 'live' && secret.startsWith('sk_test_');
  const liveEnabled = process.env.SANCTUARY_STRIPE_DONATION_CHECKOUT_ENABLED === 'true'
    && mode === 'live' && secret.startsWith('sk_live_');
  return (testEnabled || liveEnabled) && signingSecret.startsWith('whsec_') &&
    Boolean(process.env.SANCTUARY_SITE_URL) ? (liveEnabled ? 'live' : 'test') : null;
}

function isCheckoutConfigured() {
  return getDonationMode() !== null;
}

function response(status: number, body: Record<string, string | boolean | null>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Contributions are account-associated so a verified webhook can grant VIP safely. */
export async function GET() {
  return response(200, {
    stripeDonationUrl: null,
    stripeTipsEnabled: isCheckoutConfigured(),
    lemonSqueezyCheckoutUrl: null,
    monzoContributionUrl: null,
  });
}

export async function POST(request: Request) {
  const donationMode = getDonationMode();
  if (!donationMode) {
    return response(503, { error: 'Account-linked community contributions are not configured. No payment has been taken.' });
  }

  let trustedOrigin: string;
  try { trustedOrigin = new URL(process.env.SANCTUARY_SITE_URL!).origin; }
  catch { return response(503, { error: 'The checkout origin is not configured.' }); }
  if (request.headers.get('origin') !== trustedOrigin) {
    return response(403, { error: 'Invalid request origin.' });
  }

  let payload: unknown;
  try { payload = await request.json(); }
  catch { return response(400, { error: 'Invalid request body.' }); }
  if (!payload || typeof payload !== 'object' || !('option' in payload)) {
    return response(400, { error: 'Choose a contribution amount.' });
  }
  const option = (payload as { option?: unknown }).option;
  if (typeof option !== 'string' || !Object.hasOwn(CONTRIBUTIONS, option)) {
    return response(400, { error: 'Choose a supported contribution amount.' });
  }

  let userId: string;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return response(401, { error: 'Sign in before contributing so VIP can be linked to your account.' });
    userId = data.user.id;
  } catch {
    return response(503, { error: 'Account verification is unavailable. No payment has been taken.' });
  }

  const contribution = CONTRIBUTIONS[option as ContributionId];
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const siteOrigin = new URL(process.env.SANCTUARY_SITE_URL!).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: contribution.amount,
          product_data: { name: 'Sanctuary community contribution' },
        },
        quantity: 1,
      }],
      client_reference_id: userId,
      metadata: {
        sanctuary_purchase: 'community_donation',
        sanctuary_user_id: userId,
        sanctuary_donation_amount: String(contribution.amount),
      },
      payment_intent_data: {
        metadata: {
          sanctuary_purchase: 'community_donation',
          sanctuary_user_id: userId,
          sanctuary_donation_amount: String(contribution.amount),
        },
      },
      success_url: `${siteOrigin}/?tip=success`,
      cancel_url: `${siteOrigin}/?tip=cancelled`,
      allow_promotion_codes: false,
    });
    if (!session.url) return response(502, { error: 'Stripe did not return a checkout URL.' });
    return response(200, { url: session.url });
  } catch {
    return response(502, { error: 'Could not start checkout. No VIP grant has occurred.' });
  }
}
