import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const checkout = read('../src/app/api/community-tips/route.ts');
const webhook = read('../src/app/api/stripe/webhook/route.ts');
const panel = read('../src/modules/support/SupportPanel.tsx');

const checks = [
  ['checkout is explicitly test-mode only', checkout.includes("secretKey.startsWith('sk_test_')") && checkout.includes("SANCTUARY_STRIPE_TEST_CHECKOUT_ENABLED === 'true'")],
  ['checkout requires a signed-in active Sanctuary account', checkout.includes('supabase.auth.getUser()') && checkout.includes("from('profiles').select('status')") && checkout.includes("profile.status !== 'active'")],
  ['checkout binds Stripe metadata and client reference to the authenticated user', checkout.includes('client_reference_id: user.id') && checkout.includes('user_id: user.id')],
  ['checkout uses a server-side GBP amount allowlist', checkout.includes('donationAmounts') && checkout.includes("currency: 'gbp'") && checkout.includes('unit_amount: amount')],
  ['checkout restricts requests to the configured site origin', checkout.includes("request.headers.get('origin') !== config.origin")],
  ['webhook verifies Stripe signatures over the raw body', webhook.includes("request.headers.get('stripe-signature')") && webhook.includes('constructEvent(rawBody, signature, webhookSecret)')],
  ['webhook rejects live-mode events on the test endpoint', webhook.includes('if (event.livemode)')],
  ['webhook grants entitlements only after paid Checkout Sessions', webhook.includes("session.payment_status !== 'paid'") && webhook.includes('record_stripe_payment_entitlement')],
  ['webhook supports both authenticated donations and token bundle purchases', webhook.includes("purchaseType === 'community_donation'") && webhook.includes("purchaseType === 'token_bundle'")],
  ['webhook handles refunds through the private server-side RPC', webhook.includes("event.type === 'charge.refunded'") && webhook.includes('revoke_refunded_stripe_entitlement')],
  ['support UI shows GBP contribution choices and test-mode disclosure', panel.includes('£1') && panel.includes('£5') && panel.includes('TEST MODE')],
  ['support UI explains VIP is granted only after verified payment and not age verification', panel.includes('grants permanent VIP after Stripe verifies payment') && panel.includes('Payment does not verify age')],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Stripe test checkout contract checks passed: ${checks.length}. Static checks do not replace a real Stripe test payment and webhook replay.`);
