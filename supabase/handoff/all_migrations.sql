-- The Sanctuary — complete fresh-project schema.
-- Generated from supabase/migrations in filename order.
-- Use this only on a fresh Supabase project. For an existing project,
-- run supabase/handoff/verify_all.sql first and apply only missing migrations.
begin;

-- ============================================================================
-- Source: supabase/migrations/20261009000000_social_core_and_moderation.sql
-- ============================================================================
create extension if not exists pgcrypto;

create type public.world_type as enum ('sanctuary', 'guild');
create type public.conversation_kind as enum ('direct', 'group');
create type public.content_state as enum ('visible', 'hidden', 'removed');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.report_target_type as enum ('post', 'short', 'event', 'message');
create type public.moderation_action_type as enum ('warn', 'hide', 'remove', 'restore', 'suspend', 'ban');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  bio text check (bio is null or char_length(bio) <= 1000),
  status_message text check (status_message is null or char_length(status_message) <= 120),
  avatar_url text,
  banner_url text,
  theme_color text not null default '#52765c' check (theme_color ~ '^#[0-9A-Fa-f]{6}$'),
  location text,
  age integer check (age is null or age between 13 and 120),
  star_sign text,
  belief text,
  social_links jsonb not null default '{"facebook":null,"x":null,"youtube":null,"xbox":null,"playstation":null,"steam":null,"epicGames":null,"reddit":null}'::jsonb,
  privacy jsonb not null default '{"bio":true,"location":false,"age":false,"starSign":false,"belief":false,"socialLinks":false,"allowDirectMessages":true}'::jsonb,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  suspended_until timestamptz,
  allow_direct_messages boolean not null default true,
  allow_profile_discovery boolean not null default true,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{"allowProfileDiscovery":true,"allowDirectMessages":true,"showOnlineStatus":false,"emailNotifications":true,"personalizedFeed":true,"layout":"comfortable"}'::jsonb
    check (preferences ->> 'layout' in ('comfortable', 'compact')),
  updated_at timestamptz not null default now()
);

create view public.public_profiles with (security_barrier = true) as
select
  id,
  username,
  display_name,
  case when privacy ->> 'bio' = 'true' then bio end as bio,
  status_message,
  avatar_url,
  banner_url,
  theme_color,
  case when privacy ->> 'location' = 'true' then location end as location,
  case when privacy ->> 'age' = 'true' then age end as age,
  case when privacy ->> 'starSign' = 'true' then star_sign end as star_sign,
  case when privacy ->> 'belief' = 'true' then belief end as belief,
  case when privacy ->> 'socialLinks' = 'true' then social_links end as social_links,
  allow_direct_messages
from public.profiles
where visibility = 'public'
  and allow_profile_discovery
  and (status = 'active' or (status = 'suspended' and suspended_until <= now()));

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  world_type public.world_type not null,
  content text not null default '' check (char_length(content) <= 2800),
  media_url text,
  media_type text check (media_type is null or media_type in ('image', 'audio', 'video')),
  story_tag text check (story_tag is null or char_length(story_tag) <= 32),
  state public.content_state not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(content) > 0 or media_url is not null),
  check ((media_url is null) = (media_type is null))
);

create table public.short_videos (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  world_type public.world_type not null,
  video_url text not null,
  caption text not null default '' check (char_length(caption) <= 500),
  state public.content_state not null default 'visible',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  world_type public.world_type not null,
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  starts_at timestamptz not null,
  ends_at timestamptz,
  state public.content_state not null default 'visible',
  created_at timestamptz not null default now()
);

create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('going', 'interested', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.social_likes (
  id uuid primary key default gen_random_uuid(),
  target_type public.report_target_type not null check (target_type <> 'message'),
  target_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id)
);

create table public.social_comments (
  id uuid primary key default gen_random_uuid(),
  target_type public.report_target_type not null check (target_type <> 'message'),
  target_id uuid not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  state public.content_state not null default 'visible',
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  world_type public.world_type not null,
  name text check (name is null or char_length(name) between 2 and 60),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'direct' and name is null) or kind = 'group')
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (conversation_id, user_id)
);

create table public.direct_conversation_pairs (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  first_user_id uuid not null references public.profiles(id) on delete cascade,
  second_user_id uuid not null references public.profiles(id) on delete cascade,
  world_type public.world_type not null,
  check (first_user_id < second_user_id),
  unique (first_user_id, second_user_id, world_type)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  state public.content_state not null default 'visible',
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 2 and 80),
  details text check (details is null or char_length(details) <= 2000),
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.content_reports(id) on delete set null,
  actor_id uuid not null,
  target_type text not null check (target_type in ('post', 'short', 'event', 'message', 'user')),
  target_id uuid not null,
  action public.moderation_action_type not null,
  rationale text not null check (char_length(rationale) between 3 and 1000),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  event_type text not null,
  subject_type text not null,
  subject_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index posts_world_created_idx on public.posts (world_type, created_at desc) where state = 'visible';
create index shorts_world_created_idx on public.short_videos (world_type, created_at desc) where state = 'visible';
create index events_world_starts_idx on public.events (world_type, starts_at) where state = 'visible';
create index messages_conversation_sent_idx on public.messages (conversation_id, sent_at desc);
create index conversation_members_user_idx on public.conversation_members (user_id, conversation_id) where left_at is null;
create index reports_queue_idx on public.content_reports (status, created_at) where status in ('open', 'reviewing');

create function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('moderator', 'admin')
      and (status = 'active' or (status = 'suspended' and suspended_until <= now()))
  );
$$;

create function public.sync_profile_message_preference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
    set allow_direct_messages = coalesce((new.preferences ->> 'allowDirectMessages') = 'true', true),
        allow_profile_discovery = coalesce((new.preferences ->> 'allowProfileDiscovery') = 'true', true),
        updated_at = now()
    where id = new.user_id;
  return new;
end;
$$;

create trigger account_settings_sync_dm_preference
after insert or update of preferences on public.account_settings
for each row execute function public.sync_profile_message_preference();

create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and (status = 'active' or (status = 'suspended' and suspended_until <= now()))
  );
$$;

create function public.is_active_conversation_member(target_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.conversation_id = target_conversation
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
      and (p.status = 'active' or (p.status = 'suspended' and p.suspended_until <= now()))
  );
$$;

revoke all on function public.is_active_conversation_member(uuid) from public;
grant execute on function public.is_active_conversation_member(uuid) to authenticated;

create function public.create_conversation(
  requested_kind public.conversation_kind,
  requested_world public.world_type,
  requested_member_ids uuid[],
  requested_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
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
  if not exists (
    select 1 from public.profiles p
    where p.id = caller_id and (p.status = 'active' or (p.status = 'suspended' and p.suspended_until <= now()))
  ) then
    raise exception 'Active profile required' using errcode = '42501';
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
  if not caller_id = any(requested_member_ids) then
    raise exception 'The caller must be a conversation member' using errcode = '42501';
  end if;
  if exists (
    select 1
    from unnest(requested_member_ids) as members(member_id)
    left join public.profiles p on p.id = members.member_id
    where p.id is null
      or not (p.status = 'active' or (p.status = 'suspended' and p.suspended_until <= now()))
      or (members.member_id <> caller_id and not p.allow_direct_messages)
  ) then
    raise exception 'All conversation members must have active profiles' using errcode = '22023';
  end if;

  if requested_kind = 'direct' then
    select least(requested_member_ids[1], requested_member_ids[2]),
           greatest(requested_member_ids[1], requested_member_ids[2])
      into first_id, second_id;
      if cardinality(requested_member_ids) <> member_count then
        raise exception 'Direct conversations require two distinct members' using errcode = '22023';
      end if;
      perform pg_advisory_xact_lock(hashtextextended(first_id::text || ':' || second_id::text || ':' || requested_world::text, 0));
      select pair.conversation_id into created_conversation_id
      from public.direct_conversation_pairs pair
      where pair.first_user_id = first_id and pair.second_user_id = second_id
        and pair.world_type = requested_world;
    if created_conversation_id is not null then
      return created_conversation_id;
    end if;
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

revoke all on function public.create_conversation(public.conversation_kind, public.world_type, uuid[], text) from public;
grant execute on function public.create_conversation(public.conversation_kind, public.world_type, uuid[], text) to authenticated;

create function public.submit_content_report(
  requested_target_type public.report_target_type,
  requested_target_id uuid,
  requested_reason text,
  requested_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_exists boolean;
  report_id uuid;
begin
  if caller_id is null or not public.is_active_user() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if char_length(trim(requested_reason)) not between 2 and 80
    or (requested_details is not null and char_length(requested_details) > 2000) then
    raise exception 'Invalid report details' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(caller_id::text || ':report-rate', 0));
  if (select count(*) from public.content_reports
      where reporter_id = caller_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Report rate limit exceeded' using errcode = '42900';
  end if;

  case requested_target_type
    when 'post' then select exists(select 1 from public.posts where id = requested_target_id) into target_exists;
    when 'short' then select exists(select 1 from public.short_videos where id = requested_target_id) into target_exists;
    when 'event' then select exists(select 1 from public.events where id = requested_target_id) into target_exists;
    when 'message' then
      select exists (
        select 1 from public.messages m
        where m.id = requested_target_id and public.is_active_conversation_member(m.conversation_id)
      ) into target_exists;
  end case;
  if not target_exists then
    raise exception 'Report target is unavailable' using errcode = 'P0002';
  end if;

  insert into public.content_reports (reporter_id, target_type, target_id, reason, details)
  values (caller_id, requested_target_type, requested_target_id, trim(requested_reason), nullif(trim(requested_details), ''))
  on conflict (reporter_id, target_type, target_id) do update
    set reason = excluded.reason,
        details = excluded.details,
        status = 'open',
        reviewed_by = null,
        reviewed_at = null
  returning id into report_id;
  return report_id;
end;
$$;

revoke all on function public.submit_content_report(public.report_target_type, uuid, text, text) from public;
grant execute on function public.submit_content_report(public.report_target_type, uuid, text, text) to authenticated;

create function public.get_report_target_owner(requested_target_type public.report_target_type, requested_target_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  if not public.is_moderator() then
    raise exception 'Moderator authorization required' using errcode = '42501';
  end if;
  case requested_target_type
    when 'post' then select author_id into owner_id from public.posts where id = requested_target_id;
    when 'short' then select author_id into owner_id from public.short_videos where id = requested_target_id;
    when 'event' then select creator_id into owner_id from public.events where id = requested_target_id;
    when 'message' then select sender_id into owner_id from public.messages where id = requested_target_id;
  end case;
  return owner_id;
end;
$$;

revoke all on function public.get_report_target_owner(public.report_target_type, uuid) from public;
grant execute on function public.get_report_target_owner(public.report_target_type, uuid) to authenticated;

create function public.apply_moderation_action(
  requested_report_id uuid,
  requested_target_type text,
  requested_target_id uuid,
  requested_action public.moderation_action_type,
  requested_rationale text,
  requested_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  action_id uuid;
begin
  if caller_id is null or not public.is_moderator() then
    raise exception 'Moderator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(requested_rationale)) not between 3 and 1000 then
    raise exception 'A moderation rationale is required' using errcode = '22023';
  end if;
  if requested_action in ('warn', 'suspend', 'ban') and requested_target_type <> 'user' then
    raise exception 'Account actions require a user target' using errcode = '22023';
  end if;
  if requested_action not in ('warn', 'suspend', 'ban') and requested_target_type = 'user' then
    raise exception 'Content actions require a content target' using errcode = '22023';
  end if;
  if requested_action = 'suspend' and (requested_expires_at is null or requested_expires_at <= now()) then
    raise exception 'Temporary suspensions require a future expiry' using errcode = '22023';
  end if;
  if requested_target_type = 'user' then
    if not exists (select 1 from public.profiles where id = requested_target_id) then
      raise exception 'Moderation target is unavailable' using errcode = 'P0002';
    end if;
  elsif requested_target_type = 'post' then
    if not exists (select 1 from public.posts where id = requested_target_id) then
      raise exception 'Moderation target is unavailable' using errcode = 'P0002';
    end if;
  elsif requested_target_type = 'short' then
    if not exists (select 1 from public.short_videos where id = requested_target_id) then
      raise exception 'Moderation target is unavailable' using errcode = 'P0002';
    end if;
  elsif requested_target_type = 'event' then
    if not exists (select 1 from public.events where id = requested_target_id) then
      raise exception 'Moderation target is unavailable' using errcode = 'P0002';
    end if;
  elsif requested_target_type = 'message' then
    if not exists (select 1 from public.messages where id = requested_target_id) then
      raise exception 'Moderation target is unavailable' using errcode = 'P0002';
    end if;
  end if;
  if requested_report_id is not null and not exists (
    select 1
    from public.content_reports report
    where report.id = requested_report_id
      and (
        (requested_target_type = 'user' and public.get_report_target_owner(report.target_type, report.target_id) = requested_target_id)
        or (requested_target_type = report.target_type::text and report.target_id = requested_target_id)
      )
  ) then
    raise exception 'Report and moderation target do not match' using errcode = '22023';
  end if;

  insert into public.moderation_actions (report_id, actor_id, target_type, target_id, action, rationale, expires_at)
  values (requested_report_id, caller_id, requested_target_type, requested_target_id, requested_action, trim(requested_rationale), requested_expires_at)
  returning id into action_id;

  if requested_action in ('suspend', 'ban') then
    update public.profiles
      set status = case when requested_action = 'suspend' then 'suspended' else 'banned' end,
          suspended_until = case when requested_action = 'suspend' then requested_expires_at else null end,
          updated_at = now()
      where id = requested_target_id;
  elsif requested_target_type = 'post' then
    update public.posts set state = case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end
      where id = requested_target_id;
  elsif requested_target_type = 'short' then
    update public.short_videos set state = case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end
      where id = requested_target_id;
  elsif requested_target_type = 'event' then
    update public.events set state = case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end
      where id = requested_target_id;
  elsif requested_target_type = 'message' then
    update public.messages set state = case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end
      where id = requested_target_id;
  end if;

  if requested_report_id is not null then
    update public.content_reports set status = 'resolved', reviewed_by = caller_id, reviewed_at = now()
      where id = requested_report_id;
  end if;

  insert into public.audit_events (actor_id, event_type, subject_type, subject_id, details)
  values (
    caller_id,
    'moderation.' || requested_action::text,
    requested_target_type,
    requested_target_id,
    jsonb_build_object('actionId', action_id, 'reportId', requested_report_id, 'rationale', trim(requested_rationale))
  );
  return action_id;
end;
$$;

revoke all on function public.apply_moderation_action(uuid, text, uuid, public.moderation_action_type, text, timestamptz) from public;
grant execute on function public.apply_moderation_action(uuid, text, uuid, public.moderation_action_type, text, timestamptz) to authenticated;

create function public.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit events are append-only' using errcode = '42501';
end;
$$;

create function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := new.raw_user_meta_data ->> 'username';
  requested_display_name text := new.raw_user_meta_data ->> 'displayName';
begin
  if requested_username is null or requested_username !~ '^[A-Za-z0-9_]{3,24}$' then
    raise exception 'A valid username is required' using errcode = '22023';
  end if;
  if requested_display_name is null or char_length(trim(requested_display_name)) not between 1 and 50 then
    raise exception 'A valid display name is required' using errcode = '22023';
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, trim(requested_display_name));
  insert into public.account_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger auth_user_creates_profile
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

insert into public.profiles (id, username, display_name)
select
  id,
  raw_user_meta_data ->> 'username',
  trim(raw_user_meta_data ->> 'displayName')
from auth.users
where raw_user_meta_data ->> 'username' ~ '^[A-Za-z0-9_]{3,24}$'
  and char_length(trim(raw_user_meta_data ->> 'displayName')) between 1 and 50
on conflict (id) do nothing;

insert into public.account_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create function public.social_target_is_visible(target_type public.report_target_type, target_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if target_type = 'post' then
    return exists (select 1 from public.posts where id = target_id and state = 'visible');
  elsif target_type = 'short' then
    return exists (select 1 from public.short_videos where id = target_id and state = 'visible');
  elsif target_type = 'event' then
    return exists (select 1 from public.events where id = target_id and state = 'visible');
  end if;
  return false;
end;
$$;

revoke all on function public.social_target_is_visible(public.report_target_type, uuid) from public;
grant execute on function public.social_target_is_visible(public.report_target_type, uuid) to authenticated;

create function public.validate_social_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.social_target_is_visible(new.target_type, new.target_id) then
    raise exception 'Social content target is unavailable' using errcode = 'P0002';
  end if;
  return new;
end;
$$;

create trigger validate_social_like_target
before insert on public.social_likes
for each row execute function public.validate_social_target();
create trigger validate_social_comment_target
before insert on public.social_comments
for each row execute function public.validate_social_target();

create trigger audit_events_append_only
before update or delete on public.audit_events
for each row execute function public.prevent_audit_mutation();

create function public.touch_conversation_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_updated_at();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger settings_touch_updated_at
before update on public.account_settings
for each row execute function public.touch_updated_at();
create trigger posts_touch_updated_at
before update on public.posts
for each row execute function public.touch_updated_at();

create function public.touch_rsvp_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger event_rsvps_touch_updated_at
before update on public.event_rsvps
for each row execute function public.touch_rsvp_updated_at();

alter table public.profiles enable row level security;
alter table public.account_settings enable row level security;
alter table public.posts enable row level security;
alter table public.short_videos enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.social_likes enable row level security;
alter table public.social_comments enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.direct_conversation_pairs enable row level security;
alter table public.messages enable row level security;
alter table public.content_reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles visible to authenticated users"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "users insert own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and role = 'member' and status = 'active');
create policy "users update own nonprivileged profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and public.is_active_user())
  with check (id = (select auth.uid()) and public.is_active_user());
create policy "users read own account settings"
  on public.account_settings for select to authenticated using (user_id = (select auth.uid()));
create policy "users create own account settings"
  on public.account_settings for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own account settings"
  on public.account_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "visible social content readable"
  on public.posts for select to authenticated using (state = 'visible' or author_id = (select auth.uid()) or public.is_moderator());
create policy "authors create posts"
  on public.posts for insert to authenticated with check (author_id = (select auth.uid()) and public.is_active_user());
create policy "authors update posts"
  on public.posts for update to authenticated using (author_id = (select auth.uid()) and public.is_active_user()) with check (author_id = (select auth.uid()) and public.is_active_user());
create policy "authors delete posts"
  on public.posts for delete to authenticated using (author_id = (select auth.uid()) and public.is_active_user());

create policy "visible shorts readable"
  on public.short_videos for select to authenticated using (state = 'visible' or author_id = (select auth.uid()) or public.is_moderator());
create policy "authors create shorts"
  on public.short_videos for insert to authenticated with check (author_id = (select auth.uid()) and public.is_active_user());
create policy "authors update shorts"
  on public.short_videos for update to authenticated using (author_id = (select auth.uid()) and public.is_active_user()) with check (author_id = (select auth.uid()) and public.is_active_user());
create policy "authors delete shorts"
  on public.short_videos for delete to authenticated using (author_id = (select auth.uid()) and public.is_active_user());

create policy "visible events readable"
  on public.events for select to authenticated using (state = 'visible' or creator_id = (select auth.uid()) or public.is_moderator());
create policy "users create events"
  on public.events for insert to authenticated with check (creator_id = (select auth.uid()) and public.is_active_user());
create policy "creators update events"
  on public.events for update to authenticated using (creator_id = (select auth.uid()) and public.is_active_user()) with check (creator_id = (select auth.uid()) and public.is_active_user());
create policy "creators delete events"
  on public.events for delete to authenticated using (creator_id = (select auth.uid()) and public.is_active_user());

create policy "event RSVPs visible to signed in users"
  on public.event_rsvps for select to authenticated using (user_id = (select auth.uid()) or public.is_moderator());
create policy "users manage own RSVPs"
  on public.event_rsvps for insert to authenticated with check (
    user_id = (select auth.uid())
    and public.is_active_user()
    and exists (select 1 from public.events where id = event_id and state = 'visible')
  );
create policy "users update own RSVPs"
  on public.event_rsvps for update to authenticated using (user_id = (select auth.uid()) and public.is_active_user()) with check (user_id = (select auth.uid()) and public.is_active_user());
create policy "users delete own RSVPs"
  on public.event_rsvps for delete to authenticated using (user_id = (select auth.uid()) and public.is_active_user());

create policy "likes readable to authenticated users"
  on public.social_likes for select to authenticated using (user_id = (select auth.uid()) or public.is_moderator());
create policy "users add own likes"
  on public.social_likes for insert to authenticated with check (user_id = (select auth.uid()) and public.is_active_user());
create policy "users remove own likes"
  on public.social_likes for delete to authenticated using (user_id = (select auth.uid()) and public.is_active_user());
create policy "comments readable to authenticated users"
  on public.social_comments for select to authenticated using ((state = 'visible' and public.social_target_is_visible(target_type, target_id)) or author_id = (select auth.uid()) or public.is_moderator());
create policy "users add own comments"
  on public.social_comments for insert to authenticated with check (author_id = (select auth.uid()) and public.is_active_user());
create policy "authors remove own comments"
  on public.social_comments for delete to authenticated using (author_id = (select auth.uid()) and public.is_active_user());

create policy "members read conversations"
  on public.conversations for select to authenticated using (public.is_active_conversation_member(id));
create policy "members read membership"
  on public.conversation_members for select to authenticated using (public.is_active_conversation_member(conversation_id));
create policy "participants read direct pair"
  on public.direct_conversation_pairs for select to authenticated using (public.is_active_conversation_member(conversation_id));
create policy "active members read messages"
  on public.messages for select to authenticated using (public.is_active_conversation_member(conversation_id));
create policy "active members send messages"
  on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_active_user() and public.is_active_conversation_member(conversation_id));

create policy "reporters create own reports"
  on public.content_reports for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "reporters and moderators view reports"
  on public.content_reports for select to authenticated using (reporter_id = (select auth.uid()) or public.is_moderator());
create policy "moderators update reports"
  on public.content_reports for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy "moderators view actions"
  on public.moderation_actions for select to authenticated using (public.is_moderator());
create policy "moderators view audit events"
  on public.audit_events for select to authenticated using (public.is_moderator());

grant select, delete on public.profiles to authenticated;
grant insert (id, username, display_name) on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (username, display_name, bio, status_message, avatar_url, banner_url, theme_color, location, age, star_sign, belief, social_links, privacy, allow_direct_messages, allow_profile_discovery, visibility) on public.profiles to authenticated;
grant select on public.account_settings to authenticated;
grant insert (user_id, preferences) on public.account_settings to authenticated;
grant update (preferences) on public.account_settings to authenticated;
grant select on public.public_profiles to authenticated;
grant select, delete on public.posts, public.short_videos, public.events to authenticated;
grant insert (author_id, world_type, content, media_url, media_type, story_tag) on public.posts to authenticated;
grant insert (author_id, world_type, video_url, caption) on public.short_videos to authenticated;
grant insert (creator_id, world_type, title, description, latitude, longitude, starts_at, ends_at) on public.events to authenticated;
grant update (content, media_url, media_type, story_tag) on public.posts to authenticated;
grant update (caption, video_url) on public.short_videos to authenticated;
grant update (title, description, latitude, longitude, starts_at, ends_at) on public.events to authenticated;
grant select, delete on public.event_rsvps to authenticated;
grant insert (event_id, user_id, status) on public.event_rsvps to authenticated;
grant update (status) on public.event_rsvps to authenticated;
grant select, delete on public.social_likes to authenticated;
grant insert (target_type, target_id, user_id) on public.social_likes to authenticated;
grant select, delete on public.social_comments to authenticated;
grant insert (target_type, target_id, author_id, body) on public.social_comments to authenticated;
grant select on public.conversations, public.conversation_members, public.direct_conversation_pairs to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant select on public.content_reports to authenticated;
grant select on public.moderation_actions, public.audit_events to authenticated;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- ============================================================================
-- Source: supabase/migrations/20261009000100_community_tips.sql
-- ============================================================================
-- Store only the minimum payment reconciliation data needed for one-time tips.
-- Donor identity and payment details remain with Stripe and are not linked to app accounts.
create table public.community_tips (
  stripe_event_id text primary key,
  checkout_session_id text not null unique,
  tip_option text not null check (tip_option in ('tip_5_usd', 'tip_10_usd', 'tip_25_usd')),
  amount_total integer not null check (amount_total in (500, 1000, 2500)),
  currency text not null check (currency = 'usd'),
  completed_at timestamptz not null default now()
);

alter table public.community_tips enable row level security;
revoke all on public.community_tips from public, anon, authenticated, service_role;

create or replace function public.record_community_tip(
  requested_event_id text,
  requested_event_type text,
  requested_session_id text,
  requested_tip_option text,
  requested_amount_total integer,
  requested_currency text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_amount integer;
  previous_tip public.community_tips%rowtype;
begin
  if requested_event_id is null or requested_event_id = ''
    or requested_event_type not in ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
    or requested_session_id is null or requested_session_id = ''
    or requested_currency <> 'usd'
  then
    raise exception 'Invalid community tip parameters' using errcode = '22023';
  end if;

  case requested_tip_option
    when 'tip_5_usd' then expected_amount := 500;
    when 'tip_10_usd' then expected_amount := 1000;
    when 'tip_25_usd' then expected_amount := 2500;
    else raise exception 'Unsupported community tip option' using errcode = '22023';
  end case;

  if requested_amount_total is distinct from expected_amount then
    raise exception 'Community tip amount does not match its option' using errcode = '22023';
  end if;

  insert into public.community_tips (
    stripe_event_id,
    checkout_session_id,
    tip_option,
    amount_total,
    currency
  )
  values (
    requested_event_id,
    requested_session_id,
    requested_tip_option,
    requested_amount_total,
    requested_currency
  )
  on conflict do nothing;

  if found then
    return true;
  end if;

  select *
  into previous_tip
  from public.community_tips
  where stripe_event_id = requested_event_id
    or checkout_session_id = requested_session_id;

  if not found
    or previous_tip.stripe_event_id <> requested_event_id
    or previous_tip.checkout_session_id <> requested_session_id
    or previous_tip.tip_option <> requested_tip_option
    or previous_tip.amount_total <> requested_amount_total
    or previous_tip.currency <> requested_currency
  then
    raise exception 'Community tip replay does not match the original payment' using errcode = '22023';
  end if;

  return false;
end;
$$;

revoke all on function public.record_community_tip(
  text, text, text, text, integer, text
) from public, anon, authenticated;
grant execute on function public.record_community_tip(
  text, text, text, text, integer, text
) to service_role;

-- ============================================================================
-- Source: supabase/migrations/20261009000200_private_vault_and_media_storage.sql
-- ============================================================================
create table public.private_profile_vault (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  ciphertext text not null check (char_length(ciphertext) between 1 and 200000),
  salt text not null check (char_length(salt) between 20 and 100),
  updated_at timestamptz not null default now()
);

alter table public.private_profile_vault enable row level security;
revoke all on public.private_profile_vault from public, anon;
grant select, insert, update, delete on public.private_profile_vault to authenticated;

create policy "users manage only their encrypted profile vault"
  on public.private_profile_vault
  for all to authenticated
  using (user_id = (select auth.uid()) and public.is_active_user())
  with check (user_id = (select auth.uid()) and public.is_active_user());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media',
  'community-media',
  false,
  104857600,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload community media into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users read media referenced by visible content or owned by them"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'community-media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.posts
        where posts.media_url = storage.objects.name
          and (posts.state = 'visible' or posts.author_id = (select auth.uid()) or public.is_moderator())
      )
      or exists (
        select 1 from public.short_videos
        where short_videos.video_url = storage.objects.name
          and (short_videos.state = 'visible' or short_videos.author_id = (select auth.uid()) or public.is_moderator())
      )
    )
  );

create policy "users delete their own community media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ============================================================================
-- Source: supabase/migrations/20261009000300_persistent_social_content.sql
-- ============================================================================
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and (status = 'active' or (status = 'suspended' and suspended_until <= now()))
  )
  and (
    (select auth.jwt() ->> 'aal') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors
      where user_id = (select auth.uid())
        and factor_type = 'totp'
        and status = 'verified'
    )
  );
$$;

drop policy "likes readable to authenticated users" on public.social_likes;

create policy "likes readable on visible content"
  on public.social_likes for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_moderator()
    or public.social_target_is_visible(target_type, target_id)
  );

create function public.remove_social_engagement_for_deleted_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.report_target_type;
begin
  target := case tg_table_name
    when 'posts' then 'post'::public.report_target_type
    when 'short_videos' then 'short'::public.report_target_type
    when 'events' then 'event'::public.report_target_type
  end;
  delete from public.social_likes where target_type = target and target_id = old.id;
  delete from public.social_comments where target_type = target and target_id = old.id;
  return old;
end;
$$;

create trigger posts_remove_social_engagement
after delete on public.posts
for each row execute function public.remove_social_engagement_for_deleted_content();

create trigger shorts_remove_social_engagement
after delete on public.short_videos
for each row execute function public.remove_social_engagement_for_deleted_content();

create trigger events_remove_social_engagement
after delete on public.events
for each row execute function public.remove_social_engagement_for_deleted_content();

-- ============================================================================
-- Source: supabase/migrations/20261010000000_unify_sanctuary_scope.sql
-- ============================================================================
-- Consolidate all previously world-scoped data into The Sanctuary.
-- Legacy columns remain temporarily for forward-compatible rollback, but application
-- writes no longer supply or filter on them.

alter table public.posts alter column world_type set default 'sanctuary'::public.world_type;
alter table public.short_videos alter column world_type set default 'sanctuary'::public.world_type;
alter table public.events alter column world_type set default 'sanctuary'::public.world_type;
alter table public.conversations alter column world_type set default 'sanctuary'::public.world_type;
alter table public.direct_conversation_pairs alter column world_type set default 'sanctuary'::public.world_type;

update public.posts set world_type = 'sanctuary'::public.world_type where world_type <> 'sanctuary'::public.world_type;
update public.short_videos set world_type = 'sanctuary'::public.world_type where world_type <> 'sanctuary'::public.world_type;
update public.events set world_type = 'sanctuary'::public.world_type where world_type <> 'sanctuary'::public.world_type;
update public.conversations set world_type = 'sanctuary'::public.world_type where world_type <> 'sanctuary'::public.world_type;
update public.direct_conversation_pairs set world_type = 'sanctuary'::public.world_type where world_type <> 'sanctuary'::public.world_type;

-- New application-facing RPC with no world argument. The historical RPC is
-- retained so the migration is forward-safe for clients not yet upgraded.
create function public.create_sanctuary_conversation(
  requested_kind public.conversation_kind,
  requested_member_ids uuid[],
  requested_name text default null
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.create_conversation(
    requested_kind,
    'sanctuary'::public.world_type,
    requested_member_ids,
    requested_name
  );
$$;

revoke all on function public.create_sanctuary_conversation(public.conversation_kind, uuid[], text) from public;
grant execute on function public.create_sanctuary_conversation(public.conversation_kind, uuid[], text) to authenticated;

-- ============================================================================
-- Source: supabase/migrations/20261011000000_repair_social_engagement_insert_policies.sql
-- ============================================================================
-- Repair authenticated inserts for likes/comments on visible posts, shorts, and events.
-- This preserves the existing owner, active-account, and visible-target checks.

alter table public.social_likes enable row level security;
alter table public.social_comments enable row level security;

drop policy if exists "users add own likes" on public.social_likes;
create policy "users add own likes"
  on public.social_likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_active_user()
    and public.social_target_is_visible(target_type, target_id)
  );

drop policy if exists "users add own comments" on public.social_comments;
create policy "users add own comments"
  on public.social_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_active_user()
    and public.social_target_is_visible(target_type, target_id)
  );

grant insert (target_type, target_id, user_id) on public.social_likes to authenticated;
grant insert (target_type, target_id, author_id, body) on public.social_comments to authenticated;


-- ============================================================================
-- Source: supabase/migrations/20261012000000_token_wallet_and_fulfillment.sql
-- ============================================================================
-- Persistent, non-cashout token balances. Only a verified Stripe webhook can grant tokens.
-- Transfers, spending, marketplace listings, and withdrawals are intentionally absent.

create table public.token_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance_tokens bigint not null default 0 check (balance_tokens >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.token_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.token_wallets(user_id) on delete cascade,
  bundle_id text not null check (bundle_id in ('tokens_100', 'tokens_600', 'tokens_1200')),
  tokens_delta bigint not null check (tokens_delta > 0),
  amount_total integer not null,
  currency text not null check (currency = 'gbp'),
  stripe_event_id text not null unique,
  checkout_session_id text not null unique,
  livemode boolean not null,
  created_at timestamptz not null default now(),
  check (
    (bundle_id = 'tokens_100' and tokens_delta = 100 and amount_total = 100)
    or (bundle_id = 'tokens_600' and tokens_delta = 600 and amount_total = 500)
    or (bundle_id = 'tokens_1200' and tokens_delta = 1200 and amount_total = 1000)
  )
);

create index token_ledger_user_created_idx
  on public.token_ledger (user_id, created_at desc);

alter table public.token_wallets enable row level security;
alter table public.token_ledger enable row level security;

create policy "users read own token wallet"
  on public.token_wallets for select to authenticated
  using (user_id = (select auth.uid()));
create policy "users read own token ledger"
  on public.token_ledger for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.token_wallets, public.token_ledger to authenticated;
revoke insert, update, delete, truncate on public.token_wallets, public.token_ledger from public, anon, authenticated;
grant select, insert, update on public.token_wallets to service_role;
grant select, insert on public.token_ledger to service_role;

create or replace function public.record_token_bundle_purchase(
  requested_event_id text,
  requested_event_type text,
  requested_session_id text,
  requested_user_id uuid,
  requested_bundle_id text,
  requested_amount_total integer,
  requested_currency text,
  requested_livemode boolean
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_tokens bigint;
  expected_amount integer;
  wallet_balance bigint;
  existing_entry public.token_ledger%rowtype;
begin
  if requested_event_id is null or requested_event_id = ''
    or requested_event_type is null
    or requested_event_type not in ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
    or requested_session_id is null or requested_session_id = ''
    or requested_user_id is null
    or requested_livemode is null
    or requested_currency is null
    or requested_currency <> 'gbp'
  then
    raise exception 'Invalid token purchase event' using errcode = '22023';
  end if;

  case requested_bundle_id
    when 'tokens_100' then expected_tokens := 100; expected_amount := 100;
    when 'tokens_600' then expected_tokens := 600; expected_amount := 500;
    when 'tokens_1200' then expected_tokens := 1200; expected_amount := 1000;
    else raise exception 'Unsupported token bundle' using errcode = '22023';
  end case;

  if requested_amount_total is distinct from expected_amount then
    raise exception 'Paid amount does not match the token bundle' using errcode = '22023';
  end if;

  insert into public.token_wallets (user_id)
  values (requested_user_id)
  on conflict (user_id) do nothing;

  select balance_tokens into wallet_balance
  from public.token_wallets
  where user_id = requested_user_id
  for update;

  select * into existing_entry
  from public.token_ledger
  where stripe_event_id = requested_event_id
  for update;

  if found then
    if existing_entry.user_id <> requested_user_id
      or existing_entry.bundle_id <> requested_bundle_id
      or existing_entry.tokens_delta <> expected_tokens
      or existing_entry.amount_total <> expected_amount
      or existing_entry.currency <> requested_currency
      or existing_entry.checkout_session_id <> requested_session_id
      or existing_entry.livemode <> requested_livemode
    then
      raise exception 'Stripe event replay does not match the original payment' using errcode = '22023';
    end if;
    return wallet_balance;
  end if;

  -- A second successful event for the same session is a no-op, never a second credit.
  select * into existing_entry
  from public.token_ledger
  where checkout_session_id = requested_session_id
  for update;

  if found then
    if existing_entry.user_id <> requested_user_id
      or existing_entry.bundle_id <> requested_bundle_id
      or existing_entry.tokens_delta <> expected_tokens
      or existing_entry.amount_total <> expected_amount
      or existing_entry.currency <> requested_currency
      or existing_entry.livemode <> requested_livemode
    then
      raise exception 'Token purchase replay does not match the original payment' using errcode = '22023';
    end if;
    return wallet_balance;
  end if;

  insert into public.token_ledger (
    user_id, bundle_id, tokens_delta, amount_total, currency,
    stripe_event_id, checkout_session_id, livemode
  ) values (
    requested_user_id, requested_bundle_id, expected_tokens, expected_amount, requested_currency,
    requested_event_id, requested_session_id, requested_livemode
  );

  update public.token_wallets
  set balance_tokens = balance_tokens + expected_tokens,
      updated_at = now()
  where user_id = requested_user_id
  returning balance_tokens into wallet_balance;

  return wallet_balance;
end;
$$;

revoke all on function public.record_token_bundle_purchase(
  text, text, text, uuid, text, integer, text, boolean
) from public, anon, authenticated;
grant execute on function public.record_token_bundle_purchase(
  text, text, text, uuid, text, integer, text, boolean
) to service_role;


-- ============================================================================
-- Source: supabase/migrations/20261013000000_short_engagement_stats.sql
-- ============================================================================
-- Return short likes/comments counts without exposing every user's like row.
-- Toggle mutations are serialized on the short row and remain user-bound.

create or replace function public.get_short_engagement_stats(requested_short_id uuid)
returns table (
  liked boolean,
  likes_count bigint,
  comments_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.social_likes as likes
      where likes.target_type = 'short'::public.report_target_type
        and likes.target_id = requested_short_id
        and likes.user_id = (select auth.uid())
    ) as liked,
    (
      select count(*)
      from public.social_likes as likes
      where likes.target_type = 'short'::public.report_target_type
        and likes.target_id = requested_short_id
    ) as likes_count,
    (
      select count(*)
      from public.social_comments as comments
      where comments.target_type = 'short'::public.report_target_type
        and comments.target_id = requested_short_id
        and comments.state = 'visible'::public.content_state
    ) as comments_count
  where requested_short_id is not null
    and (select auth.uid()) is not null
    and public.is_active_user()
    and public.social_target_is_visible('short'::public.report_target_type, requested_short_id);
$$;

create or replace function public.toggle_short_like(requested_short_id uuid)
returns table (
  liked boolean,
  likes_count bigint,
  comments_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  did_remove boolean;
begin
  if caller_id is null or not public.is_active_user() then
    raise exception 'An active signed-in account is required' using errcode = '42501';
  end if;

  -- Serialize toggles for the same short so rapid/retried requests cannot race.
  perform 1
  from public.short_videos as short
  where short.id = requested_short_id
    and short.state = 'visible'::public.content_state
  for update;

  if not found then
    raise exception 'Short video is unavailable' using errcode = 'P0002';
  end if;

  delete from public.social_likes as likes
  where likes.target_type = 'short'::public.report_target_type
    and likes.target_id = requested_short_id
    and likes.user_id = caller_id;
  did_remove := found;

  if not did_remove then
    insert into public.social_likes (target_type, target_id, user_id)
    values ('short'::public.report_target_type, requested_short_id, caller_id)
    on conflict (target_type, target_id, user_id) do nothing;
  end if;

  return query
  select
    exists (
      select 1
      from public.social_likes as likes
      where likes.target_type = 'short'::public.report_target_type
        and likes.target_id = requested_short_id
        and likes.user_id = caller_id
    ) as liked,
    (
      select count(*)
      from public.social_likes as likes
      where likes.target_type = 'short'::public.report_target_type
        and likes.target_id = requested_short_id
    ) as likes_count,
    (
      select count(*)
      from public.social_comments as comments
      where comments.target_type = 'short'::public.report_target_type
        and comments.target_id = requested_short_id
        and comments.state = 'visible'::public.content_state
    ) as comments_count;
end;
$$;

revoke all on function public.get_short_engagement_stats(uuid) from public, anon;
revoke all on function public.toggle_short_like(uuid) from public, anon;
grant execute on function public.get_short_engagement_stats(uuid) to authenticated;
grant execute on function public.toggle_short_like(uuid) to authenticated;


-- ============================================================================
-- Source: supabase/migrations/20261023000000_harden_policies_and_views.sql
-- ============================================================================
-- Harden aggregate access, discovery performance, and media storage policies.
--
-- The original RLS policies only exposed a user's own RSVPs and likes. The app
-- needs aggregate counts without leaking who reacted, so these views run with
-- the view owner's privileges and expose counts only.
create extension if not exists pg_trgm;

create or replace view public.event_rsvp_counts
with (security_barrier = true) as
select
  event_id,
  count(*) filter (where status = 'going')::integer as going_count
from public.event_rsvps
group by event_id;

create or replace view public.social_like_counts
with (security_barrier = true) as
select
  target_type,
  target_id,
  count(*)::integer as like_count
from public.social_likes
group by target_type, target_id;

revoke all on public.event_rsvp_counts, public.social_like_counts from public, anon;
grant select on public.event_rsvp_counts, public.social_like_counts to authenticated;

-- Public profile discovery uses ILIKE searches on both names.
create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (username gin_trgm_ops);
create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (display_name gin_trgm_ops);
create index if not exists profiles_discovery_idx
  on public.profiles (visibility, allow_profile_discovery, status);

create index if not exists events_visible_starts_idx
  on public.events (state, starts_at);
create index if not exists event_rsvps_event_status_idx
  on public.event_rsvps (event_id, status);
create index if not exists social_likes_target_idx
  on public.social_likes (target_type, target_id);
create index if not exists social_comments_target_idx
  on public.social_comments (target_type, target_id, state, created_at);
create index if not exists messages_conversation_sent_idx
  on public.messages (conversation_id, sent_at desc);
create index if not exists conversation_members_active_user_idx
  on public.conversation_members (user_id)
  where left_at is null;

-- Storage policies previously checked folder ownership only, so suspended or
-- unverified users could keep uploading and reading media. Require an active
-- profile for every storage operation.
drop policy if exists "users upload community media into their own folder" on storage.objects;
drop policy if exists "users read media referenced by visible content or owned by them" on storage.objects;
drop policy if exists "users delete their own community media" on storage.objects;

create policy "active users upload community media into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_user()
  );

create policy "active users read media referenced by visible content or owned by them"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'community-media'
    and public.is_active_user()
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.posts
        where posts.media_url = storage.objects.name
          and (posts.state = 'visible' or posts.author_id = (select auth.uid()) or public.is_moderator())
      )
      or exists (
        select 1 from public.short_videos
        where short_videos.video_url = storage.objects.name
          and (short_videos.state = 'visible' or short_videos.author_id = (select auth.uid()) or public.is_moderator())
      )
    )
  );

create policy "active users delete their own community media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_user()
  );

-- ============================================================================
-- Source: supabase/migrations/20261024000000_token_spending.sql
-- ============================================================================
-- First token sink: a permanent profile frame. Prices and availability are
-- server-owned; the client sends only a catalog item ID. Spending is atomic,
-- idempotent, and cannot make a balance negative.

create table public.token_spend_catalog (
  item_id text primary key,
  name text not null,
  description text not null,
  price_tokens bigint not null check (price_tokens > 0),
  kind text not null check (kind in ('profile_frame', 'chat_item', 'gift', 'vip', 'promotion')),
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.token_spend_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.token_wallets(user_id) on delete cascade,
  item_id text not null references public.token_spend_catalog(item_id) on delete restrict,
  item_name text not null,
  tokens_delta bigint not null check (tokens_delta < 0),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index token_spend_ledger_user_created_idx
  on public.token_spend_ledger (user_id, created_at desc);

create table public.token_entitlements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.token_spend_catalog(item_id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.profiles
  add column if not exists equipped_frame text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_equipped_frame_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_equipped_frame_fkey
      foreign key (equipped_frame)
      references public.token_spend_catalog(item_id)
      on delete set null;
  end if;
end
$$;

alter table public.token_spend_catalog enable row level security;
alter table public.token_spend_ledger enable row level security;
alter table public.token_entitlements enable row level security;

create policy "authenticated users read enabled token spend catalog"
  on public.token_spend_catalog for select to authenticated
  using (enabled);
create policy "users read own token spend ledger"
  on public.token_spend_ledger for select to authenticated
  using (user_id = (select auth.uid()));
create policy "users read own token entitlements"
  on public.token_entitlements for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.token_spend_catalog, public.token_spend_ledger, public.token_entitlements
  to authenticated;
grant select on public.token_spend_catalog, public.token_spend_ledger, public.token_entitlements
  to service_role;
revoke insert, update, delete, truncate
  on public.token_spend_catalog, public.token_spend_ledger, public.token_entitlements
  from public, anon, authenticated;

insert into public.token_spend_catalog (
  item_id, name, description, price_tokens, kind, enabled
) values (
  'profile_frame_sanctuary',
  'Sanctuary supporter frame',
  'A permanent warm-gold frame around your profile picture.',
  300,
  'profile_frame',
  true
)
on conflict (item_id) do nothing;

create or replace view public.public_profiles
with (security_barrier = true) as
select
  id,
  username,
  display_name,
  case when privacy ->> 'bio' = 'true' then bio end as bio,
  status_message,
  avatar_url,
  banner_url,
  theme_color,
  case when privacy ->> 'location' = 'true' then location end as location,
  case when privacy ->> 'age' = 'true' then age end as age,
  case when privacy ->> 'starSign' = 'true' then star_sign end as star_sign,
  case when privacy ->> 'belief' = 'true' then belief end as belief,
  case when privacy ->> 'socialLinks' = 'true' then social_links end as social_links,
  allow_direct_messages,
  equipped_frame
from public.profiles
where visibility = 'public'
  and allow_profile_discovery
  and (status = 'active' or (status = 'suspended' and suspended_until <= now()));

grant select on public.public_profiles to authenticated;

create or replace function public.spend_tokens(
  requested_item_id text,
  requested_idempotency_key uuid
)
returns table (
  balance_tokens bigint,
  item_id text,
  already_applied boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  selected_item public.token_spend_catalog%rowtype;
  wallet_balance bigint;
  existing_entry public.token_spend_ledger%rowtype;
begin
  if caller_id is null then
    raise exception 'Sign in before spending tokens.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if requested_item_id is null or requested_item_id = '' then
    raise exception 'Choose a token item.' using errcode = '22023';
  end if;

  if requested_idempotency_key is null then
    raise exception 'A spend request key is required.' using errcode = '22023';
  end if;

  select *
  into selected_item
  from public.token_spend_catalog
  where item_id = requested_item_id
    and enabled
  for share;

  if not found then
    raise exception 'That token item is not available.' using errcode = '22023';
  end if;

  insert into public.token_wallets (user_id)
  values (caller_id)
  on conflict (user_id) do nothing;

  select w.balance_tokens
  into wallet_balance
  from public.token_wallets as w
  where w.user_id = caller_id
  for update;

  select l.*
  into existing_entry
  from public.token_spend_ledger as l
  where l.user_id = caller_id
    and l.idempotency_key = requested_idempotency_key
  for update;

  if found then
    if existing_entry.item_id <> requested_item_id then
      raise exception 'This spend request key was already used for another item.' using errcode = '22023';
    end if;
    return query select wallet_balance, existing_entry.item_id, true;
    return;
  end if;

  -- Permanent unlocks are charged once. A new idempotency key must not buy the
  -- same frame again.
  if selected_item.kind = 'profile_frame' and exists (
    select 1
    from public.token_entitlements
    where user_id = caller_id
      and item_id = selected_item.item_id
  ) then
    return query select wallet_balance, selected_item.item_id, true;
    return;
  end if;

  if wallet_balance < selected_item.price_tokens then
    raise exception 'Not enough tokens for this item.' using errcode = '22003';
  end if;

  insert into public.token_spend_ledger (
    user_id, item_id, item_name, tokens_delta, idempotency_key
  ) values (
    caller_id, selected_item.item_id, selected_item.name,
    -selected_item.price_tokens, requested_idempotency_key
  );

  update public.token_wallets
  set balance_tokens = balance_tokens - selected_item.price_tokens,
      updated_at = now()
  where user_id = caller_id
  returning balance_tokens into wallet_balance;

  insert into public.token_entitlements (user_id, item_id)
  values (caller_id, selected_item.item_id)
  on conflict (user_id, item_id) do nothing;

  if selected_item.kind = 'profile_frame' then
    update public.profiles
    set equipped_frame = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  end if;

  return query select wallet_balance, selected_item.item_id, false;
end;
$$;

revoke all on function public.spend_tokens(text, uuid) from public, anon, authenticated;
grant execute on function public.spend_tokens(text, uuid) to authenticated;


-- ============================================================================
-- Source: supabase/migrations/20261024000001_signup_token_bonus.sql
-- ============================================================================
-- Welcome grant: every new profile starts with 100 tokens. The grant is
-- recorded in the immutable purchase ledger so the wallet history explains the
-- starting balance. Existing pre-live profiles without a wallet are backfilled
-- once; profiles that already have a wallet are not changed.

alter table public.token_ledger
  drop constraint if exists token_ledger_bundle_id_check;
alter table public.token_ledger
  drop constraint if exists token_ledger_check;

alter table public.token_ledger
  add constraint token_ledger_bundle_id_check
  check (bundle_id in ('tokens_100', 'tokens_600', 'tokens_1200', 'signup_bonus'));

alter table public.token_ledger
  drop constraint if exists token_ledger_entry_check;
alter table public.token_ledger
  add constraint token_ledger_entry_check
  check (
    (bundle_id = 'signup_bonus' and tokens_delta = 100 and amount_total = 0)
    or (bundle_id = 'tokens_100' and tokens_delta = 100 and amount_total = 100)
    or (bundle_id = 'tokens_600' and tokens_delta = 600 and amount_total = 500)
    or (bundle_id = 'tokens_1200' and tokens_delta = 1200 and amount_total = 1000)
  );

create or replace function public.grant_signup_token_bonus(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    raise exception 'A user is required for the signup token bonus.' using errcode = '22023';
  end if;

  insert into public.token_wallets (user_id, balance_tokens)
  values (target_user_id, 100)
  on conflict (user_id) do nothing;

  if found then
    insert into public.token_ledger (
      user_id, bundle_id, tokens_delta, amount_total, currency,
      stripe_event_id, checkout_session_id, livemode
    ) values (
      target_user_id, 'signup_bonus', 100, 0, 'gbp',
      'signup_bonus:' || target_user_id::text,
      'signup_bonus:' || target_user_id::text,
      false
    )
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.grant_signup_bonus_on_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.grant_signup_token_bonus(new.id);
  return new;
end;
$$;

drop trigger if exists profiles_grant_signup_token_bonus on public.profiles;
create trigger profiles_grant_signup_token_bonus
after insert on public.profiles
for each row execute function public.grant_signup_bonus_on_profile();

-- One-time pre-live backfill. Remove this block if existing accounts should not
-- receive the welcome grant.
select public.grant_signup_token_bonus(profiles.id)
from public.profiles
where not exists (
  select 1 from public.token_wallets
  where token_wallets.user_id = profiles.id
);

revoke all on function public.grant_signup_token_bonus(uuid) from public, anon, authenticated;
revoke all on function public.grant_signup_bonus_on_profile() from public, anon, authenticated;


-- ============================================================================
-- Source: supabase/migrations/20261024000002_profile_cosmetics.sql
-- ============================================================================
-- Profile cosmetics: animated frames, animated effects, emoji badges, and
-- curated GIF banners. Prices and availability are server-owned; every item is
-- a permanent unlock recorded in token_entitlements. The client sends only a
-- catalog item ID.

alter table public.token_spend_catalog
  add column if not exists asset_url text,
  add column if not exists asset_text text,
  add column if not exists effect_key text,
  add column if not exists sort_order integer not null default 0;

alter table public.token_spend_catalog
  drop constraint if exists token_spend_catalog_kind_check;
alter table public.token_spend_catalog
  add constraint token_spend_catalog_kind_check
  check (kind in (
    'profile_frame',
    'profile_effect',
    'profile_badge',
    'profile_banner',
    'chat_item',
    'gift',
    'vip',
    'promotion'
  ));

alter table public.profiles
  add column if not exists equipped_effect text,
  add column if not exists equipped_badge text,
  add column if not exists equipped_banner text;

alter table public.profiles
  drop constraint if exists profiles_equipped_effect_fkey;
alter table public.profiles
  add constraint profiles_equipped_effect_fkey
  foreign key (equipped_effect)
  references public.token_spend_catalog(item_id)
  on delete set null;

alter table public.profiles
  drop constraint if exists profiles_equipped_badge_fkey;
alter table public.profiles
  add constraint profiles_equipped_badge_fkey
  foreign key (equipped_badge)
  references public.token_spend_catalog(item_id)
  on delete set null;

alter table public.profiles
  drop constraint if exists profiles_equipped_banner_fkey;
alter table public.profiles
  add constraint profiles_equipped_banner_fkey
  foreign key (equipped_banner)
  references public.token_spend_catalog(item_id)
  on delete set null;

insert into public.token_spend_catalog (
  item_id,
  name,
  description,
  price_tokens,
  kind,
  enabled,
  asset_url,
  asset_text,
  effect_key,
  sort_order
) values
  (
    'profile_frame_sanctuary',
    'Sanctuary supporter frame',
    'A permanent warm-gold frame around your profile picture.',
    300,
    'profile_frame',
    true,
    null,
    null,
    'sanctuary',
    10
  ),
  (
    'profile_frame_aurora',
    'Aurora frame',
    'An animated aurora ring that slowly shifts color around your profile picture.',
    300,
    'profile_frame',
    true,
    null,
    null,
    'aurora',
    20
  ),
  (
    'profile_frame_ember',
    'Ember frame',
    'A permanent ember-glow frame with a slow animated shimmer.',
    300,
    'profile_frame',
    true,
    null,
    null,
    'ember',
    30
  ),
  (
    'profile_effect_sparkle',
    'Sparkle effect',
    'Animated sparkles that drift around your profile picture.',
    250,
    'profile_effect',
    true,
    null,
    null,
    'sparkle',
    40
  ),
  (
    'profile_effect_glow',
    'Soft glow',
    'A gentle pulsing glow around your profile picture.',
    200,
    'profile_effect',
    true,
    null,
    null,
    'glow',
    50
  ),
  (
    'profile_badge_sparkle',
    'Sparkle badge',
    'A permanent sparkle badge beside your display name.',
    150,
    'profile_badge',
    true,
    null,
    '✨',
    null,
    60
  ),
  (
    'profile_badge_moon',
    'Moon badge',
    'A permanent moon badge beside your display name.',
    150,
    'profile_badge',
    true,
    null,
    '🌙',
    null,
    70
  ),
  (
    'profile_badge_flame',
    'Flame badge',
    'A permanent flame badge beside your display name.',
    150,
    'profile_badge',
    true,
    null,
    '🔥',
    null,
    80
  ),
  (
    'profile_badge_leaf',
    'Leaf badge',
    'A permanent leaf badge beside your display name.',
    150,
    'profile_badge',
    true,
    null,
    '🌿',
    null,
    90
  ),
  (
    'profile_banner_aurora',
    'Aurora banner',
    'A curated animated aurora banner for your profile.',
    300,
    'profile_banner',
    true,
    '/cosmetics/banner-aurora.gif',
    null,
    null,
    100
  ),
  (
    'profile_banner_ember',
    'Ember banner',
    'A curated animated ember banner for your profile.',
    300,
    'profile_banner',
    true,
    '/cosmetics/banner-ember.gif',
    null,
    null,
    110
  ),
  (
    'profile_banner_tide',
    'Tide banner',
    'A curated animated tide banner for your profile.',
    300,
    'profile_banner',
    true,
    '/cosmetics/banner-tide.gif',
    null,
    null,
    120
  )
on conflict (item_id) do update
set asset_url = excluded.asset_url,
    asset_text = excluded.asset_text,
    effect_key = excluded.effect_key,
    sort_order = excluded.sort_order;

create or replace view public.public_profiles
with (security_barrier = true) as
select
  id,
  username,
  display_name,
  case when privacy ->> 'bio' = 'true' then bio end as bio,
  status_message,
  avatar_url,
  banner_url,
  theme_color,
  case when privacy ->> 'location' = 'true' then location end as location,
  case when privacy ->> 'age' = 'true' then age end as age,
  case when privacy ->> 'starSign' = 'true' then star_sign end as star_sign,
  case when privacy ->> 'belief' = 'true' then belief end as belief,
  case when privacy ->> 'socialLinks' = 'true' then social_links end as social_links,
  allow_direct_messages,
  equipped_frame,
  equipped_effect,
  equipped_badge,
  equipped_banner
from public.profiles
where visibility = 'public'
  and allow_profile_discovery
  and (status = 'active' or (status = 'suspended' and suspended_until <= now()));

grant select on public.public_profiles to authenticated;

create or replace function public.spend_tokens(
  requested_item_id text,
  requested_idempotency_key uuid
)
returns table (
  balance_tokens bigint,
  item_id text,
  already_applied boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  selected_item public.token_spend_catalog%rowtype;
  wallet_balance bigint;
  existing_entry public.token_spend_ledger%rowtype;
begin
  if caller_id is null then
    raise exception 'Sign in before spending tokens.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if requested_item_id is null or requested_item_id = '' then
    raise exception 'Choose a token item.' using errcode = '22023';
  end if;

  if requested_idempotency_key is null then
    raise exception 'A spend request key is required.' using errcode = '22023';
  end if;

  select *
  into selected_item
  from public.token_spend_catalog
  where item_id = requested_item_id
    and enabled
  for share;

  if not found then
    raise exception 'That token item is not available.' using errcode = '22023';
  end if;

  insert into public.token_wallets (user_id)
  values (caller_id)
  on conflict (user_id) do nothing;

  select w.balance_tokens
  into wallet_balance
  from public.token_wallets as w
  where w.user_id = caller_id
  for update;

  select l.*
  into existing_entry
  from public.token_spend_ledger as l
  where l.user_id = caller_id
    and l.idempotency_key = requested_idempotency_key
  for update;

  if found then
    if existing_entry.item_id <> requested_item_id then
      raise exception 'This spend request key was already used for another item.' using errcode = '22023';
    end if;
    return query select wallet_balance, existing_entry.item_id, true;
    return;
  end if;

  -- Profile cosmetics are permanent unlocks. A new idempotency key must not
  -- charge the same account twice for the same cosmetic.
  if selected_item.kind in ('profile_frame', 'profile_effect', 'profile_badge', 'profile_banner')
    and exists (
      select 1
      from public.token_entitlements
      where user_id = caller_id
        and item_id = selected_item.item_id
    ) then
    return query select wallet_balance, selected_item.item_id, true;
    return;
  end if;

  if wallet_balance < selected_item.price_tokens then
    raise exception 'Not enough tokens for this item.' using errcode = '22003';
  end if;

  insert into public.token_spend_ledger (
    user_id, item_id, item_name, tokens_delta, idempotency_key
  ) values (
    caller_id, selected_item.item_id, selected_item.name,
    -selected_item.price_tokens, requested_idempotency_key
  );

  update public.token_wallets
  set balance_tokens = balance_tokens - selected_item.price_tokens,
      updated_at = now()
  where user_id = caller_id
  returning balance_tokens into wallet_balance;

  insert into public.token_entitlements (user_id, item_id)
  values (caller_id, selected_item.item_id)
  on conflict (user_id, item_id) do nothing;

  if selected_item.kind = 'profile_frame' then
    update public.profiles
    set equipped_frame = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_effect' then
    update public.profiles
    set equipped_effect = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_badge' then
    update public.profiles
    set equipped_badge = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_banner' then
    update public.profiles
    set equipped_banner = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  end if;

  return query select wallet_balance, selected_item.item_id, false;
end;
$$;

revoke all on function public.spend_tokens(text, uuid) from public, anon, authenticated;
grant execute on function public.spend_tokens(text, uuid) to authenticated;

create or replace function public.equip_profile_cosmetic(
  requested_item_id text
)
returns table (
  item_id text,
  kind text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  selected_item public.token_spend_catalog%rowtype;
begin
  if caller_id is null then
    raise exception 'Sign in before equipping a cosmetic.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if requested_item_id is null or requested_item_id = '' then
    raise exception 'Choose a cosmetic.' using errcode = '22023';
  end if;

  select *
  into selected_item
  from public.token_spend_catalog
  where item_id = requested_item_id
    and enabled
    and kind in ('profile_frame', 'profile_effect', 'profile_badge', 'profile_banner')
  for share;

  if not found then
    raise exception 'That cosmetic is not available.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.token_entitlements
    where user_id = caller_id
      and item_id = selected_item.item_id
  ) then
    raise exception 'Unlock this cosmetic before equipping it.' using errcode = '42501';
  end if;

  if selected_item.kind = 'profile_frame' then
    update public.profiles
    set equipped_frame = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_effect' then
    update public.profiles
    set equipped_effect = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_badge' then
    update public.profiles
    set equipped_badge = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_banner' then
    update public.profiles
    set equipped_banner = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  end if;

  return query select selected_item.item_id, selected_item.kind;
end;
$$;

revoke all on function public.equip_profile_cosmetic(text) from public, anon, authenticated;
grant execute on function public.equip_profile_cosmetic(text) to authenticated;

create or replace function public.clear_profile_cosmetic(
  requested_slot text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Sign in before changing a cosmetic.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if requested_slot = 'frame' then
    update public.profiles
    set equipped_frame = null,
        updated_at = now()
    where id = caller_id;
  elsif requested_slot = 'effect' then
    update public.profiles
    set equipped_effect = null,
        updated_at = now()
    where id = caller_id;
  elsif requested_slot = 'badge' then
    update public.profiles
    set equipped_badge = null,
        updated_at = now()
    where id = caller_id;
  elsif requested_slot = 'banner' then
    update public.profiles
    set equipped_banner = null,
        updated_at = now()
    where id = caller_id;
  else
    raise exception 'Choose a cosmetic slot: frame, effect, badge, or banner.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.clear_profile_cosmetic(text) from public, anon, authenticated;
grant execute on function public.clear_profile_cosmetic(text) to authenticated;


commit;
