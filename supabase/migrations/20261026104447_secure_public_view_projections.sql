-- Replace security-definer views with security-invoker views over narrow,
-- private projection tables. The projections contain only the fields intended
-- for public discovery; raw profile privacy fields never leave public.profiles.
begin;

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create table if not exists private.public_profile_projection (
  id uuid primary key,
  username text not null,
  display_name text not null,
  bio text,
  status_message text,
  avatar_url text,
  banner_url text,
  theme_color text not null,
  location text,
  age integer,
  star_sign text,
  belief text,
  social_links jsonb,
  allow_direct_messages boolean not null,
  equipped_frame text,
  equipped_effect text,
  equipped_badge text,
  equipped_banner text
);

alter table private.public_profile_projection enable row level security;
revoke all privileges on table private.public_profile_projection from public, anon, authenticated;
grant select on table private.public_profile_projection to anon, authenticated;
drop policy if exists "public profile projection readable" on private.public_profile_projection;
create policy "public profile projection readable"
  on private.public_profile_projection for select to anon, authenticated using (true);

create or replace function private.sync_public_profile_projection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from private.public_profile_projection where id = old.id;
    return old;
  end if;

  if new.visibility = 'public'
    and new.allow_profile_discovery
    and (
      new.status = 'active'
      or (
        new.status = 'suspended'
        and new.suspended_until is not null
        and new.suspended_until <= pg_catalog.now()
      )
    )
  then
    insert into private.public_profile_projection (
      id, username, display_name, bio, status_message, avatar_url, banner_url,
      theme_color, location, age, star_sign, belief, social_links,
      allow_direct_messages, equipped_frame, equipped_effect, equipped_badge, equipped_banner
    ) values (
      new.id, new.username, new.display_name,
      case when new.privacy ->> 'bio' = 'true' then new.bio end,
      new.status_message, new.avatar_url, new.banner_url, new.theme_color,
      case when new.privacy ->> 'location' = 'true' then new.location end,
      case when new.privacy ->> 'age' = 'true' then new.age end,
      case when new.privacy ->> 'starSign' = 'true' then new.star_sign end,
      case when new.privacy ->> 'belief' = 'true' then new.belief end,
      case when new.privacy ->> 'socialLinks' = 'true' then new.social_links end,
      new.allow_direct_messages, new.equipped_frame, new.equipped_effect,
      new.equipped_badge, new.equipped_banner
    )
    on conflict (id) do update set
      username = excluded.username,
      display_name = excluded.display_name,
      bio = excluded.bio,
      status_message = excluded.status_message,
      avatar_url = excluded.avatar_url,
      banner_url = excluded.banner_url,
      theme_color = excluded.theme_color,
      location = excluded.location,
      age = excluded.age,
      star_sign = excluded.star_sign,
      belief = excluded.belief,
      social_links = excluded.social_links,
      allow_direct_messages = excluded.allow_direct_messages,
      equipped_frame = excluded.equipped_frame,
      equipped_effect = excluded.equipped_effect,
      equipped_badge = excluded.equipped_badge,
      equipped_banner = excluded.equipped_banner;
  else
    delete from private.public_profile_projection where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_public_profile_projection on public.profiles;
create trigger sync_public_profile_projection
  after insert or update or delete on public.profiles
  for each row execute function private.sync_public_profile_projection();

insert into private.public_profile_projection (
  id, username, display_name, bio, status_message, avatar_url, banner_url,
  theme_color, location, age, star_sign, belief, social_links,
  allow_direct_messages, equipped_frame, equipped_effect, equipped_badge, equipped_banner
)
select
  p.id, p.username, p.display_name,
  case when p.privacy ->> 'bio' = 'true' then p.bio end,
  p.status_message, p.avatar_url, p.banner_url, p.theme_color,
  case when p.privacy ->> 'location' = 'true' then p.location end,
  case when p.privacy ->> 'age' = 'true' then p.age end,
  case when p.privacy ->> 'starSign' = 'true' then p.star_sign end,
  case when p.privacy ->> 'belief' = 'true' then p.belief end,
  case when p.privacy ->> 'socialLinks' = 'true' then p.social_links end,
  p.allow_direct_messages, p.equipped_frame, p.equipped_effect, p.equipped_badge, p.equipped_banner
from public.profiles p
where p.visibility = 'public'
  and p.allow_profile_discovery
  and (
    p.status = 'active'
    or (p.status = 'suspended' and p.suspended_until is not null and p.suspended_until <= pg_catalog.now())
  )
on conflict (id) do update set
  username = excluded.username,
  display_name = excluded.display_name,
  bio = excluded.bio,
  status_message = excluded.status_message,
  avatar_url = excluded.avatar_url,
  banner_url = excluded.banner_url,
  theme_color = excluded.theme_color,
  location = excluded.location,
  age = excluded.age,
  star_sign = excluded.star_sign,
  belief = excluded.belief,
  social_links = excluded.social_links,
  allow_direct_messages = excluded.allow_direct_messages,
  equipped_frame = excluded.equipped_frame,
  equipped_effect = excluded.equipped_effect,
  equipped_badge = excluded.equipped_badge,
  equipped_banner = excluded.equipped_banner;

create table if not exists private.event_rsvp_count_projection (
  event_id uuid primary key references public.events(id) on delete cascade,
  going_count integer not null default 0 check (going_count >= 0)
);

alter table private.event_rsvp_count_projection enable row level security;
revoke all privileges on table private.event_rsvp_count_projection from public, anon, authenticated;
grant select on table private.event_rsvp_count_projection to anon, authenticated;
drop policy if exists "visible event rsvp counts readable" on private.event_rsvp_count_projection;
create policy "visible event rsvp counts readable"
  on private.event_rsvp_count_projection for select to anon, authenticated using (true);

create or replace function private.sync_event_rsvp_count_projection(requested_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  if requested_event_id is null then
    return;
  end if;

  if exists (
    select 1 from public.events e
    where e.id = requested_event_id and e.state = 'visible'::public.content_state
  ) and exists (
    select 1 from public.event_rsvps r where r.event_id = requested_event_id
  ) then
    select count(*) filter (where r.status = 'going')::integer
    into current_count
    from public.event_rsvps r
    where r.event_id = requested_event_id;

    insert into private.event_rsvp_count_projection (event_id, going_count)
    values (requested_event_id, coalesce(current_count, 0))
    on conflict (event_id) do update set going_count = excluded.going_count;
  else
    delete from private.event_rsvp_count_projection where event_id = requested_event_id;
  end if;
end;
$$;

create or replace function private.sync_event_rsvp_count_from_rsvp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.sync_event_rsvp_count_projection(old.event_id);
    return old;
  elsif tg_op = 'UPDATE' then
    if old.event_id is distinct from new.event_id then
      perform private.sync_event_rsvp_count_projection(old.event_id);
    end if;
    perform private.sync_event_rsvp_count_projection(new.event_id);
    return new;
  else
    perform private.sync_event_rsvp_count_projection(new.event_id);
    return new;
  end if;
end;
$$;

create or replace function private.sync_event_rsvp_count_from_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from private.event_rsvp_count_projection where event_id = old.id;
    return old;
  end if;
  perform private.sync_event_rsvp_count_projection(new.id);
  return new;
end;
$$;

drop trigger if exists sync_event_rsvp_count_from_rsvp on public.event_rsvps;
create trigger sync_event_rsvp_count_from_rsvp
  after insert or update or delete on public.event_rsvps
  for each row execute function private.sync_event_rsvp_count_from_rsvp();

drop trigger if exists sync_event_rsvp_count_from_event on public.events;
create trigger sync_event_rsvp_count_from_event
  after insert or update or delete on public.events
  for each row execute function private.sync_event_rsvp_count_from_event();

insert into private.event_rsvp_count_projection (event_id, going_count)
select e.id, count(*) filter (where r.status = 'going')::integer
from public.events e
join public.event_rsvps r on r.event_id = e.id
where e.state = 'visible'::public.content_state
group by e.id
on conflict (event_id) do update set going_count = excluded.going_count;

revoke all on function private.sync_public_profile_projection() from public, anon, authenticated;
revoke all on function private.sync_event_rsvp_count_projection(uuid) from public, anon, authenticated;
revoke all on function private.sync_event_rsvp_count_from_rsvp() from public, anon, authenticated;
revoke all on function private.sync_event_rsvp_count_from_event() from public, anon, authenticated;

create or replace view public.public_profiles
with (security_barrier = true, security_invoker = true)
as
select
  id, username, display_name, bio, status_message, avatar_url, banner_url,
  theme_color, location, age, star_sign, belief, social_links,
  allow_direct_messages, equipped_frame, equipped_effect, equipped_badge, equipped_banner
from private.public_profile_projection;

create or replace view public.event_rsvp_counts
with (security_barrier = true, security_invoker = true)
as
select event_id, going_count
from private.event_rsvp_count_projection;

grant select on public.public_profiles, public.event_rsvp_counts to anon, authenticated;

commit;
