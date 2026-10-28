# Front-end / back-end work split — 2026-10-28

## Decision
From this handoff onward, Sanctuary implementation work is split into explicit front-end and back-end tracks to reduce file overlap and prevent UI work from being mistaken for working server behavior.

## Ownership boundaries

### Front-end track (this working session)
Owns:
- React/TypeScript components, page layouts, interaction states and responsive behavior.
- Client-side accessibility, loading/empty/error/unauthorized states and form validation for usability.
- Front-end tests, static contract checks, visual/browser acceptance and UI documentation.
- Typed API/RPC interfaces and mock/fixture data where useful, provided these are clearly identified as contracts or test fixtures.

Must not:
- Create/apply Supabase migrations or change RLS, grants, database functions, triggers, auth settings, secrets or production environment.
- Claim that a role gate in the UI authorizes an operation.
- Add fake audit events, fabricated service-health metrics, or local-only status changes that look persisted.
- Change the backend agent's RPC contract unilaterally. Propose contract changes in a shared interface note and coordinate first.

### Back-end track (Supabase-connected agent)
Owns:
- Supabase schema/migrations, RPC/function implementation, RLS and grants.
- Server-side authorization and owner/role hierarchy enforcement.
- Atomic, append-only audit events and failure behavior.
- Persistence, queue lifecycle transitions, pagination/sorting contracts and policy enforcement.
- Database integration tests, migration ledger, staging role tests and evidence for release gates.

Must provide:
- Exact RPC names and typed request/response shapes.
- Authorization matrix and direct-RPC negative tests.
- Migration identifiers and deployment/rollback instructions.
- Staging evidence for audit atomicity, role hierarchy, ownership boundaries and failure paths.

## Shared interface contract
Before a feature crosses the boundary, document:
1. RPC/function name and versioned request/response shape.
2. Authenticated roles/capabilities and the server's rejection behavior.
3. Error codes and loading/empty/partial-result semantics.
4. Pagination, ordering, idempotency and concurrency semantics where relevant.
5. Audit event fields and whether the operation and audit write are atomic.
6. Tests proving both allowed and denied access.

Frontend can build against a clearly marked typed contract and mocked responses while backend implementation is in progress. Never label a mock as live integration.

## Branch and merge strategy
- Keep front-end work on a named `feat/frontend-...` branch and back-end work on a named `feat/backend-supabase-...` branch.
- Prefer non-overlapping file ownership. If a shared contract file must change, coordinate before editing and have one owner land it.
- Avoid stacking independent work on another active agent's branch. Integrate through a dedicated integration branch or PR after comparing changed files and contract compatibility.
- Do not merge the current admin/moderation stack to `main` yet: PR #191's queue relies on Supabase RPCs that are not verified here, and the stack has not passed live staging authorization/acceptance. PR #198 and #199 are intentionally dependent on #191.
- Do not deploy as part of this front-end handoff. Keep the release blocked until the backend evidence and front-end acceptance checks are complete.

## Current admin/moderation work
- PR #191: moderation dashboard foundation and RPC contract; live Supabase RPC remains unverified.
- PR #198: moderation queue workflow UX, stacked on #191.
- PR #199: member-management UX and industry benchmark, stacked on #198.
- Latest known CI run for PR #199's preceding head `f7a26577c795361446fada9d3e2751ad5f6f16ec` succeeded. The handoff-only commit `5ddbabe6b5db03e260a539de762cd5ae1d7ca6aa` did not have a new PR-triggered run returned by the workflow lookup, so its CI status is not inferred from the earlier run.
- No database migration, live Supabase change or production deployment is part of this handoff.

## Front-end next steps
1. Review current front-end changes and changed-file ownership before starting another UI task.
2. Add front-end-only tests and polish against documented RPC contracts; use fixtures for missing backend behavior.
3. Improve accessibility, responsive layouts, and error/retry handling without inventing persisted states.
4. Validate media links defensively in the UI while recording that the server must independently enforce the same policy.
5. Run CI/browser checks and record exact commit/test evidence in `docs/agent-logs/`.
6. Reconcile with the Supabase agent's contract before any integration or merge decision.
