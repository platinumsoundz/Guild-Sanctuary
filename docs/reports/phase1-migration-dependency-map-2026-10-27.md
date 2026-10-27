# Phase 1 migration dependency map — initial, read-only

Date: 2026-10-27
Status: dependency map started; not a migration plan and not authorization to apply SQL.

## Evidence

- PR #18 `feature/phase1-trust-safety` is open and currently non-mergeable.
- Its current proposed Phase 1 migration set includes age gate, refund clawback, deletion grace, admin dashboard, moderation action guards, Terms acceptance records/restrictions, and admin Terms acceptance.
- The live production migration ledger contains earlier Terms versions and unrelated later migrations, but none of those proposed Phase 1 versions. Therefore those PR migrations are not production-applied under their proposed filenames.
- A fresh production audit is documented in `docs/reports/live-supabase-audit-2026-10-27.md` on PR #79.
- The previous migration drift report shows multiple live-only versions and Git-only versions; semantic equivalence cannot be inferred from names or timestamps.

## Work package dependencies

| Package | Main code / migration area | Required dependencies | Verification before merge |
|---|---|---|---|
| Purchase-age gate | token shop UI/service, `token-checkout`, age-gate migration | profiles schema; server-only service access; Edge Function secrets; test Stripe prices | adult/minor/future-date tests; direct Edge Function bypass test; exact-origin test |
| Refund/dispute | Stripe webhook, wallet ledger, refund migration | purchase fulfillment ledger; event idempotency key; wallet locking/transaction semantics; Stripe test webhook | full/partial refund, spent tokens, duplicate event, event-before-purchase, dispute tests |
| Account deletion | request/cancel/purge routes, media cleanup, deletion migration | profile visibility/content state; auth admin API; all media storage prefixes; purge secret/scheduler | confirmation/2FA, seven-day grace, restore, early purge, retry/failure and due purge tests |
| Terms acceptance | signup/gate, acceptance migration and column restrictions | final legal text/version; server timestamp; unique user/version; admin read authorization | flag-off behavior; new/existing member; duplicate/version forgery; authorized audit view |
| Admin/moderation | admin service/dashboard, moderation guards/audit migrations | current role hierarchy; RPC grant review; audit schema; appeals/reviews | direct RPC escalation tests; self-ban/admin hierarchy; audit and appeal permissions |
| Integration/staging | SQL handoff, CI scripts, runbook | reconciled migration ledger; staging project; Stripe test mode; reviewer | exact-commit CI plus observed staging checklist |

## Safe decomposition

1. Reconcile the migration ledger and recover original SQL bodies first.
2. Separate Terms/migration integrity from account lifecycle, wallet/refund, and moderation/admin.
3. Keep each migration/function change with its focused tests and explicit prerequisites.
4. Do not cherry-pick files from PR #18 until dependency and migration history are understood.
5. Use a disposable/staging project only. The inactive Supabase project has not been verified as a safe staging target; do not restore or activate it without owner approval.
6. Keep production checkout, ads, mandatory Terms gate, and production DDL disabled until staging evidence and explicit owner approval.

This map is intentionally conservative. Update it only when exact SQL and schema evidence supports a dependency or equivalence claim.
