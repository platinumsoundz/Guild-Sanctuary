-- Restore account_settings writes after privilege hardening revoked table-level grants.
-- RLS remains enabled and the existing authenticated owner-only policies remain in force.
grant select, insert, update on table public.account_settings to authenticated;
