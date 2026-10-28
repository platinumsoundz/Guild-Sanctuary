-- Private daily reflection diary.
-- Owner handoff: review and apply through the approved Supabase migration workflow.
begin;

create table if not exists public.daily_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reflection_date date not null default current_date,
  title text not null default '',
  intention text not null default '',
  content text not null default '',
  mood text,
  prompts jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_reflections_intention_length check (char_length(intention) <= 180),
  constraint daily_reflections_content_length check (char_length(content) <= 1200),
  constraint daily_reflections_title_length check (char_length(title) <= 160),
  constraint daily_reflections_mood_length check (mood is null or char_length(mood) <= 48),
  constraint daily_reflections_mood_allowed check (mood is null or mood in ('low', 'heavy', 'steady', 'good', 'bright')),
  constraint daily_reflections_prompts_array check (jsonb_typeof(prompts) = 'array'),
  constraint daily_reflections_tags_array check (jsonb_typeof(tags) = 'array')
);

create unique index if not exists daily_reflections_user_day_unique_idx
  on public.daily_reflections (user_id, reflection_date);

create index if not exists daily_reflections_user_date_idx
  on public.daily_reflections (user_id, reflection_date desc, created_at desc);

alter table public.daily_reflections enable row level security;

drop policy if exists "Users can read their own daily reflections" on public.daily_reflections;
create policy "Users can read their own daily reflections"
  on public.daily_reflections for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own daily reflections" on public.daily_reflections;
create policy "Users can create their own daily reflections"
  on public.daily_reflections for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own daily reflections" on public.daily_reflections;
create policy "Users can update their own daily reflections"
  on public.daily_reflections for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own daily reflections" on public.daily_reflections;
create policy "Users can delete their own daily reflections"
  on public.daily_reflections for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.daily_reflections from public, anon;
grant select, insert, update, delete on public.daily_reflections to authenticated;

commit;
