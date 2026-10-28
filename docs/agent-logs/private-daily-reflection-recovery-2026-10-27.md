# Private Daily Reflection recovery — 2026-10-27

## Goal
Remove local-browser storage as the source of truth for sensitive daily reflections. Entries should belong to the authenticated account, be protected by row-level security, and never be published into the social feed automatically.

## Included in this draft
- Replaces the localStorage-backed reflection component with the previously reviewed database-backed implementation and compact mobile mood controls.
- Adds typed `daily_reflections` database access and a static contract check.
- Adds a proposed SQL migration with owner-scoped row-level security.
- Keeps guest mode read-only and does not claim that reflections provide diagnosis or treatment.

## Owner handoff — not performed here
The migration is checked into Git only. Ashley must review and apply it through the approved Supabase workflow on the intended active project, then test with two signed-in accounts. No SQL was applied, and no provider settings or deployment were changed by this work.

## Verification required
- GitHub CI and `npm run check:daily-reflection` on the exact PR head.
- Authenticated browser test for read, save, update, history, and confirmed deletion.
- Cross-account isolation test.
- Confirm no reflection data is written to localStorage and no entry appears in public posts.
