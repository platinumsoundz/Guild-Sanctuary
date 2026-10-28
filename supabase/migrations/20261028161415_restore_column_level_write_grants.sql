-- Restore the original least-privilege column allowlists after table grant cleanup.
REVOKE INSERT, UPDATE ON TABLE public.posts FROM authenticated;
REVOKE INSERT (id, user_id, title, content, created_at, author_id, media_type, media_url, story_tag, state, updated_at, world_type)
  ON TABLE public.posts FROM authenticated;
REVOKE UPDATE (id, user_id, title, content, created_at, author_id, media_type, media_url, story_tag, state, updated_at, world_type)
  ON TABLE public.posts FROM authenticated;
GRANT INSERT (author_id, world_type, content, media_url, media_type, story_tag)
  ON TABLE public.posts TO authenticated;
GRANT UPDATE (content, media_url, media_type, story_tag)
  ON TABLE public.posts TO authenticated;

REVOKE INSERT, UPDATE ON TABLE public.events FROM authenticated;
REVOKE INSERT (id, creator_id, world_type, title, description, latitude, longitude, starts_at, ends_at, state, created_at)
  ON TABLE public.events FROM authenticated;
REVOKE UPDATE (id, creator_id, world_type, title, description, latitude, longitude, starts_at, ends_at, state, created_at)
  ON TABLE public.events FROM authenticated;
GRANT INSERT (creator_id, world_type, title, description, latitude, longitude, starts_at, ends_at)
  ON TABLE public.events TO authenticated;
GRANT UPDATE (title, description, latitude, longitude, starts_at, ends_at)
  ON TABLE public.events TO authenticated;

REVOKE INSERT, UPDATE ON TABLE public.short_videos FROM authenticated;
REVOKE INSERT (id, author_id, world_type, video_url, caption, state, created_at)
  ON TABLE public.short_videos FROM authenticated;
REVOKE UPDATE (id, author_id, world_type, video_url, caption, state, created_at)
  ON TABLE public.short_videos FROM authenticated;
GRANT INSERT (author_id, world_type, video_url, caption)
  ON TABLE public.short_videos TO authenticated;
GRANT UPDATE (caption, video_url)
  ON TABLE public.short_videos TO authenticated;

REVOKE INSERT ON TABLE public.profiles FROM authenticated;
REVOKE INSERT (id, username, display_name, avatar_url, created_at, updated_at, status, bio, website, status_message, banner_url, theme_color, location, age, star_sign, belief, social_links, privacy, role, suspended_until, allow_direct_messages, allow_profile_discovery, visibility, equipped_frame, equipped_effect, equipped_badge, equipped_banner)
  ON TABLE public.profiles FROM authenticated;
GRANT INSERT (id, username, display_name) ON TABLE public.profiles TO authenticated;

REVOKE ALL ON TABLE public.content_reports FROM authenticated;
REVOKE INSERT (id, reporter_id, target_type, target_id, reason, details, status, reviewed_by, reviewed_at, created_at)
  ON TABLE public.content_reports FROM authenticated;
REVOKE UPDATE (id, reporter_id, target_type, target_id, reason, details, status, reviewed_by, reviewed_at, created_at)
  ON TABLE public.content_reports FROM authenticated;
GRANT SELECT ON TABLE public.content_reports TO authenticated;
GRANT INSERT (reporter_id, target_type, target_id, reason, details)
  ON TABLE public.content_reports TO authenticated;
GRANT UPDATE (status, reviewed_by, reviewed_at)
  ON TABLE public.content_reports TO authenticated;
