import { NextResponse } from 'next/server';

function configuredHttpsUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Only provider-hosted checkout links are exposed here. Stripe stays off until its
 * checkout and verified webhook are configured end-to-end. */
export async function GET() {
  return NextResponse.json({
    stripeTipsEnabled: false,
    lemonSqueezyCheckoutUrl: configuredHttpsUrl(process.env.LEMON_SQUEEZY_CHECKOUT_URL),
    monzoContributionUrl: configuredHttpsUrl(process.env.MONZO_CONTRIBUTION_URL),
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
