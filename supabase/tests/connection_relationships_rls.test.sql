begin;
select plan(23);

select ok(
  (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'public.profile_follows'::regclass),
  'profile_follows has row-level security enabled'
);
select ok(
  (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'public.profile_connections'::regclass),
  'profile_connections has row-level security enabled'
);
select ok(
  (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'public.profile_blocks'::regclass),
  'profile_blocks has row-level security enabled'
);

select ok(not has_table_privilege('anon', 'public.profile_follows', 'select'),
  'anonymous role cannot read follows');
select ok(not has_table_privilege('anon', 'public.profile_connections', 'select'),
  'anonymous role cannot read connection requests');
select ok(not has_table_privilege('anon', 'public.profile_blocks', 'select'),
  'anonymous role cannot read block relationships');

select ok(has_table_privilege('authenticated', 'public.profile_follows', 'select'),
  'authenticated members can read policy-filtered follow edges');
select ok(has_table_privilege('authenticated', 'public.profile_connections', 'select'),
  'authenticated members can read policy-filtered connection requests');
select ok(has_table_privilege('authenticated', 'public.profile_blocks', 'select'),
  'authenticated members can read their own block list');

select ok(exists (
  select 1 from pg_catalog.pg_policies
  where schemaname = 'public' and tablename = 'profile_connections'
    and policyname = 'recipients respond to connection requests'
), 'connection responses have a recipient-only policy');

select ok(exists (
  select 1 from pg_catalog.pg_policies
  where schemaname = 'private' and tablename = 'public_profile_projection'
    and policyname = 'public profile projection readable'
), 'public profile projection policy is block-aware');

select ok(exists (
  select 1 from pg_catalog.pg_trigger
  where tgname = 'apply_profile_block_cleanup' and not tgisinternal
), 'blocking triggers relationship cleanup');

select ok(exists (
  select 1 from pg_catalog.pg_trigger
  where tgname = 'guard_direct_message_blocks' and not tgisinternal
), 'blocked members cannot send new direct messages');

select ok(exists (
  select 1 from pg_catalog.pg_trigger
  where tgname = 'guard_direct_conversation_blocks' and not tgisinternal
), 'blocked members cannot create a new direct conversation');

select ok(exists (
  select 1 from pg_catalog.pg_trigger
  where tgname = 'notify_connection_request' and not tgisinternal
), 'connection requests use the notification system');

select ok(exists (
  select 1 from pg_catalog.pg_policies
  where schemaname = 'public' and tablename = 'posts'
    and policyname = 'blocked profiles excluded from posts' and permissive = 'RESTRICTIVE'
), 'blocked members are excluded from public feed posts');

select ok(exists (
  select 1 from pg_catalog.pg_policies
  where schemaname = 'public' and tablename = 'short_videos'
    and policyname = 'blocked profiles excluded from short videos' and permissive = 'RESTRICTIVE'
), 'blocked members are excluded from short videos');

select ok(exists (
  select 1 from pg_catalog.pg_policies
  where schemaname = 'public' and tablename = 'events'
    and policyname = 'blocked profiles excluded from events' and permissive = 'RESTRICTIVE'
), 'blocked members are excluded from event discovery');

select ok(exists (
  select 1 from pg_catalog.pg_policies
  where schemaname = 'public' and tablename = 'social_comments'
    and policyname = 'blocked profiles excluded from comments' and permissive = 'RESTRICTIVE'
), 'blocked members are excluded from public comments');

select ok(
  (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'public.profile_discovery_hidden'::regclass),
  'profile_discovery_hidden has row-level security enabled'
);
select ok(
  (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'public.profile_discovery_saved'::regclass),
  'profile_discovery_saved has row-level security enabled'
);
select ok(not has_table_privilege('anon', 'public.profile_discovery_hidden', 'select'),
  'anonymous role cannot read hidden profile preferences');
select ok(not has_table_privilege('anon', 'public.profile_discovery_saved', 'select'),
  'anonymous role cannot read saved profile preferences');

select * from finish();
rollback;
