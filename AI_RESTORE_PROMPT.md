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
- #122 and #124 — guarded token-shop spending and its static contract check: dependent stack; require full CI and live authorization/ledger tests before enabling spending.
- #84 and #81 — member-role authorization and moderation hierarchy: security-sensitive; require independent review and staging authorization tests.
- #85 — beta showcase collaboration; validate feature scope and safety before promotion.
- #5 — game wallet bridge; check compatibility with the token wallet/ledger and keep any spending/transfer claims disabled until verified.

### Owner-only provider handoff
Supabase schema/migrations/RLS and owner bootstrap; Stripe and Lemon Squeezy payment setup; Cloudflare/Vercel account settings, secrets, domains and provider configuration remain owner tasks. The successful Cloudflare workflow was the repository's existing automated release path; no provider account settings or secrets were edited in this cleanup.