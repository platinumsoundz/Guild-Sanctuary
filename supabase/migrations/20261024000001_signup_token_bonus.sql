-- Welcome grant: every new profile starts with 100 tokens. The grant is
-- recorded in the immutable purchase ledger so the wallet history explains the
-- starting balance. Existing pre-live profiles without a wallet are backfilled
-- once; profiles that already have a wallet are not changed.
begin;

alter table public.token_ledger
  drop constraint if exists token_ledger_bundle_id_check;
alter table public.token_ledger
  drop constraint if exists token_ledger_check;

alter table public.token_ledger
  add constraint token_ledger_bundle_id_check
  check (bundle_id in ('tokens_100', 'tokens_600', 'tokens_1200', 'signup_bonus'));

alter table public.token_ledger
  drop constraint if exists token_ledger_entry_check;
alter table public.token_ledger
  add constraint token_ledger_entry_check
  check (
    (bundle_id = 'signup_bonus' and tokens_delta = 100 and amount_total = 0)
    or (bundle_id = 'tokens_100' and tokens_delta = 100 and amount_total = 100)
    or (bundle_id = 'tokens_600' and tokens_delta = 600 and amount_total = 500)
    or (bundle_id = 'tokens_1200' and tokens_delta = 1200 and amount_total = 1000)
  );

create or replace function public.grant_signup_token_bonus(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    raise exception 'A user is required for the signup token bonus.' using errcode = '22023';
  end if;

  insert into public.token_wallets (user_id, balance_tokens)
  values (target_user_id, 100)
  on conflict (user_id) do nothing;

  if found then
    insert into public.token_ledger (
      user_id, bundle_id, tokens_delta, amount_total, currency,
      stripe_event_id, checkout_session_id, livemode
    ) values (
      target_user_id, 'signup_bonus', 100, 0, 'gbp',
      'signup_bonus:' || target_user_id::text,
      'signup_bonus:' || target_user_id::text,
      false
    )
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.grant_signup_bonus_on_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.grant_signup_token_bonus(new.id);
  return new;
end;
$$;

drop trigger if exists profiles_grant_signup_token_bonus on public.profiles;
create trigger profiles_grant_signup_token_bonus
after insert on public.profiles
for each row execute function public.grant_signup_bonus_on_profile();

-- One-time pre-live backfill. Remove this block if existing accounts should not
-- receive the welcome grant.
select public.grant_signup_token_bonus(profiles.id)
from public.profiles
where not exists (
  select 1 from public.token_wallets
  where token_wallets.user_id = profiles.id
);

revoke all on function public.grant_signup_token_bonus(uuid) from public, anon, authenticated;
revoke all on function public.grant_signup_bonus_on_profile() from public, anon, authenticated;

commit;
