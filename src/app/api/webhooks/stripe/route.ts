import { NextResponse } from 'next/server';

/**
 * Disabled intentionally. Do not configure a Stripe webhook for this endpoint:
 * payment acceptance and entitlement fulfillment are not implemented.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Stripe webhooks are not enabled.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
