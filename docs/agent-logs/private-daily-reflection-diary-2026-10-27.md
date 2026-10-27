# Private daily reflection diary — 2026-10-27

## User requirement
Daily reflections must save to the database as a private diary/feed, not to browser storage. Users should be able to revisit entries across devices and sessions.

## Implemented on this branch
- Proposed migration creates `public.daily_reflections` with one row per user per local reflection date, mood, intention, reflection content, timestamps, and JSON arrays for optional prompts/tags.
- RLS select/insert/update/delete policies bind every operation to `auth.uid() = user_id`; anonymous grants are revoked.
- Added generated-style database typing for the new table.
- Added `src/modules/practice/service.ts` for authenticated owner verification, reverse-chronological database reads, idempotent per-day upsert, and owner-scoped history deletion.
- Rewired `DailyReflection.tsx` to read/write/delete through that service. Removed localStorage persistence entirely.
- Added account-switch clearing/loading state, save/delete progress states, actionable database errors, previous-entry history, bounded inputs, confirmation before deleting the diary, and private-by-default messaging.
- Added `npm run check:daily-reflection` static contract check.

## Security/privacy
- Reflection rows are separate from public `posts`; no automatic sharing.
- UI uses the authenticated Supabase session and checks that its user ID matches the account being rendered.
- RLS is the final row-level boundary; client-side owner filters are not treated as a security control on their own.
- No mental-health diagnosis or treatment claims are made.
- No local browser copy is retained. A database save failure is surfaced rather than falsely reported as saved.

## Important status and owner handoff
- Migration is a proposal in this PR and has **not** been applied to Supabase. Ashley retains provider-side migration responsibility.
- Until the migration is applied to the intended active project, the new UI will report a database/schema error rather than silently falling back to local storage.
- Browser verification using a real authenticated session remains required after migration application.
- This branch has not been merged or deployed.

## Verification
- Added static checks for no browser storage, matching authenticated owner, user/date upsert, RLS policies, private history, and bounded content.
- Automated GitHub Actions results must be checked against the latest PR head before claiming they pass.
- No live data was inserted or deleted during this work.

## Next steps
1. Review CI and typecheck/build for the current PR head.
2. Ashley reviews and applies the migration through the approved Supabase workflow.
3. Test create/update/reload, account switching, owner isolation with two accounts, history rendering, and delete-history flow in a real browser.
4. Only then mark end-to-end persistence as verified.
