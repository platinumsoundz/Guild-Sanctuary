-- Restore the authenticated Data API privileges required by the personal Planner.
-- Row-level security remains enabled; the existing owner-only policies continue to
-- restrict each user to their own planner records.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.personal_planner_data
TO authenticated;
