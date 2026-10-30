-- NOT APPLIED: token shop/economy completion proposal for isolated staging review.
-- Adds the approved beta catalogue, first-100 verified-account bonus, spending holds,
-- and cosmetic equipment slots. Checkout/redemption permissions remain closed.
begin;

alter table public.token_spend_catalog
  drop constraint if exists token_spend_catalog_kind_check;
alter table public.token_spend_catalog
  add constraint token_spend_catalog_kind_check check (kind in (
    'profile_frame','profile_effect','profile_badge','profile_banner',
    'profile_border','profile_theme','colour_palette','accent_customization',
    'chat_item','gift','vip','promotion'
  ));

alter table public.profiles
  add column if not exists equipped_border text,
  add column if not exists equipped_profile_theme text,
  add column if not exists equipped_palette text,
  add column if not exists custom_accent_color text;

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

create table if not exists public.token_bonus_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  tokens_delta bigint not null default 1000 check (tokens_delta = 1000),
  grant_position integer not null unique check (grant_position between 1 and 100),
  source text not null default 'verified_beta_signup',
  verified_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.token_spending_holds (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  case_reference text not null,
  reason_code text not null check (reason_code in ('payment_dispute','chargeback','fraud_review','manual_review')),
  placed_by text not null,
  created_at timestamptz not null default now()
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
alter table public.token_bonus_ledger enable row level security;
alter table public.token_spending_holds enable row level security;
alter table public.token_spending_hold_audit enable row level security;
revoke all on public.token_bonus_program, public.token_bonus_ledger,
  public.token_spending_holds, public.token_spending_hold_audit
from public, anon, authenticated;
grant select, insert, update, delete on public.token_bonus_program,
  public.token_bonus_ledger, public.token_spending_holds,
  public.token_spending_hold_audit to service_role;

create or replace function public.try_grant_verified_beta_tokens(requested_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  program_row public.token_bonus_program%rowtype;
  confirmed_at timestamptz;
  next_position integer;
begin
  if requested_user_id is null then return; end if;
  select u.email_confirmed_at into confirmed_at
  from auth.users u where u.id = requested_user_id;
  if confirmed_at is null then return; end if;
  if not exists (select 1 from public.profiles p where p.id = requested_user_id) then return; end if;

  select * into program_row from public.token_bonus_program
  where singleton = true for update;
  if not found or not program_row.beta_open or program_row.awarded_count >= 100 then return; end if;
  if exists (select 1 from public.token_bonus_ledger b where b.user_id = requested_user_id) then return; end if;

  next_position := program_row.awarded_count + 1;
  insert into public.token_wallets(user_id) values (requested_user_id)
  on conflict (user_id) do nothing;
  insert into public.token_bonus_ledger(user_id,tokens_delta,grant_position,verified_at)
  values (requested_user_id,1000,next_position,confirmed_at)
  on conflict (user_id) do nothing;
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
  where item_id=requested_item_id and enabled
    and kind in ('profile_frame','profile_effect','profile_badge','profile_banner','profile_border','profile_theme','colour_palette')
  for share;
  if not found then raise exception 'That cosmetic is not available.' using errcode='22023'; end if;
  if not exists(select 1 from public.token_entitlements e where e.user_id=caller_id and e.item_id=selected_item.item_id) then
    raise exception 'Unlock this cosmetic before equipping it.' using errcode='42501';
  end if;
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
  equipped_palette text
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
      equipped_border,equipped_profile_theme,equipped_palette
    ) values (
      new.id,new.equipped_frame,new.equipped_effect,new.equipped_badge,new.equipped_banner,
      new.equipped_border,new.equipped_profile_theme,new.equipped_palette
    ) on conflict(id) do update set
      equipped_frame=excluded.equipped_frame,equipped_effect=excluded.equipped_effect,
      equipped_badge=excluded.equipped_badge,equipped_banner=excluded.equipped_banner,
      equipped_border=excluded.equipped_border,equipped_profile_theme=excluded.equipped_profile_theme,
      equipped_palette=excluded.equipped_palette;
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
  equipped_border,equipped_profile_theme,equipped_palette
)
select p.id,p.equipped_frame,p.equipped_effect,p.equipped_badge,p.equipped_banner,
  p.equipped_border,p.equipped_profile_theme,p.equipped_palette
from public.profiles p
where p.visibility='public' and p.allow_profile_discovery
  and (p.status='active' or (p.status='suspended' and p.suspended_until is not null and p.suspended_until<=pg_catalog.now()))
on conflict(id) do update set
  equipped_frame=excluded.equipped_frame,equipped_effect=excluded.equipped_effect,
  equipped_badge=excluded.equipped_badge,equipped_banner=excluded.equipped_banner,
  equipped_border=excluded.equipped_border,equipped_profile_theme=excluded.equipped_profile_theme,
  equipped_palette=excluded.equipped_palette;

create or replace view public.public_profile_cosmetics
with (security_barrier=true,security_invoker=true) as
select id,equipped_frame,equipped_effect,equipped_badge,equipped_banner,
  equipped_border,equipped_profile_theme,equipped_palette
from private.public_profile_cosmetic_projection;
grant select on public.public_profile_cosmetics to anon,authenticated;

commit;
