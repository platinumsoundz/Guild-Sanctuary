import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const route = read('../src/app/api/community-tips/route.ts');
const panel = read('../src/modules/support/SupportPanel.tsx');
const env = read('../.env.example');
const readme = read('../README.md');

assert.match(route, /process\\.env\\.COMMUNITY_TIPS_ENABLED !== 'true'/,
  'external contributions must require the explicit host-independent flag');
assert.doesNotMatch(route, /VERCEL_ENV/,
  'external contributions must not be restricted to Vercel deployments');
assert.match(route, /url\\.protocol !== 'https:'/,
  'contribution destination must use HTTPS');
assert.match(route, /buy\\.stripe\\.com.*donate\\.stripe\\.com|donate\\.stripe\\.com.*buy\\.stripe\\.com/,
  'standard and donation-specific Stripe Payment Link hosts are supported');
assert.match(route, /stripeTipsEnabled: false/,
  'account-linked checkout must remain disabled in the external-link flow');
assert.match(route, /lemonSqueezyCheckoutUrl: null/,
  'unconfigured digital-goods checkout must remain hidden');
assert.match(panel, /Voluntary contributions do not purchase tokens or grant account perks/,
  'external donations must not imply paid account entitlements');
assert.match(env, /COMMUNITY_TIPS_ENABLED=false/,
  'the example configuration must default to disabled');
assert.match(env, /STRIPE_DONATION_URL=/,
  'the example configuration must document the destination');
assert.match(readme, /Vercel or Cloudflare/,
  'documentation must explain cross-host support');
assert.match(readme, /buy\\.stripe\\.com.*donate\\.stripe\\.com|donate\\.stripe\\.com.*buy\\.stripe\\.com/,
  'documentation must allow both Stripe link hosts');

console.log('Community donations contract passed: explicit host-independent flag, HTTPS Stripe allowlist, and no account entitlements.');
