# Next Batch Integration Record — 2026-10-28

Tracking issue: https://github.com/platinumsoundz/Guild-Sanctuary/issues/206

## State
- Integration branch created from `main`: `release/next-batch-integration-2026-10-28`.
- This is a coordination/release record, not proof that feature code has been integrated or deployed.
- Owner approved automatic Vercel preview builds/comments for prepared integration branches on 2026-10-28.
- Production deployment, Supabase migrations, provider settings, secrets, and live billing remain gated.

## Release intent
Produce one reviewable beta candidate from current, compatible work. Do not merge all divergent branches wholesale. Reconstruct/select changes against the current mainline, with fresh tests and explicit branch dispositions.

## Current integration queue

| Batch | Sources to inspect | Required outcome | Gate |
| --- | --- | --- | --- |
| Shell and navigation | `feat/unified-navigation-notifications`, `feat/sanctuary-frontend-polish-2026-10-28`, `feat/cosmic-mobile-ui-2026-10-28`, `feat/pwa-install-banner-mainline-2026-10-27` | Preserve top-left navigation; compact notification overlay that preserves the current page; remove oversized Guild/Sanctuary and Community Activity header; remove top token-shop/admin buttons; reconcile account/guest actions, theme, and compact install prompt | Resolve overlapping files against current main; run UI contracts and preview |
| Roadmap scope | `feat/guild-browser-arcade-first-2026-10-28` and current `main` | Sanctuary roadmap covers platform/community and release readiness; Guild roadmap covers games, arcade, library, media lounge and integrations; The 5 Sleeves excluded from both public roadmaps | Add/execute roadmap contract and inspect public rendered copy |
| Core correctness | issue #76, issue #71/#77/#78, current feed/messaging/report components | Verify short engagement RPC; review auth/roles, DM preferences, reports, comments and privacy | Code + test evidence; no assumed live schema changes |
| Daily Reflection | `feat/database-backed-daily-reflection-2026-10-27`, `feat/private-daily-reflection-diary-2026-10-27`, `feat/private-database-daily-reflection-recovery-2026-10-27` | One account-scoped design; no duplicate or conflicting migration paths | Compare migration history and current main before choosing one source |
| Events and identity | `feat/event-discovery-map-explorer-2026-10-28`, `feat/events-map-discovery-2026-10-28`, related connection branches | One coherent event discovery/location/identity experience | Review overlapping paths, data privacy, and tests |
| Guild browser Arcade | `feat/guild-browser-arcade-first-2026-10-28`, `feat/hidden-guild-world-blueprint-2026-10-28`, Cosmic Arcade branches | Selectively recover controller-first games, companion library and media features | Do not wholesale merge divergent history; calling stays gated until RLS, Realtime, ICE/TURN and two-device tests are verified |
| Beta/release gates | issue #100, #105, #73, #78 and `docs/full-beta-release-gate.md` from relevant branch | One evidence-based release checklist and branch disposition register | Fresh checks; explicit unresolved external/provider actions; rollback plan |

## Initial divergence snapshot (must refresh before source changes)
- `feat/guild-browser-arcade-first-2026-10-28`: 270 ahead / 1 behind main.
- `feat/sanctuary-beta-showcase-collaboration-2026-10-27`: 174 ahead / 136 behind.
- `feat/unified-navigation-notifications`: 14 ahead / 183 behind.
- `feat/database-backed-daily-reflection-2026-10-27`: 17 ahead / 118 behind.
- `feat/private-daily-reflection-diary-2026-10-27`: 11 ahead / 118 behind.
- `feat/event-discovery-map-explorer-2026-10-28`: 25 ahead / 10 behind.
- `feat/events-map-discovery-2026-10-28`: 31 ahead / 10 behind.
- `feat/cosmic-mobile-ui-2026-10-28`: 47 ahead / 1 behind.
- `feat/sanctuary-frontend-polish-2026-10-28`: 18 ahead / 1 behind.

## Checks and constraints
- A prior checked Guild Arcade head had successful GitHub Actions results for CI, Phase 1 dependency-map contract, visual-preview screenshots, and Daily Reflection contract.
- Vercel status returned a build-rate-limit failure. Preview permission does not remove provider quota limits.
- Guild calling migrations remain unapplied; Edge Function/configuration and two-device browser checks are outstanding.
- Do not apply migrations with a blind `supabase db push`; reconcile the actual live migration ledger and SQL first.
- Do not enable live Stripe/token purchases until privileged RPC grants, idempotency, ledger integrity, and release approval are verified.
- The 5 Sleeves projects are out of scope for this repository integration and must remain untouched.

## Branch disposition register
Fill in for every relevant branch/PR during execution:
- **Integrated:** changes selectively ported, reviewed and tested on this branch.
- **Preserve / recover selectively:** useful work exists but ancestry is stale or overlaps newer code.
- **Blocked:** named missing test, provider permission, quota, migration decision or owner action.
- **Stale / no longer needed:** only after confirming all useful work is superseded; preserve branch unless deletion is separately justified.

## Completion checklist
- [ ] Refresh main SHA, open PRs, source branch heads and changed-file overlap.
- [ ] Integrate shell/navigation batch first and run fresh tests.
- [ ] Separate public Sanctuary and Guild roadmaps; add contract coverage.
- [ ] Reconcile core RPC, auth/privacy, messaging and moderation issues.
- [ ] Choose one Daily Reflection implementation and one migration plan.
- [ ] Reconcile event discovery and member identity branches.
- [ ] Selectively recover Guild features and document calling release gates.
- [ ] Record every branch/PR disposition with evidence.
- [ ] Run full CI and available Vercel preview; record quota failures honestly.
- [ ] Complete release checklist, rollback plan, and owner-only provider actions.
- [ ] Only then consider merge to main; production deployment and database changes remain separate gated actions.
