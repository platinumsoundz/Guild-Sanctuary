# Sanctuary data-model inventory and owner handoff

**Updated:** 2026-10-27  
**Status:** repository planning artifact; not a claim that proposed tables exist or migrations are applied.  
**Owner boundary:** Ashley alone performs Supabase, Stripe, Lemon Squeezy, Cloudflare, Vercel, secrets, billing, remote migration, and deployment actions. This document prepares the handoff only.

## Status vocabulary

- **In code** — repository implementation exists; deployment and live behaviour may still be unverified.
- **Proposed** — model or contract is a design proposal, not implemented.
- **Unapplied / owner verification required** — migration or provider configuration must be checked by Ashley against the intended environment.
- **Verified** — evidence names the exact environment and check. Do not infer this from a file or passing CI alone.

## Current system inventory

| System | Current evidence / status | Data model or persistence direction | Security and privacy boundary | Owner verification / dependency |
|---|---|---|---|---|
| Accounts and profiles | Auth includes browser-local demo paths and optional Supabase flows; not production-ready as a whole | Supabase Auth user is the identity root; profile row keyed to auth user UUID | Never trust a client-supplied user ID; every row read/write must be owner-scoped or deliberately public | Confirm Auth configuration, profile creation, RLS, email verification, session refresh, deletion and restore |
| Account settings | account_settings table and owner-scoped RLS exist in active project; write grant repair separately verified on 2026-10-27 | One row per user, JSON preferences, updated timestamp | auth.uid() = user_id; no anonymous access; no client-side balance/admin fields | Verify signed-in browser save; migration PR #125 is still open and must be reviewed before merge |
| Social graph | Mutual-friend/follow direction is defined in product blueprint; production-ready persistence not established here | Friendship requests/edges and one-way follows should be separate relations with unique edge constraints and state/timestamps | A request cannot self-approve; block state overrides follows and messaging; list visibility follows privacy settings | Inspect existing migrations before additive schema; test two-account visibility and blocking |
| Posts, Shorts, comments, likes | Repository contains social schema/migrations and adapters; live application and migration state must be verified per feature | Reuse existing post/short/comment/reaction IDs and relations; avoid duplicate engagement tables | Visible-state checks, author identity from session, no spoofed actor IDs, owner-only edits/deletes, moderation state enforced server-side | Compare exact repository migrations with live migration ledger; verify counts, reactions, comments and guest read-only behaviour |
| Notifications | 20261026103000_social_notifications.sql exists in repository; applied state not established by this inventory | Recipient/actor, notification type, target type/ID, created/read timestamps; add event types only through reviewed constraints | Recipient-only read; recipient-only read_at update; inserts via trusted database triggers/server path | Ashley checks migration ledger and trigger behaviour in staging; test self-reaction suppression, hidden targets and duplicate events |
| Direct messaging | Blueprint says active UI uses in-memory demo service; optional Supabase repository is not wired into active UI | Conversation, membership, message, delivery/read markers, block/report references; enforce membership in database | Only members may read/send; validate membership in every server/RPC path; no broad table grants; avoid logging message bodies | Agree encryption model before claiming E2EE. Browser-local storage is not E2EE. Test two users, non-member access, block, membership changes and message deletion |
| Self-discovery / reflections | Product direction is optional, private by default; showcase PR/migration history needs reconciliation | Private raw answers, versioned questionnaire definitions, generated summary, consent record and deletion/withdrawal state | Raw answers owner-only; summaries allowlisted; sharing off by default; no diagnostic claims; consent withdrawal must remove answers and hide summaries | Reconcile showcase PR #85 and migration dependencies; do not apply migration until Ashley tests isolated staging with two accounts |
| Moderation and safety | Report UI/workflow contracts exist; deployment and authorization require separate verification | Reports, review actions, reason codes, appeal state, audit event with actor/target/timestamp | Server-enforced moderator role, no self-ban or privilege escalation, audit sensitive actions without storing unnecessary private content | Review Phase 1 PR #18 and issue #77; test role boundaries and SECURITY DEFINER functions before release |
| Token wallet and ledger | Wallet migration and Edge Functions are staged in repository; deployment not established | One canonical wallet per user plus immutable ledger; idempotency key for every credit/debit; server-only fulfillment | Browser must never write balance; service/RPC path enforces authorization; no negative balances; no client-supplied amount or eligibility | Inspect 20261012000000_token_wallet_and_fulfillment.sql and live ledger first; do not run db push blindly |
| First-100 beta bonus | Proposed / not implemented per token catalog and master blueprint | Eligibility reservation/count, unique per-user bonus grant, ledger source/idempotency key; atomic concurrency-safe global cap | Only after owner opens beta; verified, non-duplicate new accounts; exactly 1,000 tokens each for at most 100 accounts; client cannot choose eligibility or amount | Issue #96; build migration/code/tests only after wallet schema and PR overlaps are inspected. Ashley owns remote staging migration |
| Cosmetic shop / entitlements | Catalog proposal exists; no spending/redemption implemented | Server-owned catalog, account-bound entitlement, immutable purchase/spend ledger reference; atomic balance debit + entitlement grant | Cosmetic-only, non-transferable, no cash-out; server validates item and price; purchase idempotent; accessibility constraints for colours | Test-mode staging only after wallet schema and checkout/webhook are verified; live checkout stays disabled |
| Refunds and disputes | Policy direction documented; workflow not implemented | Case/review record, payment event idempotency, wallet reversal or entitlement revocation outcome, actor and audit trail | Manual review for chargebacks; pause spending during review; no automatic negative balance; do not reverse twice | Legal/support policy and staging tests before any live token sales |
| Terms acceptance and account lifecycle | Terms draft and Phase 1 work exist across branches; final approval/deployment not established | Versioned terms, acceptance timestamp, user ID, policy version; deletion request/grace state and auditable restore/purge state | Draft text is not final legal terms; no mandatory gate until approved; server-enforced deletion and purchase-age gates | Review Phase 1 PR #18 and issue #73; owner validates legal text and staging acceptance cases |
| Security audit | Audit work and live advisor findings exist separately; this inventory is not a fresh audit | Append-only security events for privileged actions, moderation, account lifecycle, wallet adjustments | Do not expose secrets or sensitive records; limit SECURITY DEFINER execute grants and fix search paths/caller checks individually | Follow issue #77 and latest audit report; do not blanket-revoke functions or modify production settings from this doc task |
| Game integration | Separate game projects; no cross-project edit authorized by this inventory | Future integration must use scoped, signed server-to-server events and stable account mapping only if explicitly approved | No shared service-role credentials; never trust client score, inventory or identity claims | Keep The 5 Sleeves 2D/3D read-only until explicit access verdict permits work |

## Dependency order

1. **Identity and access:** confirm Auth/session handling, profile identity, RLS, and ownership checks.
2. **Migration reconciliation:** compare local migration files with the exact intended Supabase ledger before any staging push. db push applies every pending local migration, not only the feature currently being discussed.
3. **Core social access:** establish block/privacy rules before enabling follows, discovery, notifications, or messages.
4. **Private self-discovery:** test raw-answer isolation, consent withdrawal, deletion and summary allowlisting with two distinct accounts.
5. **Wallet correctness:** verify canonical wallet and ledger, then implement atomic bonus and spending paths; checkout stays disabled.
6. **Moderation and lifecycle:** verify role boundaries, reports, appeals, deletion grace/restore/purge and audit logging.
7. **Provider staging and release:** Ashley configures isolated test-mode Stripe and provider resources, runs the checklist, reviews rollback/backup, and separately approves any deployment.

## Owner checklist (ordered, no secrets in this document)

- [ ] Confirm the exact Supabase project and whether it is disposable staging; do not assume the active production project is safe for tests.
- [ ] Compare supabase migration list with repository files and investigate live-only or repository-only versions before applying anything.
- [ ] Review each pending SQL file and its dependency order; never push a mixed set blindly.
- [ ] Verify RLS and grants as separate controls for every user-facing table.
- [ ] Run two-account isolation tests, including anonymous/guest, wrong-user IDs, blocked users, and unprivileged collaborators.
- [ ] Verify wallet/ledger idempotency, concurrency caps, duplicate webhook delivery, invalid signatures, wrong payment mode/price, and no-negative-balance behaviour.
- [ ] Keep checkout and ads disabled outside approved isolated staging; use Stripe test mode only.
- [ ] Confirm backup/restore and rollback path before any migration.
- [ ] Record exact commit SHA, project/environment label, commands, observed outcomes, failures, and next step without recording credentials or personal data.
- [ ] Only call a feature deployed/live after owner-observed end-to-end evidence exists.

## Current known handoff blockers

- Account Settings database grant is live-verified, but browser save confirmation remains pending; PR #125 is open/draft.
- The beta showcase PR #85 needs clean integration and privacy/migration review; do not merge its large stacked history as-is.
- Wallet, bonus, shop and spending require repository/live migration reconciliation and staging tests; production checkout remains disabled.
- Messaging persistence remains a demo path in the active UI; encryption design and membership/RLS tests are unresolved.
- Security advisor findings require function-by-function review; do not treat this inventory as remediation.
- Terms draft requires owner/legal review before mandatory acceptance or production sales.

## Change discipline

This document does not create schema, apply migrations, alter provider configuration, enable checkout, or authorize deployment. Every implementation should use an isolated branch, focused PR, static/runtime tests, a durable agent log, and an explicit owner handoff for provider-side actions.
