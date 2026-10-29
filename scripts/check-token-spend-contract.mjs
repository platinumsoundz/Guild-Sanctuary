import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const shop = readFileSync('src/modules/economy/TokenShopPanel.tsx', 'utf8');
const gates = readFileSync('src/lib/sanctuaryFeatureGates.ts', 'utf8');
const migration = readFileSync(
  'supabase/migrations/20261027120000_keep_token_spending_locked_until_staging.sql',
  'utf8',
);

const checks = [
  ['redemption is explicitly disabled until owner-approved staging', /const spendingEnabled = canAccessSanctuaryFeature\('tokenSpending', role\)/.test(shop) && /tokenSpending: \{ enabled: false/.test(gates)],
  ['purchase handler fails closed while spending is disabled', /if \(!spendingEnabled \|\| isGuest \|\| !hasSupabaseAccount \|\| purchasingItemId \|\| ownedItems\.has\(item\.item_id\)\) return;/.test(shop)],
  ['purchase button is disabled while spending is locked', /disabled=\{!spendingEnabled \|\| !hasSupabaseAccount \|\| owned \|\| purchasingItemId !== null\}/.test(shop)],
  ['locked purchase control communicates that redemption is unavailable', /!spendingEnabled \? 'Coming soon' : purchasing \? 'Unlocking…' : 'Unlock item'/.test(shop)],
  ['RPC request stays server-authoritative and carries an idempotency key', /client\.rpc\('spend_tokens'/.test(shop) && /requested_item_id:\s*item\.item_id/.test(shop) && /requested_idempotency_key:\s*crypto\.randomUUID\(\)/.test(shop)],
  ['shop verifies the authenticated user matches the active app account', /client\.auth\.getUser\(\)/.test(shop) && /authData\.user\?\.id !== userId/.test(shop)],
  ['wallet and inventory are refreshed only after RPC success', /if \(spendError\)/.test(shop) && /await loadShop\(\)/.test(shop) && /setOwnedItems/.test(shop)],
  ['staging lock revokes public execution', /REVOKE ALL ON FUNCTION public\.spend_tokens\(text, uuid\) FROM PUBLIC;/i.test(migration)],
  ['staging lock revokes anonymous execution', /REVOKE ALL ON FUNCTION public\.spend_tokens\(text, uuid\) FROM anon;/i.test(migration)],
  ['staging lock revokes authenticated execution until approval', /REVOKE ALL ON FUNCTION public\.spend_tokens\(text, uuid\) FROM authenticated;/i.test(migration)],
  ['staging lock does not grant execution to any role', !/GRANT EXECUTE ON FUNCTION public\.spend_tokens\(text, uuid\)/i.test(migration)],
];

for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label);
  assert.ok(passed, label);
}
console.log('Token spend static contract checks passed: ' + checks.length + '. Static checks only; owner-reviewed migration history and isolated authenticated staging tests are still required.');
