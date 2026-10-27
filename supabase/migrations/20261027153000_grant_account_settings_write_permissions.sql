-- Restore the table-level write privileges required by the account settings browser service.
-- Existing owner-scoped RLS policies remain the row-level security boundary.
-- Reviewed against live project xgpzvmhldyoyrwwebcic on 2026-10-27:
-- RLS is enabled and SELECT/INSERT/UPDATE policies restrict access to auth.uid().
-- The authenticated role currently has SELECT only; INSERT/UPDATE grants are missing.

begin;

grant select, insert, update on table public.account_settings to authenticated;

commit;
