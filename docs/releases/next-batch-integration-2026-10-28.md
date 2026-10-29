# Next batch integration record — 2026-10-28

Tracking issue: https://github.com/platinumsoundz/Guild-Sanctuary/issues/206

## Candidate status
This clean-main candidate selectively ports the cosmic mobile shell/theme files onto current `main` without importing the stale feature branch's commit history. The latest mainline notification-panel fix and its regression contract are preserved rather than overwritten. The candidate remains an open review PR and has not been merged to `main` or deployed.

## Owner-approved workflow
Ashley approved automatic Vercel preview builds/comments on prepared integration branches. Production deployment, provider changes, live billing, and Supabase migration application remain gated.

## Completed in this candidate stack
- PR #210 adds the responsive shell/theme work, compact notification panel preservation, and separate public Sanctuary/Guild roadmaps. Its navigation and notification contract checks cover the top-left menu, removal of the oversized community-activity label from compact mode, no Token Shop/Admin header quick actions, and a compact overlay with a full-page notifications route.
- PR #211 was merged into this candidate branch on 2026-10-28 after its CI/build and desktop/mobile screenshot workflow passed. It adds regression checks for the exact `get_short_engagement_stats` and `toggle_short_like` RPC arguments and authenticated-user handling. This is source/CI verification only; live signed-in reaction testing remains outstanding.

## Next bounded batches
1. Review the shell/navigation visual preview against the latest UI requirements and confirm the PWA install banner remains compact and dismissible.
2. Reconcile Daily Reflection and planner persistence from PR #200 against the current candidate; treat its database-backed work as a separate review, not an automatic merge. Confirm migrations and live migration history before any schema action.
3. Verify the short-video engagement RPC on a signed-in test account; if it still fails, confirm the deployed app targets the expected Supabase project and inspect the PostgREST schema-cache response.
4. Review DM preference behaviour, reports, comment controls, auth/privacy and role boundaries without weakening access checks.
5. Unify event discovery changes only after comparing the competing branch heads and changed paths; keep account isolation and profile privacy server-enforced.
6. Selectively recover Guild browser arcade/controller and companion hub work. Keep calling/Cloud Lab behind explicit RLS, Realtime, ICE/TURN, deployment and two-device gates.
7. Run fresh CI and preview checks for the exact final candidate, record external build blockers, then complete staging/device/security acceptance and rollback documentation.

## Integration policy
For each source branch, refresh the head SHA and changed paths, inspect overlap with current main, port only the necessary files, run focused tests, and record a disposition: integrated, selectively recovered, blocked with exact reason, or preserved as superseded. Do not merge stale/diverged histories wholesale or delete branches merely to tidy up.

## Release safety
- Never apply migrations with a blind `supabase db push`; compare SQL and the live migration ledger first.
- Keep live token purchases disabled until privileged RPC access, idempotency, ledger integrity and owner approval are verified.
- Calling migrations remain unapplied until reviewed and applied through the approved process; ICE/TURN configuration and two-device tests are outstanding.
- Vercel preview/build rate limits have blocked recent runs; do not claim a Vercel build passed unless the exact run succeeds.
- No production deployment or provider configuration changes are included here.
- The 5 Sleeves repositories remain separate and untouched.
