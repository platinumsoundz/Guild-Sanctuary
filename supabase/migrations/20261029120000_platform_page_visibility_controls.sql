-- Global page/system visibility switches controlled by developer and owner roles.
begin;

create table if not exists public.platform_page_visibility (
  page_key text primary key check (page_key ~ '^[a-z][a-z0-9-]{0,63}$'),
  is_visible boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.platform_page_visibility enable row level security;

drop policy if exists "active members can read page visibility" on public.platform_page_visibility;
drop policy if exists "public can read page visibility" on public.platform_page_visibility;
create policy "public can read page visibility"
  on public.platform_page_visibility for select to anon, authenticated
  using (true);

drop policy if exists "developers and owners manage page visibility" on public.platform_page_visibility;
create policy "developers and owners manage page visibility"
  on public.platform_page_visibility for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('developer', 'owner')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('developer', 'owner')
  ));

grant select on public.platform_page_visibility to anon, authenticated;
grant insert, update, delete on public.platform_page_visibility to authenticated;

commit;
notify pgrst, 'reload schema';
