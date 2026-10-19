import { NextResponse } from 'next/server';

/**
 * Disabled intentionally. The previous implementation accepted arbitrary Price
 * IDs from the browser and did not have a completed, audited fulfillment flow.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Checkout is not available while Sanctuary payments are under review.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
