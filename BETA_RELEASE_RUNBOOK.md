# Sanctuary Beta Release Runbook

Last updated: 2026-10-26

This runbook turns the Master Blueprint and Launch Checklist into a repeatable operational sequence. It is a plan and evidence log template, not proof that any step has already been executed.

## Release principles

- Keep the current branch isolated until review and checks pass. Do not merge merely to make deployment green.
- A successful TypeScript/build workflow proves buildability only. It does not prove auth, RLS, persistence, email delivery, payment fulfillment, or browser behavior.
- Keep live token checkout, token spending/redemption, production ads, and public beta launch disabled until their explicit gates pass.
- Never paste secrets, access tokens, recovery codes, service-role keys, or full environment values into issues, logs, screenshots, or this document.
- Use dedicated test accounts and staging data. Do not run destructive tests against real users.
- Do not apply migrations to production until the full pending migration list and rollback/restore plan have been reviewed.

## Phase 0 — Confirm the candidate

Record before starting:

| Field | Value |
| --- | --- |
| Candidate branch | `feature/domain-database-improvements` |
| Candidate commit SHA | Fill in from GitHub before each run |
| Pull request | [PR #13](https://github.com/platinumsoundz/Guild-Sanctuary/pull/13) |
| Reviewer | Not yet assigned |
| Environment under test | Preview / staging / production (choose one) |
| Canonical URL | Record exact URL |
| Supabase project | Record project name and whether staging/production; never record credentials |
| Test window and operator | Fill in |
| Rollback owner and method | Fill in before deployment |

### Entry criteria

- [ ] Latest commit is known and matches the commit tested.
- [ ] CI for that exact commit passes Deno checks, typecheck, and build.
- [ ] Dependency audit findings have package names, advisory links, severity, reachability assessment, and a remediation decision.
- [ ] No unexpected generated files, local environment files, or secrets are included in the diff.
- [ ] The PR describes what changed, what did not change, and which checks remain manual.
- [ ] Production deployment and database mutation are not triggered by this runbook itself.

## Phase 1 — Configuration and environment parity

- [ ] Confirm the canonical production host and whether Cloudflare Workers, Vercel, or both are supported.
- [ ] Record the exact deployment URL and commit SHA from the hosting provider.
- [ ] Compare environment variable *names and scopes* for local, Preview, staging, and Production; do not copy values into notes.
- [ ] Verify browser bundles use only public Supabase URL and publishable/anon key.
- [ ] Verify service-role and payment secrets are server/Edge-Function-only and not prefixed with `NEXT_PUBLIC_`.
- [ ] Confirm Preview cannot write to production data or access live payment products.
- [ ] Confirm Supabase Site URL and redirect allow-list include the intended canonical callback URLs and do not include unneeded wildcard origins.
- [ ] Confirm deployment has rebuilt after changes to public build-time variables.
- [ ] Confirm Cloudflare deploy guards skip deployment when credentials/config are placeholders.
- [ ] Confirm a skipped deployment is reported as skipped, not described as deployed.
- [ ] Confirm host-specific production guards for ads and donations fail closed on each actual host.

Evidence to capture: deployment URL, commit SHA, CI run URL, host, environment name, and pass/fail notes only.

## Phase 2 — Authentication smoke test

Use a dedicated test mailbox you control. Email confirmation/reset on Vercel is explicitly still pending manual verification; prior success on Cloudflare is not evidence that Vercel works.

- [ ] Create a new account with a unique email and password of at least 10 characters.
- [ ] Check invalid username, malformed email, mismatched passwords, and short password validation.
- [ ] Confirm the profile trigger creates one profile with the expected username/display name; do not create a second profile in client code.
- [ ] Confirm an unverified account cannot enter authenticated features.
- [ ] Open the confirmation link on the same browser and on a fresh browser session.
- [ ] Confirm expired, malformed, and reused links fail safely.
- [ ] Sign in with correct credentials; confirm wrong password yields a generic error.
- [ ] Refresh the app and confirm the session is restored safely.
- [ ] Sign out, refresh, and confirm protected state is gone.
- [ ] Request a password reset; check the link, callback, new password, old-password rejection, and sign-in with the new password.
- [ ] Confirm the reset request response does not reveal whether an email exists.
- [ ] Verify a reset link cannot be reused after completion.
- [ ] Enroll TOTP on a dedicated test account if the UI/provider supports it.
- [ ] Sign in to a TOTP account and verify the app does not activate the user session before challenge success.
- [ ] Enter a wrong/expired code and confirm access stays blocked.
- [ ] Dismiss the modal with Escape, close button, and backdrop; confirm the pending challenge is cancelled.
- [ ] Restore a browser session for a TOTP account and confirm an AAL1 session does not unlock protected operations.
- [ ] Test guest mode and confirm it cannot mutate authenticated records.
- [ ] Confirm local mock codes/accounts are not accepted as production credentials.

Do not mark this phase passed if any result was inferred rather than observed.

## Phase 3 — Database and authorization

- [ ] Compare local migration files with the staging project's applied migration list.
- [ ] Review the entire pending migration set in order before a dry-run or apply.
- [ ] Apply only to staging first and record migration IDs/results.
- [ ] Verify RLS is enabled on every exposed table.
- [ ] For each table, test anonymous, owner, other authenticated user, moderator/admin (where applicable), and service role separately.
- [ ] For UPDATE policies, test both row visibility/USING and resulting row validity/WITH CHECK.
- [ ] Verify profiles cannot change their own role, account status, wallet balance, or other privileged columns.
- [ ] Verify wallet and ledger client access is read-only and owner-scoped.
- [ ] Verify `game_wallet_sessions` remains inaccessible to browser roles if it is server-only.
- [ ] Inspect security-definer functions for fixed safe search paths, caller validation, minimal EXECUTE grants, and privilege escalation.
- [ ] Review `public.is_active_user()` grants and all RLS callers before changing its exposure.
- [ ] Test cross-user message, notification, event, post, comment, like, and media access.
- [ ] Test direct API calls, not just whether UI controls are hidden.
- [ ] Verify storage policies enforce file size/type and ownership; check deletion behavior.
- [ ] Run Supabase security/performance advisors and record remaining findings.
- [ ] Verify backup/restore and forward-recovery steps before any production migration.

Do not expose query results containing personal information or secrets in the PR.

## Phase 4 — Persistence and core product

Use two or more test accounts and fresh browser sessions.

- [ ] Feed: create, edit, delete, paginate, refresh, and confirm ownership/privacy.
- [ ] Feed: like/unlike, duplicate request, count accuracy, and unauthorized mutation.
- [ ] Shorts: playback, metadata, like/unlike, counts, comment read/post, and guest browsing.
- [ ] Messaging: one-to-one conversation, group membership, message ordering, unread state, refresh, reconnect, and unauthorized access.
- [ ] Events: create/list/RSVP/cancel, duplicate RSVP, capacity boundary, and private event access.
- [ ] Profiles: edit fields, privacy toggles, discovery behavior, and another user's view.
- [ ] Notifications: recipient isolation, mark read, refresh, and duplicate delivery.
- [ ] Moderation: submit report, status/role restrictions, auditability, and abuse limits.
- [ ] Confirm each feature expected to be durable still works after reload and from another session.
- [ ] Clearly label any remaining in-memory/demo feature; do not present local state as persistent.

## Phase 5 — Token economy and payments (isolated staging only)

This phase is blocked until the product's signup-bonus rule is implemented and reviewed. The current live grant mismatch is known: existing trigger grants 100 tokens; roadmap proposes a one-time 1,000-token grant to the first 100 verified new accounts after beta is explicitly opened.

- [ ] Decide the beta-open switch, verification timing, eligibility rules, and first-100 concurrency-safe counting method.
- [ ] Test concurrent eligible signups; the cap must not be exceeded.
- [ ] Test duplicate events, retries, profile recreation, and trigger failure; no user receives a duplicate grant.
- [ ] Reconcile existing wallets/ledger entries before changing grant behavior.
- [ ] Confirm checkout is disabled by default in every non-staging environment.
- [ ] Confirm test-mode Stripe Price IDs, amount, currency, user association, and origin checks.
- [ ] Confirm raw-body webhook signature validation and idempotent fulfillment.
- [ ] Test successful, unpaid, failed, abandoned, replayed, duplicate, wrong-user, wrong-price, wrong-mode, and invalid-signature events.
- [ ] Confirm no failed or unpaid checkout grants tokens.
- [ ] Confirm concurrent fulfillment cannot double-credit the wallet.
- [ ] Confirm purchase and wallet ledger entries reconcile.
- [ ] Keep token spending/redemption disabled until reversal, refund, dispute, account-deletion, and negative-balance behavior are implemented and tested.
- [ ] Do not use live payment credentials or make real charges during this phase.

## Phase 6 — PWA, accessibility, and responsive QA

- [ ] Verify manifest, icon routes, and install guidance on deployed Cloudflare and Vercel targets.
- [ ] Test Android/Chromium, iOS Safari, and desktop install paths.
- [ ] Test narrow mobile, tablet, and desktop viewports.
- [ ] Complete keyboard-only navigation and visible focus checks.
- [ ] Check labels, accessible names, error announcements, dialog focus management, and Escape behavior.
- [ ] Check contrast and reduced-motion preferences.
- [ ] Verify media failure/loading/empty states.
- [ ] Confirm no offline capability is promised unless a service worker and safe cache strategy are implemented.
- [ ] Verify ads/consent are disabled on Preview and local builds.

## Phase 7 — Legal, privacy, operations

- [ ] Replace legal placeholders with reviewed operator identity, contact, jurisdiction, age, privacy, content, moderation, deletion, support, refund, and dispute terms.
- [ ] Require terms/privacy acceptance before production account completion.
- [ ] Record accepted terms version and server-side timestamp through a trusted path.
- [ ] Define account deletion effects on profile, content, messages, media, wallet, purchases, ledger, reports, and legal retention.
- [ ] Define reporting, appeals, harassment response, moderation escalation, and incident contacts.
- [ ] Define backup retention, restore testing cadence, and breach/incident response.
- [ ] Add monitoring for auth failures, Edge Function errors, webhook failures, and database permission denials without logging credentials or full tokens.
- [ ] Confirm a support owner can investigate failed verification, reset, purchase, and deletion requests.

## Phase 8 — Go/no-go decision

A beta may proceed only when its own scope gates pass; a friend-only beta is not automatically allowed to use live payments or public ads.

- [ ] Candidate SHA and deployment URL are recorded.
- [ ] Required CI is green for the exact SHA.
- [ ] Critical dependency/security findings are fixed or explicitly reviewed and accepted with rationale.
- [ ] Authentication, session lifecycle, and RLS checks pass.
- [ ] Data persistence claims match the actual implemented backend.
- [ ] Staging payment tests pass if token checkout is part of the beta; otherwise checkout remains off.
- [ ] Terms/privacy and moderation/support process are approved for the audience.
- [ ] Rollback path and owner are known.
- [ ] Remaining known issues are visible to the product owner.
- [ ] Product owner explicitly approves the defined beta scope.

Decision: **NOT RECORDED**  
Approved scope: **NOT RECORDED**  
Approver/date: **NOT RECORDED**

## Incident / rollback notes

If auth, data isolation, payment fulfillment, or deployment integrity fails:
1. Stop the test or disable the affected feature/checkout switch.
2. Preserve non-secret timestamps, request/event IDs, commit SHA, and relevant redacted logs.
3. Do not retry payment fulfillment manually until idempotency and wallet state are reconciled.
4. Roll back the application using the hosting provider's verified prior deployment procedure.
5. Do not roll back a database migration blindly; use the reviewed forward-recovery/restore plan.
6. Notify the designated owner and record the cause, affected scope, mitigation, and follow-up issue.

## Evidence log template

| Date/time (UTC) | Environment | Commit SHA | Test | Result | Evidence link / safe note | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| Not run | Not recorded | Not recorded | Baseline | Pending | No new runbook execution is implied by this file | Not assigned |
