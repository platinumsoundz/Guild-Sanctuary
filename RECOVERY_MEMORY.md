# Sanctuary Recovery Memory

Last updated: 2026-10-27
Repository: `platinumsoundz/Guild-Sanctuary`

## Current verified state
- Mainline privacy/reliability integration #157–#170 is merged. Latest integration commit at checkpoint: `d101c2dcf504fae4b8aa54855e293acd77b69700` (subsequent memory-doc commits may advance main).
- PR #155 and #156 were closed as superseded by #157.
- Mainline CI passed at [run 40587495814](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495814).
- Automated roadmap/build check passed at [run 40587495899](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495899).
- Existing Cloudflare deployment workflow succeeded at [run 40587495817](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495817). Do not infer authenticated browser QA or full Phase 1 readiness from that workflow alone.

## What was merged (#157–#170)
- Planner/reflection placement, mobile navigation and feed polish; notification accessibility and local event timezone clarity.
- Session-only self-discovery export and state reset; written E2EE readiness gates (not an E2EE implementation).
- Notification state/action isolation across account switches; static messaging RPC security contracts; message thread/inbox account isolation.
- Event and private planner account isolation; fail-closed local reflection storage; account settings isolation.

## Still unverified / not to overclaim
- Browser/device QA for mobile layouts, focus/keyboard behavior, storage denial/corruption, and account switching across all private modules.
- Live Supabase RLS/RPC authorization, two-account messaging persistence/delivery, and staging security tests.
- Messaging is not end-to-end encrypted. The E2EE document is a readiness plan only.
- Planner, reflection and self-discovery data remain browser-local or session-only, not account-synced/cloud-backed.
- Phase 1 staging checklist, backup/restore and rollback, independent security review and human release approval remain outstanding.

## Open draft PRs to triage
- #145 database-backed Daily Reflection recovery — review for conflicts with current local-only privacy/storage assumptions before merging.
- #122 token shop guarded spend RPC and #124 dependent static contract check — require full CI and live ledger/authorization tests before enabling spending.
- #84 member-role authorization and #81 moderation hierarchy — security-sensitive; require independent review and staging authorization tests.
- #85 beta showcase collaboration — validate scope and safety.
- #5 game wallet bridge — verify against wallet/ledger model; no spending/transfer claims until verified.

## Owner-only handoff tasks
The owner must handle Supabase schema/migrations/RLS/owner bootstrap, Stripe and Lemon Squeezy payment setup, and Cloudflare/Vercel account settings, secrets, domains and provider configuration. Do not change provider settings or secrets as part of code-only work. The existing Cloudflare workflow was triggered by mainline integration and reported success; this cleanup did not edit provider configuration.

## Next steps
1. Run authenticated browser/device QA across settings, planner, reflections, events, inbox, threads, notifications and mobile navigation.
2. Execute two-account staging tests for messaging and all relevant RLS/RPC boundaries.
3. Triage the open draft PRs in the order above, preserving safety gates and rerunning CI on exact final heads.
4. Keep the roadmap and blueprint aligned with tested, merged and deployed status. Never claim E2EE or Phase 1 completion without evidence.
