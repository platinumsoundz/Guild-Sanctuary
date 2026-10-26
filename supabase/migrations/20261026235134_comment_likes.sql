-- Allow authenticated members to like visible comments on visible posts, Shorts, and events.
-- Existing likes and comments are preserved. Comment likes remain owner-removable.
begin;

create or replace function public.social_target_is_visible(
  requested_target_type public.report_target_type,
  requested_target_id uuid
)
returns boolean
language sql
stable
set search_path = 'public', 'pg_temp'
as $$
  select case requested_target_type
    when 'post' then exists (
      select 1 from public.posts p
      where p.id = requested_target_id and p.state = 'visible'::public.content_state
    )
    when 'short' then exists (
      select 1 from public.short_videos s
      where s.id = requested_target_id and s.state = 'visible'::public.content_state
    )
    when 'event' then exists (
      select 1 from public.events e
      where e.id = requested_target_id and e.state = 'visible'::public.content_state
    )
    when 'comment' then exists (
      select 1
      from public.social_comments c
      where c.id = requested_target_id
        and c.state = 'visible'::public.content_state
        and case c.target_type
          when 'post' then exists (select 1 from public.posts p where p.id = c.target_id and p.state = 'visible'::public.content_state)
          when 'short' then exists (select 1 from public.short_videos s where s.id = c.target_id and s.state = 'visible'::public.content_state)
          when 'event' then exists (select 1 from public.events e where e.id = c.target_id and e.state = 'visible'::public.content_state)
          else false
        end
    )
    else false
  end;
$$;

drop policy if exists "visible comment likes readable" on public.social_likes;
create policy "visible comment likes readable"
on public.social_likes
for select
to authenticated
using (
  target_type = 'comment'::public.report_target_type
  and exists (
    select 1
    from public.social_comments c
    where c.id = social_likes.target_id
      and c.state = 'visible'::public.content_state
      and public.social_target_is_visible(c.target_type, c.target_id)
  )
);

commit;
