-- Phase 1 launch gate: server-owned 18+ confirmation for token purchases.
-- The member's date of birth is validated in Postgres and is not stored; only
-- the verification time is kept.
begin;

-- Shared defensive audit helper. The audit_events table is restored by the
-- moderation foundation migration on projects where it is missing; logging
-- must never make an account action fail outright.
create or replace function public.log_audit_event(
  requested_actor_id uuid,
  requested_event_type text,
  requested_subject_type text,
  requested_subject_id uuid,
  requested_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if to_regclass('public.audit_events') is null then
    return;
  end if;
  insert into public.audit_events (actor_id, event_type, subject_type, subject_id, details)
  values (requested_actor_id, requested_event_type, requested_subject_type, requested_subject_id, coalesce(requested_details, '{}'::jsonb));
exception when others then
  -- Audit logging must not roll back the account action that is being logged.
  null;
end;
$$;

revoke all on function public.log_audit_event(uuid, text, text, uuid, jsonb) from public, anon, authenticated;

alter table public.profiles
  add column if not exists purchase_age_verified_at timestamptz;

create or replace function public.confirm_token_purchase_age(requested_date_of_birth date)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  verified_at timestamptz := now();
begin
  if caller_id is null then
    raise exception 'Sign in before confirming your age.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if requested_date_of_birth is null
    or requested_date_of_birth > current_date
    or requested_date_of_birth < (current_date - interval '120 years')::date
  then
    raise exception 'Enter a valid date of birth.' using errcode = '22023';
  end if;

  if requested_date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'Token purchases are only available to members aged 18 or over.' using errcode = '22023';
  end if;

  update public.profiles
  set purchase_age_verified_at = verified_at,
      updated_at = now()
  where id = caller_id;

  perform public.log_audit_event(
    caller_id,
    'account.purchase_age_verified',
    'user',
    caller_id,
    jsonb_build_object('method', 'date_of_birth')
  );

  return verified_at;
end;
$$;

revoke all on function public.confirm_token_purchase_age(date) from public, anon, authenticated;
grant execute on function public.confirm_token_purchase_age(date) to authenticated;

commit;
