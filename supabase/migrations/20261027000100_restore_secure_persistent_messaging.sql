-- Restore the durable Sanctuary conversation schema that is missing from the live project.
-- Additive repair only: existing profiles, posts, reports, wallets and account data are untouched.
begin;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  world_type public.world_type not null default 'sanctuary'::public.world_type,
  name text check (name is null or char_length(name) between 2 and 60),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'direct' and name is null) or kind = 'group')
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.direct_conversation_pairs (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  first_user_id uuid not null references public.profiles(id) on delete cascade,
  second_user_id uuid not null references public.profiles(id) on delete cascade,
  world_type public.world_type not null default 'sanctuary'::public.world_type,
  check (first_user_id < second_user_id),
  unique (first_user_id, second_user_id, world_type)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  state public.content_state not null default 'visible',
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_conversation_sent_idx
  on public.messages (conversation_id, sent_at desc);
create index if not exists conversation_members_user_idx
  on public.conversation_members (user_id, conversation_id) where left_at is null;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.direct_conversation_pairs enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_active_conversation_member(target_conversation uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.conversation_id = target_conversation
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
      and (p.status = 'active' or (p.status = 'suspended' and p.suspended_until is not null and p.suspended_until <= pg_catalog.now()))
  );
$$;

revoke all on function public.is_active_conversation_member(uuid) from public, anon;
grant execute on function public.is_active_conversation_member(uuid) to authenticated;

drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations" on public.conversations
  for select to authenticated using (public.is_active_conversation_member(id));

drop policy if exists "members read membership" on public.conversation_members;
create policy "members read membership" on public.conversation_members
  for select to authenticated using (public.is_active_conversation_member(conversation_id));

drop policy if exists "participants read direct pair" on public.direct_conversation_pairs;
create policy "participants read direct pair" on public.direct_conversation_pairs
  for select to authenticated using (public.is_active_conversation_member(conversation_id));

drop policy if exists "active members read messages" on public.messages;
create policy "active members read messages" on public.messages
  for select to authenticated using (public.is_active_conversation_member(conversation_id) and state = 'visible');

drop policy if exists "active members send messages" on public.messages;
create policy "active members send messages" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and public.is_active_user()
    and public.is_active_conversation_member(conversation_id)
    and char_length(body) between 1 and 2000
  );

revoke all on table public.conversations, public.conversation_members, public.direct_conversation_pairs, public.messages from public, anon, authenticated;
grant select on table public.conversations, public.conversation_members, public.direct_conversation_pairs, public.messages to authenticated;
grant insert on table public.messages to authenticated;

create or replace function public.create_conversation(
  requested_kind public.conversation_kind,
  requested_world public.world_type,
  requested_member_ids uuid[],
  requested_name text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  member_count integer;
  created_conversation_id uuid;
  first_id uuid;
  second_id uuid;
begin
  if caller_id is null or not public.is_active_user() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if requested_kind is null or requested_world is null then
    raise exception 'Choose a valid conversation type and scope' using errcode = '22023';
  end if;
  if requested_kind = 'group' and (requested_name is null or char_length(trim(requested_name)) not between 2 and 60) then
    raise exception 'Group names must be between 2 and 60 characters' using errcode = '22023';
  end if;

  select count(distinct member_id) into member_count
  from unnest(coalesce(requested_member_ids, array[]::uuid[])) as members(member_id)
  where member_id is not null;

  if requested_kind = 'direct' and member_count <> 2 then
    raise exception 'Direct conversations require exactly two members' using errcode = '22023';
  end if;
  if requested_kind = 'group' and (member_count < 3 or member_count > 50) then
    raise exception 'Group conversations require 3 to 50 members' using errcode = '22023';
  end if;
  if not caller_id = any(coalesce(requested_member_ids, array[]::uuid[])) then
    raise exception 'The caller must be a conversation member' using errcode = '42501';
  end if;

  if exists (
    select 1
    from unnest(coalesce(requested_member_ids, array[]::uuid[])) as members(member_id)
    left join public.profiles p on p.id = members.member_id
    where p.id is null
      or not (p.status = 'active' or (p.status = 'suspended' and p.suspended_until is not null and p.suspended_until <= pg_catalog.now()))
      or (members.member_id <> caller_id and not coalesce(p.allow_direct_messages, true))
      or (members.member_id <> caller_id and coalesce(p.privacy->>'allowDirectMessages', 'true') <> 'true')
      or (members.member_id <> caller_id and exists (
        select 1 from public.account_settings s
        where s.user_id = p.id and coalesce(s.preferences->>'allowDirectMessages', 'true') <> 'true'
      ))
  ) then
    raise exception 'One or more recipients are unavailable or do not accept direct messages' using errcode = '42501';
  end if;

  if requested_kind = 'direct' then
    if cardinality(requested_member_ids) <> member_count then
      raise exception 'Direct conversations require two distinct members' using errcode = '22023';
    end if;
    select least(requested_member_ids[1], requested_member_ids[2]),
           greatest(requested_member_ids[1], requested_member_ids[2])
      into first_id, second_id;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(first_id::text || ':' || second_id::text || ':' || requested_world::text, 0));
    select pair.conversation_id into created_conversation_id
    from public.direct_conversation_pairs pair
    where pair.first_user_id = first_id and pair.second_user_id = second_id and pair.world_type = requested_world;
    if created_conversation_id is not null then return created_conversation_id; end if;
  end if;

  insert into public.conversations (kind, world_type, name, created_by)
  values (requested_kind, requested_world, case when requested_kind = 'group' then trim(requested_name) else null end, caller_id)
  returning id into created_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  select created_conversation_id, member_id
  from (select distinct unnest(requested_member_ids) as member_id) members;

  if requested_kind = 'direct' then
    insert into public.direct_conversation_pairs (conversation_id, first_user_id, second_user_id, world_type)
    values (created_conversation_id, first_id, second_id, requested_world);
  end if;

  return created_conversation_id;
end;
$$;

revoke all on function public.create_conversation(public.conversation_kind, public.world_type, uuid[], text) from public, anon;
grant execute on function public.create_conversation(public.conversation_kind, public.world_type, uuid[], text) to authenticated;

create or replace function public.create_sanctuary_conversation(
  requested_kind public.conversation_kind,
  requested_member_ids uuid[],
  requested_name text default null
)
returns uuid
language sql security definer set search_path = ''
as $$
  select public.create_conversation(requested_kind, 'sanctuary'::public.world_type, requested_member_ids, requested_name);
$$;

revoke all on function public.create_sanctuary_conversation(public.conversation_kind, uuid[], text) from public, anon;
grant execute on function public.create_sanctuary_conversation(public.conversation_kind, uuid[], text) to authenticated;

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.conversations set updated_at = new.sent_at where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation after insert on public.messages
for each row execute function public.touch_conversation_on_message();

-- Keep the profile privacy field and settings toggle synchronized.
create or replace function public.sync_profile_message_preference()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles
  set allow_direct_messages = coalesce((new.preferences->>'allowDirectMessages') = 'true', true),
      allow_profile_discovery = coalesce((new.preferences->>'allowProfileDiscovery') = 'true', true),
      updated_at = pg_catalog.now()
  where id = new.user_id;
  return new;
end;
$$;
revoke all on function public.sync_profile_message_preference() from public, anon, authenticated;
drop trigger if exists account_settings_sync_dm_preference on public.account_settings;
create trigger account_settings_sync_dm_preference
after insert or update of preferences on public.account_settings
for each row execute function public.sync_profile_message_preference();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

commit;

notify pgrst, 'reload schema';
