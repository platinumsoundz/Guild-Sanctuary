-- Persistent, non-cashout token balances. Only a verified Stripe webhook can grant tokens.
-- Transfers, spending, marketplace listings, and withdrawals are intentionally absent.
begin;

create table public.token_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance_tokens bigint not null default 0 check (balance_tokens >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.token_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.token_wallets(user_id) on delete cascade,
  bundle_id text not null check (bundle_id in ('tokens_100', 'tokens_600', 'tokens_1200')),
  tokens_delta bigint not null check (tokens_delta > 0),
  amount_total integer not null,
  currency text not null check (currency = 'gbp'),
  stripe_event_id text not null unique,
  checkout_session_id text not null unique,
  livemode boolean not null,
  created_at timestamptz not null default now(),
  check (
    (bundle_id = 'tokens_100' and tokens_delta = 100 and amount_total = 100)
    or (bundle_id = 'tokens_600' and tokens_delta = 600 and amount_total = 500)
    or (bundle_id = 'tokens_1200' and tokens_delta = 1200 and amount_total = 1000)
  )
);

create index token_ledger_user_created_idx
  on public.token_ledger (user_id, created_at desc);

alter table public.token_wallets enable row level security;
alter table public.token_ledger enable row level security;

create policy "users read own token wallet"
  on public.token_wallets for select to authenticated
  using (user_id = (select auth.uid()));
create policy "users read own token ledger"
  on public.token_ledger for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.token_wallets, public.token_ledger to authenticated;
revoke insert, update, delete, truncate on public.token_wallets, public.token_ledger from public, anon, authenticated;
grant select, insert, update on public.token_wallets to service_role;
grant select, insert on public.token_ledger to service_role;

create or replace function public.record_token_bundle_purchase(
  requested_event_id text,
  requested_event_type text,
  requested_session_id text,
  requested_user_id uuid,
  requested_bundle_id text,
  requested_amount_total integer,
  requested_currency text,
  requested_livemode boolean
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_tokens bigint;
  expected_amount integer;
  wallet_balance bigint;
  existing_entry public.token_ledger%rowtype;
begin
  if requested_event_id is null or requested_event_id = ''
    or requested_event_type is null
    or requested_event_type not in ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
    or requested_session_id is null or requested_session_id = ''
    or requested_user_id is null
    or requested_livemode is null
    or requested_currency is null
    or requested_currency <> 'gbp'
  then
    raise exception 'Invalid token purchase event' using errcode = '22023';
  end if;

  case requested_bundle_id
    when 'tokens_100' then expected_tokens := 100; expected_amount := 100;
    when 'tokens_600' then expected_tokens := 600; expected_amount := 500;
    when 'tokens_1200' then expected_tokens := 1200; expected_amount := 1000;
    else raise exception 'Unsupported token bundle' using errcode = '22023';
  end case;

  if requested_amount_total is distinct from expected_amount then
    raise exception 'Paid amount does not match the token bundle' using errcode = '22023';
  end if;

  insert into public.token_wallets (user_id)
  values (requested_user_id)
  on conflict (user_id) do nothing;

  select balance_tokens into wallet_balance
  from public.token_wallets
  where user_id = requested_user_id
  for update;

  select * into existing_entry
  from public.token_ledger
  where stripe_event_id = requested_event_id
  for update;

  if found then
    if existing_entry.user_id <> requested_user_id
      or existing_entry.bundle_id <> requested_bundle_id
      or existing_entry.tokens_delta <> expected_tokens
      or existing_entry.amount_total <> expected_amount
      or existing_entry.currency <> requested_currency
      or existing_entry.checkout_session_id <> requested_session_id
      or existing_entry.livemode <> requested_livemode
    then
      raise exception 'Stripe event replay does not match the original payment' using errcode = '22023';
    end if;
    return wallet_balance;
  end if;

  -- A second successful event for the same session is a no-op, never a second credit.
  select * into existing_entry
  from public.token_ledger
  where checkout_session_id = requested_session_id
  for update;

  if found then
    if existing_entry.user_id <> requested_user_id
      or existing_entry.bundle_id <> requested_bundle_id
      or existing_entry.tokens_delta <> expected_tokens
      or existing_entry.amount_total <> expected_amount
      or existing_entry.currency <> requested_currency
      or existing_entry.livemode <> requested_livemode
    then
      raise exception 'Token purchase replay does not match the original payment' using errcode = '22023';
    end if;
    return wallet_balance;
  end if;

  insert into public.token_ledger (
    user_id, bundle_id, tokens_delta, amount_total, currency,
    stripe_event_id, checkout_session_id, livemode
  ) values (
    requested_user_id, requested_bundle_id, expected_tokens, expected_amount, requested_currency,
    requested_event_id, requested_session_id, requested_livemode
  );

  update public.token_wallets
  set balance_tokens = balance_tokens + expected_tokens,
      updated_at = now()
  where user_id = requested_user_id
  returning balance_tokens into wallet_balance;

  return wallet_balance;
end;
$$;

revoke all on function public.record_token_bundle_purchase(
  text, text, text, uuid, text, integer, text, boolean
) from public, anon, authenticated;
grant execute on function public.record_token_bundle_purchase(
  text, text, text, uuid, text, integer, text, boolean
) to service_role;

commit;
