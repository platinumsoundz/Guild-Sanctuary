import { NextResponse } from 'next/server';

function getConfiguredDonationUrl(): string | null {
  // This feature flag is intentionally host-agnostic so the same configuration
  // works on Vercel and Cloudflare. Keep the destination server-configured.
  if (process.env.COMMUNITY_TIPS_ENABLED !== 'true') return null;

  try {
    const url = new URL(process.env.STRIPE_DONATION_URL ?? '');
    if (
      url.protocol !== 'https:'
      || !['buy.stripe.com', 'donate.stripe.com'].includes(url.hostname)
      || url.username
      || url.password
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Return the voluntary external donation link when explicitly enabled on this deployment. */
export async function GET() {
  return NextResponse.json({
    stripeDonationUrl: getConfiguredDonationUrl(),
    stripeTipsEnabled: false,
    lemonSqueezyCheckoutUrl: null,
    monzoContributionUrl: null,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST() {
  return NextResponse.json(
    { error: 'Account-linked community contributions are not enabled. Use the voluntary external contribution link if one is configured.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
