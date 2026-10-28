-- Performance-only database hardening for The Sanctuary.
-- Adds indexes for foreign-key joins identified by Supabase Performance Advisor.
CREATE INDEX IF NOT EXISTS audit_events_actor_id_idx ON public.audit_events (actor_id);
CREATE INDEX IF NOT EXISTS content_reports_reviewed_by_idx ON public.content_reports (reviewed_by);
CREATE INDEX IF NOT EXISTS conversations_created_by_idx ON public.conversations (created_by);
CREATE INDEX IF NOT EXISTS direct_conversation_pairs_second_user_id_idx ON public.direct_conversation_pairs (second_user_id);
CREATE INDEX IF NOT EXISTS event_rsvps_user_id_idx ON public.event_rsvps (user_id);
CREATE INDEX IF NOT EXISTS events_creator_id_idx ON public.events (creator_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS moderation_actions_actor_id_idx ON public.moderation_actions (actor_id);
CREATE INDEX IF NOT EXISTS moderation_actions_report_id_idx ON public.moderation_actions (report_id);
CREATE INDEX IF NOT EXISTS notifications_actor_id_idx ON public.notifications (actor_id);
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON public.posts (author_id);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS profiles_equipped_frame_idx ON public.profiles (equipped_frame);
CREATE INDEX IF NOT EXISTS profiles_equipped_effect_idx ON public.profiles (equipped_effect);
CREATE INDEX IF NOT EXISTS profiles_equipped_badge_idx ON public.profiles (equipped_badge);
CREATE INDEX IF NOT EXISTS profiles_equipped_banner_idx ON public.profiles (equipped_banner);
CREATE INDEX IF NOT EXISTS short_videos_author_id_idx ON public.short_videos (author_id);
CREATE INDEX IF NOT EXISTS social_comments_author_id_idx ON public.social_comments (author_id);
CREATE INDEX IF NOT EXISTS social_likes_user_id_idx ON public.social_likes (user_id);
CREATE INDEX IF NOT EXISTS token_entitlements_item_id_idx ON public.token_entitlements (item_id);
CREATE INDEX IF NOT EXISTS token_spend_ledger_item_id_idx ON public.token_spend_ledger (item_id);

-- Wrap auth.uid() in a scalar subquery so it is evaluated once per statement.
DROP POLICY IF EXISTS "Users can read their own daily reflections" ON public.daily_reflections;
CREATE POLICY "Users can read their own daily reflections"
  ON public.daily_reflections FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can create their own daily reflections" ON public.daily_reflections;
CREATE POLICY "Users can create their own daily reflections"
  ON public.daily_reflections FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own daily reflections" ON public.daily_reflections;
CREATE POLICY "Users can update their own daily reflections"
  ON public.daily_reflections FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own daily reflections" ON public.daily_reflections;
CREATE POLICY "Users can delete their own daily reflections"
  ON public.daily_reflections FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
