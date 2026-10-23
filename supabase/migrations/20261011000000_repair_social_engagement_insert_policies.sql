-- Repair authenticated inserts for likes/comments on visible posts, shorts, and events.
-- This preserves the existing owner, active-account, and visible-target checks.
begin;

alter table public.social_likes enable row level security;
alter table public.social_comments enable row level security;

drop policy if exists "users add own likes" on public.social_likes;
create policy "users add own likes"
  on public.social_likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_active_user()
    and public.social_target_is_visible(target_type, target_id)
  );

drop policy if exists "users add own comments" on public.social_comments;
create policy "users add own comments"
  on public.social_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_active_user()
    and public.social_target_is_visible(target_type, target_id)
  );

grant insert (target_type, target_id, user_id) on public.social_likes to authenticated;
grant insert (target_type, target_id, author_id, body) on public.social_comments to authenticated;

commit;
