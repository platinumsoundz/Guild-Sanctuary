begin;

create table if not exists public.sanctuary_feedback (
  id uuid primary key default gen_random_uuid(),
  feedback_type text not null check (feedback_type in ('Idea or improvement', 'Bug report', 'Confusing experience', 'Accessibility issue')),
  title text not null check (char_length(btrim(title)) between 3 and 100),
  details text not null check (char_length(btrim(details)) between 5 and 2000),
  submitted_by uuid references auth.users(id) on delete set null,
  submitter_kind text not null check (submitter_kind in ('guest', 'member')),
  page_url text check (page_url is null or char_length(page_url) <= 500),
  status text not null default 'open' check (status in ('open', 'in_review', 'closed')),
  created_at timestamptz not null default now(),
  constraint sanctuary_feedback_submitter_consistency check (
    (submitter_kind = 'guest' and submitted_by is null)
    or submitter_kind = 'member'
  )
);

alter table public.sanctuary_feedback enable row level security;

drop policy if exists "Anyone can submit sanctuary feedback" on public.sanctuary_feedback;
create policy "Anyone can submit sanctuary feedback"
  on public.sanctuary_feedback for insert to anon, authenticated
  with check (
    char_length(btrim(title)) between 3 and 100
    and char_length(btrim(details)) between 5 and 2000
    and (
      (submitted_by is null and submitter_kind = 'guest')
      or (submitted_by = auth.uid() and submitter_kind = 'member')
    )
  );

drop policy if exists "Developers and owner can read sanctuary feedback" on public.sanctuary_feedback;
create policy "Developers and owner can read sanctuary feedback"
  on public.sanctuary_feedback for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('developer', 'owner')
  ));

drop policy if exists "Developers and owner can update sanctuary feedback" on public.sanctuary_feedback;
create policy "Developers and owner can update sanctuary feedback"
  on public.sanctuary_feedback for update to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('developer', 'owner')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('developer', 'owner')
  ));

grant insert on public.sanctuary_feedback to anon, authenticated;
grant select on public.sanctuary_feedback to authenticated;
grant update (status) on public.sanctuary_feedback to authenticated;

comment on table public.sanctuary_feedback is
  'Beta feedback submitted by signed-in members or guests; readable and triageable only by developers and the owner.';

commit;
