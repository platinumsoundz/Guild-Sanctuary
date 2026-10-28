begin;
select plan(15);

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

select * from finish();
rollback;
