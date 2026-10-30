# Beta token bonus and ledger acceptance plan

**Status:** Design/acceptance document only. No migration or provider change is applied by this document.
**Owner:** Ashley for Supabase, Stripe, Lemon Squeezy, Cloudflare, Vercel, remote databases, secrets, billing and deployment.
**Tracking issue:** [#96 — First-100 beta token bonus](https://github.com/platinumsoundz/Guild-Sanctuary/issues/96)

## Fixed product decisions

- The first **100 active accounts by original server-side signup timestamp** reserve the thank-you places, including accounts already registered when the migration is applied. Each receives **500 Sanctuary Tokens total** once email-verified. The original build already gave existing accounts 100 tokens, so those existing accounts receive a **400-token top-up**; later eligible signups receive **500 tokens**.
- Maximum thank-you allocation: 50,000 tokens total (the migration grants 400 to the first 100 pre-existing accounts to complete their original 100-token welcome balance to 500, and 500 to later eligible accounts until the cap is reached).
- The standard token bundle reference is 100 tokens for £1 (larger bundles may be discounted). Tokens are not cash-redeemable; this bonus does not authorize checkout, redemption, paid conversion, or game spending.
- Client code, testers, moderators, collaborators and ordinary authenticated users must not be able to grant/deduct tokens or write balances.
- A user-facing balance is a projection of server-authoritative accounting, never a client-authoritative source of truth.

## Revised implementation status — 2026-10-30

- The repository now contains a proposed migration that reserves the first 100 active accounts in original signup order, whether already registered or signing up later. Verified accounts are credited immediately; unverified accounts keep their reserved rank and receive the one-time grant after email verification. Existing accounts receive +400 (their original 100 remains); later signups receive +500.
- A locked singleton pool row serializes rank reservations and credits. A unique award row per user and unique rank prevent duplicate grants and oversubscription. Pending reservations have no wallet credit until email verification; the helper is only called from database triggers and is revoked from API roles.
- The migration is code only and **NOT APPLIED**. No live account count or balance was queried from Supabase in this change.

## Required repository audit before implementation

Inspect the current main branch and every active token-related PR before changing code. Map the existing profile balance, wallet, ledger, cosmetic entitlement, spend RPC, game wallet bridge, signup verification path, Auth trigger, migrations, RLS policies and grants. Reuse existing canonical records and functions; do not introduce a second wallet or a parallel balance table without a documented reason.

For each relevant object, record:
- source file/migration and current main commit;
- whether the object is only in code or owner-verified as applied;
- who can execute it and under which database role;
- whether it is transactionally safe and idempotent;
- test coverage and remaining release gates.

## Transaction and data-integrity requirements

The eventual implementation must use a server-side transaction and database-enforced uniqueness/idempotency. Concurrent signups must not allocate more than 100 grants. Retried signup events, webhook deliveries, job retries, and repeated function calls must not duplicate a grant. Eligibility ordering must be based on a server-owned, stable event/sequence recorded inside the same transaction as allocation—not client time or a client-provided rank.

At minimum, the durable ledger should capture an immutable entry ID, account ID, signed token delta, reason/type, unique source/idempotency key, actor/system identity, and server timestamp. The account balance must reconcile to the ledger under the selected accounting model. Negative balances, duplicate source keys, unknown actors, unverified accounts, missing role information, and partial writes must fail closed. Grant and deduction logic must not be exposed as a client-callable arbitrary-amount RPC.

Use the existing schema if it already provides these guarantees. Any proposed SQL migration must be labelled **NOT APPLIED** and remain a repository artifact until Ashley completes the staging review and migration handoff.

## Required test matrix

| Scenario | Expected result |
|---|---|
| 100 active accounts sign up concurrently | Exactly 100 places are reserved in original signup order; verified accounts are credited, unverified accounts receive credit only after verification |
| 101st eligible account | No bonus grant |
| Same account retries verification/signup event | One grant maximum |
| Same event/source key is delivered twice | Second delivery is a no-op or safe idempotent response |
| Unverified, duplicate, suspended, or otherwise ineligible account | No grant |
| Client changes amount, account ID, role, eligibility, or timestamp | Request cannot influence the authoritative grant |
| Regular user, tester, collaborator or moderator attempts grant/deduction | Denied unless an explicit owner-authorized server policy permits that exact operation |
| Authorized owner action | Allowed only through audited server-side path and permitted reason/amount |
| Transaction fails midway | No partial grant; retry remains safe |
| Ledger and displayed balance diverge | Alert/repair path; do not silently trust client balance |
| Existing game wallet asks to spend tokens | Denied until a separate server-verified spending rule is approved |
| Paid checkout/payment webhook | No token grant or spending enabled by this work |

Static tests are useful but do not prove row locking, transaction isolation, RLS, database grants, or concurrent behavior. The final gate is an isolated staging database test, with independent review and owner-confirmed migration state.

## Release and rollback gates

1. Ashley confirms the beta opening/eligibility rule and verifies the actual provider/schema state.
2. Contributor audits current token code and writes the smallest compatible implementation and tests.
3. Ashley applies the proposed migration to a disposable/staging database and runs concurrency, authorization, retry, and ledger reconciliation tests.
4. Verify that users/testers cannot directly write balances or call owner grant paths; verify audit records and the exact 100-account cap.
5. Keep checkout, redemption, and game spending disabled unless separately approved and reviewed.
6. If checks fail, do not open beta or apply the migration to production. Revert the repository PR or apply a reviewed compensating migration through Ashley's owner-only workflow.

## Honest status language

- **Proposed:** design only.
- **In code:** committed to a branch/PR; not necessarily merged.
- **Staging verified:** tests passed on the named staging revision/database.
- **Owner-verified applied:** Ashley checked migration history and the actual provider state.
- **Production-live:** only after Ashley verifies deployment and end-to-end behavior.

Never use “live,” “deployed,” “secure,” or “verified” based only on a migration file or static contract.
