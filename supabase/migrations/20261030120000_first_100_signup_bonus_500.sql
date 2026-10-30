-- First-100 thank-you award: 500 tokens total per eligible account.
-- Existing verified accounts already received 100 tokens in the original build,
-- so their one-time top-up is +400. Future eligible signups receive +500.
-- Repository migration only. Do not apply to production before owner-reviewed staging tests.
begin;

create table if not exists public.token_signup_bonus_pool (
  singleton boolean primary key default true check (singleton),
  awarded_count integer not null default 0 check (awarded_count between 0 and 100),
  opened_at timestamptz not null default now()
);

insert into public.token_signup_bonus_pool(singleton, awarded_count, opened_at)
values (true, 0, transaction_timestamp())
on conflict (singleton) do nothing;

create table if not exists public.token_signup_bonus_awards (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  signup_rank integer not null unique check (signup_rank between 1 and 100),
  tokens_delta bigint not null check (tokens_delta in (400, 500)),
  reason text not null check (reason in ('founding_member_top_up', 'founding_member_signup_bonus')),
  source text not null,
  created_at timestamptz not null default now()
);

alter table public.token_signup_bonus_pool enable row level security;
alter table public.token_signup_bonus_awards enable row level security;
revoke all on public.token_signup_bonus_pool, public.token_signup_bonus_awards from public, anon, authenticated;
grant select on public.token_signup_bonus_awards to authenticated;

drop policy if exists "users read own signup bonus award" on public.token_signup_bonus_awards;
create policy "users read own signup bonus award"
  on public.token_signup_bonus_awards for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.grant_first_100_signup_bonus(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_created_at timestamptz;
  pool_opened_at timestamptz;
  current_award_count integer;
  next_rank integer;
  grant_amount bigint;
  grant_reason text;
begin
  if target_user_id is null then return; end if;

  -- The pool row serializes concurrent verifications and profile-creation triggers.
  select awarded_count, opened_at
    into current_award_count, pool_opened_at
  from public.token_signup_bonus_pool
  where singleton = true
  for update;

  if not found or current_award_count >= 100 then return; end if;

  if exists (
    select 1 from public.token_signup_bonus_awards
    where user_id = target_user_id
  ) then
    return;
  end if;

  select u.created_at
    into account_created_at
  from auth.users as u
  join public.profiles as p on p.id = u.id
  where u.id = target_user_id
    and u.email_confirmed_at is not null
    and p.status = 'active';

  if not found then return; end if;

  -- Existing accounts keep their original 100-token welcome balance and receive
  -- a 400-token top-up. Accounts created after this programme opens receive 500.
  if account_created_at <= pool_opened_at then
    grant_amount := 400;
    grant_reason := 'founding_member_top_up';
  else
    grant_amount := 500;
    grant_reason := 'founding_member_signup_bonus';
  end if;

  next_rank := current_award_count + 1;

  insert into public.token_wallets(user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  insert into public.token_signup_bonus_awards
    (user_id, signup_rank, tokens_delta, reason, source)
  values
    (target_user_id, next_rank, grant_amount, grant_reason, 'first_100_verified_signups');

  update public.token_wallets
  set balance_tokens = balance_tokens + grant_amount,
      updated_at = now()
  where user_id = target_user_id;

  update public.token_signup_bonus_pool
  set awarded_count = next_rank
  where singleton = true;

  insert into public.audit_events(actor_id, event_type, subject_type, subject_id, details)
  values (
    null,
    'token.signup_bonus_granted',
    'user',
    target_user_id,
    jsonb_build_object(
      'signup_rank', next_rank,
      'tokens_delta', grant_amount,
      'reason', grant_reason,
      'programme', 'first_100_verified_signups'
    )
  );
end;
$$;

revoke all on function public.grant_first_100_signup_bonus(uuid) from public, anon, authenticated, service_role;

create or replace function public.grant_signup_bonus_after_auth_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null then
    perform public.grant_first_100_signup_bonus(new.id);
  end if;
  return new;
end;
$$;

create or replace function public.grant_signup_bonus_after_profile_creation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.grant_first_100_signup_bonus(new.id);
  return new;
end;
$$;

revoke all on function public.grant_signup_bonus_after_auth_verification() from public, anon, authenticated;
revoke all on function public.grant_signup_bonus_after_profile_creation() from public, anon, authenticated;

drop trigger if exists auth_user_signup_bonus_on_insert on auth.users;
create trigger auth_user_signup_bonus_on_insert
after insert on auth.users
for each row execute function public.grant_signup_bonus_after_auth_verification();

drop trigger if exists auth_user_signup_bonus_on_verification on auth.users;
create trigger auth_user_signup_bonus_on_verification
after update of email_confirmed_at on auth.users
for each row
when (new.email_confirmed_at is not null and old.email_confirmed_at is distinct from new.email_confirmed_at)
execute function public.grant_signup_bonus_after_auth_verification();

drop trigger if exists profile_signup_bonus_after_insert on public.profiles;
create trigger profile_signup_bonus_after_insert
after insert on public.profiles
for each row execute function public.grant_signup_bonus_after_profile_creation();

-- Backfill the first 100 already-verified active accounts in original signup order.
-- The helper records +400 for each because the original build already gave them 100.
do $$
declare
  eligible record;
begin
  for eligible in
    select u.id
    from auth.users as u
    join public.profiles as p on p.id = u.id
    where u.email_confirmed_at is not null
      and p.status = 'active'
    order by u.created_at asc, u.id asc
    limit 100
  loop
    perform public.grant_first_100_signup_bonus(eligible.id);
  end loop;
end;
$$;

commit;
