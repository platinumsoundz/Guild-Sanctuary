import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const shop = readFileSync('src/modules/economy/TokenShopPanel.tsx', 'utf8');
const migration = readFileSync(
  'supabase/migrations/20261027120000_keep_token_spending_locked_until_staging.sql',
  'utf8',
);
const repricing = readFileSync('supabase/migrations/20261030110000_reprice_token_cosmetics.sql', 'utf8');
const bonus = readFileSync('supabase/migrations/20261030120000_first_100_signup_bonus_500.sql', 'utf8');
const wallet = readFileSync('src/modules/economy/WalletPanel.tsx', 'utf8');

const checks = [
  ['redemption is explicitly disabled until owner-approved staging', /const SPENDING_ENABLED = false/.test(shop)],
  ['purchase handler fails closed while spending is disabled', /if \(!SPENDING_ENABLED \|\| isGuest \|\| !hasSupabaseAccount \|\| purchasingItemId \|\| ownedItems\.has\(item\.item_id\)\) return;/.test(shop)],
  ['purchase button is disabled while spending is locked', /disabled=\{!SPENDING_ENABLED \|\| !hasSupabaseAccount \|\| owned \|\| purchasingItemId !== null\}/.test(shop)],
  ['locked purchase control communicates that redemption is unavailable', /!SPENDING_ENABLED \? 'Coming soon' : purchasing \? 'Unlocking…' : 'Unlock item'/.test(shop)],
  ['RPC request stays server-authoritative and carries an idempotency key', /client\.rpc\('spend_tokens'/.test(shop) && /requested_item_id:\s*item\.item_id/.test(shop) && /requested_idempotency_key:\s*crypto\.randomUUID\(\)/.test(shop)],
  ['shop verifies the authenticated user matches the active app account', /client\.auth\.getUser\(\)/.test(shop) && /authData\.user\?\.id !== userId/.test(shop)],
  ['wallet and inventory are refreshed only after RPC success', /if \(spendError\)/.test(shop) && /await loadShop\(\)/.test(shop) && /setOwnedItems/.test(shop)],
  ['staging lock revokes public execution', /REVOKE ALL ON FUNCTION public\.spend_tokens\(text, uuid\) FROM PUBLIC;/i.test(migration)],
  ['staging lock revokes anonymous execution', /REVOKE ALL ON FUNCTION public\.spend_tokens\(text, uuid\) FROM anon;/i.test(migration)],
  ['staging lock revokes authenticated execution until approval', /REVOKE ALL ON FUNCTION public\.spend_tokens\(text, uuid\) FROM authenticated;/i.test(migration)],
  ['staging lock does not grant execution to any role', !/GRANT EXECUTE ON FUNCTION public\.spend_tokens\(text, uuid\)/i.test(migration)],
  ['all cosmetic prices are within 20–50 tokens', /when 'theme_nebula' then 50/.test(repricing) && /when 'profile_effect_sparkle' then 20/.test(repricing) && /when 'banner_crystal_garden' then 50/.test(repricing) && !/then (?:[1-9][0-9]{2,}|[6-9][0-9]|5[1-9])/.test(repricing)],
  ['first 100 places are reserved in original signup order, including unverified accounts', /order by u\.created_at asc, u\.id asc/.test(bonus) && /where p\.status = 'active'/.test(bonus) && !/where u\.email_confirmed_at is not null\s+and p\.status/.test(bonus)],
  ['unverified founding members are not credited until verified', /granted_at timestamptz/.test(bonus) && /if account_verified and award_granted_at is null then/.test(bonus) && /not\('granted_at', 'is', null\)/.test(wallet)],
  ['bonus allocation pool has a hard 100-account cap and row lock', /awarded_count integer not null default 0 check \(awarded_count between 0 and 100\)/.test(bonus) && /for update;/.test(bonus)],
  ['bonus helper requires verified and active accounts', /(u\.email_confirmed_at is not null)/.test(bonus) && /p\.status = 'active'/.test(bonus)],
  ['existing accounts receive a 400-token top-up and future accounts 500', /grant_amount := 400/.test(bonus) && /grant_amount := 500/.test(bonus)],
  ['award ledger enforces one award per account and unique rank', /user_id uuid primary key/.test(bonus) && /signup_rank integer not null unique/.test(bonus)],
  ['private grant helper is revoked from API and service roles', /revoke all on function public\.grant_first_100_signup_bonus\(uuid\) from public, anon, authenticated, service_role/i.test(bonus)],
  ['wallet displays the thank-you notice only when an award record exists', /token_signup_bonus_awards/.test(wallet) && /founding member token reward has been credited/.test(wallet)],
];

for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label);
  assert.ok(passed, label);
}
console.log('Token spend static contract checks passed: ' + checks.length + '. Static checks only; owner-reviewed migration history and isolated authenticated staging tests are still required.');
