-- Phase 1 launch gate: seven-day account deletion grace period.
-- Requesting deletion hides the profile and its community content immediately.
-- The owner can restore by signing in before the purge date; a secret-protected
-- server route performs the permanent media and auth-user removal afterwards.
begin;

alter table public.profiles
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_purge_after timestamptz;

alter table public.posts
  add column if not exists hidden_for_deletion boolean not null default false;
alter table public.short_videos
  add column if not exists hidden_for_deletion boolean not null default false;
alter table public.events
  add column if not exists hidden_for_deletion boolean not null default false;
alter table public.social_comments
  add column if not exists hidden_for_deletion boolean not null default false;

create table if not exists public.account_deletion_requests (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  purge_after timestamptz not null,
  prior_visibility text not null check (prior_visibility in ('public', 'private')),
  prior_allow_profile_discovery boolean not null,
  cancelled_at timestamptz,
  purge_attempted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists account_deletion_requests_due_idx
  on public.account_deletion_requests (purge_after)
  where cancelled_at is null;

alter table public.account_deletion_requests enable row level security;

create policy "users read own deletion request"
  on public.account_deletion_requests for select to authenticated
  using (user_id = (select auth.uid()));

create policy "moderators read deletion requests"
  on public.account_deletion_requests for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('moderator', 'admin')
      and (p.status = 'active' or (p.status = 'suspended' and p.suspended_until <= now()))
  ));

grant select on public.account_deletion_requests to authenticated;
grant select, insert, update on public.account_deletion_requests to service_role;
revoke insert, update, delete, truncate on public.account_deletion_requests from public, anon, authenticated;

create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_profile public.profiles%rowtype;
  existing_request public.account_deletion_requests%rowtype;
  purge_after timestamptz := now() + interval '7 days';
begin
  if caller_id is null then
    raise exception 'Sign in before deleting your account.' using errcode = '42501';
  end if;

  select * into caller_profile from public.profiles where id = caller_id;
  if not found then
    raise exception 'Your profile could not be found.' using errcode = 'P0002';
  end if;

  select * into existing_request
  from public.account_deletion_requests
  where user_id = caller_id
    and cancelled_at is null;

  if found and existing_request.purge_after > now() then
    return existing_request.purge_after;
  end if;

  insert into public.account_deletion_requests (
    user_id, requested_at, purge_after, prior_visibility, prior_allow_profile_discovery, cancelled_at
  ) values (
    caller_id, now(), purge_after, caller_profile.visibility, caller_profile.allow_profile_discovery, null
  )
  on conflict (user_id) do update
  set requested_at = excluded.requested_at,
      purge_after = excluded.purge_after,
      prior_visibility = excluded.prior_visibility,
      prior_allow_profile_discovery = excluded.prior_allow_profile_discovery,
      cancelled_at = null,
      purge_attempted_at = null;

  update public.posts
  set state = 'hidden', hidden_for_deletion = true, updated_at = now()
  where author_id = caller_id and state = 'visible';

  update public.short_videos
  set state = 'hidden', hidden_for_deletion = true
  where author_id = caller_id and state = 'visible';

  update public.events
  set state = 'hidden', hidden_for_deletion = true
  where creator_id = caller_id and state = 'visible';

  update public.social_comments
  set state = 'hidden', hidden_for_deletion = true
  where author_id = caller_id and state = 'visible';

  update public.profiles
  set deletion_requested_at = now(),
      deletion_purge_after = purge_after,
      visibility = 'private',
      allow_profile_discovery = false,
      status = 'suspended',
      suspended_until = purge_after,
      updated_at = now()
  where id = caller_id;

  perform public.log_audit_event(
    caller_id,
    'account.deletion_requested',
    'user',
    caller_id,
    jsonb_build_object('purgeAfter', purge_after)
  );

  return purge_after;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;

create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  existing_request public.account_deletion_requests%rowtype;
begin
  if caller_id is null then
    raise exception 'Sign in before restoring your account.' using errcode = '42501';
  end if;

  select * into existing_request
  from public.account_deletion_requests
  where user_id = caller_id
    and cancelled_at is null
  for update;

  if not found then
    raise exception 'No account deletion request is pending.' using errcode = 'P0002';
  end if;

  if existing_request.purge_after <= now() then
    raise exception 'The seven-day restoration window has ended. Contact support.' using errcode = '22023';
  end if;

  update public.posts
  set state = 'visible', hidden_for_deletion = false, updated_at = now()
  where author_id = caller_id and hidden_for_deletion and state = 'hidden';

  update public.short_videos
  set state = 'visible', hidden_for_deletion = false
  where author_id = caller_id and hidden_for_deletion and state = 'hidden';

  update public.events
  set state = 'visible', hidden_for_deletion = false
  where creator_id = caller_id and hidden_for_deletion and state = 'hidden';

  update public.social_comments
  set state = 'visible', hidden_for_deletion = false
  where author_id = caller_id and hidden_for_deletion and state = 'hidden';

  update public.profiles
  set deletion_requested_at = null,
      deletion_purge_after = null,
      visibility = existing_request.prior_visibility,
      allow_profile_discovery = existing_request.prior_allow_profile_discovery,
      status = 'active',
      suspended_until = null,
      updated_at = now()
  where id = caller_id;

  update public.account_deletion_requests
  set cancelled_at = now()
  where user_id = caller_id;

  perform public.log_audit_event(
    caller_id,
    'account.deletion_cancelled',
    'user',
    caller_id,
    jsonb_build_object('purgeAfter', existing_request.purge_after)
  );
end;
$$;

revoke all on function public.cancel_account_deletion() from public, anon, authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

create or replace function public.purge_due_account_deletions(requested_limit integer default 20)
returns table (user_id uuid, requested_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_limit is null or requested_limit < 1 or requested_limit > 100 then
    raise exception 'The purge limit must be between 1 and 100.' using errcode = '22023';
  end if;

  return query
  with due as (
    select requests.user_id, requests.requested_at
    from public.account_deletion_requests as requests
    where requests.cancelled_at is null
      and requests.purge_after <= now()
    order by requests.purge_after asc
    limit requested_limit
    for update skip locked
  )
  update public.account_deletion_requests as requests
  set purge_attempted_at = now()
  from due
  where requests.user_id = due.user_id
  returning requests.user_id, due.requested_at;

  perform public.log_audit_event(
    null,
    'account.deletions_due',
    'system',
    null,
    jsonb_build_object('limit', requested_limit)
  );
end;
$$;

revoke all on function public.purge_due_account_deletions(integer) from public, anon, authenticated;
grant execute on function public.purge_due_account_deletions(integer) to service_role;

commit;
