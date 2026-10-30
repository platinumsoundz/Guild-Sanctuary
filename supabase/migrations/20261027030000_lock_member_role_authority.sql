-- Re-check role-management authority under row locks to prevent stale-role races.
-- Proposed only: reconcile migration history and validate against staging before applying.
begin;

create or replace function public.set_member_role(
  requested_user_id uuid,
  requested_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
  caller_role text;
  caller_status text;
  target_role text;
  caller_rank integer;
  requested_rank integer;
begin
  if caller_id is null then
    raise exception 'Sign in is required to change member roles.';
  end if;
  if requested_role is null or requested_role not in ('user', 'vip', 'moderator', 'admin', 'developer', 'owner') then
    raise exception 'Unknown role requested.';
  end if;
  if requested_user_id is null or requested_user_id = caller_id then
    raise exception 'You cannot change your own role.';
  end if;

  -- Lock both rows in a stable order before checking the actor's authority.
  -- This prevents a concurrent demotion from leaving a stale privileged read usable.
  perform p.id
  from public.profiles p
  where p.id in (caller_id, requested_user_id)
  order by p.id
  for update;

  select p.role, p.status into caller_role, caller_status
  from public.profiles p
  where p.id = caller_id;

  if caller_status is distinct from 'active' then
    raise exception 'Only active accounts can manage roles.';
  end if;

  select p.role into target_role
  from public.profiles p
  where p.id = requested_user_id;

  if target_role is null then
    raise exception 'The selected member was not found.';
  end if;

  caller_rank := case caller_role
    when 'owner' then 6 when 'developer' then 5 when 'admin' then 4
    when 'moderator' then 3 when 'vip' then 2 when 'user' then 1 else 0 end;
  requested_rank := case requested_role
    when 'owner' then 6 when 'developer' then 5 when 'admin' then 4
    when 'moderator' then 3 when 'vip' then 2 when 'user' then 1 else 0 end;

  if caller_rank < 4 or requested_rank >= caller_rank or
    (case target_role when 'owner' then 6 when 'developer' then 5 when 'admin' then 4
      when 'moderator' then 3 when 'vip' then 2 when 'user' then 1 else 0 end) >= caller_rank
  then
    raise exception 'Your role cannot grant or modify that permission level.';
  end if;

  update public.profiles set role = requested_role, updated_at = now()
  where id = requested_user_id;

  insert into public.audit_events (actor_id, event_type, subject_type, subject_id, details)
  values (caller_id, 'member_role_changed', 'profile', requested_user_id,
    jsonb_build_object('previous_role', target_role, 'new_role', requested_role));
end;
$function$;

revoke all on function public.set_member_role(uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, text) to authenticated;

commit;
