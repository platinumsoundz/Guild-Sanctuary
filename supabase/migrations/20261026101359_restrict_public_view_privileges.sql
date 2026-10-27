-- These views are read-only API surfaces. Keep intended public discovery/count reads,
-- but remove unnecessary write, truncate, trigger, reference, and other privileges.
REVOKE ALL PRIVILEGES ON TABLE public.public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.event_rsvp_counts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.event_rsvp_counts TO anon, authenticated;
