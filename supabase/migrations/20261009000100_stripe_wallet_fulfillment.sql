-- Durable wallet state is writable only through the Stripe fulfillment RPC.
create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance_credits integer not null default 0 check (balance_credits >= 0),
  updated_at timestamptz not null default now()
);

create table public.wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wallets(user_id) on delete cascade,
  amount_credits integer not null check (amount_credits <> 0),
  reason text not null check (reason = 'top_up'),
  reference_id text not null unique,
  created_at timestamptz not null default now()
);

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create table public.payment_fulfillments (
  checkout_session_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_event_id text not null references public.stripe_webhook_events(event_id),
  product_key text not null check (product_key in (
    'credits_500',
    'credits_1500',
    'vip_wayfinder',
    'vip_champion'
  )),
  amount_total integer not null check (amount_total > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  fulfilled_at timestamptz not null default now()
);

create index wallet_ledger_entries_user_created_idx
  on public.wallet_ledger_entries (user_id, created_at desc);

alter table public.wallets enable row level security;
alter table public.wallet_ledger_entries enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.payment_fulfillments enable row level security;

revoke all on public.wallets, public.wallet_ledger_entries,
  public.stripe_webhook_events, public.payment_fulfillments
  from public, anon, authenticated, service_role;

create or replace function public.fulfill_stripe_checkout(
  requested_event_id text,
  requested_event_type text,
  requested_session_id text,
  requested_user_id uuid,
  requested_product_key text,
  requested_amount_total integer,
  requested_currency text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_event_id text;
  previous_fulfillment public.payment_fulfillments%rowtype;
  product_credits integer;
  product_vip_tier text;
begin
  if requested_event_id is null or requested_event_id = ''
    or requested_event_type not in ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
    or requested_session_id is null or requested_session_id = ''
    or requested_amount_total is null or requested_amount_total <= 0
    or requested_currency is null or requested_currency !~ '^[a-z]{3}$'
  then
    raise exception 'Invalid Stripe fulfillment parameters' using errcode = '22023';
  end if;

  case requested_product_key
    when 'credits_500' then product_credits := 500;
    when 'credits_1500' then product_credits := 1500;
    when 'vip_wayfinder' then product_vip_tier := 'wayfinder';
    when 'vip_champion' then product_vip_tier := 'champion';
    else raise exception 'Unsupported Stripe product' using errcode = '22023';
  end case;

  insert into public.stripe_webhook_events (event_id, event_type)
  values (requested_event_id, requested_event_type)
  on conflict (event_id) do nothing
  returning event_id into inserted_event_id;

  if inserted_event_id is null then
    return false;
  end if;

  select *
  into previous_fulfillment
  from public.payment_fulfillments
  where checkout_session_id = requested_session_id;

  if found then
    if previous_fulfillment.user_id <> requested_user_id
      or previous_fulfillment.product_key <> requested_product_key
      or previous_fulfillment.amount_total <> requested_amount_total
      or previous_fulfillment.currency <> requested_currency
    then
      raise exception 'Stripe checkout session fulfillment does not match' using errcode = '22023';
    end if;
    return false;
  end if;

  if not exists (select 1 from public.profiles where id = requested_user_id) then
    raise exception 'Stripe checkout user does not exist' using errcode = '23503';
  end if;

  insert into public.payment_fulfillments (
    checkout_session_id,
    user_id,
    stripe_event_id,
    product_key,
    amount_total,
    currency
  )
  values (
    requested_session_id,
    requested_user_id,
    requested_event_id,
    requested_product_key,
    requested_amount_total,
    requested_currency
  );

  insert into public.wallets (user_id)
  values (requested_user_id)
  on conflict (user_id) do nothing;

  if product_credits is not null then
    update public.wallets
    set balance_credits = balance_credits + product_credits,
        updated_at = now()
    where user_id = requested_user_id;

    insert into public.wallet_ledger_entries (
      user_id,
      amount_credits,
      reason,
      reference_id
    )
    values (
      requested_user_id,
      product_credits,
      'top_up',
      requested_session_id
    );
  else
    update public.profiles
    set vip_tier = case
      when vip_tier = 'champion' or (vip_tier = 'wayfinder' and product_vip_tier = 'wayfinder')
        then vip_tier
      when product_vip_tier = 'champion'
        then 'champion'
      else 'wayfinder'
    end,
        updated_at = now()
    where id = requested_user_id;
  end if;

  return true;
end;
$$;

revoke all on function public.fulfill_stripe_checkout(
  text, text, text, uuid, text, integer, text
) from public, anon, authenticated;
grant execute on function public.fulfill_stripe_checkout(
  text, text, text, uuid, text, integer, text
) to service_role;
