create or replace function public.set_account_settings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists set_account_settings_updated_at on public.account_settings;
create trigger set_account_settings_updated_at
before update on public.account_settings
for each row execute function public.set_account_settings_updated_at();
revoke all on function public.set_account_settings_updated_at() from public, anon, authenticated;
