-- Harden aggregate access, discovery performance, and media storage policies.
--
-- The original RLS policies only exposed a user's own RSVPs and likes. The app
-- needs aggregate counts without leaking who reacted, so these views run with
-- the view owner's privileges and expose counts only.
create extension if not exists pg_trgm;

create or replace view public.event_rsvp_counts
with (security_barrier = true) as
select
  event_id,
  count(*) filter (where status = 'going')::integer as going_count
from public.event_rsvps
group by event_id;

create or replace view public.social_like_counts
with (security_barrier = true) as
select
  target_type,
  target_id,
  count(*)::integer as like_count
from public.social_likes
group by target_type, target_id;

revoke all on public.event_rsvp_counts, public.social_like_counts from public, anon;
grant select on public.event_rsvp_counts, public.social_like_counts to authenticated;

-- Public profile discovery uses ILIKE searches on both names.
create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (username gin_trgm_ops);
create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (display_name gin_trgm_ops);
create index if not exists profiles_discovery_idx
  on public.profiles (visibility, allow_profile_discovery, status);

create index if not exists events_visible_starts_idx
  on public.events (state, starts_at);
create index if not exists event_rsvps_event_status_idx
  on public.event_rsvps (event_id, status);
create index if not exists social_likes_target_idx
  on public.social_likes (target_type, target_id);
create index if not exists social_comments_target_idx
  on public.social_comments (target_type, target_id, state, created_at);
create index if not exists messages_conversation_sent_idx
  on public.messages (conversation_id, sent_at desc);
create index if not exists conversation_members_active_user_idx
  on public.conversation_members (user_id)
  where left_at is null;

-- Storage policies previously checked folder ownership only, so suspended or
-- unverified users could keep uploading and reading media. Require an active
-- profile for every storage operation.
drop policy if exists "users upload community media into their own folder" on storage.objects;
drop policy if exists "users read media referenced by visible content or owned by them" on storage.objects;
drop policy if exists "users delete their own community media" on storage.objects;

create policy "active users upload community media into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_user()
  );

create policy "active users read media referenced by visible content or owned by them"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'community-media'
    and public.is_active_user()
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.posts
        where posts.media_url = storage.objects.name
          and (posts.state = 'visible' or posts.author_id = (select auth.uid()) or public.is_moderator())
      )
      or exists (
        select 1 from public.short_videos
        where short_videos.video_url = storage.objects.name
          and (short_videos.state = 'visible' or short_videos.author_id = (select auth.uid()) or public.is_moderator())
      )
    )
  );

create policy "active users delete their own community media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_user()
  );
