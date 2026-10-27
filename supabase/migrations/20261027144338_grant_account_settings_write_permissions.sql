-- Restore table-level write privileges required by the account settings browser service.
-- The existing owner-scoped RLS policies remain the row-level security boundary.
-- Live verification on 2026-10-27 confirmed RLS is enabled and the policies restrict
-- SELECT/INSERT/UPDATE to auth.uid(). The authenticated role was missing INSERT/UPDATE.
-- Applied to Supabase project xgpzvmhldyoyrwwebcic as migration
-- 20261027144338_grant_account_settings_write_permissions; see the agent log for evidence.

begin;

grant select, insert, update on table public.account_settings to authenticated;

commit;
