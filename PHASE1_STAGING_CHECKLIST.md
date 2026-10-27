# Phase 1 staging acceptance checklist

**Status: NOT RUN. This is a release runbook, not evidence that the implementation exists on main or works.**  
Checked: 2026-10-27. The current trust-and-safety implementation is still in open PR #18, which is not mergeable. The live production migration ledger does not contain its proposed Phase 1 migration versions.

## Hard release gate

Do not call Phase 1 complete or enable live checkout, ads, mandatory Terms acceptance, or production migrations until all required cases below pass against a designated staging environment and an independent reviewer signs off.

### Preconditions

- [ ] PR #18 has been decomposed into focused, mergeable PRs; the exact code under test is merged into the staging target or checked out at an identified commit.
- [ ] An isolated staging/disposable Supabase project is explicitly identified. The inactive Supabase project is not assumed to be staging or safe to restore.
- [ ] A migration dependency map compares the current live ledger, checked-in migration files, and current schema. No blind `supabase db push`; it applies every pending migration.
- [ ] Staging migration history and backup/restore path are recorded before DDL.
- [ ] Stripe test mode only; no live secret keys or live price IDs.
- [ ] Server-only secrets are configured through the provider secret store. Never put service-role keys, purge secrets, or Stripe secrets in `NEXT_PUBLIC_*`, logs, screenshots, or reports.
- [ ] `TOKEN_CHECKOUT_ENABLED=false`, `NEXT_PUBLIC_TERMS_REQUIRED=false`, donation link disabled, and ads disabled until the appropriate gates pass.
- [ ] The Terms, Privacy, and Community Guidelines content has been reviewed; the Terms page is not still marked as draft before any mandatory acceptance gate is enabled.

## Verification record

Record these values in the PR or a dated report:
- Target environment label (never credentials):
- Repository / branch / exact commit:
- Migration ledger before and after:
- Test runner version and exact commands:
- Independent reviewer:
- Date/time and pass/fail for every test below:
- Known limitations and rollback owner:

## A. Build and static verification

- [ ] `npm ci`
- [ ] `npm run check:pwa`
- [ ] `npm run check:auth`
- [ ] `npm run check:messages`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `deno check supabase/functions/token-checkout/index.ts supabase/functions/stripe-token-webhook/index.ts`
- [ ] SQL handoff checks run, once the script is available on the target branch.
- [ ] All tests pass for the exact commit; missing scripts or unavailable services are recorded as blocked, not passed.

## B. Migration and schema acceptance

- [ ] Compare the full live/staging migration ledger to exact files in Git.
- [ ] Explain every live-only version and every Git-only version. Recover original SQL bodies where available; do not create no-op migrations merely to align version strings.
- [ ] Resolve duplicate migration names by exact version and SQL content.
- [ ] Apply only to disposable/staging after reviewing the full pending migration set.
- [ ] Run schema verification queries and confirm expected columns, constraints, functions, grants, and RLS policies.
- [ ] Refresh the PostgREST schema cache after schema changes; a cache refresh does not create missing objects.

## C. 18+ purchase gate (test mode)

- [ ] Under-18 account is rejected server-side; no purchase eligibility timestamp is written.
- [ ] Eligible adult can confirm purchase eligibility; the date of birth is not stored by the purchase gate.
- [ ] Future date and implausible age are rejected.
- [ ] Direct Edge Function call without eligibility is rejected.
- [ ] Preview/wrong Origin is rejected; exact configured app Origin is required.
- [ ] Valid test purchase grants tokens once.
- [ ] Duplicate webhook delivery does not double-grant.
- [ ] No live checkout or production token sales are enabled during this test.

## D. Refunds and disputes

- [ ] Full refund with unspent tokens records one clawback and a matching ledger/history entry.
- [ ] Refund after tokens were spent never makes wallet balance negative; shortfall is flagged for review.
- [ ] Partial refund is routed to manual review and does not trigger an unsafe automatic debit.
- [ ] Dispute is handled according to the documented policy.
- [ ] Duplicate Stripe event and second event for the same Checkout Session cannot debit twice.
- [ ] Refund arriving before purchase fulfillment is retried safely rather than acknowledged and lost.
- [ ] Dispute later won / reversal policy is explicitly decided and implemented before live sales.

## E. Account deletion and restoration

- [ ] Incorrect confirmation, missing/invalid second factor, and unauthorized request fail closed.
- [ ] Request schedules purge at least seven days out and immediately hides profile/content.
- [ ] Member can restore during grace; restoration does not lift an existing ban/suspension.
- [ ] Purge endpoint rejects missing/incorrect server secret.
- [ ] Purge before due time does not delete anything.
- [ ] Due purge removes all user media, auth identity, and related rows in the intended order.
- [ ] Media cleanup failure leaves the account hidden and safely retryable; no orphaned media/auth inconsistency.
- [ ] A member past the due date cannot regain normal access if the scheduled purge is temporarily delayed.
- [ ] Purge scheduling, retries, alerting, and failure reporting are configured and verified.

## F. Terms acceptance

- [ ] With `NEXT_PUBLIC_TERMS_REQUIRED=false`, signup does not block and no acceptance is falsely recorded.
- [ ] Terms/privacy/guidelines are approved and not draft before enabling the gate.
- [ ] When enabled in staging, fresh signup must accept the exact current version.
- [ ] Existing member without a record is correctly gated.
- [ ] Acceptance timestamp is set server-side; clients cannot forge IDs or timestamps.
- [ ] Duplicate acceptance is idempotent; unsupported versions are rejected.
- [ ] Moderator audit view shows only authorized, necessary acceptance metadata.

## G. Moderation and admin

- [ ] Ordinary member cannot invoke admin RPCs or change another member's role.
- [ ] Moderator/admin actions enforce hierarchy; no self-ban or non-admin action on an admin.
- [ ] All privileged actions write appropriate audit records.
- [ ] Reports, reviews, appeals, and member status reflect the persisted database state.
- [ ] Appeal submission and review are authorization-checked; users cannot review their own appeal where prohibited.
- [ ] RLS, function grants, SECURITY DEFINER search paths, and ownership/visibility checks have an independent security review.
- [ ] Direct API calls are tested; hiding a button is not considered authorization.

## H. Recovery and release decision

- [ ] Database backup/restore path is documented and a restore has been tested where supported.
- [ ] Rollback is safe and does not delete member data or re-enable a disabled payment path.
- [ ] Monitoring covers purge failures, refund/webhook failures, elevated auth failures, and moderation failures.
- [ ] Mobile and desktop checks are completed for the exact deployed staging revision.
- [ ] Independent reviewer records findings and confirms resolved high-severity issues.
- [ ] Product owner explicitly approves any production release after reviewing the evidence.
- [ ] Production deployment revision is independently checked; a green build or queued deployment is not proof of live behavior.

## Final status

Mark **PASS** only when every applicable release gate above has observed evidence. Otherwise use **BLOCKED** with the exact missing access/configuration or **FAIL** with the test and safe next action. Never mark Phase 1 complete from source inspection alone.
