-- The Sanctuary — full schema verification.
-- Run each block separately in the Supabase SQL Editor.
-- These are read-only checks. They do not create or change anything.

-- 1. Applied migration versions. Compare with supabase/migrations/.
select version, name
from supabase_migrations.schema_migrations
order by version;

-- 2. Core tables. Expected: all listed tables exist.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'account_settings',
    'posts',
    'short_videos',
    'events',
    'event_rsvps',
    'social_likes',
    'social_comments',
    'conversations',
    'conversation_members',
    'messages',
    'content_reports',
    'moderation_actions',
    'audit_events',
    'private_profile_vault',
    'community_tips',
    'token_wallets',
    'token_ledger',
    'token_spend_catalog',
    'token_spend_ledger',
    'token_entitlements'
  )
order by table_name;

-- 3. Aggregate and public views. Expected: all listed views exist.
select table_name
from information_schema.views
where table_schema = 'public'
  and table_name in (
    'public_profiles',
    'social_like_counts',
    'event_rsvp_counts'
  )
order by table_name;

-- 4. Core functions and RPCs. Expected: all listed routines exist.
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_active_user',
    'is_moderator',
    'create_sanctuary_conversation',
    'submit_content_report',
    'apply_moderation_action',
    'get_short_engagement_stats',
    'toggle_short_like',
    'record_community_tip',
    'record_token_bundle_purchase',
    'spend_tokens',
    'equip_profile_cosmetic',
    'clear_profile_cosmetic',
    'grant_signup_token_bonus'
  )
order by routine_name;

-- 5. RLS enabled on every public table that stores user data.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'account_settings',
    'posts',
    'short_videos',
    'events',
    'event_rsvps',
    'social_likes',
    'social_comments',
    'conversations',
    'conversation_members',
    'messages',
    'content_reports',
    'moderation_actions',
    'audit_events',
    'private_profile_vault',
    'community_tips',
    'token_wallets',
    'token_ledger',
    'token_spend_catalog',
    'token_spend_ledger',
    'token_entitlements'
  )
order by tablename;

-- 6. Discovery indexes. Expected: trigram or username/display-name indexes.
select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and tablename = 'profiles'
order by indexname;

-- 7. Storage buckets. Expected: community-media and any private media bucket.
select id, name, public
from storage.buckets
order by id;

-- 8. Economy catalog. Expected: 12 enabled rows.
select item_id, kind, price_tokens, enabled, sort_order
from public.token_spend_catalog
order by sort_order, price_tokens;

-- 9. Profile cosmetic columns. Expected: equipped_frame, equipped_effect,
-- equipped_badge, equipped_banner.
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name like 'equipped_%'
order by column_name;
