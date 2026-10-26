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
    'token_entitlements',
    'token_refund_events',
    'token_purchase_reviews',
    'account_deletion_requests',
    'moderation_appeals',
    'moderation_notes'
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
    'grant_signup_token_bonus',
    'confirm_token_purchase_age',
    'record_token_refund',
    'request_account_deletion',
    'cancel_account_deletion',
    'purge_due_account_deletions',
    'submit_moderation_appeal',
    'fetch_my_moderation_appeals',
    'admin_list_appeals',
    'admin_resolve_appeal',
    'admin_search_members',
    'admin_member_overview',
    'admin_set_member_role',
    'admin_add_member_note',
    'admin_list_audit_events',
    'admin_list_terms_acceptances',
    'admin_list_purchase_reviews',
    'admin_resolve_purchase_review'
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
    'token_entitlements',
    'token_refund_events',
    'token_purchase_reviews',
    'account_deletion_requests',
    'moderation_appeals',
    'moderation_notes',
    'terms_acceptances'
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

-- 10. Launch-gate columns on profiles. Expected: three rows.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in (
    'purchase_age_verified_at',
    'deletion_requested_at',
    'deletion_purge_after'
  )
order by column_name;

-- 10a. Terms acceptance storage. Expected: id, user_id, terms_version, accepted_at.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'terms_acceptances'
order by ordinal_position;

-- 11. Deletion visibility flags. Expected: hidden_for_deletion on all four.
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('posts', 'short_videos', 'events', 'social_comments')
  and column_name = 'hidden_for_deletion'
order by table_name;

-- 12. New RLS policies. Expected: appeals, notes, deletion requests, refunds, terms.
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'token_refund_events',
    'token_purchase_reviews',
    'account_deletion_requests',
    'moderation_appeals',
    'moderation_notes',
    'terms_acceptances'
  )
order by tablename, policyname;
