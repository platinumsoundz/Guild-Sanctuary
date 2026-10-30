create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
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
  ) on conflict (stripe_event_id) do nothing;
  select * into existing from public.stripe_payment_entitlements where stripe_event_id = requested_event_id;
  if existing.checkout_session_id <> requested_session_id
     or existing.user_id <> requested_user_id
     or existing.purchase_type <> requested_purchase_type then
    raise exception 'Stripe event replay does not match the original entitlement';
  end if;
  if existing.status = 'paid' then
    update public.profiles set role = 'vip' where id = requested_user_id and role = 'user';
  end if;
  return jsonb_build_object('recorded', true, 'status', existing.status);
end;
$$;
create or replace function private.revoke_refunded_stripe_entitlement(requested_payment_intent_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_user uuid;
  remaining_paid bigint;
begin
  if requested_payment_intent_id is null or requested_payment_intent_id = '' then
    raise exception 'Missing payment intent';
  end if;
  update public.stripe_payment_entitlements
    set status = 'refunded', updated_at = now()
    where payment_intent_id = requested_payment_intent_id
    returning user_id into affected_user;
  if affected_user is null then
    return jsonb_build_object('recorded', false, 'reason', 'payment_not_found');
  end if;
  select count(*) into remaining_paid from public.stripe_payment_entitlements
    where user_id = affected_user and status = 'paid';
  if remaining_paid = 0 then
    update public.profiles set role = 'user' where id = affected_user and role = 'vip';
  end if;
  return jsonb_build_object('recorded', true, 'remaining_paid', remaining_paid);
end;
$$;
revoke all on function private.record_stripe_payment_entitlement(text,text,text,uuid,text,bigint,text) from public, anon, authenticated;
revoke all on function private.revoke_refunded_stripe_entitlement(text) from public, anon, authenticated;
grant execute on function private.record_stripe_payment_entitlement(text,text,text,uuid,text,bigint,text) to service_role;
grant execute on function private.revoke_refunded_stripe_entitlement(text) to service_role;
