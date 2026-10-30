# Beta token bonus and ledger acceptance plan

**Status:** Acceptance plan plus draft implementation in PR #296. The migration is NOT APPLIED; the beta program defaults closed.
**Owner:** Ashley for Supabase, Stripe, Lemon Squeezy, Cloudflare, Vercel, remote databases, secrets, billing and deployment.
**Tracking issue:** [#96 — First-100 beta token bonus](https://github.com/platinumsoundz/Guild-Sanctuary/issues/96)

## Fixed product decisions

- The first **100 eligible, verified, non-duplicate accounts** after the owner explicitly opens beta are eligible for **1,000 Sanctuary Tokens each**.
- Maximum bonus allocation: 100,000 tokens total.
- Tokens have no fixed cash equivalence. This bonus does not authorize checkout, redemption, paid conversion, or game spending.
- Client code, testers, moderators, collaborators and ordinary authenticated users must not be able to grant/deduct tokens or write balances.
- A user-facing balance is a projection of server-authoritative accounting, never a client-authoritative source of truth.

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
| 100 eligible accounts sign up concurrently | Exactly 100 grants, each exactly 1,000 tokens |
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


## Implemented in the draft branch (not yet staging-verified)

- A single-row locked allocator caps grants at 100 and serializes concurrent verified-account events.
- Each account has one unique 1,000-token bonus ledger entry and matching wallet credit.
- Accounts must be email-verified and created at or after the explicit beta opening timestamp.
- The beta program defaults to closed; no bonus can be issued until the owner opens it in an isolated staging project.
- The existing `token_ledger` records the bonus as `signup_bonus`; a locked program row allocates a grant position and preserves verification time in the trigger audit path.
- Existing wallet history is extended to combine purchases, spend and bonus entries.

The duplicate-account rule is enforced only to the extent of unique Supabase auth accounts/email identity; this implementation does not attempt device fingerprinting or infer whether separate verified email accounts belong to one person.


## Existing database reconciliation

A read-only audit of the populated Guild-Sanctuary project found four historical `signup_bonus` ledger entries of 100 tokens each, created by a profile-insert trigger that did not require email verification or enforce the 100-account cap. The draft migration drops that legacy trigger and its helper functions, preserves those four ledger rows and balances, and reuses `token_ledger` for the new 1,000-token grant. The new program does not top up historic grants and excludes accounts created before its explicit opening timestamp.
