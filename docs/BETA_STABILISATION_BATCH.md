# Beta Stabilisation Batch — 2026-10-29

## Purpose
Track the shortest safe path to a controlled Guild-Sanctuary beta. A feature is not beta-ready merely because its branch exists or a static contract passes. Each gate needs evidence from the integrated candidate, and live-only checks must be performed against the intended environment.

## Release gates

### P0 — Integrated build and deployment
- [ ] Choose one release-candidate commit from current `main`; record its SHA.
- [ ] Run CI, typecheck, production build, contract checks, and screenshot workflow against that exact SHA.
- [ ] Resolve the Vercel build-rate limit or document the approved alternative deployment path; verify the actual deployed commit rather than assuming a green GitHub workflow means production is updated.
- [ ] Verify Cloudflare and Vercel are not serving conflicting builds or environment configuration.
- [ ] Run desktop, Android portrait/landscape, and narrow-mobile smoke tests.

### P0 — Authentication and privacy
- [ ] Test registration, login, logout, expired session, password reset, and return-to-app navigation.
- [ ] Test guest access: public read-only pages remain available; private routes and write actions require authentication.
- [ ] Verify two separate accounts cannot read, edit, or delete one another's data.
- [ ] Verify no client-supplied user ID can override server-side identity checks.
- [ ] Confirm account deletion and session revocation boundaries.

### P0 — Community reliability
- [ ] Verify feed load, refresh, pagination, create/edit/delete post, and error/empty states.
- [ ] Verify comments can be created, edited, deleted, and liked only by permitted users.
- [ ] Verify messaging preferences match actual DM-send enforcement.
- [ ] Verify direct-message send/receive and server-backed read receipts with two real accounts in both Guild and Sanctuary; group receipts remain out of scope until per-member state exists.
- [ ] Implement attachments, voice notes, and short video clips through the existing private Supabase Storage bucket with conversation-member read policies, file-type/size limits, and orphan-upload cleanup; do not add a new server or database.
- [ ] Keep WebRTC/P2P calling parked; live calls are not a beta requirement for reliable messaging.
- [ ] Verify Shorts load and engagement stats RPC resolves in the live schema; test reactions and report flows.
- [ ] Confirm notifications open as an overlay without navigating away and have working read/unread states.

### P0 — Moderation and privileged roles
- [ ] Reconcile missing `public.get_moderation_queue()` against the live schema before merging moderation work.
- [ ] Review authorization for role changes, self-targeting, hierarchy, concurrency, and destructive actions.
- [ ] Test report → review → action → affected-user notification end-to-end.
- [ ] Ensure basic users cannot access moderator/admin routes by URL or invoke privileged APIs.
- [ ] Keep wallet spending disabled until server-authoritative ledger and staging transaction tests pass.

### P1 — Guild console experience
- [ ] Integrate HUD/navigation changes in dependency order; avoid merging a stacked PR against an unmerged parent.
- [ ] Confirm top-left navigation, compact notification overlay, focus return, Escape/back behaviour, and keyboard-only access.
- [ ] Verify game library search, favourites, clear-history, Continue Playing, and honest empty/error states.
- [ ] Test 2D/3D game launch and return paths on desktop and Android; do not claim account-synced saves or achievements unless implemented.
- [ ] Verify controller/touch fallback and safe-area layout at mobile and wide-screen sizes.

### P1 — Daily Reflection and persistence
- [ ] Confirm owner-approved local-to-account-backed transition before release.
- [ ] Test save/read/update/delete and failure states for two accounts.
- [ ] Preserve local entries until an explicit import is confirmed; do not silently overwrite existing account dates.
- [ ] Verify privacy boundaries and RLS against the active schema.

### P1 — Theme, settings and PWA
- [ ] Verify theme/layout preferences save locally when account settings are unavailable, without implying privacy settings synced.
- [ ] Verify authenticated `account_settings` writes succeed while owner-only RLS remains intact.
- [ ] Check PWA install affordance, generated icons, manifest, offline/error behaviour, and Android install flow.
- [ ] Test all supported themes for contrast, focus visibility, and reduced-motion behaviour.

### P1 — Wallet and payments
- [ ] Verify catalog, wallet and ledger access are role-gated and server-authoritative.
- [ ] Test duplicate webhook/idempotency, failed checkout, cancelled checkout, and fulfillment reconciliation in staging.
- [ ] Confirm no client-only balance or entitlement can be forged.
- [ ] Keep real token spending disabled until explicit owner approval and all security tests pass.

## Merge discipline
1. Check whether each PR is open, draft, stale, or stacked on another PR.
2. Prefer a clean-main reconstruction when the parent chain is stale or contradictory.
3. Do not retarget a stacked feature directly to `main` if it would pull in unreviewed parent work.
4. Merge only after exact-head CI and required review pass; record the merge SHA.
5. Re-run integration checks after combining branches.
6. Close superseded PRs only after confirming their intended changes are included elsewhere.

## Beta decision
A controlled beta can start when all P0 gates pass, the production candidate is identifiable and deployed, and no critical privacy/security/data-loss defects remain. Nonessential integrations (Spotify, native installed-game discovery, Cloud Lab, cross-platform achievements) can remain visibly labelled as planned or disabled.

## Evidence log
- 2026-10-29: main contains the compact shell/release-candidate reconciliation, guest-safe route boundary, Guild browser arcade, creator-game hub relocation, and Shorts RPC security contract.
- 2026-10-29: the Guild console player and HUD/accessibility navigation work has since been integrated into main via the clean-main console/HUD batches. Controller, touch, fullscreen, quick-menu and library contracts are covered by CI; real-device and cross-origin game compatibility checks remain outstanding.
- 2026-10-29: Vercel reports a deployment build-rate limit; this is a deployment blocker, not proof that the application build itself is broken.
- 2026-10-29: moderation/role work remains gated on live-schema reconciliation and independent authorization review. Token spending remains disabled.

- 2026-10-29: merged #237 (compact unified sign-in/guest entry) and #238 (private account-backed Daily Reflection) into main after exact-head CI/build/contract and screenshot checks passed. Two-account authenticated browser QA for Daily Reflection remains open.
- 2026-10-29: merged #239 (community toolkit static contract + pure helper tests wired into standard CI) after exact-head CI, build/deployment workflow and desktop/mobile screenshot workflow passed. The two separate Workers Builds check labels reported failure, but Cloudflare's build API shows both builds were deliberately skipped for this docs-only branch (no build logs or build attempt); the application CI and Sanctuary Cloudflare workflow are the meaningful validation gates for this change.
- 2026-10-29: main commit aba2ecbcc2f23c0a6121ced6c7fdd2afe8555df8 includes the community toolkit CI integration. The Vercel and Cloudflare workflows for the prior main commit 44aa0440ae6e043b06ad0c0052e64e5bbd6c5ba8 completed successfully; deployment of this newer commit must be checked separately.
- 2026-10-29: live read-only Supabase audit reconfirmed public.get_moderation_queue() is absent in both connected projects. Do not merge moderation UI as release-complete or apply production SQL until the queue RPC and action-RPC hierarchy/concurrency controls have been independently reviewed.

- 2026-10-29: main now includes the Guild console player, library launch flow, console HUD/navigation and accessibility refinements. The app CI and Cloudflare application workflow passed on the integrated heads; do not treat skipped Cloudflare Workers Builds or Vercel rate-limit notices as equivalent to a verified production deployment.
- 2026-10-29: moderation review remains blocked on staging validation and the missing live `public.get_moderation_queue()` RPC. PR #244 adds a proposed table-boundary hierarchy trigger and static contract, but remains unmerged; do not apply its migration to either live Supabase project until target-role, target-type, transaction and existing-RPC interactions are tested.
- 2026-10-29: PR #227's moderation dashboard expects `get_moderation_queue()` and is not release-ready until the RPC exists and permissions are verified. PR #230 contains wallet/notification/moderation migrations and remains under security review; token spending stays locked and no wallet-spending migration should be applied.
- 2026-10-29: Vercel preview comments show the free deployment quota exceeded 100 deployments/day (`api-deployments-free-per-day`), with retry in 24 hours. Some PR preview comments show deployments marked Ready, but this does not establish that `main` production serves the same commit; record the deployed commit during release verification.


## Integration correction — moderation hierarchy guard — 2026-10-29

- **Merged:** PR #244, `security: enforce strict moderation target hierarchy`, squash merge `0946306d1349f3cc2f5828ad5493538c86e54d1f`. Its migration and static contract are now in repository main; the migration has **not** been applied to either live Supabase project.
- The guard checks authenticated actor identity, active moderator privilege, resolves the content owner, locks actor/target profiles in stable order, rechecks current roles, applies higher-rank-only targeting, and enforces the additional suspension/ban rank rules. Unknown target roles fail closed.
- **Still gated:** the static contract and app CI are not a substitute for staging SQL execution or two-project schema verification. Validate trigger behaviour with the existing `apply_moderation_action` RPC, including comment targets, target deletion races, and concurrent role changes before applying the migration.
- **Moderation dashboard:** PR #227 remains open and stale/non-mergeable against its old base. It uses the RLS-protected `content_reports` table and `get_report_target_owner` RPC rather than calling `get_moderation_queue()`; however, live RPC/table permissions and action behaviour still need verification before enabling the dashboard as release-ready.
- **Wallet:** PR #230 remains unmerged and security-sensitive. Token spending remains revoked for `public`, `anon`, and `authenticated` until ledger/idempotency/ownership tests pass.
- **Deployment:** latest main status is still blocked by Vercel's free-tier daily deployment quota. Cloudflare app workflow success and a Ready PR preview do not prove that production Vercel and Cloudflare serve the same main commit.


## Stripe checkout readiness update — 2026-10-29

- The dedicated Stripe account `The sanctuary` remains test-mode only. Confirmed active one-time GBP prices: 100 tokens £1.00, 600 tokens £5.00, 1,200 tokens £10.00. No live products or charges were created.
- The current Next.js checkout route is opt-in and test-key-only; its webhook verifies the raw-body signature, rejects live events and unpaid sessions, validates the configured price/amount, then calls the service-role-only idempotent fulfillment RPC.
- Corrected the branch Preview `SANCTUARY_SITE_URL` and the existing Stripe test webhook URL to the verified branch alias. The signing secret is a sensitive Preview variable and remains masked.
- **Still blocked:** the Vercel Ready deployment predates the environment-variable correction. Vercel's deployment-rate limit prevents a fresh deployment right now, so a complete Checkout → signed webhook → exactly-once wallet credit has not yet been proven. Re-run the documented test-card, cancellation, duplicate-event and invalid-event matrix after redeployment.
- Read-only checks against both connected Supabase projects confirm `record_token_bundle_purchase` is executable by `service_role` only and `spend_tokens` is not executable by `anon` or `authenticated`. Do not lift the spending lock until isolated authenticated transaction tests pass for balance, ownership, insufficient funds, idempotency replay/collision and concurrent requests.
- Added `check:stripe-test-checkout` to the CI contract suite. It is static regression protection, not a substitute for an actual test-mode round-trip.
- **Live launch remains gated:** refund/dispute reversals, policy/terms review, payment reconciliation, and final production configuration are not complete. No live-mode payments are enabled by this work.

- 2026-10-30: PR #280 adds server-timestamped read receipts for one-to-one messages using the existing Supabase Postgres/Realtime stack. Migration remains unapplied and real two-account verification is outstanding. The earlier WebRTC calling PR #260 is parked as draft per the updated Supabase-first product direction; attachments, voice notes, and short videos are next, using the existing private Storage bucket.
