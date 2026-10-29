-- Consolidate the Shorts RPC and direct-message preference repairs.
-- This is additive/idempotent and explicitly refreshes PostgREST's schema cache.
-- It does not apply itself to any Supabase project; deploy through the approved migration process.

begin;

create or replace function public.get_short_engagement_stats(requested_short_id uuid)
returns table (liked boolean, likes_count bigint, comments_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.social_likes likes
      where likes.target_type = 'short'::public.report_target_type
        and likes.target_id = requested_short_id
        and likes.user_id = (select auth.uid())
    ),
    (select count(*) from public.social_likes likes
      where likes.target_type = 'short'::public.report_target_type
        and likes.target_id = requested_short_id),
    (select count(*) from public.social_comments comments
      where comments.target_type = 'short'::public.report_target_type
        and comments.target_id = requested_short_id
        and comments.state = 'visible'::public.content_state)
  where requested_short_id is not null
    and (select auth.uid()) is not null
    and public.is_active_user()
    and public.social_target_is_visible('short'::public.report_target_type, requested_short_id);
$$;

create or replace function public.toggle_short_like(requested_short_id uuid)
returns table (liked boolean, likes_count bigint, comments_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  did_remove boolean;
begin
  if caller_id is null or not public.is_active_user() then
    raise exception 'An active signed-in account is required' using errcode = '42501';
  end if;

  perform 1 from public.short_videos short
  where short.id = requested_short_id and short.state = 'visible'::public.content_state
  for update;
  if not found then
    raise exception 'Short video is unavailable' using errcode = 'P0002';
  end if;

  delete from public.social_likes likes
  where likes.target_type = 'short'::public.report_target_type
    and likes.target_id = requested_short_id and likes.user_id = caller_id;
  did_remove := found;

  if not did_remove then
    insert into public.social_likes (target_type, target_id, user_id)
    values ('short'::public.report_target_type, requested_short_id, caller_id)
    on conflict (target_type, target_id, user_id) do nothing;
  end if;

  return query select
    exists (select 1 from public.social_likes likes
      where likes.target_type = 'short'::public.report_target_type
        and likes.target_id = requested_short_id and likes.user_id = caller_id),
    (select count(*) from public.social_likes likes
      where likes.target_type = 'short'::public.report_target_type and likes.target_id = requested_short_id),
    (select count(*) from public.social_comments comments
      where comments.target_type = 'short'::public.report_target_type
        and comments.target_id = requested_short_id
        and comments.state = 'visible'::public.content_state);
end;
$$;

revoke all on function public.get_short_engagement_stats(uuid) from public, anon;
revoke all on function public.toggle_short_like(uuid) from public, anon;
grant execute on function public.get_short_engagement_stats(uuid) to authenticated;
grant execute on function public.toggle_short_like(uuid) to authenticated;

-- Keep the profile fields used by the inbox/search UI in sync with the saved
-- account preference that create_conversation treats as authoritative.
create or replace function public.sync_profile_message_preference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allow_dms boolean := coalesce((new.preferences->>'allowDirectMessages') = 'true', true);
  allow_discovery boolean := coalesce((new.preferences->>'allowProfileDiscovery') = 'true', true);
begin
  update public.profiles
  set allow_direct_messages = allow_dms,
      allow_profile_discovery = allow_discovery,
      privacy = pg_catalog.jsonb_set(
        pg_catalog.jsonb_set(coalesce(privacy, '{}'::jsonb), '{allowDirectMessages}', pg_catalog.to_jsonb(allow_dms), true),
        '{allowProfileDiscovery}', pg_catalog.to_jsonb(allow_discovery), true
      ),
      updated_at = pg_catalog.now()
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists sync_profile_message_preference on public.account_settings;
create trigger sync_profile_message_preference
after insert or update of preferences on public.account_settings
for each row execute function public.sync_profile_message_preference();

revoke all on function public.sync_profile_message_preference() from public, anon;
grant execute on function public.sync_profile_message_preference() to authenticated;

commit;

notify pgrst, 'reload schema';
