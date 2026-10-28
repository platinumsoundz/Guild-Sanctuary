# Next batch integration record — 2026-10-28

Tracking issue: https://github.com/platinumsoundz/Guild-Sanctuary/issues/206

## Candidate status
This clean-main candidate selectively ports the cosmic mobile shell/theme files onto current `main` without importing the stale feature branch's commit history. The latest mainline notification-panel fix and its regression contract are preserved rather than overwritten. This is still a draft candidate, not a merged or deployed release.

## Owner-approved workflow
Ashley approved automatic Vercel preview builds/comments on prepared integration branches. Production deployment, provider changes, live billing, and Supabase migration application remain gated.

## Next bounded batches
1. Review shell/navigation changes against the latest UI requirements: keep navigation top-left, remove the oversized header and top Token Shop/Admin buttons, keep notifications as a compact overlay that preserves the page behind it, and provide a full-page notifications option.
2. Split the public roadmaps: Sanctuary covers platform/community and beta readiness; Guild covers browser arcade, game library, media lounge and integrations. Exclude The 5 Sleeves 2D/3D from both public roadmaps.
3. Verify the short-video engagement RPC, DM preference behaviour, reports, comment controls, auth/privacy and role boundaries.
4. Reconcile Daily Reflection branches into one private account-scoped implementation and unify event discovery changes without duplicate migrations.
5. Selectively recover Guild browser arcade/controller and companion hub work. Keep calling/Cloud Lab behind explicit RLS, Realtime, ICE/TURN, deployment and two-device gates.
6. Run fresh CI and preview checks, record exact failures, then complete staging/device/security acceptance and rollback documentation.

## Integration policy
For each source branch, refresh the head SHA and changed paths, inspect overlap with current main, port only the necessary files, run focused tests, and record a disposition: integrated, selectively recovered, blocked with exact reason, or preserved as superseded. Do not merge stale/diverged histories wholesale or delete branches merely to tidy up.

## Release safety
- Never apply migrations with a blind `supabase db push`; compare SQL and the live migration ledger first.
- Keep live token purchases disabled until privileged RPC access, idempotency, ledger integrity and owner approval are verified.
- Calling migrations remain unapplied until reviewed and applied through the approved process; ICE/TURN configuration and two-device tests are outstanding.
- No production deployment or provider configuration changes are included here.
- The 5 Sleeves repositories remain separate and untouched.
