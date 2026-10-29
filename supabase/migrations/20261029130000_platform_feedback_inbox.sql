create table if not exists public.platform_feedback (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('idea', 'bug', 'confusing', 'accessibility', 'other')),
  title text not null check (char_length(trim(title)) between 3 and 120),
  details text not null check (char_length(trim(details)) between 10 and 4000),
  page_url text,
  status text not null default 'new' check (status in ('new', 'in_review', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.platform_feedback enable row level security;
revoke all on public.platform_feedback from anon, public;
grant select, insert on public.platform_feedback to authenticated;

drop policy if exists "Members submit their own feedback" on public.platform_feedback;
create policy "Members submit their own feedback"
on public.platform_feedback for insert to authenticated
with check (
  submitter_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  )
  and status = 'new'
);

drop policy if exists "Members read own feedback and staff read inbox" on public.platform_feedback;
create policy "Members read own feedback and staff read inbox"
on public.platform_feedback for select to authenticated
using (
  submitter_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('admin', 'developer', 'owner')
  )
);

create index if not exists platform_feedback_inbox_idx
  on public.platform_feedback (status, created_at desc);
