-- Persist self-discovery responses to the member's Sanctuary account.
-- Raw answers remain owner-only. A separately curated summary is exposed only
-- through public_profiles when the member explicitly enables profile visibility.
begin;

alter table public.profiles
  add column if not exists self_discovery_summary jsonb,
  add column if not exists self_discovery_visible boolean not null default false;

alter table public.profiles
  add constraint profiles_self_discovery_summary_object
  check (self_discovery_summary is null or jsonb_typeof(self_discovery_summary) = 'object');

create table if not exists public.self_discovery_responses (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(answers) = 'object'),
  consent_version text not null default 'self-discovery-v1'
    check (char_length(consent_version) between 1 and 40),
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.self_discovery_responses enable row level security;
revoke all on table public.self_discovery_responses from public, anon;
grant select, insert, update, delete on table public.self_discovery_responses to authenticated;

drop policy if exists "Members read their own self-discovery answers" on public.self_discovery_responses;
create policy "Members read their own self-discovery answers"
  on public.self_discovery_responses for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Members create their own self-discovery answers" on public.self_discovery_responses;
create policy "Members create their own self-discovery answers"
  on public.self_discovery_responses for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Members update their own self-discovery answers" on public.self_discovery_responses;
create policy "Members update their own self-discovery answers"
  on public.self_discovery_responses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Members delete their own self-discovery answers" on public.self_discovery_responses;
create policy "Members delete their own self-discovery answers"
  on public.self_discovery_responses for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Preserve the existing public-profile projection and append only the curated
-- summary. Never expose the raw self_discovery_responses.answers column.
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
  case when self_discovery_visible then self_discovery_summary else null end as self_discovery_summary
from public.profiles
where visibility = 'public'
  and allow_profile_discovery
  and (status = 'active' or (status = 'suspended' and suspended_until <= now()));

notify pgrst, 'reload schema';
commit;
