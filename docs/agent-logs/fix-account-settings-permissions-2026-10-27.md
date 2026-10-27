# Account settings write-permission repair

- Date: 2026-10-27
- Scope: fix the table-level grants behind the reported `permission denied for table account_settings` error.
- Repository: `platinumsoundz/Guild-Sanctuary`
- Branch: `fix/account-settings-permissions-2026-10-27`
- PR: https://github.com/platinumsoundz/Guild-Sanctuary/pull/125

## Evidence and change

Before the repair, `public.account_settings` had RLS enabled and owner-scoped SELECT/INSERT/UPDATE policies, but the `authenticated` database role had only SELECT at the table ACL level. PostgreSQL table grants are required in addition to RLS policies, so the existing policies alone could not permit saves.

Migration `20261027144338_grant_account_settings_write_permissions.sql` grants SELECT, INSERT, and UPDATE to `authenticated`. It does not grant DELETE, does not grant anonymous access, and does not change the existing RLS policies.

## Live status

The owner explicitly asked to fix the reported error. The migration was applied to the active Supabase project `xgpzvmhldyoyrwwebcic` and the result was read back:
- ACL includes `authenticated=arw` (INSERT, SELECT, UPDATE).
- RLS remains enabled.
- Existing own-row policies remain in place for SELECT, INSERT, and UPDATE.

This verifies the database permission change only. A successful signed-in browser save has not yet been observed; refresh the app and test saving settings. Do not claim end-to-end UI verification until that succeeds.

## Tests

- Live ACL/RLS/policy read-back: passed.
- Browser save with a real authenticated session: pending.
- Automated repository tests/build: not run in this connector-only session.

## Safety, rollback, and next step

No anonymous grants or new policies were added. If rollback is needed, revoke INSERT and UPDATE from `authenticated` after confirming the settings UI no longer needs them; this would restore the original save failure. Next: confirm the UI save, then continue a separate roadmap workstream. No deployment or merge was performed.
