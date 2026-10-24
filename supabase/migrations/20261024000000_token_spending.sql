-- First token sink: a permanent profile frame. Prices and availability are
-- server-owned; the client sends only a catalog item ID. Spending is atomic,
-- idempotent, and cannot make a balance negative.
begin;

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

commit;
