-- Fail closed on moderation actions against peers or higher-ranked accounts.
-- This trigger complements RPC authorization and protects the action table boundary.
create or replace function public.enforce_moderation_target_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  actor_role text;
  target_owner_id uuid;
  target_role text;
  actor_status text;
  actor_level integer;
  target_level integer;
begin
  if caller_id is null or new.actor_id is distinct from caller_id then
    raise exception 'Authenticated moderator identity required' using errcode = '42501';
  end if;

  select lower(p.role), p.status
    into actor_role, actor_status
    from public.profiles p
    where p.id = caller_id;

  if not found or actor_status <> 'active' then
    raise exception 'Active moderator account required' using errcode = '42501';
  end if;

  actor_level := case actor_role
    when 'moderator' then 2
    when 'admin' then 3
    when 'developer' then 4
    when 'owner' then 5
    else -1
  end;
  if actor_level < 2 then
    raise exception 'Moderator authorization required' using errcode = '42501';
  end if;

  -- UI role gates are not an authorization boundary. Enforce action-specific
  -- permissions here so direct RPC calls cannot let a moderator ban or suspend.
  if new.action = 'suspend' and actor_role not in ('admin', 'developer', 'owner') then
    raise exception 'Admin authorization required for suspension' using errcode = '42501';
  end if;
  if new.action = 'ban' and actor_role not in ('developer', 'owner') then
    raise exception 'Developer authorization required for bans' using errcode = '42501';
  end if;

  case lower(new.target_type)
    when 'user' then
      target_owner_id := new.target_id;
    when 'post' then
      select p.author_id into target_owner_id from public.posts p where p.id = new.target_id;
    when 'short' then
      select s.author_id into target_owner_id from public.short_videos s where s.id = new.target_id;
    when 'event' then
      select e.creator_id into target_owner_id from public.events e where e.id = new.target_id;
    when 'comment' then
      select c.author_id into target_owner_id from public.social_comments c where c.id = new.target_id;
    when 'message' then
      select m.sender_id into target_owner_id from public.messages m where m.id = new.target_id;
    else
      raise exception 'Unsupported moderation target' using errcode = '22023';
  end case;

  if target_owner_id is null then
    raise exception 'Moderation target is unavailable' using errcode = 'P0002';
  end if;

  -- Lock actor and target-owner profiles in stable order, then re-read both roles.
  -- This prevents a concurrent demotion/promotion from racing the hierarchy check.
  perform p.id
    from public.profiles p
    where p.id in (caller_id, target_owner_id)
    order by p.id
    for update;

  select lower(p.role), p.status
    into actor_role, actor_status
    from public.profiles p
    where p.id = caller_id;

  if not found or actor_status <> 'active' then
    raise exception 'Active moderator account required' using errcode = '42501';
  end if;

  actor_level := case actor_role
    when 'moderator' then 2
    when 'admin' then 3
    when 'developer' then 4
    when 'owner' then 5
    else -1
  end;
  if actor_level < 2 then
    raise exception 'Moderator authorization required' using errcode = '42501';
  end if;

  select lower(p.role) into target_role
    from public.profiles p
    where p.id = target_owner_id;

  if not found then
    raise exception 'Moderation target owner is unavailable' using errcode = 'P0002';
  end if;

  target_level := case target_role
    when 'user' then 0
    when 'vip' then 1
    when 'moderator' then 2
    when 'admin' then 3
    when 'developer' then 4
    when 'owner' then 5
    else 999
  end;

  -- Strictly higher rank is required. Unknown roles fail closed as highest rank.
  if actor_level <= target_level then
    raise exception 'Moderators may only act on lower-ranked accounts and their content'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_moderation_target_hierarchy() from public, anon, authenticated;
drop trigger if exists moderation_action_enforce_target_hierarchy on public.moderation_actions;
create trigger moderation_action_enforce_target_hierarchy
before insert on public.moderation_actions
for each row execute function public.enforce_moderation_target_hierarchy();
