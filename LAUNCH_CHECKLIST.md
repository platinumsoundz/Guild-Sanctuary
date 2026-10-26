# The Sanctuary — Build & Release Checklist

Last updated: 2026-10-26

This is the working checklist for the Sanctuary roadmap. Keep it updated as work is completed. A green build is not proof that a feature works in a live browser, that database policies are safe, or that a deployment is production-ready.

## Current checkpoint

- [x] Continue on `feature/domain-database-improvements`; do not merge to production just to clear checklist items.
- [x] Confirm Supabase project is active/healthy.
- [x] Confirm the branch's previous CI run passed dependency installation, Deno checks, TypeScript checks, and build.
- [x] Fix OTP signup metadata key: `displayName` is now sent as `display_name`, matching the profile trigger.
- [x] Re-fetch the changed authentication file and confirm the correction.
- [x] Latest OTP metadata fix received a successful Vercel check before subsequent auth-flow changes.
- [x] Found and fixed a password-sign-in MFA gap: accounts with verified TOTP factors now receive a challenge before the app activates the session.
- [x] Wired the password sign-in challenge through AppContext and the auth form/gateway.
- [x] Closing the account modal with Escape, the close button, or backdrop now cancels a pending TOTP challenge instead of leaving a half-authenticated session behind.
- [x] GitHub CI passed Deno checks, `npm run typecheck`, and `npm run build` for the MFA hardening commit `ce4e87b9156c93193ec0f620547186e6bfe72cf4`; the PR merge-check Cloudflare build also completed, but deployment was skipped.
- [x] Confirm the Cloudflare OpenNext build completed successfully on the PR merge-check run; actual deployment was skipped because this was a pull-request run and Cloudflare credentials/Supabase config were placeholders. No Worker deployment was confirmed.
- [ ] Vercel's status check still reports a build-rate-limit issue; recheck the Vercel preview when its build capacity is available.
- [x] Create a reminder to manually test Vercel email confirmation and password reset on 2026-10-27 at 15:00 Europe/London.
- [ ] Manually test the Vercel email flow. The flow worked previously on Cloudflare; assume it is likely okay for continued development, but do not mark this check complete until tested on Vercel.
- [ ] Record the actual Vercel deployment URL and the exact commit it serves after the next deployment.
- [x] Add `BETA_RELEASE_RUNBOOK.md` with the staged release, deployment, auth, RLS, persistence, payments, accessibility, legal, and go/no-go sequence.
- [x] Add `SECURITY_ACCEPTANCE_TEST_MATRIX.md` with explicit authentication, RLS, persistence, payment/bonus, hosting, and accessibility test cases; all tests remain Not run until executed against a named build.
- [ ] Update this checklist and `MASTER_BLUEPRINT.md` as roadmap work is completed.

## Current build batch — 2026-10-26

- Added [BETA_RELEASE_RUNBOOK.md](BETA_RELEASE_RUNBOOK.md) and [SECURITY_ACCEPTANCE_TEST_MATRIX.md](SECURITY_ACCEPTANCE_TEST_MATRIX.md).
- Cloudflare OpenNext build completed successfully in the PR merge-check workflow; deploy step was skipped as intended for a pull request with placeholder Supabase config and no Cloudflare credentials. This is build evidence only, not a deployment.
- Vercel status still reports build-rate-limit; Vercel preview deployment and email-flow tests remain pending.
- The latest documentation commits have not yet been validated by a fresh CI run. The earlier green run applies to the MFA code commit only.
- The npm install audit still reports one critical issue in the project dependency tree and four high issues after temporary Cloudflare adapter/Wrangler installation. Exact advisories are not yet identified; do not run force-upgrades blindly.

## P0 — Safe authentication and release configuration

- [ ] Confirm Preview and Production use the intended Supabase project; keep test accounts/data isolated from real users.
- [ ] Check Vercel environment-variable names and scopes for Preview, Production, and Development.
- [ ] Confirm public browser config contains only the Supabase URL and publishable/anon key; never expose a secret/service-role key via `NEXT_PUBLIC_*`.
- [ ] Confirm each deploy is rebuilt after changing `NEXT_PUBLIC_*` values, because these values are inlined at build time.
- [ ] Add the canonical Vercel preview/production callback URLs to Supabase Auth redirect allow-list; retain localhost only for local development.
- [ ] Confirm Supabase Site URL is the correct canonical production URL.
- [ ] Enable Supabase leaked-password protection before public registration.
- [ ] Test signup with a unique dedicated test email and a password meeting the 10-character minimum.
- [ ] Confirm the signup profile trigger creates exactly one profile with correct username and display name.
- [ ] Test password sign-in, sign-out, page refresh, session restoration, and expired-session behavior.
- [ ] Test forgot-password request, email link, callback, new password, old-password rejection, and sign-in with the new password.
- [ ] Confirm reset links fail safely when expired, malformed, reused, or opened without a recovery session.
- [ ] Test unverified email behavior and verify that an unconfirmed account cannot access authenticated features.
- [ ] Test TOTP-enabled password sign-in, verify the challenge is shown, and verify AAL2 is required before protected actions.
- [ ] Audit RLS policies for sensitive mutations so accounts with enrolled TOTP cannot bypass AAL2 by calling Supabase directly before completing the challenge.
- [ ] Review generic authentication error messages to avoid revealing whether an email account exists.
- [ ] Confirm no local demo password or mock code is accepted as real production authentication.
- [ ] Confirm guest mode is read-only and cannot access authenticated mutations.
- [ ] Decide whether password length limits and leaked-password controls match the final account policy.
- [ ] Confirm account deletion signs out/revokes sessions and define retention/deletion treatment for wallets, purchases, posts, messages, and moderation records.

## P0 — Supabase database, migrations, and access control

- [ ] Compare repository migration files against the live project's applied migration list before applying anything.
- [ ] Review every pending migration in order; do not run a broad migration push without checking all pending changes.
- [ ] Use a staging database for migration dry-runs, RLS tests, and restore tests.
- [ ] Confirm the profile-creation trigger and all referenced functions exist and are idempotent.
- [ ] Review `public.is_active_user()`: determine whether signed-in clients should be allowed to execute it; reduce exposure without breaking the RLS predicates that call it.
- [ ] Confirm `game_wallet_sessions` is server-only by design; if so, keep client policies absent and document intended grants. If clients need access, add narrowly scoped ownership policies and tests.
- [ ] Verify RLS is enabled on every table in exposed schemas.
- [ ] Audit SELECT/INSERT/UPDATE/DELETE policies for posts, comments, likes, shorts, events, conversations, messages, profiles, notifications, reports, media, wallets, ledger, token shop, terms acceptance, and sessions.
- [ ] For every UPDATE policy, check both `USING` and `WITH CHECK` so rows cannot be reassigned to another owner.
- [ ] Verify no security-definer function is accidentally executable by `PUBLIC`, `anon`, or `authenticated`; grant only the intended roles.
- [ ] Verify each security-definer function has a fixed safe search path and validates the caller/target user as needed.
- [ ] Review views and public projections for RLS bypass; use security-invoker views or restrict access where appropriate.
- [ ] Confirm service-role/admin credentials are used only in trusted server/Edge Function contexts.
- [ ] Run Supabase security and performance advisors after any database change; record remaining findings and rationale.
- [ ] Generate/update database types after the schema is stable and check them into the branch.
- [ ] Test migration rollback/forward recovery and restore from backup before launch.
- [ ] Confirm no migration drops legacy Sanctuary-scope columns/types until app code, types, RLS, indexes, historical clients, and restore plan are coordinated.
- [ ] Verify social-policy repair and Shorts engagement migrations are applied in staging before testing like/comment behavior.
- [ ] Test guest browsing versus signed-in mutations for feed and Shorts, including counts, duplicate likes, and comment ownership.
- [ ] Check storage bucket policies, upload size/type restrictions, access URLs, and deletion behavior.
- [ ] Add rate limits and abuse protection to auth-adjacent and public write paths.

## P0 — Token economy and signup bonus

- [ ] Resolve the live mismatch: current signup grant is 100 tokens; product roadmap says one-time 1,000-token bonus for the first 100 verified new accounts after beta officially opens.
- [ ] Agree the exact activation switch, verification condition, account eligibility, and first-100 counting method before changing the trigger.
- [ ] Design a concurrency-safe, one-time grant so simultaneous signups cannot exceed the first-100 limit.
- [ ] Ensure the bonus is granted only after email verification and after beta is explicitly opened.
- [ ] Ensure the bonus cannot be repeated by profile recreation, trigger retries, or duplicate webhook/event delivery.
- [ ] Reconcile any existing wallets/ledger entries before changing bonus behavior; do not silently top up or claw back live users.
- [ ] Verify wallet balance and ledger remain consistent and every grant has a unique idempotency record.
- [ ] Keep token spending/redemption disabled until the shop and reversal paths are tested.
- [ ] Confirm guest mode cannot spend, transfer, or mutate wallet state.
- [ ] Confirm transfers, trading, marketplace, and cash-out remain out of scope unless explicitly approved.
- [ ] Decide how wallet balance and entitlements are treated on account deletion before real-money sales.

## P1 — Stripe and Edge Functions (staging only)

- [ ] Keep all live token checkout disabled; use Stripe test mode in an isolated staging project only.
- [ ] Confirm `token-checkout` and `stripe-token-webhook` are deployed to the intended Supabase staging project.
- [ ] Confirm required Edge Function secrets exist without printing or exposing their values.
- [ ] Confirm server-side Price IDs match the intended test-mode Stripe products, currency, and token amounts.
- [ ] Confirm `APP_BASE_URL` exactly matches the canonical staging HTTPS origin.
- [ ] Verify checkout rejects missing/invalid sessions, wrong origin, unknown bundles, wrong amount/currency, and live-mode price IDs.
- [ ] Verify webhook signature validation uses the raw request body and the correct test-mode webhook secret.
- [ ] Test successful, unpaid, asynchronous success/failure, duplicate delivery, replay, wrong event, wrong session, wrong user, and invalid signature cases.
- [ ] Confirm each successful payment credits the wallet exactly once even if Stripe retries the webhook.
- [ ] Confirm failed/abandoned/unpaid checkouts never credit tokens.
- [ ] Verify ledger idempotency and wallet locking under concurrent events.
- [ ] Decide refund, chargeback, partial-refund, dispute, and manual-review procedures before production sales.
- [ ] Implement token/item reversal rules without automatic negative balances; log operator actions.
- [ ] Publish support and refund policies only after legal/operator review.
- [ ] Keep donation links separate from token purchases; do not treat donations as account-linked purchases unless designed and approved.
- [ ] Do not enable production checkout until all staging checks and release approvals pass.

## P1 — Terms, privacy, and trust

- [ ] Finalize operator identity/contact, governing jurisdiction, minimum age, acceptable use, user content, moderation, account deletion, privacy, support, refund, and dispute terms.
- [ ] Have the final Terms and Privacy Notice reviewed; current drafts/placeholders are not production-ready legal documents.
- [ ] Add a required signup checkbox that links to the actual Terms and Privacy Notice.
- [ ] Record accepted terms version and server-side timestamp, linked to the authenticated account.
- [ ] Prevent signup completion if required acceptance is missing.
- [ ] Ensure acceptance records are immutable or appropriately audited and not user-editable through the browser.
- [ ] Define reporting, appeals, moderation escalation, harassment response, and emergency handling procedures.
- [ ] Define retention and deletion policies for messages, media, account data, reports, billing records, and logs.
- [ ] Do not claim end-to-end encryption unless it is actually implemented and independently reviewed.

## P1 — Persistent product features

- [ ] Replace in-memory feed/Shorts persistence with tested Supabase repositories where the product expects durable data.
- [ ] Test post creation/edit/delete, media metadata, pagination, privacy, and moderation.
- [ ] Test Shorts upload/playback, engagement counts, likes/unlikes, comments, and access rules.
- [ ] Wire the optional Supabase direct-message repository into the active messaging UI only after schema/RLS/realtime tests.
- [ ] Test one-to-one messages, group creation, membership, thread ordering, unread state, pagination, and reconnect behavior.
- [ ] Decide message retention, blocking, reporting, attachment safety, and rate limits.
- [ ] Replace in-memory event/RSVP storage with durable APIs and test capacity, duplicates, cancellations, and permissions.
- [ ] Connect profile/settings updates to persistent storage and verify privacy preferences actually affect discovery and display.
- [ ] Test notifications for correct recipient isolation and safe read-state updates.
- [ ] Verify account status changes and moderation actions take effect consistently across all protected features.

## P1 — PWA, media, ads, and platform support

- [ ] Test manifest and icon routes on the actual Cloudflare and Vercel deployment targets.
- [ ] Test install prompts and install guidance on Chromium desktop/Android, iOS Safari, and other supported browsers.
- [ ] Make clear that installability does not mean offline support; no service worker/offline cache is currently promised.
- [ ] Decide whether offline support is needed and design safe cache boundaries before implementing it.
- [ ] Validate media MIME types, dimensions, size limits, upload authorization, malware scanning, and moderation.
- [ ] Keep AdSense disabled until domain approval, publisher/slot configuration, `ads.txt`, and policy review are complete.
- [ ] Implement and verify an approved consent-management platform for applicable territories before serving ads.
- [ ] Verify production ad configuration is disabled on preview/local builds and fail-closed on both Vercel and Cloudflare.
- [ ] Review Vercel-specific `VERCEL_ENV` guards; do not assume they provide equivalent safeguards on Cloudflare.
- [ ] Keep native AdMob placements disabled until native consent and active-shell integration are implemented and tested.
- [ ] Test responsive layouts, keyboard navigation, screen-reader labels, contrast, and reduced-motion behavior.

## P1 — Deployment and environment parity

- [ ] Identify the intended canonical host for each environment: local, preview, staging, and production.
- [ ] Decide whether Cloudflare Workers, Vercel, or both are supported deployment targets and define which one is authoritative.
- [ ] Verify build, routing, auth callbacks, cookies, headers, static assets, and API behavior independently on each supported host.
- [ ] Compare public Supabase config across environments without exposing secret values.
- [ ] Ensure preview deployments cannot write to production user data or call live payment functions.
- [ ] Ensure live Stripe keys/webhook secrets are absent from Preview and Development unless explicitly required for isolated test setup.
- [ ] Review secret-scanning/readable-secret warnings by key name and scope; rotate any credential that may have been exposed.
- [ ] Verify deployment workflows, permissions, branch filters, and skipped deployment steps; distinguish a successful build from an actual deployment.
- [ ] Record deployment commit SHA, status, and rollback procedure.
- [ ] Run a smoke test after each deployment and after environment-variable changes.

## P2 — Quality, observability, and release readiness

- [ ] Run `npm ci`, `npm run typecheck`, `npm run build`, and the repository's Deno checks on the latest branch commit.
- [ ] Add automated tests for auth metadata, signup, password sign-in with and without TOTP, profile trigger expectations, callback routing, reset flow, and failure states.
- [ ] Add integration tests for RLS ownership and security-definer permissions.
- [ ] Add token purchase idempotency/replay tests and wallet invariant tests.
- [ ] Add basic end-to-end tests for feed, Shorts, events, messages, profile/settings, notifications, and guest mode.
- [ ] Test mobile viewport and common desktop breakpoints.
- [ ] Investigate the critical-severity vulnerability reported by `npm ci` audit; identify the exact package/advisory and apply a reviewed, lockfile-preserving fix. Do not run `npm audit fix --force` blindly.
- [ ] Review the additional high-severity audit findings introduced by the Cloudflare workflow's temporary adapter/Wrangler install; pin safe versions and verify the workflow without deploying production.
- [ ] Review dependency audit output and pin/update risky packages with lockfile changes and CI verification.
- [ ] Add structured server-side error logging that excludes passwords, tokens, secrets, private messages, and sensitive personal data.
- [ ] Add uptime/health monitoring and alerts for failed builds, failed Edge Functions, webhook errors, and auth failure spikes.
- [ ] Prepare backup, incident response, credential rotation, and rollback runbooks.
- [ ] Create a friend-group beta test plan with feedback capture, issue triage, and a safe way to disable signup/payments.
- [ ] Run a release-readiness review and obtain explicit approval before public beta.
- [ ] After launch, review incidents, support requests, moderation reports, performance, and security findings on a regular cadence.

## Known constraints — do not accidentally overstate readiness

- Social persistence is still mixed: several active experiences use in-memory/demo services.
- The optional Supabase messaging repository is not yet wired into the active messaging UI.
- Token checkout Edge Functions are not confirmed deployed; keep checkout disabled.
- The 1,000-token/first-100-verified signup bonus is not implemented; the live function currently awards 100 tokens.
- Terms drafts are not final legal terms, and signup consent recording needs verification.
- Ads are disabled by default and require host-specific guard review.
- PWA install experience has not been device/browser validated; offline support is not included.
- A successful CI/preview check is not the same as a successful end-to-end release test.

## Working rule

Choose one small, well-defined task at a time. Before coding, inspect the existing implementation and current branch; after coding, run the narrowest relevant test plus typecheck/build where possible. Update this checklist and `MASTER_BLUEPRINT.md` with what changed, the commit, the test evidence, and any remaining caveats. Do not enable live payments, public ads, destructive migrations, or production access changes just to make a checkbox green.
