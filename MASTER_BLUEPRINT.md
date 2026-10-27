# The Sanctuary — Master Blueprint

Last updated: 2026-10-27

## Product decision

The product is **The Sanctuary** — a community system for personal growth, reflection, care, spiritual and everyday mental wellbeing, and connection. The former Guild Hall is retired. User-facing UI and documentation should use **The Sanctuary**, while the existing GitHub repository name and Android application ID remain unchanged for compatibility.

The mission: **personal growth inside a social environment, so nobody has to do it alone.**

The product roadmap and locked decisions live in [ROADMAP.md](ROADMAP.md). Key decisions: relationships use mutual friends plus one-way follows; guest mode is read-only; anonymous posting is out of scope; wisdom sharing and community support stay free; tokens remain cosmetic-only; no public vanity leaderboards, selling reach, cash-out, or medical/diagnostic claims. Self-discovery is optional and private by default. Do not mark planned features as live without deployed and tested evidence.

## Architecture

- `src/app/` owns Next.js App Router entry points.
- `src/context/AppContext.tsx` owns client navigation and the current demo/Supabase session. It does **not** own world state.
- `src/components/AppWorkspace.tsx` composes the authenticated feature surface; `Navigation.tsx` is a single Sanctuary navigation shell.
- `src/types/database.ts` contains shared entity contracts. Posts, Shorts, events, and conversations are community-wide entities.
- `src/modules/` owns feature UI, local state, and service APIs. Modules use their `index.ts` public entry points rather than sibling internals.
- The current social data layer is mostly in-memory for local demos. Supabase browser adapters are present for selected modules but are not production-ready without a complete Auth/RLS deployment and tests.

## Current feature ownership

| Module | Scope | Current persistence |
| --- | --- | --- |
| `auth` | Email-code sign-in/up, mock 2FA, session lifecycle | Browser-local demo store; optional Supabase browser flow |
| `feeds` | Unified post feed, media metadata, likes, comments | In-memory or optional Supabase adapter |
| `shorts` | Unified short video feed and engagement | In-memory or optional Supabase adapter |
| `events` | Community events and RSVPs | In-memory |
| `messages` | Direct one-to-one/group conversations and threads | Active UI uses in-memory demo service; optional Supabase repository is not wired into the UI |
| `profiles` / `settings` | Profile, discovery, privacy, local preferences | Browser-local demo store |
| `personal-planner` / `practice` | Private tasks, habits, daily notes, daily reflection | Browser local storage scoped by account ID; not cloud-synced; shared browser profile remains a privacy consideration |
| `moderation` | Report UI and moderator workflow contracts | Supabase-dependent when configured |
| `support` | Optional community support | Stripe donation link returned only on explicitly enabled Vercel Production deployments; no app-side reconciliation |
| `economy` | Persistent token wallet and bundle purchase foundation | Supabase wallet/ledger migration and Edge Functions staged; checkout disabled by default; no spending/transfers yet |
| `ads` | Responsive web display slots plus optional native AdMob placements | AdSense IDs via public build-time environment; native AdMob module not wired into the active shell |

## Current UI implementation checkpoint (2026-10-27)

- Daily Reflection is being moved from the community feed into the Personal Planner so personal reflection sits alongside tasks, habits, and notes. Treat this as in-code until the open PR is merged and authenticated browser/device QA is recorded.
- The current branch adds mobile bottom tabs for Today, Community, Discover, Messages, and You; Circles and Practice are not yet separate routes. Desktop navigation labels and touch targets are larger, and secondary destinations remain in the drawer.
- Feed posts use local relative timestamps with exact local time on hover/focus. Comment authors resolve to display names where available rather than exposing raw IDs; post reporting is tucked into a labelled overflow disclosure.
- CI now includes explicit navigation, feed-polish, planner, habit, daily-reflection, and theme-contrast contract checks on the open PR. Passing CI is not a substitute for browser QA or production verification.

## Sanctuary consolidation

The application contracts and local repositories have been unified: `worldType`, `activeWorld`, `entryWorld`, world switching, and per-world local stores were removed.

`supabase/migrations/20261010000000_unify_sanctuary_scope.sql` is an **expand migration** for existing databases. It normalizes legacy records to `sanctuary`, makes legacy scope columns default to `sanctuary`, and adds `create_sanctuary_conversation`. It intentionally does not drop the old columns or enum in the same release. Drop them only after the deployed application, generated database types, historical clients, RLS policies, indexes, and restore procedure have been reviewed and migrated together.

## Shorts engagement status

- Shorts likes/counts use `get_short_engagement_stats` and `toggle_short_like` RPCs in `src/modules/shorts/service.ts`; the functions are defined in `supabase/migrations/20261013000000_short_engagement_stats.sql` so counts are not truncated by client-side RLS.
- Comment reads/posts remain browser Supabase queries and depend on `supabase/migrations/20261011000000_repair_social_engagement_insert_policies.sql` plus the existing social schema/RLS. Signed-in engagement controls are disabled in guest mode.
- These migrations are repository code only and are not confirmed applied. No staging end-to-end check has been run; verify like/unlike, counts, comment fetch/post, RLS, and guest browsing after applying the pending migrations.

## PWA installation

- Added a web manifest, generated app/Apple icons, and an install-help panel with Chromium install prompts plus iOS/macOS and other-browser instructions.
- The install experience is browser-dependent; it does not promise a universal install button. No service worker or offline cache is included, so installation does not imply offline support.
- PWA assets and install prompts have not been validated on devices/browsers or deployed. Confirm the generated icon routes and manifest in the Cloudflare Worker build before claiming install support is verified.

## Advertising

Web display units are wired through `src/modules/ads/AdSenseScript.tsx` and `AdSlot.tsx`. The script and slots are disabled by default. They require `NEXT_PUBLIC_ADSENSE_ENABLED=true`; the server script additionally requires `VERCEL_ENV=production`, so previews and local development fail closed. Configure the flag and live IDs in Vercel Production only, with system environment variables enabled. Publisher/slot IDs are public and `NEXT_PUBLIC_*` values are inlined at build time.

Before serving live inventory, verify domain approval, site verification/`ads.txt` requirements, policy-compliant placement, and an approved consent-management platform for applicable regions. Do not log or infer billable impressions from the rendered units. The native AdMob consent and placements module is separate and is not currently mounted in `AppWorkspace`.

## Payments and support — current state

- The Support page can show a Stripe-hosted voluntary donation link only when `VERCEL_ENV=production` and `STRIPE_DONATION_LINK_ENABLED=true`; it is not returned to previews/local builds. Donations are not associated with Sanctuary accounts or reconciled by the app.
- `/api/checkout`, `/api/webhooks/stripe`, and `/api/community-tips` remain disabled; do not register the disabled Next.js Stripe webhook.
- Token bundles use separate Supabase Edge Functions: authenticated `token-checkout` creates a Checkout Session from server-side Price IDs and requires the request Origin to match the configured `APP_BASE_URL`; `stripe-token-webhook` verifies the raw Stripe signature and calls an idempotent, service-role-only database RPC.
- `TOKEN_CHECKOUT_ENABLED` defaults to `false`. Enable it only in isolated test-mode staging after migration, Edge Functions, mode-matched Price IDs, webhook secrets, and end-to-end checks are confirmed. Keep live checkout disabled until refund/chargeback handling and a customer-support policy are decided.
- The shared Stripe Payment Link is not used for token purchases because it cannot securely associate a session with the signed-in account.
- Current repository code supports wallet balance/history and fixed token bundles only. The product owner has requested a friend-group beta followed by a public beta, with Stripe test-mode checkout in isolated staging only, no live charges, and a one-time 1,000-token bonus for the first 100 verified new accounts after beta opens. The grant is not implemented and must be atomic/server-side.
- The requested token sink is a first-party cosmetics shop (frames, borders, profile skins/themes, and colours); no user listings, transfers, trading, or cash-out. The catalog/prices in `TOKEN_CATALOG_PROPOSAL.md` are approved for isolated test-mode staging only, not for production/live sales. No bonus, shop, spending, or redemption code is implemented.
- Product-owner refund direction for planning: free beta tokens have no cash value and are non-refundable. Token purchases and external donations are intended to be non-refundable by default except a report/chargeback sent for manual review. For token-purchase cases, pause further spending during review; decide case by case on a full/partial refund and whether to reverse remaining tokens or revoke an item. Do not create an automatic negative balance. Donations are not associated with wallets/items and are not reconciled by the app. This is not final legal advice/terms, and no refund/chargeback workflow is implemented.

Never trust client-provided prices, amounts, user IDs, eligibility, or fulfillment status. Do not expose live payment links in previews or represent staged code as production-ready. Complete migration/RLS, webhook idempotency, legal review, dispute handling, backup/restore, and staging tests before live sales; test redemption and reversal flows before enabling token spending.

Never trust client-provided prices, amounts, user IDs, or fulfillment status. Do not represent this staged code as production-ready until migration/RLS, webhook idempotency, refund/dispute handling, backups, and staging tests are complete.

## Wallet roadmap and handoff

### Complete in the repository (not yet deployed or validated)

- Wallet navigation and page with persistent balance/history UI and fixed £1/£5/£10 bundle cards. Purchase status is origin-bound; preview URLs do not use a production checkout origin.
- Supabase wallet/ledger migration with owner-read-only policies and service-role-only transactional/idempotent purchase fulfillment.
- Authenticated Checkout Session Edge Function and raw-body Stripe-signature webhook. Checkout validates the configured Stripe Prices' mode, amount, currency, and active one-time status.
- Purchase checkout remains disabled by default. A test-mode staging enablement is allowed only after staging migration, functions, Price IDs, webhook, and end-to-end test are configured.

### Blocking before live token sales

1. Run `npm run typecheck`, `npm run build`, and the separate Deno check in an environment with dependencies and command execution. A GitHub `validate` run was reported passing for commit `b08d405622bc32207050824e8af8c80719d867aa`, before the latest Shorts/PWA edits; the current edits have not been validated. Do not treat that earlier result as validation for current code.
2. Apply the wallet migration and deploy both Edge Functions in an isolated staging project; verify RLS, paid and unpaid sessions, duplicate webhook delivery, wrong mode/price, and invalid signatures.
3. Implement and test the product owner's manual-review direction: non-refundable free beta grants; purchases/donations non-refundable by default except a reviewed report/dispute; pause spending during review; make full/partial refunds and token/item reversals case-by-case, without automatic negative balances. Obtain legal review and publish compliant terms before production sales.
4. Keep the beta on Stripe test mode in isolated staging. Consider production checkout only after migration, functions, Price IDs, webhook, RLS, end-to-end tests, chargeback/reversal handling, and legal review are complete. The migration has not been applied and functions have not been deployed to the user's project.

### Planned product scope and current status

The product owner has now directed the beta scope: friends first, then public; test-mode checkout in isolated staging only; a one-time 1,000-token bonus for the first 100 verified new accounts after beta opens; and a first-party cosmetics shop for frames, borders, profile skins/themes, and colours.  `TOKEN_CATALOG_PROPOSAL.md` contains an illustrative catalog and prices for approval only; no price or effect is approved, and no spending/redemption is implemented. Transfers, trading, marketplace, and cash-out remain deferred. Keep production checkout off and spending disabled until the server-side grant/spend paths, manual dispute/reversal workflow, staging tests, and legal review are complete. Guest mode remains read-only. Account deletion currently cascades wallet and purchase history; balance treatment must be finalized before real-money sales.

`TERMS_AND_CONDITIONS_DRAFT.md` is a starter draft with placeholders, not final legal terms. The product owner requested a Terms button plus required signup checkbox and version/timestamp record. Implement consent UI and durable acceptance recording, but do not present placeholder terms as final or enable production signup/sales until operator, contact, jurisdiction, age, privacy, user-content, deletion, support, and refund language are approved and legally reviewed.

## Supabase status

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable browser clients only. Supabase Edge Function secrets remain server-side.
- The wallet migration (`20261012000000_token_wallet_and_fulfillment.sql`), social-policy repair (`20261011000000_repair_social_engagement_insert_policies.sql`), and Shorts engagement RPC migration (`20261013000000_short_engagement_stats.sql`) are not confirmed applied to the user's project. From the repository, link the intended staging project, inspect `supabase migration list`, run `supabase db push --dry-run`, then `supabase db push` only after reviewing all pending migrations. `db push` applies every pending local migration, not just the wallet migration. A PostgREST cache refresh (`NOTIFY pgrst, 'reload schema';`) does not create missing tables or functions.
- Local demo auth is not production authentication; mock code `000000` is development-only.
- Production cutover requires Supabase Auth configuration, profile-creation handling, RLS/policy tests, persistent repository wiring, storage policies, session refresh/middleware strategy, and migration/restore validation.
- Never expose a Supabase secret/service-role credential to the web client. The token Edge Functions use the platform-provided admin context (`ctx.supabaseAdmin`); no service-role key belongs in the Next.js runtime.

## Security and release gates

Do not call this a production release until all of the following are complete:

1. Replace local/mock authentication and data with tested authenticated APIs or RLS-protected browser access.
2. Test Supabase migrations, RLS policies, backup restore, and forward/rollback behavior in staging.
3. Complete media validation, scanning, storage, moderation, rate limits, and abuse controls.
4. Keep live token checkout disabled until the staging flow is verified and refund/chargeback handling is implemented; keep token spending/redemption/trading disabled until reversals and account-deletion behavior are tested. Publish approved Terms and Privacy Notice, require explicit signup acceptance, and record the accepted terms version and server-side timestamp before production signup.
5. Validate ad consent, placements, and production IDs in relevant territories; keep ads disabled until approval and site policies are in place.
6. Run `npm run typecheck`, `npm run build`, and the repository's Deno check after changes; then manually test responsive navigation, auth, feed, Shorts engagement/comments, direct and group messaging, events, support, wallet, and PWA installation. The current Shorts/PWA edits have not passed these checks.

## Messaging status and handoff

Direct one-to-one messages exist in the demo flow: Messages → Find someone to message → Discover → search a public profile → Message. Group creation is also available in Messages and requires at least two other selected members. The inbox now presents separate one-to-one and group sections to make both paths explicit. `src/modules/messages/service.ts`, `MessagesInbox.tsx`, `DirectMessageThread.tsx`, and `useDirectMessages.ts` implement the active in-memory UI. `src/modules/messages/supabaseRepository.ts` is an optional adapter, not used by that UI; durable Supabase messaging, realtime, RLS verification, and production abuse/moderation/retention decisions remain unfinished. The UX change is unvalidated. Do not describe messaging as persistent or end-to-end encrypted.

## Deployment and verification note

Cloudflare Workers is the currently observed deployment/preview target. The last observed Workers build for commit `b08d405622bc32207050824e8af8c80719d867aa` was still in progress; deployment is unconfirmed. The repository's Support and AdSense production guards use Vercel-specific environment variables. Do not assume those fail closed on Cloudflare; keep live payment/ad configuration disabled until the environment guards are reviewed and tested for the actual host.


## Local development

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Copy `.env.example` to `.env.local`. Public Supabase URL/key values are not secrets. Never commit `.env.local`, service-role keys, Stripe keys, or webhook secrets.


## Unified navigation and notifications UI upgrade — 2026-10-26

PR [#22](https://github.com/platinumsoundz/Guild-Sanctuary/pull/22) was merged to `main` at `35cfc132c366f88ed1ce158c1415b8995f579ea5`. It implements the shared top-left navigation trigger, dedicated Notifications destination/full-page view, top-right notification shortcut, Guest Mode entry, responsive header controls, and removal of the duplicate landing-page title/guest header.

Verification and deployment:
- GitHub CI passed on the merge commit: Deno checks, TypeScript typecheck, and Next.js build.
- GitHub Actions' direct Cloudflare deployment path failed during asset upload with `401 Unauthorized`; its `CLOUDFLARE_API_TOKEN` secret requires permission review/replacement.
- Cloudflare Workers Builds config was corrected to install the pinned OpenNext Cloudflare adapter and run `npx opennextjs-cloudflare build` followed by the appropriate OpenNext deploy command.
- Canonical Worker `guild-sanctuary` deployed successfully from merge commit `35cfc132c366f88ed1ce158c1415b8995f579ea5`; successful Cloudflare build ID `435cec83-e591-4d85-b235-30c199fc0ea3`; deployed version `ae7b20ec-6734-4e7e-90fe-2cdfbe4c51f9`; URL: https://guild-sanctuary.thesmarthub.workers.dev.
- Browser-level interactive smoke testing remains unverified in this environment. Confirm signed-out/guest navigation, notifications, and mobile layout before considering the UX fully QA-approved.
- Follow-up/handoff: `docs/handoffs/2026-10-26-sanctuary-ui-release.md`.

.

## PWA offline fallback — implementation in review

- The install prompt and manifest do not by themselves provide offline behavior. A minimal service worker now provides a dedicated offline page when a navigation request fails.
- The worker intentionally does **not** cache application HTML, API responses, auth/session data, messages, or user-specific content. It only precaches the static offline fallback and handles same-origin GET navigations when the network fails.
- Service-worker registration is production-only and non-blocking; browsers without service-worker support continue to use the normal online app.
- A repository smoke check verifies the required PWA files and that the worker remains navigation-only. This is a static guard, not a substitute for browser/device testing.
- Release follow-up: validate install and offline behavior on Android Chrome and iOS Safari; confirm online sign-in and navigation recover after reconnecting. Do not describe offline app data as available.


## Notification reliability follow-up — 2026-10-26

- The connected Supabase project has the `notifications` table and both social-like/comment notification triggers installed; the schema and trigger count were verified read-only. The table contained zero notification rows at the time of the check, so real user-event delivery still needs an end-to-end test.
- The UI reads per-user notifications and persists `read_at`; it refreshes while signed in. This is polling, not realtime push.
- Fixed the notification error-state ordering so a failed query shows the actual error and a retry action instead of the generic sign-in prompt. This does not change RLS, migrations, or database data.


## Admin panel, role hierarchy, and community game links

- Added a Sanctuary Admin & Moderation entry for active moderator/admin/developer/owner roles. The existing report queue remains database-backed and records moderation actions.
- The intended role hierarchy is `user` (Basic User), `vip`, `moderator`, `admin`, `developer`, and `owner`. The new migration replaces the legacy `member` role, updates moderator checks, and adds database-enforced role changes plus a limited member-search RPC. Role changes are audited.
- Role assignment is deliberately fail-closed. Only active admins/developers/owners can search the member list; rank checks prevent assigning or modifying equal/higher roles unless the caller is an owner, and users cannot change their own role. The first owner must be assigned once by an operator after verifying the correct Supabase Auth UUID; there is no public owner self-claim.
- The admin feature is not operational in production until the migration is applied to the connected Supabase project and the first owner is bootstrapped. Local/demo authentication is not sufficient for privileged operations.
- Games Hub now links to the owner's supplied Roblox experience and displays copyable Java and Bedrock Minecraft server addresses. The Minecraft hostname links are convenience links only; joining still happens through the Minecraft client, and no server port was supplied or invented.


## Multi-agent delivery status — 2026-10-27

The shared agent operating contract is in `docs/AI_AGENT_OPERATING_MODEL.md`; `AGENTS.md` is the mandatory entry point. Claude, Gemini, and GitHub Copilot instruction files point agents to the same rules. Product & Experience and Engineering & Reliability are separate workstreams with isolated branches and focused PRs.

Current anchors:
- Visual foundation: PR #69 / `build/roadmap-theme-foundation-2026-10-27`. Open, not merged; CI/build and browser/device verification must be checked on the exact current head.
- Trust and safety: PR #18 / `feature/phase1-trust-safety`. Inspect current head, changed files, and checklist before continuing; do not assume it is verified.
- Coordination rules: `build/phase1-agent-coordination-2026-10-27`. This branch adds cross-agent rules, workstream ownership, and Phase 1 exit criteria.

Phase 1 remains **not end-to-end verified**. Do not mark the trust/safety gate complete until the staging checklist has actually been executed with evidence. Hosting and provider access/configuration remain independent blockers; no documentation change means production is deployed.


## Messaging reliability status — 2026-10-27

- The active message UI still uses the in-memory demo service; `src/modules/messages/supabaseRepository.ts` contains a persistent Supabase adapter, but its presence is not proof that the active UI uses it.
- Draft PR #109 adds static checks for the messaging RPC contract. Draft PR #110 addresses stale thread state while switching conversations and deduplicates send responses against realtime events.
- The adapter's source contract includes authenticated sender identity, visible-message filtering, a 500-message history bound, membership lookup, and Realtime subscriptions. These are source-level properties, not a live two-account test.
- **Release status: not end-to-end verified.** Before claiming messaging works across accounts, wire the active UI to the repository behind the existing explicit feature flag, verify migration/RLS/RPC state in an owner-approved staging project, then test direct/group creation, persistence after reload, sender/recipient delivery, reconnect, and unauthorized access.
- Do not apply migrations or change provider configuration as part of this code-only status note. Keep E2EE deferred per product-owner direction.


## Release and integration memory — 2026-10-27

- PR #157 is merged to `main` as commit `6deb72e684f237020458d5bfdeca3dd6a5bdb739`. The planner/reflection placement, responsive primary navigation, feed polish, and regression-contract updates are in the main branch.
- Automated CI and contract checks passed for that PR head. Cloudflare deployment was skipped; Vercel reported a deployment quota limit. Do not state that this merge is deployed to production.
- Browser/device and authenticated account-switch QA remain outstanding. Daily reflection and planner data are local to the browser profile and are not cloud-synced.
- PRs #158–#170 are still open follow-up work; inspect current branch ancestry/checks before integrating because they form a dependent stack. PRs #155 and #156 overlap #157 and should be reviewed for superseded work rather than blindly merged.
- Messaging remains not end-to-end encrypted. Security contract checks are static and do not prove live RLS/RPC authorization or two-account behavior.
- Supabase, Stripe, Lemon Squeezy, Cloudflare, and Vercel account configuration is owner-only. Phase 1 is still not end-to-end verified.

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
- PR #122 (token redemption) now includes the token-spend contract from #124, rebased onto current main and merged into its draft branch at `f635b54712df8c3f8c520c2668d39c5a623c5b6a`. The purchase handler and buttons explicitly remain locked with `SPENDING_ENABLED = false`; CI, dependency-map and Cloudflare workflow checks are running on this exact head. Do not enable spending until the owner-approved migration and isolated staging ledger/authorization matrix pass.
- PR #124 was merged into PR #122's feature branch only (merge commit `f635b54712df8c3f8c520c2668d39c5a623c5b6a`) and is closed as merged; this did **not** merge token spending to `main`.
- PR #81 moderation hierarchy is rebased on current main at `3f113c7612eb5c0282512d705e7302aa2dda74d2`; CI, moderation contract, dependency-map and repository workflow checks passed. PR #84 member-role locking is rebased at `a4e816100e8a31a44c45c0ddf28769b79492bc3d`; CI, role-lock contract, dependency-map and repository workflow checks passed. Both remain draft because SQL migrations are not applied and independent staging/concurrency tests and security review are still required.
- PR #85 beta showcase remains non-mergeable and draft; reconcile its broad overlapping changes before promotion. PR #5 game-wallet bridge remains draft on a separate feature base and is blocked on migration/schema reconciliation and scoped game-ticket staging tests.

### Release gates and owner handoff
- Do not enable token spending, game-credit transfers, checkout, ads, mandatory Terms gating, or production migrations merely because source checks pass.
- Supabase schema/migrations/RLS/owner bootstrap, Stripe and Lemon Squeezy payment setup, and Cloudflare/Vercel account configuration, secrets, domains and provider settings remain owner-only handoff tasks. No provider account settings were changed in this cleanup.
- Messaging is not end-to-end encrypted. The readiness document is a plan only. Planner/reflection/self-discovery data must not be described as cloud-synced until the approved database work is applied and tested.
- Phase 1 remains **not end-to-end verified** until the staging checklist, authenticated two-account tests, browser/device QA, backup/restore and rollback review, independent security review, and owner release approval are recorded.
