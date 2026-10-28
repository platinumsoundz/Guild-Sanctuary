# Guild Sanctuary — AI Handoff / Restore Notes

Read `MASTER_BLUEPRINT.md` first; it is the product and technical roadmap. Preserve the existing modular Next.js App Router + TypeScript project structure and read project/Next.js guidance before changing code.

## Current product decisions

- The product is **The Sanctuary**. Guild Hall / dual-world switching is retired.
- Guest browsing remains read-only.
- The current implemented wallet scope is balance/history and fixed token bundles. The product owner has requested an unimplemented beta extension: friend-group testing first, then public beta; Stripe test-mode checkout in isolated staging only; a one-time 1,000-token bonus for the first 100 verified new accounts after beta opens; and a first-party cosmetics shop for frames, borders, profile skins/themes, and colours. No user listings, transfers, trading, or cash-out.
- `TOKEN_CATALOG_PROPOSAL.md` has a catalog/prices approved for isolated test-mode staging only, not production. No bonus-grant or token-spend path exists yet. Keep live sales off and redemption disabled until implementation, staging tests, and legal review pass.
- Tokens have no cash value. Account deletion currently cascades to the wallet and purchase ledger; the wallet UI discloses this.
- The voluntary Stripe donation link is external and does not grant tokens or account benefits. It is served only when `VERCEL_ENV=production` and `STRIPE_DONATION_LINK_ENABLED=true`; preview/local deployments fail closed under Vercel. AdSense is likewise disabled by default and requires an explicit flag plus production environment. Cloudflare is the current observed hosting target, so do not assume Vercel-specific guards are safe there; keep live config disabled until host-specific guards are reviewed.
- Do not use the shareable Stripe token Payment Link for in-app purchases: it cannot safely attribute a payment to the signed-in Sanctuary account. In-app checkout is a server-created Stripe Checkout Session tied to the authenticated user.

## Wallet implementation status

Wallet UI and backend foundation are in the repository, but this is **not deployed, tested, or ready for live payments**:

- Navigation and UI: `src/components/Navigation.tsx`, `src/components/AppWorkspace.tsx`, `src/context/AppContext.tsx`, and `src/modules/economy/`.
- Bundles: `tokens_100` (£1), `tokens_600` (£5), `tokens_1200` (£10).
- Supabase migration: `supabase/migrations/20261012000000_token_wallet_and_fulfillment.sql`. It creates owner-read-only wallet/ledger tables, and a service-role-only, transactional/idempotent purchase RPC. Account deletion cascades wallet history.
- Edge Functions: `supabase/functions/token-checkout/index.ts` requires an authenticated active profile, server-side fixed Price IDs, and checks Price amount/currency/mode before creating a Stripe Checkout Session. `supabase/functions/stripe-token-webhook/index.ts` verifies the raw Stripe signature and grants tokens only for valid paid sessions.
- `supabase/config.toml` keeps JWT verification on for checkout and off for the Stripe webhook (the webhook verifies Stripe signatures itself). The checkout function also requires `Origin` to exactly match the configured `APP_BASE_URL`, preventing preview deployments from using production checkout.
- `TOKEN_CHECKOUT_ENABLED=false` is the default. Staging may enable it only with Stripe test configuration after deployment and setup. Keep live checkout disabled until refund/chargeback handling and customer support policy are implemented and reviewed.
- Product-owner direction for beta policy: free beta tokens have no cash value and are non-refundable. Token purchases and external donations are intended to be non-refundable by default except a report/chargeback sent for manual review. For token-purchase cases, pause spending during review; decide case by case on full/partial refunds and whether to reverse remaining tokens or revoke the purchased item; do not create an automatic negative balance. Donations are not associated with wallets/items and are not reconciled by the app. This is not final legal language, and no refund/chargeback/reversal workflow is implemented. Obtain legal review and test these cases before live sales or redemption.
- The user requested Terms and Conditions access plus a required signup checkbox and durable version/time acceptance record. `TERMS_AND_CONDITIONS_DRAFT.md` is a placeholder draft, not production-ready legal text. Obtain approval/legal review for the operator, contact, jurisdiction, age, content license, privacy, deletion, support, and refund terms before presenting it as final or launching production signup.
- The Supabase migration has not been applied to the user's project. Functions are not deployed. No Stripe Price IDs, keys, or webhook secret were provided or configured.
- The earlier GitHub `validate` workflow was reported passing for commit `b08d405622bc32207050824e8af8c80719d867aa`; this predates the latest Shorts/PWA code. The current edits have not been typechecked, built, browser-tested, or deployed. The prior workspace had no shell/command tool and no `node_modules`; do not claim current checks passed.

## Latest changes and exact status

- Shorts: `supabase/migrations/20261013000000_short_engagement_stats.sql` adds server-side `get_short_engagement_stats` and `toggle_short_like`. `src/modules/shorts/service.ts`, `ShortsFeed.tsx`, and generated DB types use those RPCs for aggregate likes/counts. Comment reads/posts still use Supabase browser queries and depend on the existing social schema/RLS plus `20261011000000_repair_social_engagement_insert_policies.sql`. Guest engagement controls are disabled. The migrations are not confirmed applied; no staging like/comment check has run.
- Wallet: the reported `public.token_wallets` schema-cache error means the wallet migration is not applied to that Supabase project. A PostgREST cache reload cannot create the missing table.
- Messaging: both direct and group flows exist in the demo UI. Direct path: Messages → Find someone to message → Discover → search a public profile → Message. Group creation is in Messages and requires two other members. Active files are `src/modules/messages/MessagesInbox.tsx`, `DirectMessageThread.tsx`, `useDirectMessages.ts`, and `service.ts`. The active UI still uses the in-memory demo service; `supabaseRepository.ts` is not wired in. Persistent storage, realtime, RLS end-to-end checks, and production abuse/retention policy are unfinished. The inbox now presents separate one-to-one and group sections; direct CTA goes to Discover, where a profile's Message button opens the one-to-one thread. This UI clarification is unvalidated.
- PWA: code has been added in `src/app/manifest.ts`, `src/app/icon.tsx`, `src/app/apple-icon.tsx`, `src/app/pwa-icons/`, `src/lib/sanctuaryPwaIcon.ts`, `src/components/PwaInstallHelp.tsx`, and its CSS. It includes generated icons and browser-specific install guidance. No service worker/offline cache is included; installability is not offline support. No device/browser test or deployment has confirmed it, and Cloudflare compatibility of generated icon routes must be checked.
- Terms acceptance: Terms draft exists but the signup checkbox and durable accepted-version/time recording are not implemented. The Terms draft is not final legal advice.
- Hosting/validation: last known Workers build for `b08d405622bc32207050824e8af8c80719d867aa` was still in progress; deployment is unconfirmed. The reported CI pass for that commit predates current Shorts/PWA edits. Re-check current CI and Cloudflare status rather than repeating that old result.

## Handoff: next agent actions (small, modular tasks)

1. **Validate current code first.** Read this handoff, `MASTER_BLUEPRINT.md`, and applicable project/Next docs. Run `npm run typecheck`, `npm run build`, and the Deno Edge Function check if shell/dependencies are available. Fix only observed failures; keep each change focused in its feature module. Report exact commands/results.
2. **Apply staging migrations safely.** From the repository, use the intended staging project only:
   ```sh
   supabase link --project-ref <STAGING_PROJECT_REF>
   supabase migration list
   supabase db push --dry-run
   supabase db push
   ```
   Review the dry run first: `db push` applies *all* pending local migrations, not only the wallet migration. Pending work may include `20261011000000_repair_social_engagement_insert_policies.sql`, `20261012000000_token_wallet_and_fulfillment.sql`, and `20261013000000_short_engagement_stats.sql`. Never run against production without explicit approval. `NOTIFY pgrst, 'reload schema';` only refreshes the API cache after schema changes; it does not create tables/functions.
3. **Verify Shorts on staging.** With signed-in test accounts, check like/unlike, visible counts across users, comment load/post/count, RLS rejection for non-members/inactive users, and guest read-only behavior. Record failures and fix one service/RPC/policy area at a time. Do not claim comments are fixed end-to-end before this passes.
4. **Finish messaging in bounded steps.** Verify the new one-to-one entry point in `MessagesInbox` and the Discover → Message path. Separately, wire `MessagesInbox`/thread hooks to `supabaseRepository.ts` only after reviewing auth, `create_sanctuary_conversation`, membership/message policies, Realtime publication, and migration state. Test direct and group participants, unauthorized reads/writes, offline/reconnect, duplicate subscription events, and profile privacy. Keep files small and module-owned; do not combine the UX and persistence rewrites.
5. **Verify PWA separately.** Check manifest/192/512/Apple icon responses and install prompt behavior on Chromium desktop/Android, iOS Safari, and macOS Safari. Confirm behavior on the actual Cloudflare Worker build. No service worker is present: do not promise offline use. Keep browser-specific manual instructions and never promise an install prompt in every browser.
6. **Complete legal consent only after approval.** Obtain approved, versioned Terms and Privacy text first; implement explicit signup acceptance and durable version/timestamp recording in a focused auth migration/UI task. Do not ship placeholder terms as final.
7. **Check hosting and release gates.** Inspect the latest GitHub validation and Cloudflare Workers deployment; distinguish an Actions pass from a deployed worker. Review Vercel-specific Support/AdSense guards for Cloudflare before configuring any live values. Keep all live token checkout disabled.
8. **Follow the confirmed beta policy direction without enabling live sales.** Keep checkout test-mode-only in isolated staging; the bonus and cosmetics shop are not implemented. Use manual review for reported disputes and pause spending during review; no automatic negative balances. Obtain legal review and complete staging tests before production sales or redemption. Never ask for Stripe/Supabase secrets in chat.

## Required collaboration rules

- Treat `MASTER_BLUEPRINT.md` and this handoff as source-of-truth project context; update both when roadmap/status changes.
- Keep Supabase RLS enabled. No client-side wallet writes, client-supplied prices, user IDs, or fulfillment claims. Never expose Stripe or Supabase secret keys.
- Keep guest mode read-only. Never treat local demo balances or mock authentication as real accounts.
- Distinguish code added from SQL applied, functions deployed, and payments tested. Report only validations actually run.
- Keep changes beginner-maintainable: prefer small feature-owned components/services and focused migrations; avoid long all-in-one files and unrelated edits. Update the module README, `MASTER_BLUEPRINT.md`, and this handoff when behavior/status changes.
- Ask the user when a product, refund, chargeback, deletion, or spending policy is underspecified.


## Handoff update — 2026-10-27: Phase 1 and multi-agent work

Read `AGENTS.md` and `docs/AI_AGENT_OPERATING_MODEL.md` first. They are the cross-agent rules. Also read `ROADMAP.md` and `MASTER_BLUEPRINT.md` before changing code.

### Parallel workstreams

- **Product & Experience:** continue the visual foundation from PR #69 on `build/roadmap-theme-foundation-2026-10-27`. It is open/unmerged; verify current head, CI, and visual behavior before claiming completion.
- **Engineering & Reliability:** inspect PR #18 and `feature/phase1-trust-safety`; review age gate, terms acceptance, account deletion grace/restore/purge, refund/dispute handling, moderation roles/audit, and migration/test state. The checklist is `PHASE1_STAGING_CHECKLIST.md` on that branch; nothing in it is done until observed.
- **Roadmap & Integration:** use `build/phase1-agent-coordination-2026-10-27` for the shared AI rules and operating model. Keep canonical roadmap/blueprint/handoff updates coordinated.

### Immediate next actions

1. Confirm the current head and changed files for PRs #69 and #18; inspect workflow results for the exact heads.
2. Inventory all Phase 1 migrations and compare them with staging history read-only. Never blindly run `supabase db push` because it applies all pending migrations.
3. Run available static checks/tests on each branch. Record actual command output; if this environment cannot run shell commands or lacks secrets, mark the step blocked.
4. Only after a disposable/staging project and safe credentials are configured, execute `PHASE1_STAGING_CHECKLIST.md` using Stripe test mode. Keep live checkout, ads, mandatory Terms gate, and production migrations disabled.
5. Obtain independent review for security-sensitive changes. Do not merge or deploy just to make a checklist look complete.

### Honest status rule

Code, CI, staging, and production are separate states. A PR being open, a branch existing, a build passing, or a deployment being queued is not proof of production behavior. Report exact branch/commit and evidence; do not invent tests or claim a live update without checking the deployed revision.


## Handoff update — 2026-10-27: messaging reliability

- Product-owner priority: ordinary messaging reliability comes first; E2EE work is deferred.
- The active UI is still documented as using the in-memory demo service. The Supabase repository exists but is not confirmed wired into the active UI.
- Draft PR #109 adds static messaging contract checks; draft PR #110 fixes stale conversation state during thread switches and deduplicates send-response/realtime overlap. Neither is proof of live cross-account messaging.
- Next safe steps: inspect the exact PR heads and CI; trace the feature flag and service boundary; implement the UI/service wiring in a focused branch only after checking current open PR collisions; then provide a staging checklist for two-account tests. Owner performs provider/database operations.
- Required acceptance: direct and group conversations create successfully; messages persist after reload; sender and recipient see each message once; history and membership remain scoped; realtime reconnect errors are visible; a non-member cannot read or send; demo mode stays clearly separate from authenticated persistent mode.
- Do not claim live messaging, database migration application, or deployment until observed evidence exists. No E2EE changes are requested now.


## Latest verified checkpoint (2026-10-27)

- Repository: `platinumsoundz/Guild-Sanctuary`; default branch `main` at `6deb72e684f237020458d5bfdeca3dd6a5bdb739` after squash-merging PR #157.
- PR #157 merged: planner/reflection placement, responsive navigation, feed polish, regression contracts. CI/build workflow passed; Cloudflare deployment step skipped. Vercel deployment attempt was rate-limited. Production deployment is **not verified**.
- PR #170's CI and automated roadmap checks passed on head `fc4a98c4ee4b5bdcc052834e1cbb8c3f5fda6b76`; it remains open/draft. PRs #158–#170 remain dependent follow-up stack work; do not assume they are merged or live.
- PRs #155 and #156 overlap work included in #157; confirm no unique changes before closing them as superseded.
- Required manual gates still outstanding: authenticated two-account isolation checks, browser/device/mobile QA, staging RLS/RPC authorization tests, and the Phase 1 staging checklist.
- Messaging is not end-to-end encrypted. Static tests are not proof of live authorization. Reflection/planner data remain browser-local and not synced.
- User owns all Supabase, Stripe, Lemon Squeezy, Cloudflare, and Vercel account-level configuration and migrations. Do not alter these provider settings without a separate explicit owner task.
- Continue by verifying and integrating the dependent PR stack safely, re-running checks on each final head, and maintaining consistent status across `ROADMAP.md`, `MASTER_BLUEPRINT.md`, and this recovery checkpoint.

## Integration and release checkpoint — 2026-10-27 (latest)

### Merged to `main`
The following PRs are merged and present in the current mainline: #157–#170. The integration sequence covered responsive navigation/feed polish; notification accessibility and event-time clarity; private self-discovery export and session-state cleanup; an explicit end-to-end encryption readiness plan; notification action/session guards; static messaging RPC security contracts; message-thread and inbox account isolation; event and planner account isolation; fail-closed local reflection storage; and account-settings isolation. PR #155 and #156 were closed as superseded because their unique file changes were included in #157.

### Verification and deployment
- Integration commit after PR #170 merged (before memory-document commits): `d101c2dcf504fae4b8aa54855e293acd77b69700`.
- Mainline CI passed: run [40587495814](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495814).
- Automated roadmap/build check passed: run [40587495899](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495899).
- The repository's Cloudflare deployment workflow completed successfully: run [40587495817](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495817). This records workflow success, not a substitute for authenticated browser/device verification.
- Vercel had previously reported its daily deployment quota limit on preview checks. Do not treat that as a failure of the mainline CI or as proof of Vercel production deployment.

### Remaining release gates
- Authenticated browser/device QA is still outstanding: test account switching and isolation for settings, planner, reflections, events, inbox, message threads, and notification actions; verify mobile navigation, keyboard/focus behavior, event timezone display, and reflection storage-denial recovery.
- Messaging remains **not end-to-end encrypted**. The merged readiness document is a plan/gate, not cryptographic implementation. Static messaging contract checks do not prove live Supabase RLS/RPC authorization; two-account staging tests are required.
- Planner, daily reflection, and self-discovery answers/results remain browser-local/session-only as documented; do not describe them as account-synced or cloud-backed.
- Phase 1 is not end-to-end verified until the staging checklist, safety authorization tests, backup/restore and rollback review, and human release approval are complete.

### Open draft work to triage
- #145 — database-backed Daily Reflection recovery: review carefully against the now-merged local-only reflection implementation before integrating; it may change storage/privacy assumptions.
- #122 — guarded token-shop spending plus its merged static contract check: remains a draft; require full CI on the final feature head and live authorization/ledger tests before enabling spending.
- #84 and #81 — member-role authorization and moderation hierarchy: security-sensitive; require independent review and staging authorization tests.
- #85 — beta showcase collaboration; validate feature scope and safety before promotion.
- #5 — game wallet bridge; check compatibility with the token wallet/ledger and keep any spending/transfer claims disabled until verified.

### Owner-only provider handoff
Supabase schema/migrations/RLS and owner bootstrap; Stripe and Lemon Squeezy payment setup; Cloudflare/Vercel account settings, secrets, domains and provider configuration remain owner tasks. The successful Cloudflare workflow was the repository's existing automated release path; no provider account settings or secrets were edited in this cleanup.

## Continued cleanup checkpoint — 2026-10-27

### Mainline and draft status
- Mainline contains the merged privacy/reliability stack #157–#170. The preceding roadmap/recovery checkpoint commit is `aa70be864d8471aeb6af58fab010f758d4514415`; its CI run [40591789913](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591789913), roadmap/build check [40591789891](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591789891), and Cloudflare workflow [40591789945](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591789945) all passed. This documentation commit follows that checkpoint.
- Latest mainline CI, roadmap/build check, and repository Cloudflare deployment workflow passed on the pre-checkpoint mainline. Authenticated browser/device QA is still outstanding; workflow success alone is not proof of user-level acceptance.
- PR #145 (private database-backed Daily Reflection) has now been reconciled onto current main. Its CI, Daily Reflection contract, and dependency-map contract passed on head `b68da680269498b43a30e62635ce6e2848a3bd78`. It remains draft: the owner must approve the storage transition and apply the migration through the approved Supabase workflow, then run authenticated cross-account and failure-path tests. Do not merge/apply automatically.
- PR #122 (token redemption) now includes the token-spend contract from #124, rebased onto current main and merged into its draft branch at `f635b54712df8c3f8c520c2668d39c5a623c5b6a`. The purchase handler and buttons explicitly remain locked with `SPENDING_ENABLED = false`; CI [40591929788](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591929788), dependency-map [40591929744](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591929744), roadmap/build [40591929814](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591929814), and Cloudflare workflow [40591929809](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591929809) all passed on that exact feature head. Do not enable spending until the owner-approved migration and isolated staging ledger/authorization matrix pass.
- PR #124 was merged into PR #122's feature branch only (merge commit `f635b54712df8c3f8c520c2668d39c5a623c5b6a`) and is closed as merged; this did **not** merge token spending to `main`.
- PR #81 moderation hierarchy is rebased on current main at `3f113c7612eb5c0282512d705e7302aa2dda74d2`; CI, moderation contract, dependency-map and repository workflow checks passed. PR #84 member-role locking is rebased at `a4e816100e8a31a44c45c0ddf28769b79492bc3d`; CI, role-lock contract, dependency-map and repository workflow checks passed. Both remain draft because SQL migrations are not applied and independent staging/concurrency tests and security review are still required.
- PR #85 beta showcase remains non-mergeable and draft; reconcile its broad overlapping changes before promotion. PR #5 game-wallet bridge remains draft on a separate feature base and is blocked on migration/schema reconciliation and scoped game-ticket staging tests.

### Release gates and owner handoff
- Do not enable token spending, game-credit transfers, checkout, ads, mandatory Terms gating, or production migrations merely because source checks pass.
- Supabase schema/migrations/RLS/owner bootstrap, Stripe and Lemon Squeezy payment setup, and Cloudflare/Vercel account configuration, secrets, domains and provider settings remain owner-only handoff tasks. No provider account settings were changed in this cleanup.
- Messaging is not end-to-end encrypted. The readiness document is a plan only. Planner/reflection/self-discovery data must not be described as cloud-synced until the approved database work is applied and tested.
- Phase 1 remains **not end-to-end verified** until the staging checklist, authenticated two-account tests, browser/device QA, backup/restore and rollback review, independent security review, and owner release approval are recorded.
- **Dependency audit blocker resolved:** PR #171 updated Next.js to patched 16.4.3 and aligned the lockfile; its exact-head `npm ci` reported 0 vulnerabilities. Post-merge checks are pending.


## Critical dependency security fix — 2026-10-28

- Merged PR #171: https://github.com/platinumsoundz/Guild-Sanctuary/pull/171.
- Merge commit: `bb0fc5240a2bf571e86384197a37256a8faf85fb`.
- Updated Next.js from 16.4.0 to patched 16.4.3 and aligned `@next/env` and all eight platform-specific `@next/swc-*` lock entries with SHA-512 integrity pins. Existing `sharp` is 0.35.5.
- Added `npm run check:framework-security` to CI to prevent the locked Next.js version falling below 16.4.1 or the @next/env/SWC versions drifting from it, and to require sharp >= 0.35.5.
- On the exact PR head `7815b278c0f9938b5b3fa0dcf27e1071ea45fa22`, `npm ci` succeeded, the framework-security contract passed, full CI/typecheck/build passed, dependency-map contract passed, roadmap/build check passed, and the repository Cloudflare workflow passed. The same install log reported **0 vulnerabilities**.
- Post-merge verification passed on mainline documentation head `edb5f63c571cc69852024920409f81de507e4461`: CI [40672038270](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672038270), roadmap/build [40672037990](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672037990), and Cloudflare build/deploy [40672038151](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672038151). The CI install reports **0 vulnerabilities**, the framework-security contract passes, and the production build compiles.
- This dependency patch does not replace browser/device QA, staging authorization tests, independent security review or the Phase 1 release gates. Token spending remains disabled; messaging is not end-to-end encrypted; owner-only provider setup remains unchanged.


## Latest cleanup continuation — 2026-10-28

### Mainline and checks
- Current mainline integration/security checkpoint: `718210f99f9cc2316af784cf356219f9c42d8593`.
- Mainline CI passed: [40672381006](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672381006).
- Mainline automated roadmap/build check passed: [40672381046](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672381046).
- Mainline repository Cloudflare workflow passed: [40672380786](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672380786). This does not substitute for authenticated browser/device acceptance.
- PR #171 is merged. Next.js was patched to 16.4.3 with aligned lockfile entries; its recorded exact-head `npm ci` reported zero vulnerabilities. The mainline post-merge checks above are green.

### Current open draft queue (verified 2026-10-28)
- [#145 — private database-backed Daily Reflection](https://github.com/platinumsoundz/Guild-Sanctuary/pull/145): fixed a duplicate SQL mood-constraint declaration and added a contract assertion that catches duplicates. CI, Daily Reflection contract, and dependency-map checks passed on exact head `e85ac8654cf678b15d6e1d843c94296af96b12cc`; Cloudflare deployment run was cancelled by a later branch update and must not be called deployed. Keep draft until the owner approves the local-to-account-backed storage transition and applies the migration through the approved Supabase workflow; then test authenticated cross-account, storage failure, and deletion behavior.
- [#122 — token shop redemption](https://github.com/platinumsoundz/Guild-Sanctuary/pull/122): title/body now correctly state redemption remains locked pending staging. Fixed the static contract, which previously had contradictory grant-vs-revoke assertions and referenced undefined `resolve(root)`. The updated contract check passed on exact head `d87da8b8c7ac2063cd00d2f6c9a493bbb8f62247` ([run 40673060021](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40673060021)). `SPENDING_ENABLED = false`; the UI guard and SQL revoke migration keep spending disabled. Do not enable or merge as a live purchase feature until owner-approved migration reconciliation and authenticated staging ledger/idempotency/authorization tests pass.
- [#81 — moderation hierarchy](https://github.com/platinumsoundz/Guild-Sanctuary/pull/81) and [#84 — member-role locking](https://github.com/platinumsoundz/Guild-Sanctuary/pull/84): their recorded static CI/contracts passed; keep draft pending independent security review and owner-approved staging/concurrency tests for the SQL functions.
- [#85 — beta showcase](https://github.com/platinumsoundz/Guild-Sanctuary/pull/85): still non-mergeable; resolve overlapping broad changes before promotion.
- [#5 — game wallet bridge](https://github.com/platinumsoundz/Guild-Sanctuary/pull/5): still draft; recorded Cloudflare Workers builds failed. Diagnose build errors and reconcile wallet schema/session authorization before considering merge.

### Release gates remain open
- Authenticated browser/device QA for account-switch isolation, private planner/reflection/settings, inbox/thread/events/notifications, mobile navigation, keyboard/focus, and storage-denial recovery.
- Live Supabase RLS/RPC authorization and two-account messaging tests; static checks alone are insufficient.
- Messaging is **not end-to-end encrypted**. Planner and reflection currently remain browser-local until the owner-approved Daily Reflection storage migration is applied and verified; self-discovery results remain session-only.
- Phase 1 is not end-to-end verified until staging security tests, migration reconciliation, backup/restore and rollback review, independent review, and human owner release approval are documented.

### Owner-only provider handoff
Supabase schema/migrations/RLS/owner bootstrap; Stripe and Lemon Squeezy payment setup; Cloudflare/Vercel account settings, secrets, domains and provider configuration remain owner tasks. No provider account settings or secrets were changed in this cleanup.


## Final cleanup checkpoint — 2026-10-28 10:15 UTC

### Latest mainline verification
- Current main commit at the start of this checkpoint: `2342b8d6f061239ca46ffe88d6208998b3b94613` (token-spending fail-closed integration).
- CI passed on that exact SHA: [run 40674535609](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40674535609).
- Automated build/roadmap check passed on that exact SHA: [run 40674535516](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40674535516).
- Phase 1 dependency-map contract passed on that exact SHA: [run 40674535505](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40674535505).
- Repository Cloudflare workflow completed successfully on that exact SHA: [run 40674535617](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40674535617). Treat this as workflow evidence only; authenticated browser acceptance is still outstanding.

### Completed integration and safety decisions
- PR #122 is now merged as [commit 2342b8d](https://github.com/platinumsoundz/Guild-Sanctuary/commit/2342b8d6f061239ca46ffe88d6208998b3b94613). Token-shop spending is intentionally disabled in the UI and the spend RPC remains revoked until owner-approved migration reconciliation and authenticated staging checks pass. This is a safety lock, not a live purchase feature.
- PR #124's static token-spend contract check is merged as [commit f635b54](https://github.com/platinumsoundz/Guild-Sanctuary/commit/f635b54712df8c3f8c520c2668d39c5a623c5b6a).
- The account/session isolation and reflection-storage changes from #157–#170 remain integrated in mainline as previously documented.

### Remaining open draft PRs (current queue)
- [#145 — private database-backed Daily Reflection](https://github.com/platinumsoundz/Guild-Sanctuary/pull/145): do not merge until the owner approves the local-to-account-backed privacy/storage transition and applies/reconciles the migration. Require authenticated cross-account, deletion and failure-recovery tests.
- [#84 — member-role authorization](https://github.com/platinumsoundz/Guild-Sanctuary/pull/84) and [#81 — moderation hierarchy](https://github.com/platinumsoundz/Guild-Sanctuary/pull/81): remain draft pending independent security review and owner-approved staging/concurrency authorization tests.
- [#85 — beta showcase](https://github.com/platinumsoundz/Guild-Sanctuary/pull/85): remains draft/non-mergeable; reconcile broad overlapping changes before promoting.
- [#5 — game wallet bridge](https://github.com/platinumsoundz/Guild-Sanctuary/pull/5): remains draft; prior Cloudflare Workers builds failed. Diagnose the build and reconcile wallet schema/session authorization before promotion.

### Explicit release gates — not complete
- Authenticated browser/device QA across settings, planner, reflections, events, inbox, threads, notifications, mobile navigation, keyboard/focus, and storage-denial recovery.
- Live Supabase RLS/RPC authorization and two-account messaging tests; static contracts are not proof of production authorization.
- Messaging is **not end-to-end encrypted**. The E2EE readiness document is a plan, not a cryptographic implementation.
- Planner and reflection are still browser-local unless and until the owner-approved Daily Reflection migration is applied and verified; self-discovery results remain session-only.
- Backup/restore and rollback review, independent security review, staging sign-off and human release approval remain required for Phase 1.

### Owner-only provider handoff
Supabase schema/migrations/RLS/owner bootstrap; Stripe and Lemon Squeezy payment setup; Cloudflare/Vercel account settings, secrets, domains and provider configuration remain owner tasks. No provider account settings or secrets were edited as part of this cleanup.

## Current handoff: Sanctuary Connection Discovery (2026-10-28)

Read the “Sanctuary Connection Discovery” section in ROADMAP.md and the locked product direction in MASTER_BLUEPRINT.md before continuing.

- Working branch: feat/sanctuary-connection-discovery-2026-10-28.
- Agreed direction: People, Communities, and Topics are equally valid discovery paths. This is meaningful community connection, not dating.
- Reuse existing profile, feed, event, messaging, notification, and navigation systems; avoid duplicate social primitives.
- Keep private self-discovery reflections and questionnaire answers separate from discovery. Member interests are private by default; public interest discovery is opt-in and is gated by the public discoverable-profile projection.
- Current implementation includes People / Communities & Gatherings / Topics tabs, public-feed topic filtering, upcoming-event discovery, profile interest editing, public interest display, interest search, and explainable shared-public-interest suggestions. A first relationship slice now adds follow/unfollow, mutual connection requests with accept/decline, block/unblock, incoming request controls, private saved/hidden profile lists, profile reports through existing moderation, relationship notifications, RLS policies, and block-aware profile/feed/topic/event/comment filtering. Blocking also closes direct conversations, hides their prior visible messages, and prevents new direct conversations/messages.
- Database migrations: supabase/migrations/20261028150000_member_discovery_interests.sql, supabase/migrations/20261028170000_connection_relationships.sql, supabase/migrations/20261028180000_add_profile_report_target.sql, and supabase/migrations/20261028180100_profile_report_rpc.sql. All are committed but none has been applied to Supabase.
- Still outstanding: dedicated groups/community discovery, message-request policy integration, richer intention/preferences and questionnaire integration, connection request rate limiting/history, final upstream sync, and full validation.
- Upstream main was reconciled into this branch by merge commit 25b10a2c500f40a40cff8962b374787d7a728a57; the branch is now ahead of main and not behind. Recheck integration diffs and run the full suite before any PR/merge.
- Validation is incomplete: repository cloning was blocked by this runtime's network access. Vercel status reports a build-rate-limit/upgrade-plan failure, not compiler diagnostics; typecheck, lint, build, browser/device QA, and database/RLS tests remain unverified.
- Do not deploy during implementation. Finish integration and checks on the branch, document remaining staging gates, and leave release to the project's later combined release decision.

### Latest implementation checkpoint (2026-10-28)

- src/modules/profiles/components/ProfileDiscovery.tsx: accessible People, Communities & Gatherings, and Topics tabs; people search by public name or public interests; shared-interest suggestions explain the overlapping tags; topics use the existing public feed; gatherings use existing events.
- src/modules/profiles/components/ProfileInterestsEditor.tsx and src/modules/profiles/discoveryInterests.ts: member-controlled interests (up to 12), private by default, optional public discovery, local-demo fallback, and public-interest lookup.
- src/modules/profiles/components/PublicProfilePage.tsx: displays member-approved public interests while keeping profile/feed loading resilient if the optional interest lookup fails.
- supabase/migrations/20261028150000_member_discovery_interests.sql and src/services/supabase/database.types.ts: RLS-protected interest persistence and type definitions.
- scripts/check-discovery-interests-contract.mjs and npm run check:discovery-interests: static contract checks are wired into .github/workflows/ci.yml but have not been executed. supabase/tests/connection_relationships_rls.test.sql adds pgTAP schema/policy checks; these have not been run.

