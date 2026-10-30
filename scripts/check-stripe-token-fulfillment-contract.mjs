import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const checkout = read('../supabase/functions/token-checkout/index.ts');
const webhook = read('../supabase/functions/stripe-token-webhook/index.ts');

const checks = [
  ['checkout requires an authenticated Supabase user', /withSupabase\(\{\s*auth:\s*'user'\s*\}/.test(checkout) && /ctx\.userClaims\?\.id/.test(checkout)],
  ['checkout accepts POST only and rejects malformed JSON', /req\.method !== 'POST'/.test(checkout) && /await req\.json\(\)/.test(checkout) && /Invalid checkout request/.test(checkout)],
  ['checkout is disabled unless the explicit feature flag and configuration are valid', /TOKEN_CHECKOUT_ENABLED.*=== 'true'/.test(checkout) && /keyMatchesMode/.test(checkout) && /webhookSecret\.startsWith\('whsec_'\)/.test(checkout)],
  ['checkout rejects origins other than the configured app origin', /isAllowedAppOrigin\(req, config\.appBaseUrl\)/.test(checkout) && /origin === new URL\(appBaseUrl\)\.origin/.test(checkout)],
  ['checkout requires an active account before creating a session', /from\('profiles'\)[\s\S]*?select\('status'\)[\s\S]*?eq\('id', userId\)/.test(checkout) && /profile\.status !== 'active'/.test(checkout)],
  ['checkout validates configured Stripe price amount, currency, type and mode', /price\.type === 'one_time'/.test(checkout) && /price\.currency === expectedBundles\[bundleId\]\.currency/.test(checkout) && /price\.unit_amount === expectedBundles\[bundleId\]\.amount/.test(checkout) && /price\.livemode === \(mode === 'live'\)/.test(checkout)],
  ['checkout accepts only the server-defined bundle allowlist', /bundleId !== 'tokens_100' && bundleId !== 'tokens_600' && bundleId !== 'tokens_1200'/.test(checkout)],
  ['checkout derives amount from a configured Stripe Price, not request body values', /line_items: \[\{ price: config\.prices\[bundleId\], quantity: 1 \}\]/.test(checkout) && !/body\.amount|body\.currency|body\.tokens/.test(checkout)],
  ['checkout binds the user and bundle to Stripe metadata', /client_reference_id: userId/.test(checkout) && /user_id: userId/.test(checkout) && /bundle_id: bundleId/.test(checkout)],
  ['checkout return URLs use the configured application origin', /const appOrigin = new URL\(config\.appBaseUrl\)\.origin/.test(checkout) && /success_url: \x60\$\{appOrigin\}/.test(checkout) && /cancel_url: \x60\$\{appOrigin\}/.test(checkout)],
  ['webhook is unauthenticated at HTTP layer but requires a Stripe signature', /withSupabase\(\{\s*auth:\s*'none'\s*\}/.test(webhook) && /stripe-signature/.test(webhook) && /constructEventAsync\(/.test(webhook)],
  ['webhook verifies the raw request body and configured signing secret', /const rawBody = await req\.text\(\)/.test(webhook) && /rawBody,[\s\S]*?config\.signingSecret/.test(webhook)],
  ['webhook rejects events whose live/test mode differs from configuration', /event\.livemode !== \(config\.mode === 'live'\)/.test(webhook)],
  ['webhook credits only paid, supported token-bundle checkout sessions', /event\.type !== 'checkout\.session\.completed'/.test(webhook) && /session\.payment_status !== 'paid'/.test(webhook) && /metadata\.sanctuary_purchase !== 'token_bundle'/.test(webhook)],
  ['webhook validates UUID, client reference, bundle, GBP currency and exact amount', /!isUuid\(userId\)/.test(webhook) && /session\.client_reference_id !== userId/.test(webhook) && /!isBundleId\(bundleId\)/.test(webhook) && /session\.currency !== 'gbp'/.test(webhook) && /session\.amount_total !== bundles\[bundleId\]\.amount/.test(webhook)],
  ['webhook records fulfillment through the server-side idempotent purchase RPC', /ctx\.supabaseAdmin\.rpc\('record_token_bundle_purchase'/.test(webhook) && /requested_event_id:\s*event\.id/.test(webhook) && /requested_session_id:\s*session\.id/.test(webhook) && /requested_user_id:\s*userId/.test(webhook)],
  ['webhook returns an error when authoritative fulfillment fails', /if \(error\) return Response\.json\(\{ error: 'Token purchase could not be recorded\.' \}, \{ status: 500 \}\)/.test(webhook)],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Stripe token fulfillment contract checks passed: ${checks.length}. Static source checks do not replace Stripe test-mode or database integration tests.`);
