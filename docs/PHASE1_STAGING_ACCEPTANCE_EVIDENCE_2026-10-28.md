# Phase 1 staging acceptance evidence — 2026-10-28

**Status: BLOCKED — no disposable/staging Supabase session was available in this work context.**

This is an evidence template and execution order, not a claim that any live or staging acceptance case has passed. Do not run production writes or supabase db push as a substitute.

## Environment record

- Environment type: [disposable / staging / unavailable]
- Project ref (non-secret identifier only): [record here]
- Branch and exact commit SHA: [record here]
- Migration ledger export time/source: [record here]
- Backup/recovery point and restore check: [record here]
- Executor and reviewer: [record here]
- Stripe mode: **test only**
- Production checkout, ads, mandatory Terms gate: **remain disabled until owner-approved release**

Never record API keys, passwords, service-role keys, webhook secrets, customer data, or session tokens in this document, PR, issue, or CI logs.

## Preconditions — hard stop if any item is missing

- [ ] Confirm a disposable or explicitly designated staging project with owner approval.
- [ ] Export the exact migration ledger and capture the current schema/roles/policies/functions relevant to Phase 1.
- [ ] Compare repository migration files against live-only and repository-only versions; resolve duplicates, ordering drift, and equivalent/superseded migrations with evidence.
- [ ] Review the exact SQL bodies and dependency order for age gate, terms records, refund/dispute handling, deletion grace, moderation guards, and token ledger.
- [ ] Verify backup/restore or disposable-project recreation procedure.
- [ ] Confirm test-mode Stripe keys/webhook and feature flags; do not share values.
- [ ] Ensure test accounts and test data are synthetic and isolated.

## Acceptance matrix

Record command or reproducible procedure, exact revision, result, evidence link, and reviewer for every case.

| Area | Acceptance case | Required evidence | Status |
|---|---|---|---|
| Age gate | Underage/ineligible purchase rejected server-side; client bypass fails | RPC/API response and database state | BLOCKED |
| Terms | Version and timestamp recorded; mandatory gate remains disabled until approved legal copy | Schema/function test and feature-flag evidence | BLOCKED |
| Deletion | Authorized request starts grace period; content is hidden; restoration works; purge only after due time with server authorization | Before/after row counts, storage checks, retry and unauthorized tests | BLOCKED |
| Refunds/disputes | Duplicate events idempotent; no negative balance; spent/partial cases route to manual review | Replayed signed test events and immutable ledger diff | BLOCKED |
| Moderation | Role tiers enforced by database, unauthorized calls rejected, audit event recorded | Multi-role RPC tests and audit rows | BLOCKED |
| Role changes | Concurrent demotion/role change cannot bypass hierarchy; self-target/unknown/equal-or-higher targets rejected | Concurrent SQL test output and audit rows | BLOCKED |
| Privacy/RLS | User A cannot read/write User B private data; block/report behaviour is consistent across feed, profile, messages, discovery | Two-account matrix and denied-query evidence | BLOCKED |
| Payments | Only Stripe test events accepted; price/amount/currency/user/bundle match; retries do not double-credit | Stripe test event IDs and ledger before/after | BLOCKED |
| Build | Contracts, Deno checks, typecheck and production build pass on the same SHA | GitHub Actions URLs for exact SHA | PARTIAL — repository CI only |
| Recovery | Partial failure and retry are observable and recoverable; rollback/recovery procedure exercised | Redacted logs and restore evidence | BLOCKED |

## Run order

1. Finish the repository-only migration dependency audit and reconcile migration history. Do not apply unresolved migrations.
2. Create a fresh disposable/staging project or restore a verified backup into a designated isolated environment.
3. Apply only the reviewed migration set to that environment, one controlled batch at a time, and capture each result.
4. Run focused SQL tests for grants, RLS, role hierarchy, event idempotency, deletion lifecycle, and audit trails.
5. Run API tests with separate synthetic accounts and Stripe test mode; verify persisted rows and storage objects rather than relying only on UI responses.
6. Repeat critical calls to test retries and concurrency; collect denied-call evidence for unauthorized accounts.
7. Run the repository CI suite against the exact candidate SHA and link each run.
8. Have an independent reviewer inspect the evidence and obtain owner approval before any production plan is considered.

## Exit criteria

Do not mark Phase 1 staging acceptance complete until every applicable row has a passing result tied to an exact revision and environment, failures are resolved or explicitly accepted by the owner, migration history is reconciled, and independent review is recorded. Repository CI alone does not satisfy the database, privacy, payment, or deletion acceptance criteria.
