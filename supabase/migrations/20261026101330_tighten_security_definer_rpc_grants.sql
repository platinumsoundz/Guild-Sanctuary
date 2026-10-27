-- These functions are intended for internal trigger/policy use, not anonymous RPC calls.
-- Trigger execution does not require callers to have EXECUTE on the trigger function.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- This helper is used by authenticated RLS policies and privileged routines.
-- Keep it available to signed-in users, but prevent anonymous/public invocation.
REVOKE EXECUTE ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
