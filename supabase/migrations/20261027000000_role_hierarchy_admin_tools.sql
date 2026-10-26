-- Sanctuary role hierarchy and database-enforced role assignment.
-- IMPORTANT: after this migration is applied, bootstrap the first owner by verifying the
-- intended auth.users UUID out-of-band, then run:
-- update public.profiles set role = 'owner' where id = '<verified-auth-user-uuid>';
-- Do not expose a public self-claim function for owner access.

alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'user' where role = 'member';
alter table public.profiles alter column role set default 'user';
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'vip', 'moderator', 'admin', 'developer', 'owner'));

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('moderator', 'admin', 'developer', 'owner')
      and status = 'active'
  );
$$;

create or replace function public.set_member_role(
  requested_user_id uuid,
  requested_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
  if requested_role not in ('user', 'vip', 'moderator', 'admin', 'developer', 'owner') then
    raise exception 'Unknown role requested.';
  end if;
  if requested_user_id is null or requested_user_id = caller_id then
    raise exception 'You cannot change your own role.';
  end if;

  select role, status into caller_role, caller_status
    from public.profiles where id = caller_id;
  if caller_status is distinct from 'active' then
    raise exception 'Only active accounts can manage roles.';
  end if;

  select role into target_role from public.profiles where id = requested_user_id for update;
  if target_role is null then
    raise exception 'The selected member was not found.';
  end if;

  caller_rank := case caller_role
    when 'owner' then 6 when 'developer' then 5 when 'admin' then 4
    when 'moderator' then 3 when 'vip' then 2 when 'user' then 1 else 0 end;
  requested_rank := case requested_role
    when 'owner' then 6 when 'developer' then 5 when 'admin' then 4
    when 'moderator' then 3 when 'vip' then 2 when 'user' then 1 else 0 end;

  if caller_role is distinct from 'owner'
    and (caller_rank < 4 or requested_rank >= caller_rank or
      (case target_role when 'owner' then 6 when 'developer' then 5 when 'admin' then 4
        when 'moderator' then 3 when 'vip' then 2 when 'user' then 1 else 0 end) >= caller_rank)
  then
    raise exception 'Your role cannot grant or modify that permission level.';
  end if;

  update public.profiles set role = requested_role, updated_at = now()
    where id = requested_user_id;

  insert into public.audit_events (actor_id, event_type, subject_type, subject_id, details)
    values (caller_id, 'member_role_changed', 'profile', requested_user_id::text,
      jsonb_build_object('previous_role', target_role, 'new_role', requested_role));
end;
$$;

revoke all on function public.set_member_role(uuid, text) from public;
grant execute on function public.set_member_role(uuid, text) to authenticated;
