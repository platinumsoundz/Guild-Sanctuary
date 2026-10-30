-- Permanent first-party cosmetic catalogue and premium theme entitlement guard.
-- Repository migration only: keep the spend RPC revoked until isolated staging tests pass.
begin;

alter table public.token_spend_catalog drop constraint if exists token_spend_catalog_kind_check;
alter table public.token_spend_catalog add constraint token_spend_catalog_kind_check
  check (kind in ('profile_frame','profile_effect','profile_badge','profile_banner','chat_item','gift','vip','promotion','theme'));

alter table public.profiles
  add column if not exists equipped_frame text,
  add column if not exists equipped_effect text,
  add column if not exists equipped_badge text,
  add column if not exists equipped_banner text;

insert into public.token_spend_catalog
(item_id,name,description,price_tokens,kind,enabled,asset_text,effect_key,sort_order)
values
('theme_nebula','Nebula','A rich violet galaxy palette with luminous lavender accents.',750,'theme',true,'🌌','nebula',40),
('theme_aurora','Aurora','A northern-lights palette with emerald and teal cosmic glow.',850,'theme',true,'🌠','aurora',50),
('theme_celestial','Celestial','A warm rose-gold night palette with soft blush highlights.',850,'theme',true,'✨','celestial',60),
('theme_eclipse','Eclipse','A midnight palette with restrained solar-gold accents.',1000,'theme',true,'🌘','eclipse',70),
('frame_crystal','Crystal Halo','A luminous crystal ring for your profile portrait.',350,'profile_frame',true,'💎','crystal',100),
('frame_starlight','Starlight Ring','A delicate silver star-ring profile frame.',350,'profile_frame',true,'✦','starlight',110),
('frame_solar','Solar Crown','A golden solar halo that marks your profile.',500,'profile_frame',true,'☀️','solar',120),
('frame_void','Void Prism','A deep-space prism frame with a violet edge.',500,'profile_frame',true,'🔮','void',130),
('effect_comet','Comet Trail','A subtle comet-tail accent for your profile portrait.',300,'profile_effect',true,'☄️','comet',150),
('effect_moonlight','Moonlight Aura','A cool moonlit aura around your profile portrait.',300,'profile_effect',true,'🌙','moonlight',160),
('effect_constellation','Constellation','A constellation-inspired portrait sparkle effect.',450,'profile_effect',true,'✧','constellation',170),
('badge_starborn','Starborn Badge','A permanent starborn identity badge beside your name.',200,'profile_badge',true,'⭐',null,200),
('badge_cosmic','Cosmic Badge','A permanent cosmic identity badge beside your name.',200,'profile_badge',true,'🪐',null,210),
('badge_comet','Comet Badge','A permanent comet identity badge beside your name.',200,'profile_badge',true,'☄️',null,220),
('badge_crystal','Crystal Badge','A permanent crystal identity badge beside your name.',250,'profile_badge',true,'💠',null,230),
('badge_sunrise','Sunrise Badge','A permanent sunrise identity badge beside your name.',250,'profile_badge',true,'🌅',null,240),
('banner_starry_sky','Starry Sky Banner','A deep-space starfield banner for your profile.',400,'profile_banner',true,'🌌','starry-sky',260),
('banner_moonlit','Moonlit Horizon Banner','A moonlit horizon banner with a calm night-sky mood.',450,'profile_banner',true,'🌙','moonlit',270),
('banner_solar_flare','Solar Flare Banner','A radiant solar banner with warm golden light.',500,'profile_banner',true,'☀️','solar-flare',280),
('banner_crystal_garden','Crystal Garden Banner','A luminous crystal-garden profile banner.',500,'profile_banner',true,'💎','crystal-garden',290)
on conflict(item_id) do update set
 name=excluded.name,description=excluded.description,price_tokens=excluded.price_tokens,
 kind=excluded.kind,enabled=excluded.enabled,asset_text=excluded.asset_text,
 effect_key=excluded.effect_key,sort_order=excluded.sort_order;

create or replace function public.guard_account_theme_entitlement()
returns trigger language plpgsql set search_path = '' as $$
declare selected_theme text := coalesce(new.preferences ->> 'theme','dark');
begin
  if selected_theme in ('nebula','aurora','celestial','eclipse')
    and not exists(select 1 from public.token_entitlements
      where user_id=new.user_id and item_id='theme_' || selected_theme) then
    raise exception 'Unlock this theme in the Token Shop before selecting it.' using errcode='42501';
  end if;
  return new;
end;
$$;
drop trigger if exists account_settings_theme_entitlement_guard on public.account_settings;
create trigger account_settings_theme_entitlement_guard
before insert or update of preferences on public.account_settings
for each row execute function public.guard_account_theme_entitlement();

create or replace function public.spend_tokens(requested_item_id text, requested_idempotency_key uuid)
returns table(balance_tokens bigint,item_id text,already_applied boolean)
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := (select auth.uid());
  selected_item public.token_spend_catalog%rowtype;
  wallet_balance bigint;
  existing_entry public.token_spend_ledger%rowtype;
begin
  if caller_id is null then raise exception 'Sign in before spending tokens.' using errcode='42501'; end if;
  if not public.is_active_user() then raise exception 'This account is not active.' using errcode='42501'; end if;
  if requested_item_id is null or requested_item_id='' then raise exception 'Choose a token item.' using errcode='22023'; end if;
  if requested_idempotency_key is null then raise exception 'A spend request key is required.' using errcode='22023'; end if;
  select * into selected_item from public.token_spend_catalog
    where item_id=requested_item_id and enabled for share;
  if not found then raise exception 'That token item is not available.' using errcode='22023'; end if;
  insert into public.token_wallets(user_id) values(caller_id) on conflict(user_id) do nothing;
  select balance_tokens into wallet_balance from public.token_wallets where user_id=caller_id for update;
  select * into existing_entry from public.token_spend_ledger
    where user_id=caller_id and idempotency_key=requested_idempotency_key for update;
  if found then
    if existing_entry.item_id<>requested_item_id then raise exception 'This spend request key was already used for another item.' using errcode='22023'; end if;
    return query select wallet_balance,existing_entry.item_id,true; return;
  end if;
  if selected_item.kind in ('profile_frame','profile_effect','profile_badge','profile_banner','theme')
    and exists(select 1 from public.token_entitlements where user_id=caller_id and item_id=selected_item.item_id) then
    return query select wallet_balance,selected_item.item_id,true; return;
  end if;
  if wallet_balance<selected_item.price_tokens then raise exception 'Not enough tokens for this item.' using errcode='22003'; end if;
  insert into public.token_spend_ledger(user_id,item_id,item_name,tokens_delta,idempotency_key)
    values(caller_id,selected_item.item_id,selected_item.name,-selected_item.price_tokens,requested_idempotency_key);
  update public.token_wallets set balance_tokens=balance_tokens-selected_item.price_tokens,updated_at=now()
    where user_id=caller_id returning balance_tokens into wallet_balance;
  insert into public.token_entitlements(user_id,item_id) values(caller_id,selected_item.item_id)
    on conflict(user_id,item_id) do nothing;
  if selected_item.kind='profile_frame' then
    update public.profiles set equipped_frame=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_effect' then
    update public.profiles set equipped_effect=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_badge' then
    update public.profiles set equipped_badge=selected_item.item_id,updated_at=now() where id=caller_id;
  elsif selected_item.kind='profile_banner' then
    update public.profiles set equipped_banner=selected_item.item_id,updated_at=now() where id=caller_id;
  end if;
  return query select wallet_balance,selected_item.item_id,false;
end;
$$;

revoke all on function public.spend_tokens(text,uuid) from public,anon,authenticated,service_role;
commit;

-- Remove legacy placeholder banner paths; the catalogue renders first-party art/text,
-- so a missing static asset can never create a broken image in the shop.
update public.token_spend_catalog
set asset_url = null,
    asset_text = case item_id
      when 'profile_banner_aurora' then '🌠'
      when 'profile_banner_ember' then '🔥'
      when 'profile_banner_tide' then '🌊'
      else asset_text
    end
where item_id in ('profile_banner_aurora','profile_banner_ember','profile_banner_tide');
