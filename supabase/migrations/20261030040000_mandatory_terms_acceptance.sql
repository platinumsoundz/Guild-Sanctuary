begin;

create table if not exists public.terms_acceptances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null check (char_length(terms_version) between 1 and 40),
  accepted_at timestamptz not null default now()
);

alter table public.terms_acceptances enable row level security;
revoke all on public.terms_acceptances from anon, authenticated;
grant select on public.terms_acceptances to authenticated;

drop policy if exists "Users can read their own terms acceptance" on public.terms_acceptances;
create policy "Users can read their own terms acceptance"
  on public.terms_acceptances for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.require_current_terms_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'terms_accepted', 'false') <> 'true'
     or coalesce(new.raw_user_meta_data ->> 'terms_version', '') <> '2026-10-30-v2' then
    raise exception 'You must accept the current Terms and Conditions before creating an account.';
  end if;
  return new;
end;
$$;

create or replace function public.record_terms_acceptance_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.terms_acceptances (user_id, terms_version, accepted_at)
  values (new.id, '2026-10-30-v2', now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.require_current_terms_on_signup() from public, anon, authenticated;
revoke all on function public.record_terms_acceptance_on_signup() from public, anon, authenticated;

drop trigger if exists require_current_terms_before_signup on auth.users;
create trigger require_current_terms_before_signup
  before insert on auth.users
  for each row execute function public.require_current_terms_on_signup();

drop trigger if exists record_terms_acceptance_after_signup on auth.users;
create trigger record_terms_acceptance_after_signup
  after insert on auth.users
  for each row execute function public.record_terms_acceptance_on_signup();

comment on table public.terms_acceptances is
  'Append-only server-timestamped record of the terms version accepted during account registration.';

commit;
