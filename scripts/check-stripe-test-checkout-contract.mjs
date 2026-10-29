import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const checkout = readFileSync('src/app/api/checkout/route.ts', 'utf8');
const webhook = readFileSync('src/app/api/webhooks/stripe/route.ts', 'utf8');
const walletService = readFileSync('src/modules/economy/service.ts', 'utf8');
const spendingLock = readFileSync('supabase/migrations/20261027120000_keep_token_spending_locked_until_staging.sql', 'utf8');
const ledgerMigration = readFileSync('supabase/migrations/20261012000000_token_wallet_and_fulfillment.sql', 'utf8');
const runbook = readFileSync('docs/STRIPE_TEST_MODE_RUNBOOK.md', 'utf8');

const checks = [
  ['checkout is explicitly opt-in and test-key-only', checkout.includes("SANCTUARY_STRIPE_TEST_CHECKOUT_ENABLED !== 'true'") && checkout.includes("!secret?.startsWith('sk_test_')") && checkout.includes("!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')")],
  ['checkout origin comes from trusted server configuration', checkout.includes("new URL(process.env.SANCTUARY_SITE_URL)") && checkout.includes("request.headers.get('origin') !== trustedOrigin")],
  ['checkout requires a signed-in Supabase user', checkout.includes('supabase.auth.getUser()') && checkout.includes('if (error || !data.user)')],
  ['client can choose only an allowlisted bundle, not a price or amount', checkout.includes("Object.hasOwn(BUNDLES, bundleId)") && !/payload.*amount|payload.*priceId|payload.*userId/.test(checkout)],
  ['Stripe price is active, one-time, GBP, test-mode and the exact approved amount', checkout.includes('!price.active || price.livemode || price.type !== \'one_time\' || price.currency !== \'gbp\' || price.unit_amount !== bundle.amount')],
  ['Checkout Session binds the order and authenticated account in server metadata', checkout.includes('sanctuary_order_id: orderId') && checkout.includes('sanctuary_user_id: userId') && checkout.includes('client_reference_id: userId')],
  ['webhook verifies Stripe signature against the raw request body', webhook.includes('stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret)')],
  ['webhook rejects live-mode events and unpaid sessions', webhook.includes('if (event.livemode)') && webhook.includes("session.payment_status !== 'paid'")],
  ['webhook verifies bundle, configured price, quantity, currency and exact amount', webhook.includes('stripe.checkout.sessions.listLineItems(session.id') && webhook.includes('actualPriceId !== expectedPriceId') && webhook.includes('session.amount_total !== bundle.amount') && webhook.includes("line.currency !== 'gbp'")],
  ['webhook grants tokens only through the server-only idempotent fulfillment RPC', webhook.includes("supabase.rpc('record_token_bundle_purchase'") && webhook.includes('requested_event_id: event.id') && webhook.includes('requested_session_id: session.id')],
  ['fulfillment RPC is service-role-only', ledgerMigration.includes('to service_role') && ledgerMigration.includes('from public, anon, authenticated')],
  ['token spending remains revoked from public, anonymous and authenticated roles', /REVOKE ALL ON FUNCTION public\\.spend_tokens\\(text, uuid\\) FROM PUBLIC;/i.test(spendingLock) && /REVOKE ALL ON FUNCTION public\\.spend_tokens\\(text, uuid\\) FROM anon;/i.test(spendingLock) && /REVOKE ALL ON FUNCTION public\\.spend_tokens\\(text, uuid\\) FROM authenticated;/i.test(spendingLock)],
  ['wallet UI calls the same Next.js checkout endpoint and validates Stripe URL', walletService.includes("fetch('/api/checkout'") && walletService.includes("checkoutUrl.hostname !== 'checkout.stripe.com'")],
  ['runbook blocks live payments pending refunds, disputes and end-to-end evidence', runbook.includes('Refund/dispute reversal behavior is not implemented') && runbook.includes('Do not enable real payments')],
];

for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label);
  assert.ok(passed, label);
}
console.log('Stripe checkout release contract passed: ' + checks.length + ' static checks. This is not a substitute for a completed test-mode Checkout and webhook round-trip.');
