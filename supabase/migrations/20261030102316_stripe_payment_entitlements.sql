create table if not exists public.stripe_payment_entitlements (
  stripe_event_id text primary key,
  checkout_session_id text not null unique,
  payment_intent_id text,
  user_id uuid not null references public.profiles(id) on delete cascade,
  purchase_type text not null check (purchase_type in ('community_donation','token_bundle')),
  amount_total bigint not null check (amount_total > 0),
  currency text not null check (currency = 'gbp'),
  status text not null default 'paid' check (status in ('paid','refunded','disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists stripe_payment_entitlements_payment_intent_uidx
  on public.stripe_payment_entitlements(payment_intent_id)
  where payment_intent_id is not null;
alter table public.stripe_payment_entitlements enable row level security;
revoke all on table public.stripe_payment_entitlements from anon, authenticated;
grant all on table public.stripe_payment_entitlements to service_role;
