-- Consolidate legacy permissive policies so suspended accounts cannot bypass
-- the active-account guard through older post/event-specific policies.
DROP POLICY IF EXISTS "sanctuary comments add" ON public.social_comments;
DROP POLICY IF EXISTS "sanctuary event comments add" ON public.social_comments;
DROP POLICY IF EXISTS "users add own comments" ON public.social_comments;
CREATE POLICY "active users add comments to visible targets"
  ON public.social_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND public.is_active_user()
    AND public.social_target_is_visible(target_type, target_id)
  );

DROP POLICY IF EXISTS "sanctuary comments read" ON public.social_comments;
DROP POLICY IF EXISTS "sanctuary event comments read" ON public.social_comments;
DROP POLICY IF EXISTS "visible short comments readable" ON public.social_comments;
CREATE POLICY "visible comments and own comments readable"
  ON public.social_comments FOR SELECT TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR (
      state = 'visible'::public.content_state
      AND target_type IN ('post'::public.report_target_type, 'event'::public.report_target_type, 'short'::public.report_target_type)
      AND public.social_target_is_visible(target_type, target_id)
    )
  );

DROP POLICY IF EXISTS "sanctuary likes add" ON public.social_likes;
DROP POLICY IF EXISTS "sanctuary event likes add" ON public.social_likes;
DROP POLICY IF EXISTS "users add own likes" ON public.social_likes;
DROP POLICY IF EXISTS "users add own comment likes" ON public.social_likes;
CREATE POLICY "active users add likes to visible targets"
  ON public.social_likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_active_user()
    AND public.social_target_is_visible(target_type, target_id)
  );

DROP POLICY IF EXISTS "sanctuary likes read" ON public.social_likes;
DROP POLICY IF EXISTS "sanctuary event likes read" ON public.social_likes;
DROP POLICY IF EXISTS "visible comment likes readable" ON public.social_likes;
CREATE POLICY "own likes and visible target likes readable"
  ON public.social_likes FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      target_type IN ('post'::public.report_target_type, 'event'::public.report_target_type, 'comment'::public.report_target_type)
      AND public.social_target_is_visible(target_type, target_id)
    )
  );
