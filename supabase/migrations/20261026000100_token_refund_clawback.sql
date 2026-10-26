-- Phase 1 launch gate: refund and chargeback handling.
-- Approved policy: claw back unspent tokens, never create a negative balance,
-- and flag spent-token or partial-refund cases for manual review. Purchased
-- cosmetics are never reversed automatically.
begin;

create table if not exists public.token_refund_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_event_type text not null check (stripe_event_type in ('charge.refunded', 'charge.dispute.created')),
  checkout_session_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('refund', 'dispute')),
  purchased_tokens bigint not null check (purchased_tokens > 0),
  clawed_back_tokens bigint not null check (clawed_back_tokens >= 0),
  shortfall_tokens bigint not null check (shortfall_tokens >= 0),
  review_required boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists token_refund_events_user_created_idx
  on public.token_refund_events (user_id, created_at desc);

create table if not exists public.token_purchase_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkout_session_id text not null,
  refund_event_id uuid references public.token_refund_events(id) on delete set null,
  reason text not null check (reason in ('spent_tokens', 'partial_refund', 'partial_dispute', 'dispute_won', 'unmatched')),
  shortfall_tokens bigint not null default 0 check (shortfall_tokens >= 0),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  notes text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists token_purchase_reviews_status_idx
  on public.token_purchase_reviews (status, created_at);

alter table public.token_refund_events enable row level security;
alter table public.token_purchase_reviews enable row level security;

create policy "moderators read token refund events"
  on public.token_refund_events for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('moderator', 'admin')
      and (p.status = 'active' or (p.status = 'suspended' and p.suspended_until <= now()))
  ));

create policy "moderators read token purchase reviews"
  on public.token_purchase_reviews for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('moderator', 'admin')
      and (p.status = 'active' or (p.status = 'suspended' and p.suspended_until <= now()))
  ));

grant select on public.token_refund_events, public.token_purchase_reviews to authenticated;
revoke insert, update, delete, truncate
  on public.token_refund_events, public.token_purchase_reviews
  from public, anon, authenticated;
grant select, insert, update on public.token_refund_events, public.token_purchase_reviews to service_role;

create or replace function public.record_token_refund(
  requested_event_id text,
  requested_event_type text,
  requested_checkout_session_id text,
  requested_reason text,
  requested_is_full boolean
)
returns table (
  matched boolean,
  clawed_back_tokens bigint,
  shortfall_tokens bigint,
  review_required boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  purchase public.token_ledger%rowtype;
  existing_event public.token_refund_events%rowtype;
  wallet_balance bigint;
  prior_clawback bigint;
  clawback bigint := 0;
  shortfall bigint := 0;
  needs_review boolean := false;
  new_event_id uuid;
  review_reason text;
begin
  if requested_event_id is null or requested_event_id = ''
    or requested_event_type is null
    or requested_event_type not in ('charge.refunded', 'charge.dispute.created')
    or requested_checkout_session_id is null or requested_checkout_session_id = ''
    or requested_reason is null
    or requested_reason not in ('refund', 'dispute')
    or requested_is_full is null
  then
    raise exception 'Invalid token refund event' using errcode = '22023';
  end if;

  select * into existing_event
  from public.token_refund_events
  where stripe_event_id = requested_event_id;

  if found then
    return query select true, existing_event.clawed_back_tokens, existing_event.shortfall_tokens, existing_event.review_required;
    return;
  end if;

  select * into purchase
  from public.token_ledger
  where checkout_session_id = requested_checkout_session_id;

  if not found then
    return query select false, 0::bigint, 0::bigint, false;
    return;
  end if;

  select coalesce(sum(events.clawed_back_tokens), 0)
  into prior_clawback
  from public.token_refund_events as events
  where events.checkout_session_id = requested_checkout_session_id;

  -- Partial refunds and partial disputes are never auto-debited because the
  -- product owner has not approved a proportional policy. Flag for review.
  if not requested_is_full then
    review_reason := case requested_reason when 'refund' then 'partial_refund' else 'partial_dispute' end;
    insert into public.token_refund_events (
      stripe_event_id, stripe_event_type, checkout_session_id, user_id, reason,
      purchased_tokens, clawed_back_tokens, shortfall_tokens, review_required
    ) values (
      requested_event_id, requested_event_type, requested_checkout_session_id, purchase.user_id, requested_reason,
      purchase.tokens_delta, 0, 0, true
    ) returning id into new_event_id;
    insert into public.token_purchase_reviews (
      user_id, checkout_session_id, refund_event_id, reason
    ) values (
      purchase.user_id, requested_checkout_session_id, new_event_id, review_reason
    );
    perform public.log_audit_event(
      null,
      'token.refund_review_required',
      'user',
      purchase.user_id,
      jsonb_build_object('checkoutSessionId', requested_checkout_session_id, 'reason', review_reason)
    );
    return query select true, 0::bigint, 0::bigint, true;
    return;
  end if;

  if prior_clawback > 0 then
    insert into public.token_refund_events (
      stripe_event_id, stripe_event_type, checkout_session_id, user_id, reason,
      purchased_tokens, clawed_back_tokens, shortfall_tokens, review_required
    ) values (
      requested_event_id, requested_event_type, requested_checkout_session_id, purchase.user_id, requested_reason,
      purchase.tokens_delta, 0, 0, false
    );
    return query select true, 0::bigint, 0::bigint, false;
    return;
  end if;

  select wallets.balance_tokens
  into wallet_balance
  from public.token_wallets as wallets
  where wallets.user_id = purchase.user_id
  for update;

  if wallet_balance is null then
    wallet_balance := 0;
  end if;

  clawback := least(greatest(wallet_balance, 0), purchase.tokens_delta);
  shortfall := purchase.tokens_delta - clawback;
  needs_review := shortfall > 0;

  if clawback > 0 then
    update public.token_wallets
    set balance_tokens = balance_tokens - clawback,
        updated_at = now()
    where user_id = purchase.user_id;
  end if;

  insert into public.token_refund_events (
    stripe_event_id, stripe_event_type, checkout_session_id, user_id, reason,
    purchased_tokens, clawed_back_tokens, shortfall_tokens, review_required
  ) values (
    requested_event_id, requested_event_type, requested_checkout_session_id, purchase.user_id, requested_reason,
    purchase.tokens_delta, clawback, shortfall, needs_review
  ) returning id into new_event_id;

  if needs_review then
    insert into public.token_purchase_reviews (
      user_id, checkout_session_id, refund_event_id, reason, shortfall_tokens
    ) values (
      purchase.user_id, requested_checkout_session_id, new_event_id, 'spent_tokens', shortfall
    );
  end if;

  perform public.log_audit_event(
    null,
    'token.refund_processed',
    'user',
    purchase.user_id,
    jsonb_build_object(
      'checkoutSessionId', requested_checkout_session_id,
      'reason', requested_reason,
      'clawedBackTokens', clawback,
      'shortfallTokens', shortfall
    )
  );

  return query select true, clawback, shortfall, needs_review;
end;
$$;

revoke all on function public.record_token_refund(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.record_token_refund(text, text, text, text, boolean) to service_role;

commit;
