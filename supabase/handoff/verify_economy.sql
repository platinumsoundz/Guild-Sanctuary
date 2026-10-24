-- The Sanctuary — economy verification.
-- Run each block separately in the Supabase SQL Editor.
-- These are read-only checks. They do not create or change anything.

-- 1. Applied migration versions. Compare with supabase/migrations/.
select version, name
from supabase_migrations.schema_migrations
order by version;

-- 2. Economy tables. Expected: five rows.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'token_wallets',
    'token_ledger',
    'token_spend_catalog',
    'token_spend_ledger',
    'token_entitlements'
  )
order by table_name;

-- 3. Economy functions. Expected: five rows.
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'record_token_bundle_purchase',
    'spend_tokens',
    'equip_profile_cosmetic',
    'clear_profile_cosmetic',
    'grant_signup_token_bonus'
  )
order by routine_name;

-- 4. Equipped cosmetic columns on profiles. Expected: four rows.
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name like 'equipped_%'
order by column_name;

-- 5. Equipped cosmetic columns on the public_profiles view. Expected: four rows.
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'public_profiles'
  and column_name like 'equipped_%'
order by column_name;

-- 6. Catalog. Expected: 12 enabled rows.
-- Frames 300, effects 200-250, badges 150, GIF banners 300.
select item_id, kind, price_tokens, enabled, sort_order
from public.token_spend_catalog
order by sort_order, price_tokens;

-- 7. Row-level security. Expected: rowsecurity = true for all five tables.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'token_wallets',
    'token_ledger',
    'token_spend_catalog',
    'token_spend_ledger',
    'token_entitlements'
  )
order by tablename;

-- 8. RLS policies. Expected: owner-read policies plus enabled-catalog read.
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'token_wallets',
    'token_ledger',
    'token_spend_catalog',
    'token_spend_ledger',
    'token_entitlements'
  )
order by tablename, policyname;

-- 9. Existing test wallets. New and backfilled profiles should have 100 tokens.
select p.username, w.balance_tokens
from public.profiles p
left join public.token_wallets w on w.user_id = p.id
order by p.username;

-- 10. Signup grant ledger entries. One row per granted account.
select user_id, bundle_id, tokens_delta, amount_total, created_at
from public.token_ledger
where bundle_id = 'signup_bonus'
order by created_at desc
limit 20;
