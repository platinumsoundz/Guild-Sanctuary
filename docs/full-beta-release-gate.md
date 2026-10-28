# Sanctuary full-beta release gate

**Status: preparation checklist — not a declaration that beta is ready.** This is a single source of truth for the final release blockers. Complete each applicable gate with evidence on a staging environment before public beta. Do not infer readiness from static source-contract checks alone.

## P0 — release blockers

- [ ] **Build and CI:** latest PR head passes the full GitHub Actions CI suite, TypeScript typecheck, production build, all focused contracts, and Cloudflare Worker build where applicable. Resolve source failures; distinguish external provider quota/build-rate-limit failures from code failures.
- [ ] **Staging environment:** verify environment variables, redirect URLs, email delivery, auth callback URLs, app base URL, CORS, CSP/security headers, analytics consent, error reporting, and secrets rotation. No production secret values in client bundles or logs.
- [ ] **Database and authorization:** inventory every unapplied migration and its dependencies; inspect SQL diff; apply only to an authorized staging project; verify RLS and grants with two unrelated accounts plus anonymous/guest access. Test cross-account reads/writes, role escalation, deletion, disabled accounts, race conditions, rollback/restore, and backups before any production migration.
- [ ] **Authentication and account lifecycle:** sign-up, email verification, sign-in/out, password reset, session expiry/refresh, OAuth if enabled, guest read-only restrictions, account deletion, and data export. Confirm sensitive actions re-check the server session and active-account status.
- [ ] **Messaging:** replace or explicitly scope the in-memory demo inbox/thread service before advertising persistent messaging. Verify membership checks, group membership changes, attachments, unread state, reload/reconnect behaviour, report/block/moderation flows, and retention. Do not describe messaging as end-to-end encrypted unless independently implemented and audited.
- [ ] **Calls:** two authenticated browsers and two accounts; audio/video permission grant/deny; incoming accept/reject; busy state; unanswered expiry; hang-up; refresh/navigation cleanup; reconnect; restrictive NAT/mobile networks; cross-account and non-member signalling rejection. Deploy and test TURN credentials securely; STUN-only operation is not reliable on every network. Check Supabase Realtime global public-access setting and private-channel authorization. Group calls need an SFU and are out of scope until implemented.
- [ ] **Community safety:** test report/block/moderation, role-gated admin surfaces, rate limits, spam/abuse controls, user deletion, and audit trail. Review all role/permission SQL independently. Never merge old diverged moderation branches without full diff and staging authorization tests.
- [ ] **Payments and tokens:** keep checkout and token spending disabled until product/price IDs, webhook signatures, idempotency, refund/cancellation paths, reconciliation, tax/consumer disclosures, spend limits and abuse handling are verified in provider test mode. Cosmetic-only, non-pay-to-reach principles must remain intact.
- [ ] **Privacy and data handling:** verify consent and retention; personal photos/audio remain device-local unless explicit cloud backup is implemented with quota, access control, deletion and retention policy. Confirm no private data is exposed in logs, analytics, exports or caches.
- [ ] **Accessibility and responsive UX:** keyboard-only, screen reader, visible focus, reduced motion, contrast, zoom, touch target, mobile viewport, landscape, loading/empty/error states, and form validation. Test real iOS Safari and Android Chrome, plus desktop Chromium/Firefox/Safari where supported.
- [ ] **Operational readiness:** backups and restore drill, incident/contact route, monitoring and alerting, error budgets, dependency/security scanning, rate limits, abuse response, data deletion requests, and a documented rollback/disable plan.
- [ ] **Product accuracy:** all prototype/demo/local-only/planned functions are labelled honestly. No fake connected status, fake terminal, fabricated achievement verification, or unimplemented platform integrations shown as live.

## P1 — complete before broad beta where feature is exposed

- [ ] **Daily Reflection, self-discovery and personal notes:** resolve the diverged database-backed reflection branch and private-storage migration through review, account-isolation tests, and explicit data-transition approval. Avoid claiming persistence until verified.
- [ ] **Guild library:** apply the staged library migration in staging; verify two-account isolation, concurrent insert cap, duplicate handling, deletion tombstone retries, offline/network failures, import/export, local cache owner changes, and migration-unavailable UI. Media selection must respect file-count, per-file and aggregate byte limits and release object URLs.
- [ ] **Cloud Lab:** remains **In development** and is not a beta promise. Before building a real workspace, select a provider with an explicit spend ceiling; threat-model isolation, egress, persistence, quotas, idle shutdown, reset/delete semantics, audit logs, abuse response, backup and terminal authentication. Do not provision compute without approval.
- [ ] **Cosmic Arcade and Guild:** run keyboard/touch/controller testing, reduced-motion and mobile layout checks, game reset/restart tests, and controller disconnect/reconnect tests. Validate original games and avoid implying native installed-game scan/launch exists.
- [ ] **Events:** verify timezone handling, event create/edit/cancel, map/location permission, RSVP concurrency, past-event filtering, and persistence on refresh.
- [ ] **Profiles, preferences and themes:** verify server-backed vs local-only preferences, privacy visibility, account-switch isolation, layout mode, contrast per theme, and mobile navigation state.
- [ ] **PWA and Android:** verify install prompts, offline fallback, service-worker updates, stale-cache recovery, deep links, permissions, Android release signing, and real-device smoke tests. No release artifact should contain development credentials.
- [ ] **Creator projects and support:** validate external URLs and ownership, configure the 2D game host, confirm the 3D host, and keep contribution/checkout disabled until the owner verifies the live provider setup.

## P2 — staged after beta if not essential to the beta promise

- Native installed-game scanning/launch via an optional signed desktop companion.
- Platform OAuth and verified achievement sync.
- Persistent Linux workspace and secure terminal gateway.
- Explicit opt-in cloud media backup.
- Group voice/video via an SFU.
- Additional game integrations and broader device coverage.

## Evidence log

For every completed item, record: commit/PR SHA, environment, test accounts/roles used, command or test scenario, result, date, and reviewer. Do not put credentials or personal data in the evidence log.

## Release decision

Beta may be called ready only when all P0 gates are checked, every exposed feature is either verified or clearly labelled/disabled, critical security/privacy issues are closed, and an owner explicitly approves the staging-to-beta release. External build-provider quota failures should be tracked separately from source build failures, but a source build that has not completed successfully is still a blocker.
