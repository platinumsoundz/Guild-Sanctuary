# Phase 1 — Close-friends beta readiness checkpoint

Date: 2026-10-30 (UTC)
Repository: `platinumsoundz/Guild-Sanctuary`
Baseline main before this checkpoint: `7a8d91f9df3f89ee3af80d65f61d61387a274c14`
Integrated access commit: `49948b4af9fd9a108f9b7a00808527dca88c912b`
Status: **IMPLEMENTATION HANDOFF — OWNER USER ACCEPTANCE PENDING**

This report records verified repository and connected-service observations. It is not a substitute for staging acceptance, two-account browser tests, or owner release approval.

## Completed in this checkpoint

- Merged PR [#306](https://github.com/platinumsoundz/Guild-Sanctuary/pull/306) using squash merge at `49948b4af9fd9a108f9b7a00808527dca88c912b`.
- Integrated staged guest/basic/VIP/staff navigation and direct-route page gates.
- Guest public showcase is Today, Community preview, Discover preview, Roadmap, Support and Feedback. Guest access to Events, Shorts, Cosmic Arcade, Messages, Profile, Planner, Notifications, Wallet and Token Shop is excluded.
- Basic users receive the stable member set; VIP preview pages are role-gated. Moderator/admin/developer/owner tools remain role-gated.
- Unknown roles and unknown pages fail closed, including inherited JavaScript object properties.
- Feedback remains available to guests and members; the feedback inbox remains developer/owner-only.
- Token spending remains disabled. No live checkout or wallet-spending permission was enabled.
- The PR's CI, typecheck/build, screenshot and CodeQL checks passed on its exact head before merge. Mainline CI passed on merge commit `49948b4af9fd9a108f9b7a00808527dca88c912b`. The mainline Cloudflare workflow was cancelled after a subsequent push superseded it; the PR's Cloudflare build-only check passed, but no production deploy is confirmed. The docs-only report commit was subsequently updated to `1a5100419c9ef7b930e59ab8fec3d77c3a9a312a`.

## Current verified blockers

### P0 — Environment and migrations

- Production Supabase project inspected: `xgpzvmhldyoyrwwebcic` (Guild-Sanctuary).
- A second connected project `kchrskkchoyqweowskxv` has a different, staging-like migration ledger. Its purpose was not independently confirmed; do not assume it is the authorised staging project.
- The production migration ledger and checked-in migration filenames are not a one-to-one match. The second project's ledger is also different. Recover original SQL and reconcile each version before applying any migration.
- The repository contains duplicate migration version prefixes:
  - `20261030100000_personal_planner_world_scoped_storage.sql`
  - `20261030100000_token_cosmetics_and_premium_themes.sql`
  - `20261030120000_allow_members_to_delete_own_notifications.sql`
  - `20261030120000_first_100_signup_bonus_500.sql`
- Do not simply rename/reorder these files or run `supabase db push`: the production ledger already contains later, differently versioned migrations. First reconstruct provenance and exact SQL equivalence.
- No database migration was applied by this checkpoint.

### P0 — Moderation and privileged operations

- `public.get_moderation_queue()` is absent, but the active `fetchModerationQueue` implementation intentionally reads `content_reports` under RLS and resolves target ownership through `get_report_target_owner()`. The missing RPC is not itself a blocker; the current RLS-backed query and report/action lifecycle still require end-to-end role testing. Private message report bodies are intentionally not previewed.
- Existing SECURITY DEFINER RPCs, including role-change and moderation functions, require per-function authorization, search-path, grants, hierarchy, and concurrency review.
- Leaked-password protection was reported disabled by the Supabase security advisor.
- `game_wallet_sessions` and `stripe_payment_entitlements` have RLS enabled without client policies in the inspected schema. Treat this as intentional deny-by-default unless a reviewed use case proves otherwise.
- Token spending is owner-only at the database grant layer and must stay disabled for ordinary users.

### P0 — Messaging and account privacy

- Persistent messaging tables and policies exist in the inspected production schema, but repository documentation still contains stale descriptions of in-memory/demo messaging and older schema snapshots. Reconcile documentation and the actual runtime flag/configuration.
- Required acceptance: two independent accounts send/receive, refresh, read receipts, DM preference enforcement, account switching, and unauthorized conversation access.
- End-to-end encryption and audio/video calling are not closed-friends beta requirements and must not be advertised as shipped.

### P0 — Deployment and client QA

- Vercel production is now `READY` on app commit `49948b4af9fd9a108f9b7a00808527dca88c912b`; main is one later docs-only commit ahead (`08c2be8476a592a79b32c7e5f438abed37fc9d5e`). This confirms the guest/basic access integration is deployed on Vercel, but does not prove browser journeys or Supabase correctness.
- Cloudflare's production SHA is not confirmed. Its workflow is intentionally build-only on push/PR and requires an explicit manual dispatch to deploy; the latest mainline run was cancelled. Do not treat the successful PR build as a production deployment.
- Desktop, Android portrait/landscape, narrow mobile, keyboard navigation, and accessibility smoke tests remain outstanding.
- No close-friends invite should be sent until the approved candidate is deployed and the P0 acceptance suite passes.

## Open pull-request handling

Do not merge all open PRs indiscriminately. The remaining open PR set includes drafts, stacked PRs, and security/payment changes. In particular:

- #305 is a draft migration/index change whose database effects and file versions need reconciliation against both live ledgers before merge.
- #230 and #261 are draft wallet/moderation/role changes and need staging security acceptance.
- #260 is optional calling work and remains out of beta scope.
- #203, #205 and #232 are stacked on non-main parents; do not retarget them without reconstructing their full diff.
- #200 and #81 are draft security/backend work; inspect and integrate only after current-main reconciliation and independent review.
- #189 member discovery and #85 beta showcase require diff-based review against current main; no force merge.

No branches were deleted or force-pushed in this checkpoint.

## Required Phase 1 exit gates

- [ ] Confirm the designated staging Supabase project and its owner-approved disposable/restore plan.
- [ ] Reconcile the full production and staging migration ledgers to source SQL; resolve duplicate version prefixes without replaying already-applied work.
- [ ] Complete the role/RLS/RPC security review, including moderation hierarchy and concurrent role changes.
- [ ] Resolve the missing moderation queue RPC or remove/disable the unsupported dashboard path.
- [ ] Verify auth registration, login, logout, session expiry, password reset and account recovery.
- [ ] Verify two-account messaging, preferences, read receipts and privacy.
- [ ] Verify community post/comment edit-delete-like-report flows and discover privacy.
- [ ] Verify Events and Shorts core journeys, reporting and notifications.
- [ ] Verify planner/reflection persistence, deletion and cross-account isolation.
- [ ] Verify guest/basic/VIP/moderator/admin/developer/owner navigation and direct API access with real accounts.
- [ ] Confirm Vercel and Cloudflare serve the same approved release candidate and correct environment variables.
- [ ] Complete desktop/mobile/Android, keyboard/accessibility and error-state QA.
- [ ] Verify backup/restore and rollback procedures.
- [ ] Keep checkout, token spending, ads and mandatory Terms gates disabled until their separate release gates pass.
- [ ] Record evidence for every test and obtain explicit owner go/no-go approval.

## Decision

**NOT READY FOR CLOSE-FRIENDS BETA.** The access-boundary integration is merged, but the database target/migration provenance, moderation, messaging, cross-account privacy, deployment parity, and real-device acceptance gates remain unresolved. This is a controlled stabilisation checkpoint, not a release declaration.


## Owner-directed Phase 1 handoff — 2026-10-30

The owner has confirmed that the application is behaving as intended in their testing and has asked that remaining product/user-journey testing be left to them. No Supabase staging branch is to be created, and no branch/compute charge is authorised.

### Additional read-only production security audit

- Re-inspected production `public` SECURITY DEFINER functions using read-only catalog queries. Their functions are pinned to an empty `search_path`; the 16 advisor warnings identify authenticated execution of exposed SECURITY DEFINER RPCs, not proof that all 16 are exploitable.
- `apply_moderation_action`, `get_moderation_report_context`, and `get_report_target_owner` all check `public.is_moderator()`. The role-change function validates active caller status, role rank, self-change prevention, and target-role rank before writing an audit event.
- Conversation creation checks caller authentication/active status, caller membership, member counts, recipient availability and DM preferences. Read-receipt updates require active conversation membership and a direct conversation.
- `submit_content_report` checks active-user status, validates target visibility and applies a per-user rate limit; message reports additionally require active conversation membership.
- Token-spending and profile-cosmetic SECURITY DEFINER functions are not executable by the authenticated role in the inspected ACLs; token spending remains disabled at the application/release boundary.
- `game_wallet_sessions` and `stripe_payment_entitlements` have RLS enabled without client policies and remain deny-by-default. No broad policies or grants were added.
- Leaked-password protection remains flagged by the advisor. The available connected controls do not expose a safe Auth configuration update in this workflow; it has not been changed through SQL.
- No database schema or Auth configuration was changed in this pass. No Supabase branch was created. No cost was incurred.

### Handoff boundary

- The owner is taking over hands-on user acceptance: account journeys, role-by-role navigation, messaging, community, Events/Shorts, planner/reflection, and desktop/Android/mobile behaviour.
- The Phase 1 access-boundary implementation is merged. Vercel's approved app commit remains `49948b4af9fd9a108f9b7a00808527dca88c912b`.
- Cloudflare production parity is not independently confirmed; the repository workflow builds on push and deploys only on manual dispatch. Do not describe it as deployed until a successful production deployment is observed.
- Migration-ledger reconciliation remains a controlled release-engineering task. Do not run `supabase db push`, rename duplicate migration prefixes, or apply production DDL as a shortcut.
- Keep checkout, ads, and token spending disabled. Do not merge stale/stacked security or payment PRs merely to clear the queue.

**Status: IMPLEMENTATION HANDOFF — OWNER USER ACCEPTANCE PENDING.** This records the owner's decision to take over product testing; it does not claim that Cloudflare deployment parity, Auth leaked-password protection, or migration-ledger reconciliation has been completed.
