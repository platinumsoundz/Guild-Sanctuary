import { NextResponse } from 'next/server';

/**
 * Payments are deliberately unavailable until an end-to-end provider, webhook,
 * fulfillment, and reconciliation implementation has been reviewed.
 */
export async function GET() {
  return NextResponse.json({
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
