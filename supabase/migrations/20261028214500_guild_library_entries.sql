-- Server-side home for Guild library metadata.
-- This migration is repository code only; it has not been applied to a Supabase project.
begin;

create table if not exists public.guild_library_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  platform text not null check (platform in ('Browser', 'Steam', 'Xbox', 'RetroArch', 'Other')),
  launch_url text not null default '' check (launch_url = '' or launch_url ~* '^https?://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.guild_library_entries is
  'Account-scoped Guild library metadata only. Does not store game binaries, media files, credentials, or installed-game scan results.';
comment on column public.guild_library_entries.launch_url is
  'Optional HTTP(S) destination. Client-side URL validation remains required; links must open with safe browser rel attributes.';

create unique index if not exists guild_library_entries_owner_title_platform_uidx
  on public.guild_library_entries (user_id, lower(title), platform);
create index if not exists guild_library_entries_owner_updated_idx
  on public.guild_library_entries (user_id, updated_at desc);

alter table public.guild_library_entries enable row level security;

drop policy if exists "Members can read their Guild library" on public.guild_library_entries;
create policy "Members can read their Guild library"
on public.guild_library_entries for select to authenticated
using (user_id = (select auth.uid()) and public.is_active_user());

drop policy if exists "Members can add to their Guild library" on public.guild_library_entries;
create policy "Members can add to their Guild library"
on public.guild_library_entries for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_active_user());

drop policy if exists "Members can update their Guild library" on public.guild_library_entries;
create policy "Members can update their Guild library"
on public.guild_library_entries for update to authenticated
using (user_id = (select auth.uid()) and public.is_active_user())
with check (user_id = (select auth.uid()) and public.is_active_user());

drop policy if exists "Members can delete from their Guild library" on public.guild_library_entries;
create policy "Members can delete from their Guild library"
on public.guild_library_entries for delete to authenticated
using (user_id = (select auth.uid()) and public.is_active_user());

grant select, insert, update, delete on public.guild_library_entries to authenticated;
revoke all on public.guild_library_entries from anon;

create or replace function public.set_guild_library_entry_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists set_guild_library_entry_updated_at on public.guild_library_entries;
create trigger set_guild_library_entry_updated_at
before update on public.guild_library_entries
for each row execute function public.set_guild_library_entry_updated_at();


-- Enforce the same 500-entry ceiling on the server, not just in the browser.
-- The per-owner transaction lock makes concurrent inserts respect the cap.
create or replace function public.enforce_guild_library_entry_limit()
returns trigger
language plpgsql
set search_path = ''
as $
declare
  current_count bigint;
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception using errcode = '42501', message = 'Guild library ownership cannot be changed.';
    end if;
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
  select pg_catalog.count(*) into current_count
  from public.guild_library_entries
  where user_id = new.user_id;

  if current_count >= 500 then
    raise exception using errcode = '54000', message = 'Guild library entry limit reached (500).';
  end if;
  return new;
end;
$;

drop trigger if exists enforce_guild_library_entry_limit on public.guild_library_entries;
create trigger enforce_guild_library_entry_limit
before insert or update of user_id on public.guild_library_entries
for each row execute function public.enforce_guild_library_entry_limit();

commit;
