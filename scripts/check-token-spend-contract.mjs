import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const shop = readFileSync('src/modules/economy/TokenShopPanel.tsx', 'utf8');
const migration = readFileSync(
  'supabase/migrations/20261027120000_grant_authenticated_token_spending.sql',
  'utf8',
);

assert.match(shop, /const SPENDING_ENABLED = false/, 'Token redemption must remain explicitly disabled until staging approval');
assert.match(shop, /if \(!SPENDING_ENABLED \|\| isGuest/, 'Purchase handler must fail closed while spending is locked');
assert.match(shop, /disabled=\{!SPENDING_ENABLED \|\| !hasSupabaseAccount/, 'Purchase button must remain disabled while spending is locked');
assert.match(shop, /Coming soon/, 'Locked purchase control must explain that redemption is not yet available');
assert.match(shop, /client\.rpc\('spend_tokens'/, 'Shop must call the guarded spend RPC');
assert.match(shop, /requested_item_id:\s*item\.item_id/, 'RPC must receive the selected catalogue item ID');
assert.match(shop, /requested_idempotency_key:\s*crypto\.randomUUID\(\)/, 'Each purchase attempt must have an idempotency key');
assert.match(shop, /client\.auth\.getUser\(\)/, 'Shop must verify the current Supabase user');
assert.match(shop, /authData\.user\?\.id !== userId/, 'Shop must bind the UI account to the authenticated user');
assert.match(shop, /disabled=\{!hasSupabaseAccount \|\| owned \|\| purchasingItemId !== null\}/, 'Guest/unconfigured/owned/parallel UI purchases must be disabled');
assert.match(shop, /balance_tokens/, 'Shop must consume the database-confirmed balance');
assert.match(shop, /setOwnedItems/, 'Shop must refresh owned-item state after a confirmed purchase');

assert.match(migration, /REVOKE ALL ON FUNCTION public\.spend_tokens\(text, uuid\) FROM PUBLIC;/i, 'PUBLIC execute must be revoked');
assert.match(migration, /REVOKE ALL ON FUNCTION public\.spend_tokens\(text, uuid\) FROM anon;/i, 'anon execute must be revoked');
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.spend_tokens\(text, uuid\) TO authenticated;/i, 'authenticated execute must be granted');
assert.doesNotMatch(migration, /GRANT EXECUTE ON FUNCTION public\.spend_tokens\(text, uuid\) TO (PUBLIC|anon)\s*;/i, 'spend RPC must never be granted to PUBLIC or anon');

console.log('Token spend static contract checks passed.');
