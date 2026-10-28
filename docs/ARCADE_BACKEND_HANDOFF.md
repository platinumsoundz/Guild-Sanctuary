# Cosmic Arcade backend handoff

## Current status
- This is a repository-ready backend contract, not a live Supabase change. The owner must review and apply the migration through the normal Supabase workflow.
- Local browser scores remain available as an offline fallback. They are not authoritative and must never award tokens.
- The migration exposes only verified score rows to leaderboard readers. Client roles have no write policy.

## Required trusted score submission endpoint
Implement an authenticated server/Edge Function before switching the UI to online scores:
1. Require a real authenticated Supabase user; ignore client-supplied user IDs and usernames.
2. Accept an idempotency `run_id`, game ID, level, difficulty, elapsed time and a server-checkable result record. Validate each field against the database bounds.
3. Enforce per-user rate limits and replay protection; reject duplicate run IDs.
4. Verify game-specific evidence on the server. A score supplied by the browser alone is not proof. If a game has no verifiable proof protocol yet, store no verified score and never grant tokens for it.
5. Derive the public display name from the approved profile/display-name source or apply the app's display-name policy. Never trust arbitrary HTML or unbounded text.
6. Insert with `verified = true` only after successful validation, using server credentials held exclusively by the function. Do not expose service-role credentials to the client.
7. Return the canonical score row and use the unique `run_id` to make retries safe.

## Token features / purchase contract
Token extras stay disabled. For a future paid extra, require a server-side transaction that:
- checks the authenticated user's authoritative wallet balance and a server-owned price;
- requires explicit confirmation of the exact item/cost;
- performs debit + ledger insert + entitlement grant atomically;
- uses an idempotency key and unique transaction reference to prevent double-spends;
- writes an immutable audit record and rejects stale/replayed requests;
- never trusts client score, client balance, or client price;
- has a server-side feature flag that remains off until staging tests, database review and abuse tests pass.

Use the existing wallet/token migrations and RPC grant restrictions; do not create a second balance source or alter payment/provider configuration in this task.

## Release gates
- Owner applies/reviews the SQL migration.
- Add endpoint integration tests for unauthenticated requests, forged user IDs, oversized scores, duplicate run IDs, replayed requests, unverified games, insufficient balance, and concurrent spending.
- Verify RLS and grants with Supabase advisors / test queries before enabling online scores.
- Token rewards remain disabled until those gates pass.
