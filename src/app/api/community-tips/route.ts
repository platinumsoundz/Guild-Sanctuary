import { NextResponse } from 'next/server';

function getProductionDonationUrl(): string | null {
  if (process.env.VERCEL_ENV !== 'production' || process.env.STRIPE_DONATION_LINK_ENABLED !== 'true') {
    return null;
  }

  try {
    const url = new URL(process.env.STRIPE_DONATION_URL ?? '');
    return url.protocol === 'https:' && url.hostname === 'buy.stripe.com' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Return the public donation link only for explicitly enabled production deployments. */
export async function GET() {
  return NextResponse.json({
    stripeDonationUrl: getProductionDonationUrl(),
    stripeTipsEnabled: false,
    lemonSqueezyCheckoutUrl: null,
    monzoContributionUrl: null,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST() {
  return NextResponse.json(
    { error: 'Community contributions are not available yet.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
