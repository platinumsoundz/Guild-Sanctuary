-- Tighten table-level grants while retaining intentional RLS-mediated access.
REVOKE ALL ON TABLE public.audit_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.audit_events TO authenticated;

REVOKE ALL ON TABLE public.moderation_actions FROM anon, authenticated;
GRANT SELECT ON TABLE public.moderation_actions TO authenticated;

REVOKE ALL ON TABLE public.content_reports FROM anon;
REVOKE DELETE ON TABLE public.content_reports FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.content_reports TO authenticated;

-- Guest access is read-only; authenticated writes remain constrained by RLS.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.posts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.posts TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.events FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.short_videos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.short_videos TO authenticated;

-- Match the existing self-profile INSERT policy with its table privilege.
GRANT INSERT ON TABLE public.profiles TO authenticated;
