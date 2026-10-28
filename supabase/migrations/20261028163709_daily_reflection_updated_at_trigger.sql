create or replace function public.set_daily_reflection_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists set_daily_reflection_updated_at on public.daily_reflections;
create trigger set_daily_reflection_updated_at
before update on public.daily_reflections
for each row execute function public.set_daily_reflection_updated_at();
revoke all on function public.set_daily_reflection_updated_at() from public, anon, authenticated;
