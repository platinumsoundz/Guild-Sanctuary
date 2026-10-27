-- Make the saved Settings preference authoritative for direct-message privacy.
-- Older deployments can have stale legacy privacy JSON while the Settings toggle is enabled.
begin;

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
      or (members.member_id <> caller_id and coalesce(
        (select (s.preferences->>'allowDirectMessages') = 'true'
         from public.account_settings s where s.user_id = p.id),
        p.allow_direct_messages,
        true
      ) is not true)
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

commit;
notify pgrst, 'reload schema';
