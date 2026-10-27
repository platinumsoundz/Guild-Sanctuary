-- Allow signed-in app users to purchase catalogue items through the guarded RPC.
-- Apply only after reviewing the function definition in the target Supabase project.
-- The function must remain SECURITY DEFINER, use an empty/locked search_path,
-- validate auth.uid() and active-user status, and perform all price/balance checks
-- server-side. Do not grant execution to anon or PUBLIC.

REVOKE ALL ON FUNCTION public.spend_tokens(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.spend_tokens(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.spend_tokens(text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.spend_tokens(text, uuid) TO authenticated;
