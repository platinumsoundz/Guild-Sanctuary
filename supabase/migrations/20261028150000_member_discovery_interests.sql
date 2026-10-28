-- Member-controlled interests for Sanctuary's public discovery experience.
-- These are deliberately separate from private self-discovery reflections.
begin;

create table if not exists public.profile_interests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  interest text not null check (
    interest = lower(btrim(interest))
    and char_length(interest) between 2 and 32
    and interest ~ '^[a-z0-9][a-z0-9 _-]*$'
  ),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, interest)
);

create index if not exists profile_interests_public_lookup_idx
  on public.profile_interests (interest, user_id)
  where is_public = true;

alter table public.profile_interests enable row level security;

drop policy if exists "members read own or public interests" on public.profile_interests;
create policy "members read own or public interests"
  on public.profile_interests for select to authenticated
  using (user_id = (select auth.uid()) or (is_public and public.is_active_user()));

drop policy if exists "members add own interests" on public.profile_interests;
create policy "members add own interests"
  on public.profile_interests for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());

drop policy if exists "members update own interests" on public.profile_interests;
create policy "members update own interests"
  on public.profile_interests for update to authenticated
  using (user_id = (select auth.uid()) and public.is_active_user())
  with check (user_id = (select auth.uid()) and public.is_active_user());

drop policy if exists "members delete own interests" on public.profile_interests;
create policy "members delete own interests"
  on public.profile_interests for delete to authenticated
  using (user_id = (select auth.uid()) and public.is_active_user());

grant select, insert, update, delete on public.profile_interests to authenticated;

commit;
