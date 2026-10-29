-- Role-based navigation entitlements and verified payment/donation VIP grants.
-- Apply in staging first; live checkout/webhook configuration remains an explicit release gate.
begin;

create table if not exists public.sanctuary_donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_total integer not null check (amount_total in (500, 1000, 2500)),
  currency text not null check (currency = 'usd'),
  stripe_event_id text not null unique,
  checkout_session_id text not null unique,
  livemode boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists sanctuary_donations_user_created_idx
  on public.sanctuary_donations (user_id, created_at desc);

alter table public.sanctuary_donations enable row level security;
drop policy if exists "users read own sanctuary donations" on public.sanctuary_donations;
create policy "users read own sanctuary donations"
  on public.sanctuary_donations for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.sanctuary_donations to authenticated;
revoke insert, update, delete, truncate on public.sanctuary_donations from public, anon, authenticated;
grant select, insert on public.sanctuary_donations to service_role;

-- Grant VIP only after a verified, idempotently recorded token purchase is inserted.
create or replace function public.grant_vip_after_token_purchase()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set role = 'vip', updated_at = now()
   where id = new.user_id and role = 'user';
  return new;
end;
$$;

drop trigger if exists grant_vip_after_token_purchase on public.token_ledger;
create trigger grant_vip_after_token_purchase
after insert on public.token_ledger
for each row execute function public.grant_vip_after_token_purchase();

revoke all on function public.grant_vip_after_token_purchase() from public, anon, authenticated;

create or replace function public.record_sanctuary_donation(
  requested_event_id text,
  requested_event_type text,
  requested_session_id text,
  requested_user_id uuid,
  requested_amount_total integer,
  requested_currency text,
  requested_livemode boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  recorded public.sanctuary_donations%rowtype;
begin
  if requested_event_id is null or requested_event_id = ''
    or requested_event_type not in ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
    or requested_session_id is null or requested_session_id = ''
    or requested_user_id is null
    or requested_amount_total not in (500, 1000, 2500)
    or requested_currency is distinct from 'usd'
    or requested_livemode is null
  then
    raise exception 'Invalid Sanctuary donation event' using errcode = '22023';
  end if;

  insert into public.sanctuary_donations (
    user_id, amount_total, currency, stripe_event_id, checkout_session_id, livemode
  ) values (
    requested_user_id, requested_amount_total, requested_currency,
    requested_event_id, requested_session_id, requested_livemode
  ) on conflict do nothing;

  select * into recorded
    from public.sanctuary_donations
   where stripe_event_id = requested_event_id
      or checkout_session_id = requested_session_id
   limit 1;

  if not found
    or recorded.user_id is distinct from requested_user_id
    or recorded.amount_total is distinct from requested_amount_total
    or recorded.currency is distinct from requested_currency
    or recorded.stripe_event_id is distinct from requested_event_id
    or recorded.checkout_session_id is distinct from requested_session_id
    or recorded.livemode is distinct from requested_livemode
  then
    raise exception 'Donation replay does not match the recorded contribution' using errcode = '22023';
  end if;

  -- Do not demote moderators, admins, developers, or the owner.
  update public.profiles
     set role = 'vip', updated_at = now()
   where id = requested_user_id and role = 'user';
end;
$$;

revoke all on function public.record_sanctuary_donation(text, text, text, uuid, integer, text, boolean)
  from public, anon, authenticated;
grant execute on function public.record_sanctuary_donation(text, text, text, uuid, integer, text, boolean)
  to service_role;

commit;
