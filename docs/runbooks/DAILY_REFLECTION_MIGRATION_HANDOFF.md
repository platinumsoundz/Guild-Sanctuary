# Private Daily Reflection migration handoff

**Status:** repository migration proposal only; not applied to any Supabase project.
**Owner:** Ashley
**Related work:** private Daily Reflection database integration PRs #127 and #128.

## What this migration creates

- `public.daily_reflections`, one row per authenticated user and reflection date.
- A unique user/date index so one daily entry can be safely upserted.
- Length/type constraints for text, mood, prompt and tag fields.
- Row-level security with owner-scoped SELECT, INSERT, UPDATE and DELETE policies.
- Authenticated-only table grants and an explicit revoke for `anon`.

## Owner-only actions before applying

1. Confirm the target Supabase project and environment.
2. Review the migration against the live schema and migration ledger; do not blindly replay it if the table or policies already exist.
3. Inspect the SQL and verify RLS is enabled, policies use `auth.uid() = user_id`, and anonymous access remains revoked.
4. Apply it through the approved migration workflow and record the resulting migration version.
5. Read back the table definition, indexes, grants and RLS policies.
6. Test with two authenticated accounts: each account must be unable to read, update or delete the other's reflections; unauthenticated/anonymous access must fail.

## Important integration gate

The database-backed Daily Reflection UI must not be merged/enabled until Ashley confirms the migration is applied and read-back verified. Until then, the feature may surface a schema error. It must not silently fall back to a different storage mechanism or imply entries were saved.

This PR does not connect to Supabase, execute SQL, change provider settings, or deploy anything. The migration is source code only.
