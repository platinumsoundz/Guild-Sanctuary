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

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and role = 'user' and status = 'active');

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
  if requested_role is null or requested_role not in ('user', 'vip', 'moderator', 'admin', 'developer', 'owner') then
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
    values (caller_id, 'member_role_changed', 'profile', requested_user_id,
      jsonb_build_object('previous_role', target_role, 'new_role', requested_role));
end;
$$;

revoke all on function public.set_member_role(uuid, text) from public;
grant execute on function public.set_member_role(uuid, text) to authenticated;


create or replace function public.search_members_for_admin(requested_query text)
returns table(id uuid, username text, display_name text, role text, status text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_role text;
  clean_query text := btrim(coalesce(requested_query, ''));
begin
  select p.role into caller_role
    from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active';
  if caller_role is null or caller_role not in ('admin', 'developer', 'owner') then
    raise exception 'Only active admins, developers, and owners can search members for role management.';
  end if;
  if char_length(clean_query) < 1 or char_length(clean_query) > 24 then
    raise exception 'Enter a username search of 1 to 24 characters.';
  end if;
  return query
    select p.id, p.username, p.display_name, p.role, p.status
    from public.profiles p
    where p.username ilike ('%' || replace(replace(replace(clean_query, '%', ''), '_', ''), E'\\', '') || '%')
    order by p.username
    limit 25;
end;
$$;

revoke all on function public.search_members_for_admin(text) from public;
grant execute on function public.search_members_for_admin(text) to authenticated;
