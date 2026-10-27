-- Allow authenticated users to like visible comments without opening likes on hidden content.
-- The generic social_target_is_visible(target_type, target_id) helper validates posts,
-- shorts and events; comment reactions need to validate the comment and its parent target.
begin;

drop policy if exists "users add own comment likes" on public.social_likes;

create policy "users add own comment likes"
on public.social_likes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_active_user()
  and target_type = 'comment'::public.report_target_type
  and exists (
    select 1
    from public.social_comments c
    where c.id = social_likes.target_id
      and c.state = 'visible'::public.content_state
      and public.social_target_is_visible(c.target_type, c.target_id)
  )
);

commit;
