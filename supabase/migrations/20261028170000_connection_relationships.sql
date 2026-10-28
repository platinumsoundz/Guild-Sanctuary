-- Sanctuary's explicit follow, connection-request, and blocking layer.
-- Relationship state is separate from public interests and private self-discovery.
begin;

create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint profile_follows_no_self check (follower_id <> followee_id)
);

create index if not exists profile_follows_followee_idx
  on public.profile_follows (followee_id, follower_id);

create table if not exists public.profile_connections (
  id uuid primary key default gen_random_uuid(),
  member_low_id uuid not null references public.profiles(id) on delete cascade,
  member_high_id uuid not null references public.profiles(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint profile_connections_pair_order check (member_low_id < member_high_id),
  constraint profile_connections_unique_pair unique (member_low_id, member_high_id),
  constraint profile_connections_distinct_members check (requester_id <> addressee_id),
  constraint profile_connections_pair_members check (
    (requester_id = member_low_id and addressee_id = member_high_id)
    or (requester_id = member_high_id and addressee_id = member_low_id)
  )
);

create index if not exists profile_connections_addressee_status_idx
  on public.profile_connections (addressee_id, status, created_at desc);
create index if not exists profile_connections_requester_status_idx
  on public.profile_connections (requester_id, status, created_at desc);

create table if not exists public.profile_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint profile_blocks_no_self check (blocker_id <> blocked_id)
);

create index if not exists profile_blocks_blocked_idx
  on public.profile_blocks (blocked_id, blocker_id);

alter table public.profile_follows enable row level security;
alter table public.profile_connections enable row level security;
alter table public.profile_blocks enable row level security;

revoke all on table public.profile_follows, public.profile_connections, public.profile_blocks from anon, authenticated;
grant select, insert, delete on table public.profile_follows to authenticated;
grant select, insert, update, delete on table public.profile_connections to authenticated;
grant select, insert, delete on table public.profile_blocks to authenticated;

drop policy if exists "members read their follow edges" on public.profile_follows;
create policy "members read their follow edges" on public.profile_follows
  for select to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

drop policy if exists "members follow discoverable profiles" on public.profile_follows;
create policy "members follow discoverable profiles" on public.profile_follows
  for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and public.is_active_user()
    and exists (select 1 from private.public_profile_projection p where p.id = followee_id)
  );

drop policy if exists "members unfollow their own edges" on public.profile_follows;
create policy "members unfollow their own edges" on public.profile_follows
  for delete to authenticated
  using (follower_id = (select auth.uid()));

drop policy if exists "members read their connection requests" on public.profile_connections;
create policy "members read their connection requests" on public.profile_connections
  for select to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

drop policy if exists "members request a connection with discoverable profiles" on public.profile_connections;
create policy "members request a connection with discoverable profiles" on public.profile_connections
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and public.is_active_user()
    and exists (select 1 from private.public_profile_projection p where p.id = addressee_id)
  );

drop policy if exists "recipients respond to connection requests" on public.profile_connections;
create policy "recipients respond to connection requests" on public.profile_connections
  for update to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (
    addressee_id = (select auth.uid())
    and status in ('accepted', 'declined')
    and requester_id <> addressee_id
  );

drop policy if exists "requesters remove declined requests" on public.profile_connections;
create policy "requesters remove declined requests" on public.profile_connections
  for delete to authenticated
  using (requester_id = (select auth.uid()) and status = 'declined');

drop policy if exists "members read their own block list" on public.profile_blocks;
create policy "members read their own block list" on public.profile_blocks
  for select to authenticated using (blocker_id = (select auth.uid()));

drop policy if exists "members block profiles" on public.profile_blocks;
create policy "members block profiles" on public.profile_blocks
  for insert to authenticated
  with check (
    blocker_id = (select auth.uid())
    and public.is_active_user()
    and exists (select 1 from private.public_profile_projection p where p.id = blocked_id)
  );

drop policy if exists "members unblock profiles" on public.profile_blocks;
create policy "members unblock profiles" on public.profile_blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

-- Relationship writes must respect blocks in either direction. Keep the
-- enforcement function in a non-exposed schema and use it only as a trigger.
create or replace function private.guard_profile_relationships()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  left_id uuid;
  right_id uuid;
begin
  if tg_table_name = 'profile_follows' then
    left_id := new.follower_id;
    right_id := new.followee_id;
  else
    left_id := new.requester_id;
    right_id := new.addressee_id;
  end if;

  if left_id = right_id then
    raise exception 'You cannot create a relationship with yourself.';
  end if;

  if tg_table_name = 'profile_connections' and tg_op = 'UPDATE' then
    if new.requester_id is distinct from old.requester_id
      or new.addressee_id is distinct from old.addressee_id
      or new.member_low_id is distinct from old.member_low_id
      or new.member_high_id is distinct from old.member_high_id
      or not (
        (old.status = 'pending' and new.status in ('accepted', 'declined'))
        or (old.status = 'accepted' and new.status = 'declined')
      ) then
      raise exception 'Only the recipient may respond to a pending connection request.';
    end if;
    new.responded_at := coalesce(new.responded_at, now());
  end if;

  if tg_table_name = 'profile_connections' and tg_op = 'UPDATE'
    and new.status = 'declined'
    and exists (
      select 1 from public.profile_blocks b
      where (b.blocker_id = left_id and b.blocked_id = right_id)
         or (b.blocker_id = right_id and b.blocked_id = left_id)
    ) then
    return new;
  end if;

  if exists (
    select 1 from public.profile_blocks b
    where (b.blocker_id = left_id and b.blocked_id = right_id)
       or (b.blocker_id = right_id and b.blocked_id = left_id)
  ) then
    raise exception 'This relationship is unavailable.';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_profile_relationships() from public, anon, authenticated;

drop trigger if exists guard_profile_follows on public.profile_follows;
create trigger guard_profile_follows
  before insert on public.profile_follows
  for each row execute function private.guard_profile_relationships();

drop trigger if exists guard_profile_connections on public.profile_connections;
create trigger guard_profile_connections
  before insert or update on public.profile_connections
  for each row execute function private.guard_profile_relationships();

-- Authenticated public-profile discovery must hide either side of a block.
create or replace function private.is_profile_blocked(requested_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1
    from public.profile_blocks b
    where ((select auth.uid()) = b.blocker_id and b.blocked_id = requested_profile_id)
       or ((select auth.uid()) = b.blocked_id and b.blocker_id = requested_profile_id)
  );
$;

revoke all on function private.is_profile_blocked(uuid) from public, anon;
grant execute on function private.is_profile_blocked(uuid) to authenticated;

drop policy if exists "public profile projection readable" on private.public_profile_projection;
create policy "public profile projection readable"
  on private.public_profile_projection for select to anon, authenticated
  using (
    (select auth.uid()) is null
    or not (select private.is_profile_blocked(id))
  );

-- Blocking immediately removes follow edges and closes pending requests both ways.
create or replace function private.apply_profile_block_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.profile_follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);

  update public.profile_connections
  set status = 'declined', responded_at = now()
  where status in ('pending', 'accepted')
    and (
      (requester_id = new.blocker_id and addressee_id = new.blocked_id)
      or (requester_id = new.blocked_id and addressee_id = new.blocker_id)
    );

  -- Close existing direct conversations and hide their history from normal
  -- visible-message queries after a block, without affecting shared group chats.
  update public.messages m
  set state = 'hidden'
  where m.conversation_id in (
    select c.id from public.conversations c
    where c.kind = 'direct'
      and exists (
        select 1 from public.conversation_members cm
        where cm.conversation_id = c.id and cm.user_id = new.blocker_id
      )
      and exists (
        select 1 from public.conversation_members cm
        where cm.conversation_id = c.id and cm.user_id = new.blocked_id
      )
  );

  update public.conversation_members cm
  set left_at = coalesce(cm.left_at, now())
  where cm.user_id in (new.blocker_id, new.blocked_id)
    and cm.conversation_id in (
      select c.id from public.conversations c
      where c.kind = 'direct'
        and exists (
          select 1 from public.conversation_members other_member
          where other_member.conversation_id = c.id and other_member.user_id = new.blocker_id
        )
        and exists (
          select 1 from public.conversation_members other_member
          where other_member.conversation_id = c.id and other_member.user_id = new.blocked_id
        )
    );

  return new;
end;
$$;

revoke all on function private.apply_profile_block_cleanup() from public, anon, authenticated;

drop trigger if exists apply_profile_block_cleanup on public.profile_blocks;
create trigger apply_profile_block_cleanup
  after insert on public.profile_blocks
  for each row execute function private.apply_profile_block_cleanup();

create or replace function private.guard_direct_message_blocks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
begin
  if exists (
    select 1
    from public.conversations c
    join public.conversation_members sender_member
      on sender_member.conversation_id = c.id
     and sender_member.user_id = new.sender_id
     and sender_member.left_at is null
    join public.conversation_members recipient_member
      on recipient_member.conversation_id = c.id
     and recipient_member.user_id <> new.sender_id
     and recipient_member.left_at is null
    join public.profile_blocks b
      on (b.blocker_id = new.sender_id and b.blocked_id = recipient_member.user_id)
      or (b.blocker_id = recipient_member.user_id and b.blocked_id = new.sender_id)
    where c.id = new.conversation_id and c.kind = 'direct'
  ) then
    raise exception 'Messaging is unavailable because a member has blocked the other.';
  end if;
  return new;
end;
$;

revoke all on function private.guard_direct_message_blocks() from public, anon, authenticated;

drop trigger if exists guard_direct_message_blocks on public.messages;
create trigger guard_direct_message_blocks
  before insert on public.messages
  for each row execute function private.guard_direct_message_blocks();

create or replace function private.guard_direct_conversation_blocks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
begin
  if exists (
    select 1 from public.profile_blocks b
    where (b.blocker_id = new.first_user_id and b.blocked_id = new.second_user_id)
       or (b.blocker_id = new.second_user_id and b.blocked_id = new.first_user_id)
  ) then
    raise exception 'A direct conversation cannot be created because a member has blocked the other.';
  end if;
  return new;
end;
$;

revoke all on function private.guard_direct_conversation_blocks() from public, anon, authenticated;

drop trigger if exists guard_direct_conversation_blocks on public.direct_conversation_pairs;
create trigger guard_direct_conversation_blocks
  before insert on public.direct_conversation_pairs
  for each row execute function private.guard_direct_conversation_blocks();

commit;
