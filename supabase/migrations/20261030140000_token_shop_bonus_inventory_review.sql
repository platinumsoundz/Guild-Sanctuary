-- NOT APPLIED: token shop/economy completion proposal for isolated staging review.
-- Adds the approved beta catalogue, first-100 verified-account bonus, spending holds,
-- and cosmetic equipment slots. Checkout/redemption permissions remain closed.
begin;

-- Guests may browse only enabled catalogue entries. Signed-in members may
-- additionally read disabled catalogue rows only when they own that entitlement.
drop policy if exists "authenticated users read enabled token spend catalog" on public.token_spend_catalog;
create policy "authenticated users read enabled or owned token catalog"
  on public.token_spend_catalog for select to authenticated
  using (
    enabled or exists (
      select 1 from public.token_entitlements e
      where e.user_id=(select auth.uid()) and e.item_id=token_spend_catalog.item_id
    )
  );
drop policy if exists "anonymous users read enabled token spend catalog" on public.token_spend_catalog;
create policy "anonymous users read enabled token spend catalog"
  on public.token_spend_catalog for select to anon using (enabled);
grant select on public.token_spend_catalog to anon;

alter table public.token_spend_catalog
  drop constraint if exists token_spend_catalog_kind_check;
alter table public.token_spend_catalog
  add constraint token_spend_catalog_kind_check check (kind in (
    'profile_frame','profile_effect','profile_badge','profile_banner',
    'profile_border','profile_theme','colour_palette','accent_customization',
    'chat_item','gift','vip','promotion'
  ));

alter table public.profiles
  add column if not exists equipped_frame text,
  add column if not exists equipped_effect text,
  add column if not exists equipped_badge text,
  add column if not exists equipped_banner text,
  add column if not exists equipped_border text,
  add column if not exists equipped_profile_theme text,
  add column if not exists equipped_palette text,
  add column if not exists custom_accent_color text;

alter table public.profiles
  add constraint profiles_equipped_border_fkey foreign key (equipped_border) references public.token_spend_catalog(item_id) on delete set null,
  add constraint profiles_equipped_profile_theme_fkey foreign key (equipped_profile_theme) references public.token_spend_catalog(item_id) on delete set null,
  add constraint profiles_equipped_palette_fkey foreign key (equipped_palette) references public.token_spend_catalog(item_id) on delete set null;

insert into public.token_spend_catalog
  (item_id,name,description,price_tokens,kind,enabled,asset_text,effect_key,sort_order)
values
  ('frame_moonlit_halo','Moonlit Halo','A luminous moonlit ring for your profile avatar.',250,'profile_frame',true,'☾','moonlit-halo',200),
  ('frame_wildflower_wreath','Wildflower Wreath','A botanical wreath framing your profile avatar.',400,'profile_frame',true,'✿','wildflower-wreath',210),
  ('border_aurora_line','Aurora Line','A flowing aurora border for your profile card.',200,'profile_border',true,'✧','aurora-line',220),
  ('border_gilded_laurel','Gilded Laurel','A refined laurel border for your profile card.',350,'profile_border',true,'❧','gilded-laurel',230),
  ('theme_tidal_glass','Tidal Glass','A cool glass-inspired profile card theme.',400,'profile_theme',true,'◈','tidal-glass',240),
  ('theme_twilight_garden','Twilight Garden','A twilight botanical profile card theme.',600,'profile_theme',true,'✺','twilight-garden',250),
  ('palette_sanctuary_colour_pack','Sanctuary Colour Pack','A curated set of accessible profile accent colours.',150,'colour_palette',true,'◉','sanctuary-colour-pack',260),
  ('unlock_custom_accent_picker','Custom Accent Picker','Unlock custom profile accent colours with contrast validation.',500,'accent_customization',true,'◌','custom-accent-picker',270)
on conflict (item_id) do update set
  name=excluded.name, description=excluded.description, price_tokens=excluded.price_tokens,
  kind=excluded.kind, enabled=excluded.enabled, asset_text=excluded.asset_text,
  effect_key=excluded.effect_key, sort_order=excluded.sort_order;

-- Retire the legacy starter seed from sale while retaining old entitlements.
update public.token_spend_catalog set enabled=false
where item_id in (
  'profile_frame_sanctuary','profile_frame_aurora','profile_frame_ember',
  'profile_effect_sparkle','profile_effect_glow','profile_badge_sparkle',
  'profile_badge_moon','profile_badge_flame','profile_badge_leaf',
  'profile_banner_aurora','profile_banner_ember','profile_banner_tide'
);

-- Retire the legacy profile-created 100-token grant before adding the verified/capped program.
-- Existing historical signup_bonus rows and their balances are deliberately preserved.
drop trigger if exists profiles_grant_signup_token_bonus on public.profiles;
drop function if exists public.grant_signup_bonus_on_profile();
drop function if exists public.grant_signup_token_bonus(uuid);

-- Keep the established token_ledger as the single source of truth for wallet credits.
alter table public.token_ledger
  add column if not exists grant_position integer,
  add column if not exists verified_at timestamptz,
  add column if not exists stripe_payment_intent_id text;
alter table public.token_ledger drop constraint if exists token_ledger_bundle_id_check;
alter table public.token_ledger drop constraint if exists token_ledger_check;
alter table public.token_ledger drop constraint if exists token_ledger_entry_check;
alter table public.token_ledger drop constraint if exists token_ledger_tokens_delta_check;
alter table public.token_ledger
  add constraint token_ledger_bundle_id_check
  check (bundle_id in ('tokens_100','tokens_600','tokens_1200','signup_bonus'));
alter table public.token_ledger
  add constraint token_ledger_tokens_delta_check check (tokens_delta > 0);
alter table public.token_ledger
  add constraint token_ledger_economy_entry_check check (
    (bundle_id='tokens_100' and tokens_delta=100 and amount_total=100) or
    (bundle_id='tokens_600' and tokens_delta=600 and amount_total=500) or
    (bundle_id='tokens_1200' and tokens_delta=1200 and amount_total=1000) or
    (bundle_id='signup_bonus' and tokens_delta in (100,1000) and amount_total=0 and livemode=false)
  );
create unique index if not exists token_ledger_one_signup_bonus_per_user_idx
  on public.token_ledger(user_id) where bundle_id='signup_bonus';
create unique index if not exists token_ledger_signup_bonus_position_idx
  on public.token_ledger(grant_position) where bundle_id='signup_bonus' and grant_position is not null;
create unique index if not exists token_ledger_payment_intent_idx
  on public.token_ledger(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
alter table public.token_ledger drop constraint if exists token_ledger_signup_bonus_position_check;
alter table public.token_ledger add constraint token_ledger_signup_bonus_position_check
  check (grant_position is null or grant_position between 1 and 100);


-- Persist the Stripe PaymentIntent ID so dispute events can resolve the wallet
-- even if Stripe delivers a dispute webhook before checkout fulfillment.
drop function if exists public.record_token_bundle_purchase(text,text,text,uuid,text,integer,text,boolean);
create or replace function public.record_token_bundle_purchase(
  requested_event_id text,
  requested_event_type text,
  requested_session_id text,
  requested_user_id uuid,
  requested_bundle_id text,
  requested_amount_total integer,
  requested_currency text,
  requested_livemode boolean,
  requested_payment_intent_id text
)
returns bigint language plpgsql security definer set search_path=''
as $
declare
  expected_tokens bigint;
  expected_amount integer;
  wallet_balance bigint;
  existing_entry public.token_ledger%rowtype;
begin
  if requested_event_id is null or requested_event_id='' or
    requested_event_type is null or requested_event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded') or
    requested_session_id is null or requested_session_id='' or
    requested_user_id is null or requested_payment_intent_id is null or requested_payment_intent_id='' or
    requested_livemode is null or requested_currency is distinct from 'gbp' then
    raise exception 'Invalid token purchase event.' using errcode='22023';
  end if;
  case requested_bundle_id
    when 'tokens_100' then expected_tokens:=100; expected_amount:=100;
    when 'tokens_600' then expected_tokens:=600; expected_amount:=500;
    when 'tokens_1200' then expected_tokens:=1200; expected_amount:=1000;
    else raise exception 'Unsupported token bundle.' using errcode='22023';
  end case;
  if requested_amount_total is distinct from expected_amount then
    raise exception 'Paid amount does not match the token bundle.' using errcode='22023';
  end if;

  insert into public.token_wallets(user_id) values(requested_user_id) on conflict(user_id) do nothing;
  select balance_tokens into wallet_balance from public.token_wallets
  where user_id=requested_user_id for update;

  select * into existing_entry from public.token_ledger
  where stripe_event_id=requested_event_id for update;
  if found then
    if existing_entry.user_id<>requested_user_id or existing_entry.bundle_id<>requested_bundle_id or
      existing_entry.tokens_delta<>expected_tokens or existing_entry.amount_total<>expected_amount or
      existing_entry.currency<>requested_currency or existing_entry.checkout_session_id<>requested_session_id or
      existing_entry.livemode<>requested_livemode or
      existing_entry.stripe_payment_intent_id is distinct from requested_payment_intent_id then
      raise exception 'Stripe event replay does not match the original payment.' using errcode='22023';
    end if;
    return wallet_balance;
  end if;

  select * into existing_entry from public.token_ledger
  where checkout_session_id=requested_session_id or stripe_payment_intent_id=requested_payment_intent_id
  for update;
  if found then
    if existing_entry.user_id<>requested_user_id or existing_entry.bundle_id<>requested_bundle_id or
      existing_entry.tokens_delta<>expected_tokens or existing_entry.amount_total<>expected_amount or
      existing_entry.currency<>requested_currency or existing_entry.livemode<>requested_livemode or
      existing_entry.stripe_payment_intent_id is distinct from requested_payment_intent_id then
      raise exception 'Token purchase replay does not match the original payment.' using errcode='22023';
    end if;
    return wallet_balance;
  end if;

  insert into public.token_ledger(
    user_id,bundle_id,tokens_delta,amount_total,currency,stripe_event_id,
    checkout_session_id,livemode,stripe_payment_intent_id
  ) values (
    requested_user_id,requested_bundle_id,expected_tokens,expected_amount,requested_currency,
    requested_event_id,requested_session_id,requested_livemode,requested_payment_intent_id
  );
  update public.token_wallets set balance_tokens=balance_tokens+expected_tokens,updated_at=now()
  where user_id=requested_user_id returning balance_tokens into wallet_balance;
  return wallet_balance;
end;
$;
revoke all on function public.record_token_bundle_purchase(text,text,text,uuid,text,integer,text,boolean,text)
from public,anon,authenticated,service_role;
grant execute on function public.record_token_bundle_purchase(text,text,text,uuid,text,integer,text,boolean,text)
to service_role;

-- The beta switch is intentionally OFF. An owner must explicitly open it in staging.
create table if not exists public.token_bonus_program (
  singleton boolean primary key default true check (singleton),
  beta_open boolean not null default false,
  awarded_count integer not null default 0 check (awarded_count between 0 and 100),
  opened_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.token_bonus_program(singleton,beta_open,awarded_count)
values (true,false,0) on conflict (singleton) do nothing;

create table if not exists public.token_spending_holds (
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_reference text not null,
  reason_code text not null check (reason_code in ('payment_dispute','chargeback','fraud_review','manual_review')),
  placed_by text not null,
  created_at timestamptz not null default now(),
  primary key (user_id,case_reference)
);
create table if not exists public.token_spending_hold_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_reference text not null,
  action text not null check (action in ('hold_placed','hold_released')),
  reason_code text not null,
  actor text not null,
  created_at timestamptz not null default now()
);

alter table public.token_bonus_program enable row level security;
alter table public.token_spending_holds enable row level security;
alter table public.token_spending_hold_audit enable row level security;
revoke all on public.token_bonus_program, public.token_spending_holds, public.token_spending_hold_audit
from public, anon, authenticated;
grant select, insert, update, delete on public.token_bonus_program,
  public.token_spending_holds, public.token_spending_hold_audit to service_role;

create or replace function public.try_grant_verified_beta_tokens(requested_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  program_row public.token_bonus_program%rowtype;
  confirmed_at timestamptz;
  account_created_at timestamptz;
  next_position integer;
  wallet_balance bigint;
begin
  if requested_user_id is null then return; end if;
  select u.email_confirmed_at,u.created_at into confirmed_at,account_created_at
  from auth.users u where u.id = requested_user_id;
  if confirmed_at is null then return; end if;
  if not exists (select 1 from public.profiles p where p.id = requested_user_id) then return; end if;

  select * into program_row from public.token_bonus_program
  where singleton = true for update;
  if not found or not program_row.beta_open or program_row.opened_at is null
    or account_created_at < program_row.opened_at or program_row.awarded_count >= 100 then return; end if;
  if exists (select 1 from public.token_ledger b where b.user_id=requested_user_id and b.bundle_id='signup_bonus') then return; end if;

  next_position := program_row.awarded_count + 1;
  insert into public.token_wallets(user_id) values (requested_user_id)
  on conflict (user_id) do nothing;
  select balance_tokens into wallet_balance from public.token_wallets where user_id=requested_user_id for update;
  insert into public.token_ledger(
    user_id,bundle_id,tokens_delta,amount_total,currency,stripe_event_id,
    checkout_session_id,livemode,grant_position,verified_at
  ) values (
    requested_user_id,'signup_bonus',1000,0,'gbp',
    'beta_signup_bonus:' || requested_user_id::text,
    'beta_signup_bonus:' || requested_user_id::text,false,next_position,confirmed_at
  ) on conflict do nothing;
  if not found then return; end if;

  update public.token_wallets
  set balance_tokens = balance_tokens + 1000, updated_at = now()
  where user_id = requested_user_id;
  update public.token_bonus_program
  set awarded_count = next_position, updated_at = now()
  where singleton = true;
end;
$$;

create or replace function public.on_auth_user_verified_token_bonus()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.try_grant_verified_beta_tokens(new.id);
  return new;
end;
$$;

create or replace function public.on_profile_created_token_bonus()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.try_grant_verified_beta_tokens(new.id);
  return new;
end;
$$;

drop trigger if exists token_bonus_on_auth_verified on auth.users;
create trigger token_bonus_on_auth_verified
after insert or update of email_confirmed_at on auth.users
for each row when (new.email_confirmed_at is not null)
execute function public.on_auth_user_verified_token_bonus();

drop trigger if exists token_bonus_on_profile_created on public.profiles;
create trigger token_bonus_on_profile_created
after insert on public.profiles
for each row execute function public.on_profile_created_token_bonus();

revoke all on function public.try_grant_verified_beta_tokens(uuid) from public, anon, authenticated;
revoke all on function public.on_auth_user_verified_token_bonus() from public, anon, authenticated;
revoke all on function public.on_profile_created_token_bonus() from public, anon, authenticated;

-- Preserve existing spend logic but reject spending while an account is under review.
create or replace function public.spend_tokens(requested_item_id text, requested_idempotency_key uuid)
returns table(balance_tokens bigint, item_id text, already_applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  selected_item public.token_spend_catalog%rowtype;
  wallet_balance bigint;
  existing_entry public.token_spend_ledger%rowtype;
begin
  if caller_id is null then raise exception 'Sign in before spending tokens.' using errcode='42501'; end if;
  if not public.is_active_user() then raise exception 'This account is not active.' using errcode='42501'; end if;
  if exists (select 1 from public.token_spending_holds h where h.user_id=caller_id) then
    raise exception 'Token spending is paused while your account is under review. Contact support.' using errcode='42501';
  end if;
  if requested_item_id is null or requested_item_id='' or requested_idempotency_key is null then
    raise exception 'Choose a valid item and request key.' using errcode='22023';
  end if;
  select * into selected_item from public.token_spend_catalog
  where item_id=requested_item_id and enabled for share;
  if not found then raise exception 'That token item is not available.' using errcode='22023'; end if;

  insert into public.token_wallets(user_id) values(caller_id) on conflict(user_id) do nothing;
  select w.balance_tokens into wallet_balance from public.token_wallets w
  where w.user_id=caller_id for update;

  select l.* into existing_entry from public.token_spend_ledger l
  where l.user_id=caller_id and l.idempotency_key=requested_idempotency_key for update;
  if found then
    if existing_entry.item_id<>requested_item_id then raise exception 'Request key reused for another item.' using errcode='22023'; end if;
    return query select wallet_balance,existing_entry.item_id,true; return;
  end if;

  if exists(select 1 from public.token_entitlements e where e.user_id=caller_id and e.item_id=selected_item.item_id) then
    return query select wallet_balance,selected_item.item_id,true; return;
  end if;
  if wallet_balance<selected_item.price_tokens then raise exception 'Not enough tokens for this item.' using errcode='22003'; end if;

  insert into public.token_spend_ledger(user_id,item_id,item_name,tokens_delta,idempotency_key)
  values(caller_id,selected_item.item_id,selected_item.name,-selected_item.price_tokens,requested_idempotency_key);
  update public.token_wallets set balance_tokens=balance_tokens-selected_item.price_tokens,updated_at=now()
  where user_id=caller_id returning balance_tokens into wallet_balance;
  insert into public.token_entitlements(user_id,item_id) values(caller_id,selected_item.item_id);

  perform pg_catalog.set_config('app.cosmetic_write_authorized','true',true);
  if selected_item.kind='profile_frame' then update public.profiles set equipped_frame=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_effect' then update public.profiles set equipped_effect=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_badge' then update public.profiles set equipped_badge=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_banner' then update public.profiles set equipped_banner=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_border' then update public.profiles set equipped_border=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_theme' then update public.profiles set equipped_profile_theme=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='colour_palette' then update public.profiles set equipped_palette=selected_item.item_id,updated_at=now() where id=caller_id;
  end if;
  return query select wallet_balance,selected_item.item_id,false;
end;
$$;

create or replace function public.equip_profile_cosmetic(requested_item_id text)
returns table(item_id text,kind text)
language plpgsql
security definer
set search_path = ''
as $$
declare caller_id uuid := (select auth.uid()); selected_item public.token_spend_catalog%rowtype;
begin
  if caller_id is null or not public.is_active_user() then raise exception 'An active signed-in account is required.' using errcode='42501'; end if;
  if exists(select 1 from public.token_spending_holds h where h.user_id=caller_id) then raise exception 'Cosmetic changes are paused during account review.' using errcode='42501'; end if;
  select * into selected_item from public.token_spend_catalog
  where item_id=requested_item_id
    and kind in ('profile_frame','profile_effect','profile_badge','profile_banner','profile_border','profile_theme','colour_palette')
  for share;
  if not found then raise exception 'That cosmetic is not available.' using errcode='22023'; end if;
  if not exists(select 1 from public.token_entitlements e where e.user_id=caller_id and e.item_id=selected_item.item_id) then
    raise exception 'Unlock this cosmetic before equipping it.' using errcode='42501';
  end if;
  perform pg_catalog.set_config('app.cosmetic_write_authorized','true',true);
  if selected_item.kind='profile_frame' then update public.profiles set equipped_frame=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_effect' then update public.profiles set equipped_effect=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_badge' then update public.profiles set equipped_badge=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_banner' then update public.profiles set equipped_banner=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_border' then update public.profiles set equipped_border=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_theme' then update public.profiles set equipped_profile_theme=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='colour_palette' then update public.profiles set equipped_palette=selected_item.item_id,updated_at=now() where id=caller_id;
  end if;
  return query select selected_item.item_id,selected_item.kind;
end;
$$;

create or replace function public.clear_profile_cosmetic(requested_slot text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not public.is_active_user() then raise exception 'An active signed-in account is required.' using errcode='42501'; end if;
  if exists(select 1 from public.token_spending_holds h where h.user_id=caller_id) then raise exception 'Cosmetic changes are paused during account review.' using errcode='42501'; end if;
  perform pg_catalog.set_config('app.cosmetic_write_authorized','true',true);
  if requested_slot='frame' then update public.profiles set equipped_frame=null,updated_at=now() where id=caller_id;
  elsif requested_slot='effect' then update public.profiles set equipped_effect=null,updated_at=now() where id=caller_id;
  elsif requested_slot='badge' then update public.profiles set equipped_badge=null,updated_at=now() where id=caller_id;
  elsif requested_slot='banner' then update public.profiles set equipped_banner=null,updated_at=now() where id=caller_id;
  elsif requested_slot='border' then update public.profiles set equipped_border=null,updated_at=now() where id=caller_id;
  elsif requested_slot='profile_theme' then update public.profiles set equipped_profile_theme=null,updated_at=now() where id=caller_id;
  elsif requested_slot='palette' then update public.profiles set equipped_palette=null,updated_at=now() where id=caller_id;
  else raise exception 'Choose a valid cosmetic slot.' using errcode='22023';
  end if;
end;
$$;

revoke all on function public.spend_tokens(text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.equip_profile_cosmetic(text) from public,anon,authenticated,service_role;
revoke all on function public.clear_profile_cosmetic(text) from public,anon,authenticated,service_role;
grant execute on function public.equip_profile_cosmetic(text) to authenticated;
grant execute on function public.clear_profile_cosmetic(text) to authenticated;

-- Public cosmetic projection is separate from the private profile row. It exposes
-- only already-public profiles and cosmetic identifiers, never wallet or ledger data.
create table if not exists private.public_profile_cosmetic_projection (
  id uuid primary key,
  equipped_frame text,
  equipped_effect text,
  equipped_badge text,
  equipped_banner text,
  equipped_border text,
  equipped_profile_theme text,
  equipped_palette text,
  custom_accent_color text
);
alter table private.public_profile_cosmetic_projection enable row level security;
revoke all on private.public_profile_cosmetic_projection from public,anon,authenticated;
grant select on private.public_profile_cosmetic_projection to anon,authenticated;
drop policy if exists "public cosmetic projection readable" on private.public_profile_cosmetic_projection;
create policy "public cosmetic projection readable" on private.public_profile_cosmetic_projection
for select to anon,authenticated using (true);

create or replace function private.sync_public_profile_cosmetic_projection()
returns trigger language plpgsql security definer set search_path=''
as $
begin
  if tg_op='DELETE' then
    delete from private.public_profile_cosmetic_projection where id=old.id;
    return old;
  end if;
  if new.visibility='public' and new.allow_profile_discovery and
    (new.status='active' or (new.status='suspended' and new.suspended_until is not null and new.suspended_until<=pg_catalog.now())) then
    insert into private.public_profile_cosmetic_projection(
      id,equipped_frame,equipped_effect,equipped_badge,equipped_banner,
      equipped_border,equipped_profile_theme,equipped_palette,custom_accent_color
    ) values (
      new.id,new.equipped_frame,new.equipped_effect,new.equipped_badge,new.equipped_banner,
      new.equipped_border,new.equipped_profile_theme,new.equipped_palette,new.custom_accent_color
    ) on conflict(id) do update set
      equipped_frame=excluded.equipped_frame,equipped_effect=excluded.equipped_effect,
      equipped_badge=excluded.equipped_badge,equipped_banner=excluded.equipped_banner,
      equipped_border=excluded.equipped_border,equipped_profile_theme=excluded.equipped_profile_theme,
      equipped_palette=excluded.equipped_palette,custom_accent_color=excluded.custom_accent_color;
  else
    delete from private.public_profile_cosmetic_projection where id=new.id;
  end if;
  return new;
end;
$;
drop trigger if exists sync_public_profile_cosmetic_projection on public.profiles;
create trigger sync_public_profile_cosmetic_projection after insert or update or delete on public.profiles
for each row execute function private.sync_public_profile_cosmetic_projection();
insert into private.public_profile_cosmetic_projection(
  id,equipped_frame,equipped_effect,equipped_badge,equipped_banner,
  equipped_border,equipped_profile_theme,equipped_palette,custom_accent_color
)
select p.id,p.equipped_frame,p.equipped_effect,p.equipped_badge,p.equipped_banner,
  p.equipped_border,p.equipped_profile_theme,p.equipped_palette,p.custom_accent_color
from public.profiles p
where p.visibility='public' and p.allow_profile_discovery
  and (p.status='active' or (p.status='suspended' and p.suspended_until is not null and p.suspended_until<=pg_catalog.now()))
on conflict(id) do update set
  equipped_frame=excluded.equipped_frame,equipped_effect=excluded.equipped_effect,
  equipped_badge=excluded.equipped_badge,equipped_banner=excluded.equipped_banner,
  equipped_border=excluded.equipped_border,equipped_profile_theme=excluded.equipped_profile_theme,
  equipped_palette=excluded.equipped_palette,custom_accent_color=excluded.custom_accent_color;

create or replace view public.public_profile_cosmetics
with (security_barrier=true,security_invoker=true) as
select id,equipped_frame,equipped_effect,equipped_badge,equipped_banner,
  equipped_border,equipped_profile_theme,equipped_palette,custom_accent_color
from private.public_profile_cosmetic_projection;
grant select on public.public_profile_cosmetics to anon,authenticated;


-- Support-only case controls. The service role can place/release holds while
-- the public client cannot read or mutate these records.
create or replace function public.place_token_spending_hold(
  requested_user_id uuid, requested_case_reference text, requested_reason_code text, requested_actor text
)
returns void language plpgsql security definer set search_path=''
as $
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if requested_user_id is null or coalesce(trim(requested_case_reference),'')='' or
    requested_reason_code not in ('payment_dispute','chargeback','fraud_review','manual_review') or
    coalesce(trim(requested_actor),'')='' then
    raise exception 'A valid user, case reference, reason and actor are required.' using errcode='22023';
  end if;
  insert into public.token_spending_holds(user_id,case_reference,reason_code,placed_by)
  values(requested_user_id,requested_case_reference,requested_reason_code,requested_actor)
  on conflict(user_id,case_reference) do update set
    reason_code=excluded.reason_code,placed_by=excluded.placed_by,created_at=now();
  insert into public.token_spending_hold_audit(user_id,case_reference,action,reason_code,actor)
  values(requested_user_id,requested_case_reference,'hold_placed',requested_reason_code,requested_actor);
end;
$;

create or replace function public.release_token_spending_hold(
  requested_user_id uuid, requested_case_reference text, requested_actor text
)
returns void language plpgsql security definer set search_path=''
as $
declare existing_hold public.token_spending_holds%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if coalesce(trim(requested_actor),'')='' then raise exception 'An actor is required.' using errcode='22023'; end if;
  select * into existing_hold from public.token_spending_holds
  where user_id=requested_user_id and case_reference=requested_case_reference for update;
  if not found then return; end if;
  delete from public.token_spending_holds where user_id=requested_user_id and case_reference=requested_case_reference;
  insert into public.token_spending_hold_audit(user_id,case_reference,action,reason_code,actor)
  values(requested_user_id,existing_hold.case_reference,'hold_released',existing_hold.reason_code,requested_actor);
end;
$;

revoke all on function public.place_token_spending_hold(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.release_token_spending_hold(uuid,text,text) from public,anon,authenticated;
grant execute on function public.place_token_spending_hold(uuid,text,text,text) to service_role;
grant execute on function public.release_token_spending_hold(uuid,text,text) to service_role;


-- Prevent profile-edit APIs from forging cosmetic ownership/equipment fields.
create or replace function private.guard_profile_cosmetic_writes()
returns trigger language plpgsql security definer set search_path=''
as $
begin
  if auth.role() in ('authenticated','anon')
    and pg_catalog.current_setting('app.cosmetic_write_authorized',true) is distinct from 'true'
    and (
    new.equipped_frame is distinct from old.equipped_frame or
    new.equipped_effect is distinct from old.equipped_effect or
    new.equipped_badge is distinct from old.equipped_badge or
    new.equipped_banner is distinct from old.equipped_banner or
    new.equipped_border is distinct from old.equipped_border or
    new.equipped_profile_theme is distinct from old.equipped_profile_theme or
    new.equipped_palette is distinct from old.equipped_palette or
    new.custom_accent_color is distinct from old.custom_accent_color
  ) then
    raise exception 'Profile cosmetics can only be changed through the verified cosmetic service.' using errcode='42501';
  end if;
  return new;
end;
$;
drop trigger if exists guard_profile_cosmetic_writes on public.profiles;
create trigger guard_profile_cosmetic_writes before update on public.profiles
for each row execute function private.guard_profile_cosmetic_writes();

alter table public.profiles
  drop constraint if exists profiles_custom_accent_color_check;
alter table public.profiles
  add constraint profiles_custom_accent_color_check check (
    custom_accent_color is null or custom_accent_color in
    ('#8b5cf6','#ec4899','#3b82f6','#a855f7','#db2777','#0d9488','#7c3aed','#2563eb')
  );

create or replace function public.set_profile_custom_accent(requested_color text)
returns text language plpgsql security definer set search_path=''
as $
declare caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not public.is_active_user() then raise exception 'An active signed-in account is required.' using errcode='42501'; end if;
  if exists(select 1 from public.token_spending_holds h where h.user_id=caller_id) then raise exception 'Profile cosmetic changes are paused during account review.' using errcode='42501'; end if;
  if requested_color is not null and requested_color not in
    ('#8b5cf6','#ec4899','#3b82f6','#a855f7','#db2777','#0d9488','#7c3aed','#2563eb') then
    raise exception 'Choose an accessible colour from the approved palette.' using errcode='22023';
  end if;
  if not exists(select 1 from public.token_entitlements e where e.user_id=caller_id and e.item_id='unlock_custom_accent_picker') then
    raise exception 'Unlock the Custom Accent Picker before changing this colour.' using errcode='42501';
  end if;
  perform pg_catalog.set_config('app.cosmetic_write_authorized','true',true);
  update public.profiles set custom_accent_color=requested_color,updated_at=now() where id=caller_id;
  return requested_color;
end;
$;
revoke all on function public.set_profile_custom_accent(text) from public,anon,authenticated,service_role;
grant execute on function public.set_profile_custom_accent(text) to authenticated;


-- Audited, manual-only token adjustments for reviewed refunds/reversals.
-- No Stripe refund is initiated here and no adjustment may create a negative balance.
create table if not exists public.token_adjustment_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.token_wallets(user_id) on delete cascade,
  tokens_delta bigint not null check (tokens_delta <> 0),
  reason_code text not null check (reason_code in ('purchase_refund','chargeback_reversal','manual_correction','bonus_correction')),
  case_reference text not null,
  source_key text not null unique,
  actor text not null,
  item_id text references public.token_spend_catalog(item_id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.token_adjustment_ledger enable row level security;
revoke all on public.token_adjustment_ledger from public,anon,authenticated;
grant select,insert,update,delete on public.token_adjustment_ledger to service_role;
drop policy if exists "users read own token adjustments" on public.token_adjustment_ledger;
create policy "users read own token adjustments" on public.token_adjustment_ledger
for select to authenticated using (user_id=(select auth.uid()));
grant select on public.token_adjustment_ledger to authenticated;

create or replace function public.apply_token_adjustment(
  requested_user_id uuid,
  requested_tokens_delta bigint,
  requested_reason_code text,
  requested_case_reference text,
  requested_source_key text,
  requested_actor text,
  requested_item_id text default null
)
returns bigint language plpgsql security definer set search_path=''
as $
declare
  wallet_balance bigint;
  existing_entry public.token_adjustment_ledger%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required.' using errcode='42501'; end if;
  if requested_user_id is null or requested_tokens_delta is null or requested_tokens_delta=0 or
    requested_reason_code not in ('purchase_refund','chargeback_reversal','manual_correction','bonus_correction') or
    coalesce(trim(requested_case_reference),'')='' or coalesce(trim(requested_source_key),'')='' or
    coalesce(trim(requested_actor),'')='' then
    raise exception 'A valid user, non-zero adjustment, reason, case, source key and actor are required.' using errcode='22023';
  end if;

  insert into public.token_wallets(user_id) values(requested_user_id) on conflict(user_id) do nothing;
  select w.balance_tokens into wallet_balance from public.token_wallets w
  where w.user_id=requested_user_id for update;

  select * into existing_entry from public.token_adjustment_ledger
  where source_key=requested_source_key for update;
  if found then
    if existing_entry.user_id<>requested_user_id or existing_entry.tokens_delta<>requested_tokens_delta or
      existing_entry.reason_code<>requested_reason_code or existing_entry.case_reference<>requested_case_reference or
      existing_entry.actor<>requested_actor or existing_entry.item_id is distinct from requested_item_id then
      raise exception 'Adjustment source key conflicts with an existing ledger entry.' using errcode='22023';
    end if;
    return wallet_balance;
  end if;

  if wallet_balance + requested_tokens_delta < 0 then
    raise exception 'Adjustment would create a negative token balance; manual item review is required.' using errcode='22003';
  end if;

  insert into public.token_adjustment_ledger(
    user_id,tokens_delta,reason_code,case_reference,source_key,actor,item_id
  ) values (
    requested_user_id,requested_tokens_delta,requested_reason_code,
    requested_case_reference,requested_source_key,requested_actor,requested_item_id
  );
  update public.token_wallets set balance_tokens=balance_tokens+requested_tokens_delta,updated_at=now()
  where user_id=requested_user_id returning balance_tokens into wallet_balance;
  return wallet_balance;
end;
$;
revoke all on function public.apply_token_adjustment(uuid,bigint,text,text,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.apply_token_adjustment(uuid,bigint,text,text,text,text,text) to service_role;

commit;
