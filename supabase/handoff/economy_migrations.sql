begin;
-- Persistent, non-cashout token balances. Only a verified Stripe webhook can grant tokens.
-- Transfers, spending, marketplace listings, and withdrawals are intentionally absent.

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

-- First token sink: a permanent profile frame. Prices and availability are
-- server-owned; the client sends only a catalog item ID. Spending is atomic,
-- idempotent, and cannot make a balance negative.

create table public.token_spend_catalog (
  item_id text primary key,
  name text not null,
  description text not null,
  price_tokens bigint not null check (price_tokens > 0),
  kind text not null check (kind in ('profile_frame', 'chat_item', 'gift', 'vip', 'promotion')),
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.token_spend_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.token_wallets(user_id) on delete cascade,
  item_id text not null references public.token_spend_catalog(item_id) on delete restrict,
  item_name text not null,
  tokens_delta bigint not null check (tokens_delta < 0),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index token_spend_ledger_user_created_idx
  on public.token_spend_ledger (user_id, created_at desc);

create table public.token_entitlements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.token_spend_catalog(item_id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.profiles
  add column if not exists equipped_frame text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_equipped_frame_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_equipped_frame_fkey
      foreign key (equipped_frame)
      references public.token_spend_catalog(item_id)
      on delete set null;
  end if;
end
$$;

alter table public.token_spend_catalog enable row level security;
alter table public.token_spend_ledger enable row level security;
alter table public.token_entitlements enable row level security;

create policy "authenticated users read enabled token spend catalog"
  on public.token_spend_catalog for select to authenticated
  using (enabled);
create policy "users read own token spend ledger"
  on public.token_spend_ledger for select to authenticated
  using (user_id = (select auth.uid()));
create policy "users read own token entitlements"
  on public.token_entitlements for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.token_spend_catalog, public.token_spend_ledger, public.token_entitlements
  to authenticated;
grant select on public.token_spend_catalog, public.token_spend_ledger, public.token_entitlements
  to service_role;
revoke insert, update, delete, truncate
  on public.token_spend_catalog, public.token_spend_ledger, public.token_entitlements
  from public, anon, authenticated;

insert into public.token_spend_catalog (
  item_id, name, description, price_tokens, kind, enabled
) values (
  'profile_frame_sanctuary',
  'Sanctuary supporter frame',
  'A permanent warm-gold frame around your profile picture.',
  300,
  'profile_frame',
  true
)
on conflict (item_id) do nothing;

create or replace view public.public_profiles
with (security_barrier = true) as
select
  id,
  username,
  display_name,
  case when privacy ->> 'bio' = 'true' then bio end as bio,
  status_message,
  avatar_url,
  banner_url,
  theme_color,
  case when privacy ->> 'location' = 'true' then location end as location,
  case when privacy ->> 'age' = 'true' then age end as age,
  case when privacy ->> 'starSign' = 'true' then star_sign end as star_sign,
  case when privacy ->> 'belief' = 'true' then belief end as belief,
  case when privacy ->> 'socialLinks' = 'true' then social_links end as social_links,
  allow_direct_messages,
  equipped_frame
from public.profiles
where visibility = 'public'
  and allow_profile_discovery
  and (status = 'active' or (status = 'suspended' and suspended_until <= now()));

grant select on public.public_profiles to authenticated;

create or replace function public.spend_tokens(
  requested_item_id text,
  requested_idempotency_key uuid
)
returns table (
  balance_tokens bigint,
  item_id text,
  already_applied boolean
)
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
  if caller_id is null then
    raise exception 'Sign in before spending tokens.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if requested_item_id is null or requested_item_id = '' then
    raise exception 'Choose a token item.' using errcode = '22023';
  end if;

  if requested_idempotency_key is null then
    raise exception 'A spend request key is required.' using errcode = '22023';
  end if;

  select *
  into selected_item
  from public.token_spend_catalog
  where item_id = requested_item_id
    and enabled
  for share;

  if not found then
    raise exception 'That token item is not available.' using errcode = '22023';
  end if;

  insert into public.token_wallets (user_id)
  values (caller_id)
  on conflict (user_id) do nothing;

  select w.balance_tokens
  into wallet_balance
  from public.token_wallets as w
  where w.user_id = caller_id
  for update;

  select l.*
  into existing_entry
  from public.token_spend_ledger as l
  where l.user_id = caller_id
    and l.idempotency_key = requested_idempotency_key
  for update;

  if found then
    if existing_entry.item_id <> requested_item_id then
      raise exception 'This spend request key was already used for another item.' using errcode = '22023';
    end if;
    return query select wallet_balance, existing_entry.item_id, true;
    return;
  end if;

  -- Permanent unlocks are charged once. A new idempotency key must not buy the
  -- same frame again.
  if selected_item.kind = 'profile_frame' and exists (
    select 1
    from public.token_entitlements
    where user_id = caller_id
      and item_id = selected_item.item_id
  ) then
    return query select wallet_balance, selected_item.item_id, true;
    return;
  end if;

  if wallet_balance < selected_item.price_tokens then
    raise exception 'Not enough tokens for this item.' using errcode = '22003';
  end if;

  insert into public.token_spend_ledger (
    user_id, item_id, item_name, tokens_delta, idempotency_key
  ) values (
    caller_id, selected_item.item_id, selected_item.name,
    -selected_item.price_tokens, requested_idempotency_key
  );

  update public.token_wallets
  set balance_tokens = balance_tokens - selected_item.price_tokens,
      updated_at = now()
  where user_id = caller_id
  returning balance_tokens into wallet_balance;

  insert into public.token_entitlements (user_id, item_id)
  values (caller_id, selected_item.item_id)
  on conflict (user_id, item_id) do nothing;

  if selected_item.kind = 'profile_frame' then
    update public.profiles
    set equipped_frame = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  end if;

  return query select wallet_balance, selected_item.item_id, false;
end;
$$;

revoke all on function public.spend_tokens(text, uuid) from public, anon, authenticated;
grant execute on function public.spend_tokens(text, uuid) to authenticated;

-- Welcome grant: every new profile starts with 100 tokens. The grant is
-- recorded in the immutable purchase ledger so the wallet history explains the
-- starting balance. Existing pre-live profiles without a wallet are backfilled
-- once; profiles that already have a wallet are not changed.

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

-- Profile cosmetics: animated frames, animated effects, emoji badges, and
-- curated GIF banners. Prices and availability are server-owned; every item is
-- a permanent unlock recorded in token_entitlements. The client sends only a
-- catalog item ID.

alter table public.token_spend_catalog
  add column if not exists asset_url text,
  add column if not exists asset_text text,
  add column if not exists effect_key text,
  add column if not exists sort_order integer not null default 0;

alter table public.token_spend_catalog
  drop constraint if exists token_spend_catalog_kind_check;
alter table public.token_spend_catalog
  add constraint token_spend_catalog_kind_check
  check (kind in (
    'profile_frame',
    'profile_effect',
    'profile_badge',
    'profile_banner',
    'chat_item',
    'gift',
    'vip',
    'promotion'
  ));

alter table public.profiles
  add column if not exists equipped_effect text,
  add column if not exists equipped_badge text,
  add column if not exists equipped_banner text;

alter table public.profiles
  drop constraint if exists profiles_equipped_effect_fkey;
alter table public.profiles
  add constraint profiles_equipped_effect_fkey
  foreign key (equipped_effect)
  references public.token_spend_catalog(item_id)
  on delete set null;

alter table public.profiles
  drop constraint if exists profiles_equipped_badge_fkey;
alter table public.profiles
  add constraint profiles_equipped_badge_fkey
  foreign key (equipped_badge)
  references public.token_spend_catalog(item_id)
  on delete set null;

alter table public.profiles
  drop constraint if exists profiles_equipped_banner_fkey;
alter table public.profiles
  add constraint profiles_equipped_banner_fkey
  foreign key (equipped_banner)
  references public.token_spend_catalog(item_id)
  on delete set null;

insert into public.token_spend_catalog (
  item_id,
  name,
  description,
  price_tokens,
  kind,
  enabled,
  asset_url,
  asset_text,
  effect_key,
  sort_order
) values
  (
    'profile_frame_sanctuary',
    'Sanctuary supporter frame',
    'A permanent warm-gold frame around your profile picture.',
    300,
    'profile_frame',
    true,
    null,
    null,
    'sanctuary',
    10
  ),
  (
    'profile_frame_aurora',
    'Aurora frame',
    'An animated aurora ring that slowly shifts color around your profile picture.',
    300,
    'profile_frame',
    true,
    null,
    null,
    'aurora',
    20
  ),
  (
    'profile_frame_ember',
    'Ember frame',
    'A permanent ember-glow frame with a slow animated shimmer.',
    300,
    'profile_frame',
    true,
    null,
    null,
    'ember',
    30
  ),
  (
    'profile_effect_sparkle',
    'Sparkle effect',
    'Animated sparkles that drift around your profile picture.',
    250,
    'profile_effect',
    true,
    null,
    null,
    'sparkle',
    40
  ),
  (
    'profile_effect_glow',
    'Soft glow',
    'A gentle pulsing glow around your profile picture.',
    200,
    'profile_effect',
    true,
    null,
    null,
    'glow',
    50
  ),
  (
    'profile_badge_sparkle',
    'Sparkle badge',
    'A permanent sparkle badge beside your display name.',
    150,
    'profile_badge',
    true,
    null,
    '✨',
    null,
    60
  ),
  (
    'profile_badge_moon',
    'Moon badge',
    'A permanent moon badge beside your display name.',
    150,
    'profile_badge',
    true,
    null,
    '🌙',
    null,
    70
  ),
  (
    'profile_badge_flame',
    'Flame badge',
    'A permanent flame badge beside your display name.',
    150,
    'profile_badge',
    true,
    null,
    '🔥',
    null,
    80
  ),
  (
    'profile_badge_leaf',
    'Leaf badge',
    'A permanent leaf badge beside your display name.',
    150,
    'profile_badge',
    true,
    null,
    '🌿',
    null,
    90
  ),
  (
    'profile_banner_aurora',
    'Aurora banner',
    'A curated animated aurora banner for your profile.',
    300,
    'profile_banner',
    true,
    '/cosmetics/banner-aurora.gif',
    null,
    null,
    100
  ),
  (
    'profile_banner_ember',
    'Ember banner',
    'A curated animated ember banner for your profile.',
    300,
    'profile_banner',
    true,
    '/cosmetics/banner-ember.gif',
    null,
    null,
    110
  ),
  (
    'profile_banner_tide',
    'Tide banner',
    'A curated animated tide banner for your profile.',
    300,
    'profile_banner',
    true,
    '/cosmetics/banner-tide.gif',
    null,
    null,
    120
  )
on conflict (item_id) do update
set asset_url = excluded.asset_url,
    asset_text = excluded.asset_text,
    effect_key = excluded.effect_key,
    sort_order = excluded.sort_order;

create or replace view public.public_profiles
with (security_barrier = true) as
select
  id,
  username,
  display_name,
  case when privacy ->> 'bio' = 'true' then bio end as bio,
  status_message,
  avatar_url,
  banner_url,
  theme_color,
  case when privacy ->> 'location' = 'true' then location end as location,
  case when privacy ->> 'age' = 'true' then age end as age,
  case when privacy ->> 'starSign' = 'true' then star_sign end as star_sign,
  case when privacy ->> 'belief' = 'true' then belief end as belief,
  case when privacy ->> 'socialLinks' = 'true' then social_links end as social_links,
  allow_direct_messages,
  equipped_frame,
  equipped_effect,
  equipped_badge,
  equipped_banner
from public.profiles
where visibility = 'public'
  and allow_profile_discovery
  and (status = 'active' or (status = 'suspended' and suspended_until <= now()));

grant select on public.public_profiles to authenticated;

create or replace function public.spend_tokens(
  requested_item_id text,
  requested_idempotency_key uuid
)
returns table (
  balance_tokens bigint,
  item_id text,
  already_applied boolean
)
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
  if caller_id is null then
    raise exception 'Sign in before spending tokens.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if requested_item_id is null or requested_item_id = '' then
    raise exception 'Choose a token item.' using errcode = '22023';
  end if;

  if requested_idempotency_key is null then
    raise exception 'A spend request key is required.' using errcode = '22023';
  end if;

  select *
  into selected_item
  from public.token_spend_catalog
  where item_id = requested_item_id
    and enabled
  for share;

  if not found then
    raise exception 'That token item is not available.' using errcode = '22023';
  end if;

  insert into public.token_wallets (user_id)
  values (caller_id)
  on conflict (user_id) do nothing;

  select w.balance_tokens
  into wallet_balance
  from public.token_wallets as w
  where w.user_id = caller_id
  for update;

  select l.*
  into existing_entry
  from public.token_spend_ledger as l
  where l.user_id = caller_id
    and l.idempotency_key = requested_idempotency_key
  for update;

  if found then
    if existing_entry.item_id <> requested_item_id then
      raise exception 'This spend request key was already used for another item.' using errcode = '22023';
    end if;
    return query select wallet_balance, existing_entry.item_id, true;
    return;
  end if;

  -- Profile cosmetics are permanent unlocks. A new idempotency key must not
  -- charge the same account twice for the same cosmetic.
  if selected_item.kind in ('profile_frame', 'profile_effect', 'profile_badge', 'profile_banner')
    and exists (
      select 1
      from public.token_entitlements
      where user_id = caller_id
        and item_id = selected_item.item_id
    ) then
    return query select wallet_balance, selected_item.item_id, true;
    return;
  end if;

  if wallet_balance < selected_item.price_tokens then
    raise exception 'Not enough tokens for this item.' using errcode = '22003';
  end if;

  insert into public.token_spend_ledger (
    user_id, item_id, item_name, tokens_delta, idempotency_key
  ) values (
    caller_id, selected_item.item_id, selected_item.name,
    -selected_item.price_tokens, requested_idempotency_key
  );

  update public.token_wallets
  set balance_tokens = balance_tokens - selected_item.price_tokens,
      updated_at = now()
  where user_id = caller_id
  returning balance_tokens into wallet_balance;

  insert into public.token_entitlements (user_id, item_id)
  values (caller_id, selected_item.item_id)
  on conflict (user_id, item_id) do nothing;

  if selected_item.kind = 'profile_frame' then
    update public.profiles
    set equipped_frame = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_effect' then
    update public.profiles
    set equipped_effect = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_badge' then
    update public.profiles
    set equipped_badge = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_banner' then
    update public.profiles
    set equipped_banner = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  end if;

  return query select wallet_balance, selected_item.item_id, false;
end;
$$;

revoke all on function public.spend_tokens(text, uuid) from public, anon, authenticated;
grant execute on function public.spend_tokens(text, uuid) to authenticated;

create or replace function public.equip_profile_cosmetic(
  requested_item_id text
)
returns table (
  item_id text,
  kind text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  selected_item public.token_spend_catalog%rowtype;
begin
  if caller_id is null then
    raise exception 'Sign in before equipping a cosmetic.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if requested_item_id is null or requested_item_id = '' then
    raise exception 'Choose a cosmetic.' using errcode = '22023';
  end if;

  select *
  into selected_item
  from public.token_spend_catalog
  where item_id = requested_item_id
    and enabled
    and kind in ('profile_frame', 'profile_effect', 'profile_badge', 'profile_banner')
  for share;

  if not found then
    raise exception 'That cosmetic is not available.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.token_entitlements
    where user_id = caller_id
      and item_id = selected_item.item_id
  ) then
    raise exception 'Unlock this cosmetic before equipping it.' using errcode = '42501';
  end if;

  if selected_item.kind = 'profile_frame' then
    update public.profiles
    set equipped_frame = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_effect' then
    update public.profiles
    set equipped_effect = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_badge' then
    update public.profiles
    set equipped_badge = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  elsif selected_item.kind = 'profile_banner' then
    update public.profiles
    set equipped_banner = selected_item.item_id,
        updated_at = now()
    where id = caller_id;
  end if;

  return query select selected_item.item_id, selected_item.kind;
end;
$$;

revoke all on function public.equip_profile_cosmetic(text) from public, anon, authenticated;
grant execute on function public.equip_profile_cosmetic(text) to authenticated;

create or replace function public.clear_profile_cosmetic(
  requested_slot text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Sign in before changing a cosmetic.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if requested_slot = 'frame' then
    update public.profiles
    set equipped_frame = null,
        updated_at = now()
    where id = caller_id;
  elsif requested_slot = 'effect' then
    update public.profiles
    set equipped_effect = null,
        updated_at = now()
    where id = caller_id;
  elsif requested_slot = 'badge' then
    update public.profiles
    set equipped_badge = null,
        updated_at = now()
    where id = caller_id;
  elsif requested_slot = 'banner' then
    update public.profiles
    set equipped_banner = null,
        updated_at = now()
    where id = caller_id;
  else
    raise exception 'Choose a cosmetic slot: frame, effect, badge, or banner.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.clear_profile_cosmetic(text) from public, anon, authenticated;
grant execute on function public.clear_profile_cosmetic(text) to authenticated;

-- ============================================================================
-- Source: supabase/migrations/20261026000000_token_purchase_age_gate.sql
-- ============================================================================
-- Shared defensive audit helper. The audit_events table is restored by the
-- moderation foundation migration on projects where it is missing; logging
-- must never make an account action fail outright.
create or replace function public.log_audit_event(
  requested_actor_id uuid,
  requested_event_type text,
  requested_subject_type text,
  requested_subject_id uuid,
  requested_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if to_regclass('public.audit_events') is null then
    return;
  end if;
  insert into public.audit_events (actor_id, event_type, subject_type, subject_id, details)
  values (requested_actor_id, requested_event_type, requested_subject_type, requested_subject_id, coalesce(requested_details, '{}'::jsonb));
exception when others then
  -- Audit logging must not roll back the account action that is being logged.
  null;
end;
$$;

revoke all on function public.log_audit_event(uuid, text, text, uuid, jsonb) from public, anon, authenticated;

alter table public.profiles
  add column if not exists purchase_age_verified_at timestamptz;

create or replace function public.confirm_token_purchase_age(requested_date_of_birth date)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  verified_at timestamptz := now();
begin
  if caller_id is null then
    raise exception 'Sign in before confirming your age.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if requested_date_of_birth is null
    or requested_date_of_birth > current_date
    or requested_date_of_birth < (current_date - interval '120 years')::date
  then
    raise exception 'Enter a valid date of birth.' using errcode = '22023';
  end if;

  if requested_date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'Token purchases are only available to members aged 18 or over.' using errcode = '22023';
  end if;

  update public.profiles
  set purchase_age_verified_at = verified_at,
      updated_at = now()
  where id = caller_id;

  perform public.log_audit_event(
    caller_id,
    'account.purchase_age_verified',
    'user',
    caller_id,
    jsonb_build_object('method', 'date_of_birth')
  );

  return verified_at;
end;
$$;

revoke all on function public.confirm_token_purchase_age(date) from public, anon, authenticated;
grant execute on function public.confirm_token_purchase_age(date) to authenticated;

-- ============================================================================
-- Source: supabase/migrations/20261026000100_token_refund_clawback.sql
-- ============================================================================
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
