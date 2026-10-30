-- First-100 thank-you award: 500 tokens total per eligible account.
-- The first 100 active accounts by original signup timestamp reserve the places,
-- including accounts already registered before this migration. Existing accounts
-- receive +400 because the original build already credited 100; later signups +500.
-- Unverified accounts reserve their signup-order place but receive no tokens until
-- email verification. Repository migration only; never apply before owner-reviewed staging.
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
  created_at timestamptz not null default now(),
  granted_at timestamptz
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
  account_verified boolean;
  pool_opened_at timestamptz;
  current_award_count integer;
  next_rank integer;
  grant_amount bigint;
  grant_reason text;
  award_granted_at timestamptz;
begin
  if target_user_id is null then return; end if;

  -- This singleton row serializes reservation and crediting across concurrent
  -- profile creation, email verification and the migration backfill.
  select awarded_count, opened_at
    into current_award_count, pool_opened_at
  from public.token_signup_bonus_pool
  where singleton = true
  for update;

  if not found then return; end if;

  select u.created_at, (u.email_confirmed_at is not null)
    into account_created_at, account_verified
  from auth.users as u
  join public.profiles as p on p.id = u.id
  where u.id = target_user_id
    and p.status = 'active';

  if not found then return; end if;

  -- Reserve a place for the earliest 100 active signups even if email verification
  -- is still pending. No tokens are credited until that account is verified.
  select tokens_delta, reason, granted_at
    into grant_amount, grant_reason, award_granted_at
  from public.token_signup_bonus_awards
  where user_id = target_user_id
  for update;

  if not found then
    if current_award_count >= 100 then return; end if;

    if account_created_at <= pool_opened_at then
      grant_amount := 400;
      grant_reason := 'founding_member_top_up';
    else
      grant_amount := 500;
      grant_reason := 'founding_member_signup_bonus';
    end if;

    next_rank := current_award_count + 1;

    insert into public.token_signup_bonus_awards
      (user_id, signup_rank, tokens_delta, reason, source)
    values
      (target_user_id, next_rank, grant_amount, grant_reason, 'first_100_signups');

    update public.token_signup_bonus_pool
    set awarded_count = next_rank
    where singleton = true;
  end if;

  -- A reserved but unverified account keeps its rank; verification later invokes
  -- this same helper and credits the one-time award without allocating another rank.
  if account_verified and award_granted_at is null then
    insert into public.token_wallets(user_id)
    values (target_user_id)
    on conflict (user_id) do nothing;

    update public.token_wallets
    set balance_tokens = balance_tokens + grant_amount,
        updated_at = now()
    where user_id = target_user_id;

    update public.token_signup_bonus_awards
    set granted_at = now()
    where user_id = target_user_id
      and granted_at is null;

    insert into public.audit_events(actor_id, event_type, subject_type, subject_id, details)
    values (
      null,
      'token.signup_bonus_granted',
      'user',
      target_user_id,
      jsonb_build_object(
        'signup_rank', (select signup_rank from public.token_signup_bonus_awards where user_id = target_user_id),
        'tokens_delta', grant_amount,
        'reason', grant_reason,
        'programme', 'first_100_signups'
      )
    );
  end if;
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

-- Reserve the first 100 already-registered active accounts in original signup order.
-- Existing accounts reserve +400 because their original 100-token welcome amount
-- is already in their wallet. Verified accounts are credited now; unverified accounts
-- retain their rank and receive the top-up after email verification.
do $$
declare
  eligible record;
begin
  for eligible in
    select u.id
    from auth.users as u
    join public.profiles as p on p.id = u.id
    where p.status = 'active'
    order by u.created_at asc, u.id asc
    limit 100
  loop
    perform public.grant_first_100_signup_bonus(eligible.id);
  end loop;
end;
$$;

commit;
