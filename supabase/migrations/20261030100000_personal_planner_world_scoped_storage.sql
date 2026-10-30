begin;

create table if not exists public.personal_planner_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  world_type public.world_type not null default 'sanctuary',
  planner_data jsonb not null default '{"version":1,"tasks":[],"notesByDate":{},"habits":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint personal_planner_data_shape check (
    jsonb_typeof(planner_data) = 'object'
    and planner_data ->> 'version' = '1'
    and jsonb_typeof(planner_data -> 'tasks') = 'array'
    and jsonb_typeof(planner_data -> 'notesByDate') = 'object'
    and jsonb_typeof(planner_data -> 'habits') = 'array'
    and pg_column_size(planner_data) <= 1048576
  )
);

alter table public.personal_planner_data
  add column if not exists world_type public.world_type not null default 'sanctuary';
alter table public.personal_planner_data
  drop constraint if exists personal_planner_data_pkey;
alter table public.personal_planner_data
  add constraint personal_planner_data_pkey primary key (user_id, world_type);

alter table public.personal_planner_data enable row level security;
drop policy if exists "Users read own planner data" on public.personal_planner_data;
create policy "Users read own planner data" on public.personal_planner_data
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own planner data" on public.personal_planner_data;
create policy "Users insert own planner data" on public.personal_planner_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own planner data" on public.personal_planner_data;
create policy "Users update own planner data" on public.personal_planner_data
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own planner data" on public.personal_planner_data;
create policy "Users delete own planner data" on public.personal_planner_data
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.personal_planner_data from anon, authenticated;
grant select, delete on public.personal_planner_data to authenticated;
grant insert (user_id, world_type, planner_data) on public.personal_planner_data to authenticated;
grant update (planner_data) on public.personal_planner_data to authenticated;

create or replace function public.set_personal_planner_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists set_personal_planner_updated_at on public.personal_planner_data;
create trigger set_personal_planner_updated_at before update on public.personal_planner_data
for each row execute function public.set_personal_planner_updated_at();
revoke all on function public.set_personal_planner_updated_at() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
