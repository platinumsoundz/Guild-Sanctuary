# Phase 1 dependency map — 2026-10-27

Status: source-only dependency analysis. This is not an implementation approval, a staging result, or a release decision. No SQL, production data, account, role, payment, Terms gate, or deployment was changed.

## Evidence snapshot

- Canonical main reviewed at commit 5d5ad672d326f253c5a13171b620523dd7281a21.
- Issue #71 requests five separately reviewable Phase 1 work packages and an explicit dependency map.
- PR #18, head 2e85add7b082ad113ed5fa54e43198c6f714d2da, is open, targets main, reports mergeable: false, and changes 184 files (+28,082 / -4,655). Do not merge it as a unit or copy its migration files without reconciling dependencies and history.
- The latest main CI run inspected was 40431564636 and passed. The main Cloudflare workflow 40431564691 completed its build and deploy steps successfully for the older main commit. PR #70 CI run 40436063279 passed at 5cad0c6f6de4963f1f93245bd118d472744dcfe2; its Cloudflare build succeeded but deployment was skipped. PR #18 has no observed CI run for its current head in the evidence reviewed here.
- The shared AI Agent Operating Model is on PR #70, not current main. This report follows its branch-from-main, one-task-per-PR, and no-production-mutation rules without editing its shared files.

## Canonical main foundations

| Main file | What it provides | Boundary |
| --- | --- | --- |
| supabase/migrations/20261009000000_social_core_and_moderation.sql | Profiles, posts, Shorts, events, social comments, reports, moderation actions, audit events, and baseline report/action RPCs. | Baseline definitions are later replaced by some checked-in migrations; do not read this file in isolation. |
| supabase/migrations/20261012000000_token_wallet_and_fulfillment.sql | Token wallet/ledger and the purchase-fulfilment foundation. | The handoff says the migration is unapplied, while the drift inventory reports wallet tables in the inspected live schema but no exact-version ledger entry. Treat this as unresolved, not proof of absence. |
| supabase/migrations/20261026120000_role_hierarchy_admin_tools.sql | Main role set: user, vip, moderator, admin, developer, owner; guarded role assignment and admin member search. | PR #18's admin helpers use a narrower moderator/admin model and must be reconciled with this hierarchy. |
| supabase/migrations/20261026233100_add_comment_report_target.sql | Adds comment to report_target_type. | It does not alone make the full moderation workflow support comments. |
| supabase/migrations/20261026233200_restore_moderation_and_comment_controls.sql | Rebuilds report intake, target-owner lookup, comment-aware moderation actions, and report/action policies. | Its later definition of apply_moderation_action is important to the guard-order conflict described below. |
| supabase/migrations/20261026233300_token_shop_schema_and_guard.sql | Token-shop schema foundation. | Not permission to enable redemption or checkout. |
| supabase/migrations/20261026233400_lock_token_spending_until_staging.sql | Keeps token spending locked pending verification. | Preserve the lock. |

## Work-package dependency map

### 1. Purchase age gate

PR #18 candidate migration: supabase/migrations/20261026000000_token_purchase_age_gate.sql.

Related PR #18 code: src/modules/economy/TokenShopPanel.tsx, src/modules/economy/service.ts, supabase/functions/token-checkout/index.ts, and tests in the same branch.

Dependencies:
- Existing public.profiles and public.is_active_user().
- Existing wallet/ledger and authenticated checkout flow; the exact live schema must be reconciled before assuming the main wallet migration is either absent or equivalent.
- This migration creates public.log_audit_event(...), which later account-deletion and admin migrations call. That helper makes this migration an ordering dependency for otherwise separate work packages.
- The function should retain only the verification timestamp, not the submitted date of birth.

Acceptance before staging sign-off: reject under-18, future, null, and implausible dates; accept a valid adult date; require an authenticated active account; verify the timestamp is server-generated; verify checkout still fails closed when age verification is missing. Use Stripe test mode only. Keep TOKEN_CHECKOUT_ENABLED=false outside isolated staging.

### 2. Refund and chargeback handling

PR #18 candidate migration: supabase/migrations/20261026000100_token_refund_clawback.sql.

Dependencies:
- public.token_wallets and public.token_ledger from the wallet foundation.
- public.log_audit_event(...) from the age-gate migration.
- The authenticated checkout session and server-side Stripe webhook; refund/dispute events must be verified server-side, not accepted from the browser.
- New public.token_refund_events and public.token_purchase_reviews tables with server-only writes.

Acceptance before staging sign-off: duplicate Stripe event id is idempotent; full refund, partial refund, dispute, unmatched session, and spent-token cases are covered; no negative balance is created; spent-token shortfalls require manual review; purchased cosmetics are not automatically reversed. Do not enable live checkout.

### 3. Seven-day account deletion and restore

PR #18 candidate migration: supabase/migrations/20261026000200_account_deletion_grace_period.sql.

Related PR #18 code: src/app/api/account/delete/route.ts, src/app/api/account/purge/route.ts, src/lib/accountPurge.ts, src/components/AccountDeletionNotice.tsx, and the account lifecycle/settings panels.

Dependencies:
- Existing profiles, posts, short_videos, events, and social_comments schema.
- public.log_audit_event(...) from the age-gate migration.
- Server-only Supabase admin access, storage cleanup, and a scheduled caller for the purge route.
- SUPABASE_SERVICE_ROLE_KEY and ACCOUNT_PURGE_SECRET must exist only in the server environment; the purge secret must be strong and never client-exposed.

Acceptance before staging sign-off: request hides content and records a seven-day deadline; owner can restore only before expiry; a non-owner cannot restore or purge; a premature or unauthenticated purge fails; due deletion removes media and Auth identity idempotently; restoring an account does not clear an existing moderation suspension/ban. No purge test may use production accounts or data.

### 4. Admin dashboard, appeals, audit, and moderation guards

PR #18 candidate migrations:
- supabase/migrations/20261026000400_admin_dashboard.sql
- supabase/migrations/20261026000500_moderation_action_guards.sql

Dependencies:
- public.profiles, public.content_reports, public.moderation_actions, public.audit_events, and the current report/action RPCs.
- public.log_audit_event(...) from the age-gate migration.
- public.token_refund_events and public.token_purchase_reviews from the refund migration.
- The PR #18 admin dashboard also queries token_wallets, token_ledger, token_spend_ledger, and the refund/review tables.
- The PR #18 dashboard defines current_moderation_role() as moderator/admin and admin_set_member_role() as admin-only. Current main has developer/owner roles as well. Decide and test one consistent role policy; do not silently treat the two models as equivalent.

Critical migration-order conflict:
- PR #18 migration 20261026000500_moderation_action_guards.sql adds caller/target rank checks intended to prevent self-ban and actions against equal/higher roles.
- On a clean migration run, the later main migration 20261026233200_restore_moderation_and_comment_controls.sql replaces public.apply_moderation_action(...) after that guard migration. The later main definition supports comment moderation but does not contain the same caller/target rank checks. Applying both in filename order can therefore remove the Phase 1 guard.
- The safe resolution is a reviewed final function definition that preserves both comment support and the self-ban/equal-or-higher-role protections, with negative-path tests. Do not fix this by copying either function wholesale or changing migration order blindly.

Acceptance before staging sign-off: ordinary users cannot call admin actions; moderators cannot change their own role or suspend/ban themselves; lower-ranked moderators cannot act against equal/higher-ranked members; owners' exceptional permissions are explicit and audited; report/action IDs must match; each accepted action records an audit event; unauthorized and missing-target paths leave data unchanged.

### 5. Terms acceptance and admin review

PR #18 candidate migrations:
- supabase/migrations/20261026113205_terms_acceptance_records.sql
- supabase/migrations/20261026113229_restrict_terms_acceptance_columns.sql
- supabase/migrations/20261027000000_admin_terms_acceptances.sql

Related PR #18 code: src/modules/auth/terms.ts, src/modules/auth/accountLifecycle.ts, src/modules/auth/components/AuthenticationForm.tsx, src/components/TermsAcceptanceGate.tsx, and the Terms/Privacy/Guidelines pages.

Dependencies:
- Supabase Auth identity and a durable public.terms_acceptances table with server-generated id and accepted_at.
- The two admin-review migration/function dependencies above; admin_list_terms_acceptances() calls current_moderation_role().
- The current Terms text is still a draft. Keep NEXT_PUBLIC_TERMS_REQUIRED=false until approved legal text is published and reviewed.

Migration provenance blocker:
- The drift inventory says live migration versions 20261026113205 and 20261026113229 exist, but exact-version files were absent from canonical main. PR #18 supplies files with those version numbers, but this does not prove their bodies match the SQL already applied to the live project. Compare the live migration bodies before reuse; do not replay or repair the ledger based only on filenames.

Acceptance before staging sign-off: server timestamp cannot be supplied/updated by a client; members can read only their own acceptance; the admin read path is role-gated; a missing table fails clearly; changing the terms version requires a migration; draft text never triggers a mandatory gate.

### 6. CI and staging checklist

PR #18 adds PHASE1_STAGING_CHECKLIST.md, scripts/check-sql-handoff.mjs, vitest.config.ts, and package scripts/dependencies for lint, test, and check:sql-handoff. Those paths/configuration are not on current main. Current main package.json has check:pwa, check:auth, check:messages, typecheck, and build, but no lint, test, or check:sql-handoff script. Do not copy the checklist to main without bringing its test harness and dependency lockfile as a separately reviewed slice.

The checklist's own preconditions require a disposable Supabase project, Node dependencies, Deno, Stripe test-mode keys/Price IDs, APP_BASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ACCOUNT_PURGE_SECRET. Never paste secrets into a PR or report.

## Cross-cutting migration drift

docs/SUPABASE_MIGRATION_DRIFT_INVENTORY_2026-10-26.md reports 15 live-ledger versions without exact-version files on canonical main and seven checked-in migration files without exact-version ledger entries. This can mean equivalent, superseded, renamed, or unexplained SQL; it does not prove that a table/function is absent or that a differently named file is safe to apply. The role hierarchy and Terms versions are concrete examples above.

Safe precondition for every SQL slice: export the current migration ledger and retrieve the original SQL bodies for the mismatched live versions from the intended disposable/staging project; diff them against Git and the actual schema; document equivalent/superseded/missing/unexplained; then validate the proposed migration sequence in a disposable database. Never run supabase db push blindly because it applies all pending migrations.

## Vercel-versus-Cloudflare Supabase Auth flow: blocked

No dedicated staging/test Supabase project reference, test account, configured email provider, provider credentials, redirect allowlist, or Vercel/Cloudflare staging-origin configuration is documented in canonical main or supplied to this run. Therefore no signup-confirmation, redirect, sign-in, refresh/session-restore, or password-reset flow was executed. Do not substitute production accounts or infer success from source/build checks.

When staging access is deliberately provisioned, test the same isolated test account against both hosts: signup and email confirmation; allowed callback redirect and PKCE/token-hash exchange; sign-in; refresh and reload/session restore; password reset and return link; sign-out; invalid/expired link; and failure when the origin is not allowlisted. Record host, commit, environment class, outcome, and sanitized error only.

## Recommended execution order

1. Reconcile migration history and SQL bodies in a disposable/staging project. Do not mutate production.
2. Bring the focused CI/test harness onto canonical main and verify its commands work.
3. Split age gate, refund handling, account lifecycle, admin/moderation, and Terms into independent PRs with explicit dependencies and negative-path tests. Resolve the moderation function overwrite before considering the admin/moderation slice complete.
4. Execute the Phase 1 checklist against staging with Stripe test mode only; collect observed pass/fail evidence.
5. Obtain independent security review. Keep live checkout, token spending, ads, mandatory Terms gate, production migrations, and deployment disabled until all applicable gates are explicitly approved.
