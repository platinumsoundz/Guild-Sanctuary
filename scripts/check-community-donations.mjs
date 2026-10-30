import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const route = read('../src/app/api/community-tips/route.ts');
const panel = read('../src/modules/support/SupportPanel.tsx');
const env = read('../.env.example');
const readme = read('../README.md');

assert.ok(route.includes("process.env.COMMUNITY_TIPS_ENABLED !== 'true'"),
  'external contributions must require the explicit host-independent flag');
assert.ok(!route.includes('VERCEL_ENV'),
  'external contributions must not be restricted to Vercel deployments');
assert.ok(route.includes("url.protocol !== 'https:'"),
  'contribution destination must use HTTPS');
assert.ok(route.includes("'buy.stripe.com', 'donate.stripe.com'"),
  'standard and donation-specific Stripe Payment Link hosts are supported');
assert.ok(route.includes('stripeTipsEnabled: false'),
  'account-linked checkout must remain disabled in the external-link flow');
assert.ok(route.includes('lemonSqueezyCheckoutUrl: null'),
  'unconfigured digital-goods checkout must remain hidden');
assert.ok(panel.includes('Voluntary contributions do not purchase tokens or grant account perks'),
  'external donations must not imply paid account entitlements');
assert.ok(env.includes('COMMUNITY_TIPS_ENABLED=false'),
  'the example configuration must default to disabled');
assert.ok(env.includes('STRIPE_DONATION_URL='),
  'the example configuration must document the destination');
assert.ok(readme.includes('Vercel or Cloudflare'),
  'documentation must explain cross-host support');
assert.ok(readme.includes('buy.stripe.com') && readme.includes('donate.stripe.com'),
  'documentation must allow both Stripe link hosts');

console.log('Community donations contract passed: explicit host-independent flag, HTTPS Stripe allowlist, and no account entitlements.');
