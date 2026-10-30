create or replace function private.record_stripe_payment_entitlement(
  requested_event_id text,
  requested_session_id text,
  requested_payment_intent_id text,
  requested_user_id uuid,
  requested_purchase_type text,
  requested_amount_total bigint,
  requested_currency text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.stripe_payment_entitlements%rowtype;
begin
  if requested_event_id is null or requested_event_id = ''
     or requested_session_id is null or requested_session_id = ''
     or requested_user_id is null
     or requested_purchase_type not in ('community_donation','token_bundle')
     or requested_amount_total is null or requested_amount_total <= 0
     or requested_currency <> 'gbp' then
    raise exception 'Invalid Stripe entitlement payload';
  end if;
  insert into public.stripe_payment_entitlements (
    stripe_event_id, checkout_session_id, payment_intent_id, user_id,
    purchase_type, amount_total, currency, status
  ) values (
    requested_event_id, requested_session_id, requested_payment_intent_id,
    requested_user_id, requested_purchase_type, requested_amount_total, 'gbp', 'paid'
  ) on conflict do nothing;
  select * into existing from public.stripe_payment_entitlements
    where stripe_event_id = requested_event_id
       or checkout_session_id = requested_session_id
    order by (stripe_event_id = requested_event_id) desc
    limit 1;
  if existing.stripe_event_id is null
     or existing.checkout_session_id <> requested_session_id
     or existing.user_id <> requested_user_id
     or existing.purchase_type <> requested_purchase_type
     or existing.amount_total <> requested_amount_total
     or existing.currency <> requested_currency then
    raise exception 'Stripe event replay does not match the original entitlement';
  end if;
  if existing.status = 'paid' then
    update public.profiles set role = 'vip' where id = requested_user_id and role = 'user';
  end if;
  return jsonb_build_object('recorded', true, 'status', existing.status);
end;
$$;
