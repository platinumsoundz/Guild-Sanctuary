-- Remove client privileges that bypass RLS or are not needed by application clients.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Account settings: users may only supply ownership/preferences, and only edit preferences.
REVOKE INSERT, UPDATE ON TABLE public.account_settings FROM authenticated;
REVOKE INSERT (user_id, preferences, updated_at) ON TABLE public.account_settings FROM authenticated;
REVOKE UPDATE (user_id, preferences, updated_at) ON TABLE public.account_settings FROM authenticated;
GRANT INSERT (user_id, preferences) ON TABLE public.account_settings TO authenticated;
GRANT UPDATE (preferences) ON TABLE public.account_settings TO authenticated;

-- RSVPs: only event/user/status can be supplied; only status can be edited.
REVOKE INSERT, UPDATE ON TABLE public.event_rsvps FROM authenticated;
REVOKE INSERT (id, event_id, user_id, status, created_at, updated_at) ON TABLE public.event_rsvps FROM authenticated;
REVOKE UPDATE (id, event_id, user_id, status, created_at, updated_at) ON TABLE public.event_rsvps FROM authenticated;
GRANT INSERT (event_id, user_id, status) ON TABLE public.event_rsvps TO authenticated;
GRANT UPDATE (status) ON TABLE public.event_rsvps TO authenticated;

-- Messages: clients can insert only the sender, conversation, and body; server controls state/timestamps/read markers.
REVOKE INSERT, UPDATE ON TABLE public.messages FROM authenticated;
REVOKE INSERT (id, conversation_id, sender_id, body, state, sent_at, read_at) ON TABLE public.messages FROM authenticated;
REVOKE UPDATE (id, conversation_id, sender_id, body, state, sent_at, read_at) ON TABLE public.messages FROM authenticated;
GRANT INSERT (conversation_id, sender_id, body) ON TABLE public.messages TO authenticated;

-- Comments: preserve own-comment editing, but only the body is client-editable.
REVOKE INSERT, UPDATE ON TABLE public.social_comments FROM authenticated;
REVOKE INSERT (id, target_type, target_id, author_id, body, state, created_at) ON TABLE public.social_comments FROM authenticated;
REVOKE UPDATE (id, target_type, target_id, author_id, body, state, created_at) ON TABLE public.social_comments FROM authenticated;
GRANT INSERT (target_type, target_id, author_id, body) ON TABLE public.social_comments TO authenticated;
GRANT UPDATE (body) ON TABLE public.social_comments TO authenticated;

-- Likes are insert/delete toggles; clients must not rewrite existing like rows.
REVOKE INSERT, UPDATE ON TABLE public.social_likes FROM authenticated;
REVOKE INSERT (id, target_type, target_id, user_id, created_at) ON TABLE public.social_likes FROM authenticated;
REVOKE UPDATE (id, target_type, target_id, user_id, created_at) ON TABLE public.social_likes FROM authenticated;
GRANT INSERT (target_type, target_id, user_id) ON TABLE public.social_likes TO authenticated;
