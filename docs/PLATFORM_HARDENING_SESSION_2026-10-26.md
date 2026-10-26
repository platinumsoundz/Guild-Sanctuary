# Platform Hardening Session — 2026-10-26

This is the operational handoff for the next coordinated build session. It supplements `MASTER_BLUEPRINT.md`; it does not replace the established product decisions or authorize live payments, destructive database changes, or unreviewed changes to story canon.

## Verified snapshot

### Sanctuary app
- Main repository: [Guild-Sanctuary](https://github.com/platinumsoundz/Guild-Sanctuary).
- The password-reset contract checks are merged to `main` (PR #30). They validate source-level wiring, not delivery of real emails or a real-account reset.
- PR #31, [compact header and single install prompt](https://github.com/platinumsoundz/Guild-Sanctuary/pull/31), is merged. It removes the redundant global install-help panel and shortens the header/navigation. Source checks passed, but the Vercel production alias still points at an older commit because the Vercel API daily deployment limit was reached; do not infer a live Vercel rollout from CI.
- The active messaging service now has an opt-in persistent repository path with authenticated-session identity checks and Realtime subscription handling. The flag `NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES` remains `false`: the linked database has no expected conversation/message tables, and two-account RLS/Realtime staging checks have not passed. Continue to label messaging as demo-backed and not durable until those gates pass.
- Social engagement and PWA browser/device checks still need a real staging smoke test.

### Supabase production project
- The linked `Guild-Sanctuary` project is `ACTIVE_HEALTHY` in `eu-west-1`.
- The database migration ledger contains multiple migrations through 2026-10-26 that do not appear in the GitHub `supabase/migrations/` directory (including role-hierarchy/RPC grant hardening, notifications, game wallet sessions, terms acceptance, and view projections). This is **migration drift**. Reconcile the exact SQL and migration history before applying further schema changes or regenerating types.
- Current Supabase security advisor results include:
  - Warning: `is_active_user()`, `is_moderator()`, `search_members_for_admin(text)`, and `set_member_role(uuid,text)` are still reported as executable by `authenticated` while marked `SECURITY DEFINER`.
  - Warning: leaked-password protection is disabled.
  - Informational finding: `game_wallet_sessions` has RLS enabled with no policies. This can be intentional for service-role-only access, but verify all client roles are denied and server functions use the service role only where required.
- Performance advisor reports 14 foreign keys without covering indexes and four unused indexes. Treat this as an optimization backlog, not a reason to drop indexes blindly.
- Do not directly revoke function grants or change role-management SQL based only on lint text. First inspect function definitions, current ACLs, policies, call sites, and the untracked migration SQL; then create a migration that is safe, reviewed, and represented in Git.

## Priority order for the next build session

### P0 — Preserve deployability and recoverability
1. PR #31 is merged; verify the actual deployed commit before claiming the compact header is live. Vercel's daily deployment limit is a separate platform blocker.
2. Reconcile Supabase migration drift against the repo; capture the actual applied migration SQL into version control through a reviewed migration-history recovery plan. Never reset or recreate the production project to resolve drift.
3. Verify the production Auth redirect allowlist, email provider/template, and one controlled password-reset smoke test with an account whose owner can access the mailbox. Keep the account and existing user records intact.

### P1 — Security and roles
1. Audit RLS and effective grants for every exposed table and RPC, prioritizing role mutation, admin search, moderation, notifications, wallet, and game-wallet session tables.
2. Confirm the Owner bootstrap path is one-time, protected, and cannot be invoked by a normal signed-in user; validate the hierarchy: Basic User, VIP, Moderator, Admin, Developer, Owner.
3. Enable Supabase leaked-password protection after checking current auth settings and compatibility; document the change and test signup/password reset.
4. Add focused tests for unauthorized role escalation, cross-user data access, guest read-only behavior, and owner/admin operations.

### P2 — Durable community features
1. Persistent messaging repository/UI wiring and the authenticated-session identity guard are merged behind an opt-in flag. A guarded schema-repair migration is checked in, but staging/RLS/Realtime validation remains before activation.
2. Verify direct and group conversation membership, read receipts/unread state, realtime delivery, and RLS using two distinct test accounts.
3. Ensure notifications are persisted, recipient-scoped, and link to the right in-app destination.
4. Validate feed/Shorts likes and comments with the latest applied migrations and signed-in/guest roles.

### P3 — Cross-project roadmap
1. Keep The 5 Sleeves narrative repository canonical for lore and story; do not silently rewrite canon from the playable prototype.
2. Treat The 5 Sleeves 3D repository as a playable prototype; test-only Cipher equipment, prototype geography, and prototype economy must remain labelled as non-canon.
3. Recover and inspect the “branch - project access check” work state before touching its active files. Do not overwrite work in progress.
4. Stagger project tasks and report each project's chosen task, changed files, checks, blockers, and next step in the Sanctuary roadmap. Do not claim a background build ran unless an automation run or workflow record proves it.

## Release acceptance gates

A feature is not “done” merely because source code exists. Mark it complete only when applicable gates pass:
- source checks and typecheck;
- production build;
- migration present in Git and confirmed applied to the intended environment;
- security/RLS checks for the affected roles;
- end-to-end smoke test with real sessions and the intended browser/device;
- deployment URL/commit verified;
- rollback or recovery path documented for data/schema changes.

## Safety boundaries
- Keep existing accounts and records. No user deletion or role mutation is authorized by this handoff.
- Keep token purchases, token spending/redemption, transfers, marketplace, and cash-out disabled until staging, support/refund handling, and legal review are complete.
- Do not expose secrets, apply unreviewed SQL, or change story canon based on inference.


## Historical handoff snapshot — 2026-10-26 22:10 UTC

- PR #31 compact-header/PWA source change is merged; the current Vercel production alias still points to commit `8486da390b59183cf6de5a322c80e4497b755d3e`. Vercel reported the daily deployment quota limit, so do not claim the Vercel URL has the new header.
- PR #34 is merged as `db7ec76c228945c7fd748124142a083139857d6e`. The Systems & Roadmap page now lists Guild Sanctuary, The 5 Sleeves 2D and The 5 Sleeves 3D, with disabled visible placeholder actions for planned, preview and security-gated systems. GitHub CI and the Cloudflare build passed; the GitHub Cloudflare deploy step was skipped, so a production Worker update is not confirmed.
- PR #35 is merged as `19698353311ad2f1bfe03edc6fc56f8bd3533c0f`. Persistent messaging remains disabled by default because the live database schema is still missing the expected conversation/message tables. Do not turn on `NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES` until schema, RLS, Realtime and two-account staging checks are verified.
- The 2D main-branch scheduled suite on commit `b360d0654c7db3dff040d606fd2b2ae3ef3a9153` failed 4 of 145 tests: spawn/canon count (expected 5, actual 6), compact HUD bounds at phone size, fullscreen settings control expectation, and sleeve sprite channel placement. The report artifact is attached to run [40368414521](https://github.com/platinumsoundz/The-5-Sleeves/actions/runs/40368414521). Keep game-code changes on hold until the separate “branch - project access check” verdict is recovered.
- The 2D and 3D README project-name corrections are merged in their respective repositories. Existing 3D save-recovery PR #1 remains untouched.
- No production database, accounts, roles, token balances, Stripe settings or user data were changed.


## Verified build update — 2026-10-26 22:33 UTC

- **Cloudflare production Worker deployed:** `https://guild-sanctuary.thesmarthub.workers.dev`. GitHub workflow [40412968808](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40412968808) completed successfully; its log confirms the OpenNext build and `wrangler deploy`. The deployed source commit at that point was `2c29679eef11da783c0824db1d7422d6bd47a13`.
- **GitHub CI passed on that commit:** PWA checks, auth-flow contract checks, messaging persistence/identity checks, Deno checks for token checkout/webhook functions, TypeScript typecheck and Next.js production build.
- PR #36 is merged: roadmap cards now show disabled placeholder actions for every non-Available system, with status-specific text. The unconfigured The 5 Sleeves 2D launch button says Coming soon. Private messaging is correctly marked Preview until persistent storage is verified.
- PR #39 is merged as `93c43602b56748dcd76742ba78f6222d6bd47a13`: a guarded, idempotent schema-repair migration and staging-first runbook are in Git. **The migration has not been applied to production.** The live catalog still lacks the expected messaging tables, so keep `NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES=false`.
- PR #44 is merged as `2c29679eef11da783c0824db1d7422d6bd47a13`: persistent messaging now fails closed when the app's user ID does not match the authenticated Supabase user, and CI asserts this behavior.
- **Vercel remains blocked:** the Vercel deployment API returned HTTP 402 because the free-tier daily deployment limit was exceeded for 24 hours. The `guild-sanctuary.vercel.app` alias still points to the older deployment. No billing or plan settings were changed. Use the verified Cloudflare Worker URL above while the Vercel limit is unresolved.
- The latest The 5 Sleeves 2D main-branch suite still fails 4 of 145 tests: canon/world spawn count, compact phone HUD bounds, fullscreen settings expectation, and sleeve sprite channel placement. See [run 40410217327](https://github.com/platinumsoundz/The-5-Sleeves/actions/runs/40410217327). Game-code edits remain on hold pending recovery of the “branch - project access check” verdict.
- The 5 Sleeves 2D and The 5 Sleeves 3D naming corrections are merged. The existing 3D save-recovery draft PR #1 remains untouched pending browser/device checks.
- No production database migrations, account/role changes, wallet changes, payment activation or user-data changes were made.


## Read-only security review — 2026-10-26 22:34 UTC

Live catalog and ACL checks on the linked Supabase project confirmed:

- `is_active_user()`, `is_moderator()`, `search_members_for_admin(text)`, and `set_member_role(uuid,text)` are SECURITY DEFINER functions with an empty search path. Their ACLs grant execution to `authenticated` and `service_role`, not `anon` or `PUBLIC`.
- `search_members_for_admin` checks that the caller is an active admin, developer, or owner and bounds the search query. `set_member_role` rejects self-role changes, validates target roles, requires an active caller, enforces rank-based authorization, and records role changes in `audit_events`.
- `profiles` has RLS enabled; authenticated users can read their own profile, insert only a basic active profile, and update their own profile only through the active-user gate.
- `notifications` has RLS enabled and authenticated read/update policies are scoped to `recipient_id = auth.uid()`.
- `token_wallets`, `token_ledger`, and `token_entitlements` have RLS enabled, authenticated table privileges are read-only, and their policies scope reads to the authenticated user's own `user_id`.
- `game_wallet_sessions` has RLS enabled, no client-facing policies, and table ACLs grant access only to `postgres` and `service_role`. This is consistent with a service-role-only design; do not add authenticated policies without reviewing its server-side call path.
- The Supabase advisor still reports leaked-password protection disabled. It remains a release-hardening task; this review did not change Auth settings.

No SQL, grants, policies, account roles, token balances or user data were changed during this read-only review. The findings are evidence for the next hardening step, not authorization for automatic production mutations.


## Session continuation — 2026-10-26 22:35 UTC

- PR #37 merged the Arcade's visible, disabled future-system placeholders. CI, PWA/auth checks, Deno checks, typecheck and production build passed.
- PR #38 merged `docs/SUPABASE_MIGRATION_DRIFT_INVENTORY_2026-10-26.md`, recording exact live-only and repository-only migration versions, the current public table inventory, and a safe reconciliation sequence.
- PR #40 and PR #44 merged the persistent-messaging identity gate and fail-closed mismatch handling. Messaging contract checks, auth checks, typecheck and production build passed. The feature flag remains disabled.
- PR #43 enabled the guarded main-branch Cloudflare deployment path. The main run for commit `2c29679eef11da783c0824db1d7421ccda84b2fa` completed the Cloudflare deploy step successfully. A live fetch of `https://guild-sanctuary.thesmarthub.workers.dev/` returned HTTP 200 on 2026-10-26. The Vercel alias is still stale, and the Supabase redirect allowlist for the Workers URL has not been independently verified, so do not switch the canonical host without an auth smoke test.
- Vercel API deployment attempts remain blocked by the free daily deployment quota (HTTP 402, retry after 24 hours). The Vercel production alias last verified still points to `8486da390b59183cf6de5a322c80e4497b755d3e`; do not claim it contains the new UI until a new production deployment is verified.
- The 3D repository has static hosting/PWA smoke tests on main; its automated suite passed. The 2D main-branch suite still reports the same four failures: spawn/canon count, phone HUD bounds, fullscreen settings expectation, and sleeve sprite channel placement. The “branch - project access check” verdict was not recoverable, so game-code edits remain on hold.
- Scheduled build/report runs are now staggered: Guild Sanctuary at :17, The 5 Sleeves 2D at :37, The 5 Sleeves 3D at :57. Push and PR checks remain immediate.
- No production database, user accounts, roles, token balances, payment settings, or story canon were changed.
