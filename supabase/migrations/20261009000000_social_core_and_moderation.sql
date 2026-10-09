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
  cosmetic_frames text[] not null default '{}',
  vip_tier text not null default 'free' check (vip_tier in ('free', 'wayfinder', 'champion')),
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
  allow_direct_messages,
  cosmetic_frames,
  vip_tier
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
grant update (username, display_name, bio, status_message, avatar_url, banner_url, theme_color, location, age, star_sign, belief, social_links, privacy, cosmetic_frames, allow_direct_messages, allow_profile_discovery, visibility) on public.profiles to authenticated;
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
