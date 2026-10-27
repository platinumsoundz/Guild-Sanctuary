# Sanctuary Recovery Memory

Last updated: 2026-10-27
Repository: `platinumsoundz/Guild-Sanctuary`

## Current verified state
- Mainline privacy/reliability integration #157–#170 is merged. Latest integration commit at checkpoint: `d101c2dcf504fae4b8aa54855e293acd77b69700` (subsequent memory-doc commits may advance main).
- PR #155 and #156 were closed as superseded by #157.
- Mainline CI passed at [run 40587495814](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495814).
- Automated roadmap/build check passed at [run 40587495899](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495899).
- Existing Cloudflare deployment workflow succeeded at [run 40587495817](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495817). Do not infer authenticated browser QA or full Phase 1 readiness from that workflow alone.

## What was merged (#157–#170)
- Planner/reflection placement, mobile navigation and feed polish; notification accessibility and local event timezone clarity.
- Session-only self-discovery export and state reset; written E2EE readiness gates (not an E2EE implementation).
- Notification state/action isolation across account switches; static messaging RPC security contracts; message thread/inbox account isolation.
- Event and private planner account isolation; fail-closed local reflection storage; account settings isolation.

## Still unverified / not to overclaim
- Browser/device QA for mobile layouts, focus/keyboard behavior, storage denial/corruption, and account switching across all private modules.
- Live Supabase RLS/RPC authorization, two-account messaging persistence/delivery, and staging security tests.
- Messaging is not end-to-end encrypted. The E2EE document is a readiness plan only.
- Planner, reflection and self-discovery data remain browser-local or session-only, not account-synced/cloud-backed.
- Phase 1 staging checklist, backup/restore and rollback, independent security review and human release approval remain outstanding.

## Open draft PRs to triage
- #145 database-backed Daily Reflection recovery — review for conflicts with current local-only privacy/storage assumptions before merging.
- #122 token shop guarded spend RPC and #124 dependent static contract check — require full CI and live ledger/authorization tests before enabling spending.
- #84 member-role authorization and #81 moderation hierarchy — security-sensitive; require independent review and staging authorization tests.
- #85 beta showcase collaboration — validate scope and safety.
- #5 game wallet bridge — verify against wallet/ledger model; no spending/transfer claims until verified.

## Owner-only handoff tasks
The owner must handle Supabase schema/migrations/RLS/owner bootstrap, Stripe and Lemon Squeezy payment setup, and Cloudflare/Vercel account settings, secrets, domains and provider configuration. Do not change provider settings or secrets as part of code-only work. The existing Cloudflare workflow was triggered by mainline integration and reported success; this cleanup did not edit provider configuration.

## Next steps
1. Run authenticated browser/device QA across settings, planner, reflections, events, inbox, threads, notifications and mobile navigation.
2. Execute two-account staging tests for messaging and all relevant RLS/RPC boundaries.
3. Triage the open draft PRs in the order above, preserving safety gates and rerunning CI on exact final heads.
4. Keep the roadmap and blueprint aligned with tested, merged and deployed status. Never claim E2EE or Phase 1 completion without evidence.


## Continued cleanup checkpoint — 2026-10-27

### Mainline and draft status
- Mainline contains the merged privacy/reliability stack #157–#170. The latest code-integration checkpoint is recorded above; this documentation commit is based on main SHA `4676b77b7ab3d59a6dbb8143dd2353299b88354e`.
- Latest mainline CI, roadmap/build check, and repository Cloudflare deployment workflow passed on the pre-checkpoint mainline. Authenticated browser/device QA is still outstanding; workflow success alone is not proof of user-level acceptance.
- PR #145 (private database-backed Daily Reflection) has now been reconciled onto current main. Its CI, Daily Reflection contract, and dependency-map contract passed on head `b68da680269498b43a30e62635ce6e2848a3bd78`. It remains draft: the owner must approve the storage transition and apply the migration through the approved Supabase workflow, then run authenticated cross-account and failure-path tests. Do not merge/apply automatically.
- PR #122 (token redemption) was rebased onto current main at `7e6d346882fd031cd05cbad03ad82cff38d845d2`; CI, dependency-map contract and automated roadmap check passed. The shop's handler and purchase buttons explicitly remain locked with `SPENDING_ENABLED = false`.
- PR #124 (token spending contract) now preserves all current package scripts and runs `npm run check:token-spend` in CI. CI passed on head `d95344fdfcac0a46e9e9455e11b81500eafdef0e` (run [40591477589](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591477589)); the explicit lock assertions passed. Both #122 and #124 remain draft until the owner-approved migration and staging ledger/authorization matrix pass.
- PR #81 moderation hierarchy is rebased on current main at `3f113c7612eb5c0282512d705e7302aa2dda74d2`; CI, moderation contract, dependency-map and repository workflow checks passed. PR #84 member-role locking is rebased at `a4e816100e8a31a44c45c0ddf28769b79492bc3d`; CI, role-lock contract, dependency-map and repository workflow checks passed. Both remain draft because SQL migrations are not applied and independent staging/concurrency tests and security review are still required.
- PR #85 beta showcase remains non-mergeable and draft; reconcile its broad overlapping changes before promotion. PR #5 game-wallet bridge remains draft on a separate feature base and is blocked on migration/schema reconciliation and scoped game-ticket staging tests.

### Release gates and owner handoff
- Do not enable token spending, game-credit transfers, checkout, ads, mandatory Terms gating, or production migrations merely because source checks pass.
- Supabase schema/migrations/RLS/owner bootstrap, Stripe and Lemon Squeezy payment setup, and Cloudflare/Vercel account configuration, secrets, domains and provider settings remain owner-only handoff tasks. No provider account settings were changed in this cleanup.
- Messaging is not end-to-end encrypted. The readiness document is a plan only. Planner/reflection/self-discovery data must not be described as cloud-synced until the approved database work is applied and tested.
- Phase 1 remains **not end-to-end verified** until the staging checklist, authenticated two-account tests, browser/device QA, backup/restore and rollback review, independent security review, and owner release approval are recorded.
