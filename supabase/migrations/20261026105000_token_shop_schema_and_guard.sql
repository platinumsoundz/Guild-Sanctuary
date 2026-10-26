-- Reproducible token shop schema and catalog. Mutation RPCs are defined for
-- staging, but execution remains revoked until the release gates are passed.
begin;

create table if not exists public.token_spend_catalog (
  item_id text primary key,
  name text not null,
  description text not null,
  price_tokens bigint not null check (price_tokens > 0),
  kind text not null check (kind in ('profile_frame', 'profile_effect', 'profile_badge', 'profile_banner', 'chat_item', 'gift', 'vip', 'promotion')),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  asset_url text,
  asset_text text,
  effect_key text,
  sort_order integer not null default 0
);

create table if not exists public.token_spend_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.token_wallets(user_id) on delete cascade,
  item_id text not null references public.token_spend_catalog(item_id) on delete restrict,
  item_name text not null,
  tokens_delta bigint not null check (tokens_delta < 0),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.token_entitlements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.token_spend_catalog(item_id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index if not exists token_spend_ledger_user_created_idx
  on public.token_spend_ledger (user_id, created_at desc);

alter table public.token_spend_catalog enable row level security;
alter table public.token_spend_ledger enable row level security;
alter table public.token_entitlements enable row level security;

drop policy if exists "authenticated users read enabled token spend catalog" on public.token_spend_catalog;
create policy "authenticated users read enabled token spend catalog"
  on public.token_spend_catalog for select to authenticated using (enabled);

drop policy if exists "users read own token spend ledger" on public.token_spend_ledger;
create policy "users read own token spend ledger"
  on public.token_spend_ledger for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users read own token entitlements" on public.token_entitlements;
create policy "users read own token entitlements"
  on public.token_entitlements for select to authenticated using (user_id = (select auth.uid()));

revoke all privileges on table
  public.token_wallets, public.token_ledger, public.token_spend_catalog,
  public.token_spend_ledger, public.token_entitlements
from public, anon, authenticated;

grant select on table
  public.token_wallets, public.token_ledger, public.token_spend_catalog,
  public.token_spend_ledger, public.token_entitlements
to authenticated;

grant select, insert, update, delete, truncate, references, trigger
  on table public.token_spend_catalog to service_role;
grant select, insert, update, delete, truncate, references, trigger
  on table public.token_spend_ledger, public.token_entitlements to service_role;

insert into public.token_spend_catalog
  (item_id, name, description, price_tokens, kind, enabled, asset_url, asset_text, effect_key, sort_order)
values
  ('profile_frame_sanctuary', 'Sanctuary supporter frame', 'A permanent warm-gold frame around your profile picture.', 300, 'profile_frame', true, null, null, 'sanctuary', 10),
  ('profile_frame_aurora', 'Aurora frame', 'An animated aurora ring that slowly shifts color around your profile picture.', 300, 'profile_frame', true, null, null, 'aurora', 20),
  ('profile_frame_ember', 'Ember frame', 'A permanent ember-glow frame with a slow animated shimmer.', 300, 'profile_frame', true, null, null, 'ember', 30),
  ('profile_effect_sparkle', 'Sparkle effect', 'Animated sparkles that drift around your profile picture.', 250, 'profile_effect', true, null, null, 'sparkle', 40),
  ('profile_effect_glow', 'Soft glow', 'A gentle pulsing glow around your profile picture.', 200, 'profile_effect', true, null, null, 'glow', 50),
  ('profile_badge_sparkle', 'Sparkle badge', 'A permanent sparkle badge beside your display name.', 150, 'profile_badge', true, null, '✨', null, 60),
  ('profile_badge_moon', 'Moon badge', 'A permanent moon badge beside your display name.', 150, 'profile_badge', true, null, '🌙', null, 70),
  ('profile_badge_flame', 'Flame badge', 'A permanent flame badge beside your display name.', 150, 'profile_badge', true, null, '🔥', null, 80),
  ('profile_badge_leaf', 'Leaf badge', 'A permanent leaf badge beside your display name.', 150, 'profile_badge', true, null, '🌿', null, 90),
  ('profile_banner_aurora', 'Aurora banner', 'A curated animated aurora banner for your profile.', 300, 'profile_banner', true, '/cosmetics/banner-aurora.gif', null, null, 100),
  ('profile_banner_ember', 'Ember banner', 'A curated animated ember banner for your profile.', 300, 'profile_banner', true, '/cosmetics/banner-ember.gif', null, null, 110),
  ('profile_banner_tide', 'Tide banner', 'A curated animated tide banner for your profile.', 300, 'profile_banner', true, '/cosmetics/banner-tide.gif', null, null, 120)
on conflict (item_id) do nothing;

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

  select * into selected_item
  from public.token_spend_catalog
  where item_id = requested_item_id and enabled
  for share;
  if not found then
    raise exception 'That token item is not available.' using errcode = '22023';
  end if;

  insert into public.token_wallets (user_id) values (caller_id)
  on conflict (user_id) do nothing;
  select w.balance_tokens into wallet_balance
  from public.token_wallets as w where w.user_id = caller_id for update;

  select l.* into existing_entry
  from public.token_spend_ledger as l
  where l.user_id = caller_id and l.idempotency_key = requested_idempotency_key
  for update;
  if found then
    if existing_entry.item_id <> requested_item_id then
      raise exception 'This spend request key was already used for another item.' using errcode = '22023';
    end if;
    return query select wallet_balance, existing_entry.item_id, true;
    return;
  end if;

  if selected_item.kind in ('profile_frame', 'profile_effect', 'profile_badge', 'profile_banner')
    and exists (
      select 1 from public.token_entitlements
      where user_id = caller_id and item_id = selected_item.item_id
    ) then
    return query select wallet_balance, selected_item.item_id, true;
    return;
  end if;

  if wallet_balance < selected_item.price_tokens then
    raise exception 'Not enough tokens for this item.' using errcode = '22003';
  end if;

  insert into public.token_spend_ledger
    (user_id, item_id, item_name, tokens_delta, idempotency_key)
  values
    (caller_id, selected_item.item_id, selected_item.name, -selected_item.price_tokens, requested_idempotency_key);

  update public.token_wallets
  set balance_tokens = balance_tokens - selected_item.price_tokens, updated_at = now()
  where user_id = caller_id returning balance_tokens into wallet_balance;

  insert into public.token_entitlements (user_id, item_id)
  values (caller_id, selected_item.item_id)
  on conflict (user_id, item_id) do nothing;

  if selected_item.kind = 'profile_frame' then
    update public.profiles set equipped_frame = selected_item.item_id, updated_at = now() where id = caller_id;
  elsif selected_item.kind = 'profile_effect' then
    update public.profiles set equipped_effect = selected_item.item_id, updated_at = now() where id = caller_id;
  elsif selected_item.kind = 'profile_badge' then
    update public.profiles set equipped_badge = selected_item.item_id, updated_at = now() where id = caller_id;
  elsif selected_item.kind = 'profile_banner' then
    update public.profiles set equipped_banner = selected_item.item_id, updated_at = now() where id = caller_id;
  end if;

  return query select wallet_balance, selected_item.item_id, false;
end;
$$;

create or replace function public.equip_profile_cosmetic(requested_item_id text)
returns table(item_id text, kind text)
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
  select * into selected_item
  from public.token_spend_catalog
  where item_id = requested_item_id and enabled
    and kind in ('profile_frame', 'profile_effect', 'profile_badge', 'profile_banner')
  for share;
  if not found then
    raise exception 'That cosmetic is not available.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.token_entitlements where user_id = caller_id and item_id = selected_item.item_id) then
    raise exception 'Unlock this cosmetic before equipping it.' using errcode = '42501';
  end if;

  if selected_item.kind = 'profile_frame' then
    update public.profiles set equipped_frame = selected_item.item_id, updated_at = now() where id = caller_id;
  elsif selected_item.kind = 'profile_effect' then
    update public.profiles set equipped_effect = selected_item.item_id, updated_at = now() where id = caller_id;
  elsif selected_item.kind = 'profile_badge' then
    update public.profiles set equipped_badge = selected_item.item_id, updated_at = now() where id = caller_id;
  elsif selected_item.kind = 'profile_banner' then
    update public.profiles set equipped_banner = selected_item.item_id, updated_at = now() where id = caller_id;
  end if;
  return query select selected_item.item_id, selected_item.kind;
end;
$$;

create or replace function public.clear_profile_cosmetic(requested_slot text)
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
    update public.profiles set equipped_frame = null, updated_at = now() where id = caller_id;
  elsif requested_slot = 'effect' then
    update public.profiles set equipped_effect = null, updated_at = now() where id = caller_id;
  elsif requested_slot = 'badge' then
    update public.profiles set equipped_badge = null, updated_at = now() where id = caller_id;
  elsif requested_slot = 'banner' then
    update public.profiles set equipped_banner = null, updated_at = now() where id = caller_id;
  else
    raise exception 'Choose a cosmetic slot: frame, effect, badge, or banner.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.spend_tokens(text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.equip_profile_cosmetic(text) from public, anon, authenticated, service_role;
revoke all on function public.clear_profile_cosmetic(text) from public, anon, authenticated, service_role;

commit;
