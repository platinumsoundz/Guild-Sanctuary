# Proposed Sanctuary system data models

**Purpose:** Handoff-ready database design notes for existing and future systems.  
**Owner:** Ashley / product owner for all provider execution.  
**Status:** Architecture proposal only. This does not assert that listed tables exist, and does not apply migrations. Future SQL must be reviewed and marked **NOT APPLIED** until Ashley verifies otherwise.

## Design rules
- Use UUID primary keys for app-owned entities unless existing schema requires compatibility.
- Use UTC timestamptz, server-generated timestamps, and immutable IDs.
- Minimize personal data; private by default; explicit visibility.
- Enable RLS on user-owned tables; default deny and test anonymous/authenticated/owner/service-role paths.
- Clients must never set privileged roles, payment status, entitlement grants, wallet balances, moderation outcomes, or audit integrity fields.
- Define indexes, foreign-key delete behavior, uniqueness/idempotency, retention, deletion, and migration ordering before production migrations.
- Inspect current migrations and deployed state before proposing duplicate tables/functions.

## System inventory and proposed status

| System | Status | Proposed core records | Dependency / owner handoff |
|---|---|---|---|
| Identity/profile | Existing code/schema must be reconciled | profiles or current auth-user mapping | Owner verifies actual Auth/schema; do not duplicate profiles |
| Friends/follows | Proposed until audited | friend_requests, friendships, follows | Mutual friendship and one-way follow are separate relationships |
| Notifications | **In code; applied state unverified** | `public.notifications` plus `notify_social_like()` / `notify_social_comment()` | Migration `20261026103000_social_notifications.sql` exists in main. Owner must verify migration history, grants/RLS, trigger health and UI journey. `notification_preferences` remains proposed, not evidenced in the current migration. |
| Direct messaging | **Schema/migration in code; production persistence unverified** | `conversations`, `conversation_members`, `messages` (receipt/read-state fields must be reconciled) | `20261010000000_unify_sanctuary_scope.sql`, `20261026230000_repair_persistent_messaging_schema.sql`, and `20261027001557_restore_secure_persistent_messaging.sql` exist in main. Blueprint says active UI still uses in-memory demo service and optional repository is not wired into UI. Owner verifies deployed schema; agents can audit repo wiring only. Decide E2EE/key management before schema lock. |
| Reflection/self-discovery | Proposed | reflection_entries, assessment_runs, assessment_answers, assessment_summaries, consent_records | Sensitive by design; privacy, export/delete, no diagnostic claims |
| Shorts engagement | **In code; applied state unverified** | existing `social_likes` / `social_comments`; `get_short_engagement_stats(uuid)` and `toggle_short_like(uuid)` | Both `20261013000000_short_engagement_stats.sql` and repair migration `20261026233000_repair_short_engagement_rpc.sql` exist in main. Do not create duplicate tables. Owner checks actual migration ledger, signature/grants, schema cache and signed-in like/unlike/count/comment flows. |
| Moderation/reports | Competing implementation PRs noted | content_reports, moderation_actions, moderation_appeals | Resolve PR #81/#82 overlap before schema/policy migration |
| Cosmetic wallet/entitlements | Proposed; no live commerce assumption | wallet_ledger_entries, entitlements, payment_events | Owner chooses Stripe vs Lemon Squeezy per flow; verified webhooks and idempotency |
| Audit/security | Proposed | security_audit_events, optional session records if justified | Restricted access; never store tokens/secrets/message bodies |
| Game bridge/rewards | Proposed | game_accounts, game_link_challenges, game_reward_events | Server-side verification/replay protection; never expose game_wallet_sessions |
| Community/content | Reconcile existing schema | current posts/shorts/comments/community tables | Inspect actual schema before adding equivalent tables |

## Existing repository evidence to reconcile before designing new migrations

This table records repository files only, **not** deployed/provider state.

| System | Checked-in evidence | Current caution |
|---|---|---|
| Notifications | `supabase/migrations/20261026103000_social_notifications.sql`; `src/components/NotificationBar.tsx` | The migration defines `notifications`, RLS read/update policies, and like/comment triggers. It currently allows notification types `like`/`comment` and target types `post`/`short`/`event`. It does not establish preferences, push delivery, or owner-verified production state. |
| Shorts | `supabase/migrations/20261013000000_short_engagement_stats.sql`; `supabase/migrations/20261026233000_repair_short_engagement_rpc.sql` | Both migrations define the engagement RPCs. Confirm migration ordering/history and actual remote function signature before applying anything; avoid duplicate table creation. |
| Messaging | `supabase/migrations/20261026230000_repair_persistent_messaging_schema.sql`; `supabase/migrations/20261027001557_restore_secure_persistent_messaging.sql`; `src/modules/messages/supabaseRepository.ts` | Repository code exists, but `MASTER_BLUEPRINT.md` says the active UI still uses the in-memory demo service and the optional repository is not wired into the UI. Do not call this production-persistent until owner verifies backend and UI cutover. |
| Moderation | `supabase/migrations/20261026120000_role_hierarchy_admin_tools.sql`; `supabase/migrations/20261026233200_restore_moderation_and_comment_controls.sql`; open PRs #81 and #84 | Existing migrations and overlapping open role-authorization PRs mean no new competing hierarchy migration until the owner/coordinator resolves the canonical design. |

## Proposed relationships and invariants

### Social graph
- Friend request has requester, recipient, status, created time, and optional response time. Prevent duplicate pending requests and define opposite-direction behavior.
- Accepted friendship has a canonical mutual representation; one-way follow remains separate.
- A user cannot accept/decline a request addressed to someone else. Enforce server-side and in RLS, not just UI.

### Notifications
- Each record has recipient, event type, safe payload/reference, created time, optional read time, and optional deduplication key.
- Users can only read their own notifications and mark their own as read. Clients cannot manufacture trusted notifications.
- Generate from verified application events. Index recipient + created time and unread queries.

### Messaging
- Conversation membership is the authorization source for listing/sending messages. Sender must be a current member.
- Receipts are scoped to a member/message pair; do not leak read state to non-members.
- E2EE requires a reviewed design for key enrollment, device/key changes, recovery trade-offs, attachment encryption, metadata, abuse reporting, and multi-device behavior. A table named encrypted does not implement E2EE.
- Define deletion, blocking, retention, and reporting before production.

### Reflection/self-discovery
- Answers and summaries private by default; record consent/version where appropriate.
- Do not infer or present clinical diagnoses. Distinguish user reflections, informational assessments, and clinical evaluation.
- Minimize sensitive data and define export/delete and de-identified analytics policy.

### Shorts engagement
- One like per user/short; comments need author checks, moderation status, and deletion/report handling.
- Counts derive from authorized source rows or transaction-safe server aggregates. Clients cannot set counts directly.
- Keep RPC name/signature, SQL argument types, grants, schema cache, and client calls in sync. Owner verifies deployed signature and permissions.

### Moderation
- Reporters can create/read their own reports only; ordinary users cannot read moderator notes or alter outcomes.
- Separate report state from moderation action/audit history. Restrict writes to authorized roles, validated server-side.
- Resolve competing implementations before creating function/policy migrations.

### Cosmetics/payments
- Unique provider event IDs for idempotency. Verify webhook signatures server-side.
- Derive entitlements from verified events and explicit grant/revoke records. Never allow client-side paid status or wallet writes.
- Prefer an append-only ledger for balance-affecting events; define refunds, chargebacks, duplicates, and reconciliation.
- Do not activate checkout until provider ownership, refund/cancellation flow, webhook security, tax/legal review, and owner verification are complete.

### Audit/game bridge
- Record actor, action, target, timestamp, outcome, and minimal safe metadata; never log credentials or full message content.
- Game linking uses short-lived one-time challenges, server-side verification, replay protection, and explicit unlinking. Never trust a client-supplied username alone.

## Migration handoff sequence
1. **Inventory:** Ashley verifies project/environment and compares current schema + migration history with repository migrations; identify drift and duplicate objects.
2. **Freeze naming:** choose canonical names/functions and resolve open PR conflicts before overlapping migrations.
3. **Draft only:** agents may propose numbered migration files on branches, clearly labelled NOT APPLIED. Include dependencies, indexes, constraints, grants, RLS, rollback limits, and test cases.
4. **Static/local checks:** run available SQL lint/format/repository tests without provider connections; report exact results and limitations.
5. **Owner review:** Ashley checks environment, backup/recovery, impact, and timing.
6. **Owner applies in test:** inspect migration history and apply only through the owner's chosen workflow.
7. **Verify:** test RLS with least-privilege accounts; verify RPC signatures/grants and schema cache where relevant.
8. **Production decision:** separate explicit owner approval after test evidence; record migration ID, environment, timestamp, verification, and rollback/forward-fix plan.
9. **Roadmap update:** mark Owner-verified only after Ashley records evidence. A draft PR is not live status.

## Owner action register

| Priority | Owner action required | Evidence to record |
|---|---|---|
| P0 | Verify Supabase environment, schema/migration history, Auth settings, RLS, and security functions | Non-secret environment identifier, migration list, policy/function checklist |
| P0 | Investigate missing public.get_short_engagement_stats(requested_short_id) and migration 20261013000000_short_engagement_stats.sql | Applied/unapplied state, actual signature/grants, test result |
| P0 | Resolve moderation PR #81/#82 overlap in code review | Canonical function/policy decision and tests |
| P1 | Decide messaging E2EE scope and key-management trade-offs | Written design decision before schema finalization |
| P1 | Choose provider of record: Stripe or Lemon Squeezy per payment flow | Provider ownership matrix and sandbox evidence |
| P1 | Verify Cloudflare/Vercel environment and approved source commit | Environment inventory and deployment/commit IDs |
| P1 | Approve notification event sources and read/delivery semantics | Event catalog and recipient/privacy tests |
| P2 | Approve reflection retention, export/delete, and consent model | Data lifecycle decision |
| P2 | Approve game-linking/reward boundary and server authority | Threat model and replay/authorization test plan |

## Explicit non-goals
- No live database creation or provider changes by agents.
- No migration is claimed applied.
- No live payments, ads, or paid-status advantages.
- No diagnosis/treatment claims from self-discovery.
- No E2EE claim until reviewed protocol and implementation are independently verified.
