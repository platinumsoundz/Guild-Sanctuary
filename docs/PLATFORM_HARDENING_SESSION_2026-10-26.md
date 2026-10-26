# Platform Hardening Session — 2026-10-26

This is the operational handoff for the next coordinated build session. It supplements `MASTER_BLUEPRINT.md`; it does not replace the established product decisions or authorize live payments, destructive database changes, or unreviewed changes to story canon.

## Verified snapshot

### Sanctuary app
- Main repository: [Guild-Sanctuary](https://github.com/platinumsoundz/Guild-Sanctuary).
- The password-reset contract checks are merged to `main` (PR #30). They validate source-level wiring, not delivery of real emails or a real-account reset.
- PR #31, [compact header and single install prompt](https://github.com/platinumsoundz/Guild-Sanctuary/pull/31), is open. It removes the redundant global install-help panel and shortens the header/navigation. GitHub CI passed, including PWA/auth checks, Deno checks, TypeScript typecheck, and production build. The Cloudflare workflow also completed successfully for the PR. Vercel preview deployment is blocked by its daily deployment limit, so don't infer a Vercel preview or production rollout from these checks.
- The app's current messaging UI is still primarily in-memory/demo-backed. The Supabase repository exists but is not connected to the active UI. Do not advertise messages as durable or real-time until the repository is wired and tested end-to-end.
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
1. Keep PR #31 isolated until the branch's checks are green and deployment implications are understood. Do not merge merely to bypass the Vercel preview limit.
2. Reconcile Supabase migration drift against the repo; capture the actual applied migration SQL into version control through a reviewed migration-history recovery plan. Never reset or recreate the production project to resolve drift.
3. Verify the production Auth redirect allowlist, email provider/template, and one controlled password-reset smoke test with an account whose owner can access the mailbox. Keep the account and existing user records intact.

### P1 — Security and roles
1. Audit RLS and effective grants for every exposed table and RPC, prioritizing role mutation, admin search, moderation, notifications, wallet, and game-wallet session tables.
2. Confirm the Owner bootstrap path is one-time, protected, and cannot be invoked by a normal signed-in user; validate the hierarchy: Basic User, VIP, Moderator, Admin, Developer, Owner.
3. Enable Supabase leaked-password protection after checking current auth settings and compatibility; document the change and test signup/password reset.
4. Add focused tests for unauthorized role escalation, cross-user data access, guest read-only behavior, and owner/admin operations.

### P2 — Durable community features
1. Wire the existing Supabase messaging repository into the active Messages UI behind a small service boundary; keep demo mode explicit when configuration is absent.
2. Verify direct and group conversation membership, read receipts/unread state, realtime delivery, and RLS using two distinct test accounts.
3. Ensure notifications are persisted, recipient-scoped, and link to the right in-app destination.
4. Validate feed/Shorts likes and comments with the latest applied migrations and signed-in/guest roles.

### P3 — Cross-project roadmap
1. Keep The 5 Sleeves narrative repository canonical for lore and story; do not silently rewrite canon from the playable prototype.
2. Treat The 5 Sleeves 3D/training-ground repository as a playable slice; test-only Cipher equipment, test-world geography, and prototype economy must remain labelled as non-canon.
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


## Live handoff update — 2026-10-26 22:10 UTC

- PR #31 compact-header/PWA source change is merged; the current Vercel production alias still points to commit `8486da390b59183cf6de5a322c80e4497b755d3e`. Vercel reported the daily deployment quota limit, so do not claim the Vercel URL has the new header.
- PR #34 is merged as `db7ec76c228945c7fd748124142a083139857d6e`. The Systems & Roadmap page now lists Guild Sanctuary, The 5 Sleeves 2D and The 5 Sleeves 3D, with disabled visible placeholder actions for planned, preview and security-gated systems. GitHub CI and the Cloudflare build passed; the GitHub Cloudflare deploy step was skipped, so a production Worker update is not confirmed.
- PR #35 is merged as `19698353311ad2f1bfe03edc6fc56f8bd3533c0f`. Persistent messaging remains disabled by default because the live database schema is still missing the expected conversation/message tables. Do not turn on `NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES` until schema, RLS, Realtime and two-account staging checks are verified.
- The 2D main-branch scheduled suite on commit `b360d0654c7db3dff040d606fd2b2ae3ef3a9153` failed 4 of 145 tests: spawn/canon count (expected 5, actual 6), compact HUD bounds at phone size, fullscreen settings control expectation, and sleeve sprite channel placement. The report artifact is attached to run [40368414521](https://github.com/platinumsoundz/The-5-Sleeves/actions/runs/40368414521). Keep game-code changes on hold until the separate “branch - project access check” verdict is recovered.
- The 2D and 3D README project-name corrections are merged in their respective repositories. Existing 3D save-recovery PR #1 remains untouched.
- No production database, accounts, roles, token balances, Stripe settings or user data were changed.
