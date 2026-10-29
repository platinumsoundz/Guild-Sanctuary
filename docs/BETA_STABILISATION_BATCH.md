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
- 2026-10-29: Guild HUD PR #234 and accessibility/navigation PR #235 remain draft/stacked; #235 CI and screenshot workflows passed on its tested head, but preview/device QA remains outstanding.
- 2026-10-29: Vercel reports a deployment build-rate limit; this is a deployment blocker, not proof that the application build itself is broken.
- 2026-10-29: moderation/role work remains gated on live-schema reconciliation and independent authorization review. Token spending remains disabled.

- 2026-10-29: merged #237 (compact unified sign-in/guest entry) and #238 (private account-backed Daily Reflection) into main after exact-head CI/build/contract and screenshot checks passed. Two-account authenticated browser QA for Daily Reflection remains open.
- 2026-10-29: merged #239 (community toolkit static contract + pure helper tests wired into standard CI) after exact-head CI, build/deployment workflow and desktop/mobile screenshot workflow passed. The two separate Workers Builds check labels reported failure, but Cloudflare's build API shows both builds were deliberately skipped for this docs-only branch (no build logs or build attempt); the application CI and Sanctuary Cloudflare workflow are the meaningful validation gates for this change.
- 2026-10-29: main commit aba2ecbcc2f23c0a6121ced6c7fdd2afe8555df8 includes the community toolkit CI integration. The Vercel and Cloudflare workflows for the prior main commit 44aa0440ae6e043b06ad0c0052e64e5bbd6c5ba8 completed successfully; deployment of this newer commit must be checked separately.
- 2026-10-29: live read-only Supabase audit reconfirmed public.get_moderation_queue() is absent in both connected projects. Do not merge moderation UI as release-complete or apply production SQL until the queue RPC and action-RPC hierarchy/concurrency controls have been independently reviewed.
