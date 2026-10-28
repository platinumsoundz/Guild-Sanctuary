# Private Daily Reflection migration handoff

**Status:** live database migration is applied and read-back verified; UI database integration is now implemented in PR #200. Browser end-to-end verification remains pending.
**Owner:** Ashley
**Related work:** private Daily Reflection database integration PRs #127 and #128.

## What this migration creates

- `public.daily_reflections`, one row per authenticated user and reflection date.
- A unique user/date index so one daily entry can be safely upserted.
- Length/type constraints for text, mood, prompt and tag fields.
- Row-level security with owner-scoped SELECT, INSERT, UPDATE and DELETE policies.
- Authenticated-only table grants and an explicit revoke for `anon`.

## Live verification

The table, unique user/date index, owner-scoped SELECT/INSERT/UPDATE/DELETE policies, and authenticated-only grants are present in the connected project. The `updated_at` timestamp is now set by a database trigger. Anonymous SELECT access is not granted.

## Remaining verification

1. Sign in as two different authenticated users and confirm neither can read, update, or delete the other's reflections.
2. Test save, update, history load, clear-history, and account switching in a real browser.
3. Confirm legacy local entries migrate only when absent from the database and are removed from local storage only after a successful database write.

## Important integration gate

The UI now uses the database as its authoritative store and does not write new reflections to localStorage. If the database is unavailable or the active auth user does not match the supplied account ID, it fails closed and displays an error rather than silently switching storage. Legacy browser entries are imported once, preserving database rows as authoritative for dates already present.

This PR does not connect to Supabase, execute SQL, change provider settings, or deploy anything. The migration is source code only.
