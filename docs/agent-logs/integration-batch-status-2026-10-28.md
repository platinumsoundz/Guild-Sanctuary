# Integration batch status — 2026-10-28

## Scope
Reconcile current Sanctuary mainline after merging the event map, community connection toolkit, Sanctuary Intelligence, Today home, Arcade separation and deployment guard.

## Mainline commits
- `a832dd366b7cd5f397cc5d47a4a269fb4dc7c585` — PR #185, Cloudflare production deploy requires manual workflow dispatch during integration.
- `3a74b959761d76ffc68e0aad7d50080b16031c54` — PR #184, event map discovery.
- `5b09b2d6e7a935bbae978624b6b9b4f95d9809ae` — PR #183, Life Lesson and Conversation Starter templates.
- `4e8c276e7d429f9b706d91c7aa935b014e874c98` — PR #181, Sanctuary Intelligence learning path.
- `b611c7cda823dcebbd22a3682b395d820705837b` — PR #178, Today home.
- `5e0b06afb0884374779fb62a667e96319eae470c` — PR #179, Cosmic Arcade / creator-project separation and classic games.

## Changes made during integration
- Added a production deployment guard before merging the feature batch. Cloudflare builds still run for PR/main; the deploy command only runs on explicit `workflow_dispatch`. No provider configuration or secrets were edited and no deployment was dispatched.
- Resolved the AppWorkspace/Navigation overlap between the Today home and Arcade shell changes. The combined navigation keeps Today reachable and routes the Games destination to Cosmic Arcade.
- GitHub CI caught a JSX parent-grouping error in an intermediate navigation commit. The conditional menu button and site-name label were separated correctly; the final integration head `093c8c29c4325617651428b7096665a50621e222` passed CI/typecheck/build and Cloudflare build.
- Updated ROADMAP statuses and added a consolidated open-work queue.

## Verification
- PR #184 exact head: CI, event contract, roadmap/build and Cloudflare Worker build passed; Vercel preview was blocked by the build-rate-limit failure.
- PR #183 exact head: feature contract, runtime tests, CI/typecheck/build and Cloudflare Worker build passed; Vercel preview was blocked by the build-rate-limit failure.
- PR #181 exact head: CI, self-discovery contract, typecheck/build and Cloudflare Worker build passed; Vercel preview was blocked by the build-rate-limit failure.
- PR #178 exact head: CI, Today-home contract, roadmap/build and Cloudflare Worker build passed; Vercel preview was blocked by the build-rate-limit failure.
- PR #179 final integration head `093c8c29c4325617651428b7096665a50621e222`: CI/typecheck/build, Daily Reflection contract, dependency-map contract, install-banner contract and Cloudflare Worker build passed. The Cloudflare deployment step was skipped.
- Mainline CI passed on `5e0b06afb0884374779fb62a667e96319eae470c`, run https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40703200916.
- Mainline Cloudflare Worker build was still in progress when this log was drafted. Verify the completed run and skipped deployment step before calling the post-merge worker build passed.
- Browser/device and screen-reader QA remain outstanding because the Vercel preview is rate-limited. No visual acceptance is claimed.

## Safety and owner gates
- The Arcade leaderboard SQL is merged as a migration file only; it has not been applied to Supabase.
- Token spending remains disabled. No wallet grants, deductions, checkout changes or provider operations were performed.
- Daily Reflection database migration (#145) remains blocked on owner approval, migration-history reconciliation and authenticated cross-account tests.
- Moderation (#81) and member-role authorization (#84) remain blocked on independent security review and owner-approved staging/concurrency tests.
- Beta showcase (#85) is non-mergeable and must be split/reconciled; do not force-merge.
- Game wallet bridge (#5) targets a heavily diverged feature base, not main; do not retarget without a dependency/schema review.
- No branches were force-pushed or deleted. Old branch cleanup requires checking for unique unmerged work.

## Rollback
- Revert the focused feature merge commits independently if needed.
- Revert PR #185 to restore the prior automatic deployment condition only when the owner explicitly resumes normal release behavior.
- Do not apply or revert database migrations as part of a source-code rollback; use the owner-approved database recovery procedure.

## Next steps
1. Confirm the post-merge Cloudflare build completed and deployment step was skipped.
2. Run browser/device QA once a Vercel preview is available.
3. Reconcile the remaining open PRs in the documented safety order.
4. Audit stale branches and close only those proven to contain no unique unmerged work.
