create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and (status = 'active' or (status = 'suspended' and suspended_until <= now()))
  )
  and (
    (select auth.jwt() ->> 'aal') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors
      where user_id = (select auth.uid())
        and factor_type = 'totp'
        and status = 'verified'
    )
  );
$$;

drop policy "likes readable to authenticated users" on public.social_likes;

create policy "likes readable on visible content"
  on public.social_likes for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_moderator()
    or public.social_target_is_visible(target_type, target_id)
  );

create function public.remove_social_engagement_for_deleted_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.report_target_type;
begin
  target := case tg_table_name
    when 'posts' then 'post'::public.report_target_type
    when 'short_videos' then 'short'::public.report_target_type
    when 'events' then 'event'::public.report_target_type
  end;
  delete from public.social_likes where target_type = target and target_id = old.id;
  delete from public.social_comments where target_type = target and target_id = old.id;
  return old;
end;
$$;

create trigger posts_remove_social_engagement
after delete on public.posts
for each row execute function public.remove_social_engagement_for_deleted_content();

create trigger shorts_remove_social_engagement
after delete on public.short_videos
for each row execute function public.remove_social_engagement_for_deleted_content();

create trigger events_remove_social_engagement
after delete on public.events
for each row execute function public.remove_social_engagement_for_deleted_content();
