-- Phase 1 launch gate: auditable terms acceptance.
-- Acceptance is configuration-gated in the app because the public /terms page is
-- still a marked draft. This migration only provides the storage and audit trail
-- so approved wording can be recorded without a schema change later.
begin;

alter table public.profiles
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_terms_version_format;
alter table public.profiles
  add constraint profiles_terms_version_format check (
    terms_version is null or terms_version ~ '^[A-Za-z0-9._-]{4,40}$'
  );

-- Carry the accepted version through signup metadata so the profile row is
-- created already stamped. The trigger stays security definer, so the narrow
-- authenticated insert grant on profiles is unchanged.
create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := new.raw_user_meta_data ->> 'username';
  requested_display_name text := new.raw_user_meta_data ->> 'displayName';
  requested_terms_version text := nullif(trim(new.raw_user_meta_data ->> 'termsVersion'), '');
begin
  if requested_username is null or requested_username !~ '^[A-Za-z0-9_]{3,24}$' then
    raise exception 'A valid username is required' using errcode = '22023';
  end if;
  if requested_display_name is null or char_length(trim(requested_display_name)) not between 1 and 50 then
    raise exception 'A valid display name is required' using errcode = '22023';
  end if;
  if requested_terms_version is not null
    and requested_terms_version !~ '^[A-Za-z0-9._-]{4,40}$'
  then
    raise exception 'The terms version is invalid' using errcode = '22023';
  end if;

  insert into public.profiles (id, username, display_name, terms_version, terms_accepted_at)
  values (
    new.id,
    requested_username,
    trim(requested_display_name),
    requested_terms_version,
    case when requested_terms_version is null then null else now() end
  );
  insert into public.account_settings (user_id) values (new.id);
  return new;
end;
$$;

-- Lets an existing member accept a newly approved version without re-creating
-- the account. Returns the stored version and timestamp so the client can
-- update its session without guessing.
create or replace function public.record_terms_acceptance(requested_version text)
returns table (terms_version text, terms_accepted_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  normalized_version text := trim(coalesce(requested_version, ''));
  accepted_at timestamptz := now();
begin
  if caller_id is null then
    raise exception 'Sign in before accepting the terms.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if normalized_version !~ '^[A-Za-z0-9._-]{4,40}$' then
    raise exception 'The terms version is invalid.' using errcode = '22023';
  end if;

  update public.profiles
  set terms_version = normalized_version,
      terms_accepted_at = accepted_at,
      updated_at = now()
  where id = caller_id;

  perform public.log_audit_event(
    caller_id,
    'account.terms_accepted',
    'user',
    caller_id,
    jsonb_build_object('termsVersion', normalized_version)
  );

  return query select normalized_version, accepted_at;
end;
$$;

revoke all on function public.record_terms_acceptance(text) from public, anon, authenticated;
grant execute on function public.record_terms_acceptance(text) to authenticated;

commit;
