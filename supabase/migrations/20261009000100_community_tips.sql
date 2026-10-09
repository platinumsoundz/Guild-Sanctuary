-- Store only the minimum payment reconciliation data needed for one-time tips.
-- Donor identity and payment details remain with Stripe and are not linked to app accounts.
create table public.community_tips (
  stripe_event_id text primary key,
  checkout_session_id text not null unique,
  tip_option text not null check (tip_option in ('tip_5_usd', 'tip_10_usd', 'tip_25_usd')),
  amount_total integer not null check (amount_total in (500, 1000, 2500)),
  currency text not null check (currency = 'usd'),
  completed_at timestamptz not null default now()
);

alter table public.community_tips enable row level security;
revoke all on public.community_tips from public, anon, authenticated, service_role;

create or replace function public.record_community_tip(
  requested_event_id text,
  requested_event_type text,
  requested_session_id text,
  requested_tip_option text,
  requested_amount_total integer,
  requested_currency text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_amount integer;
  previous_tip public.community_tips%rowtype;
begin
  if requested_event_id is null or requested_event_id = ''
    or requested_event_type not in ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
    or requested_session_id is null or requested_session_id = ''
    or requested_currency <> 'usd'
  then
    raise exception 'Invalid community tip parameters' using errcode = '22023';
  end if;

  case requested_tip_option
    when 'tip_5_usd' then expected_amount := 500;
    when 'tip_10_usd' then expected_amount := 1000;
    when 'tip_25_usd' then expected_amount := 2500;
    else raise exception 'Unsupported community tip option' using errcode = '22023';
  end case;

  if requested_amount_total is distinct from expected_amount then
    raise exception 'Community tip amount does not match its option' using errcode = '22023';
  end if;

  insert into public.community_tips (
    stripe_event_id,
    checkout_session_id,
    tip_option,
    amount_total,
    currency
  )
  values (
    requested_event_id,
    requested_session_id,
    requested_tip_option,
    requested_amount_total,
    requested_currency
  )
  on conflict do nothing;

  if found then
    return true;
  end if;

  select *
  into previous_tip
  from public.community_tips
  where stripe_event_id = requested_event_id
    or checkout_session_id = requested_session_id;

  if not found
    or previous_tip.stripe_event_id <> requested_event_id
    or previous_tip.checkout_session_id <> requested_session_id
    or previous_tip.tip_option <> requested_tip_option
    or previous_tip.amount_total <> requested_amount_total
    or previous_tip.currency <> requested_currency
  then
    raise exception 'Community tip replay does not match the original payment' using errcode = '22023';
  end if;

  return false;
end;
$$;

revoke all on function public.record_community_tip(
  text, text, text, text, integer, text
) from public, anon, authenticated;
grant execute on function public.record_community_tip(
  text, text, text, text, integer, text
) to service_role;
