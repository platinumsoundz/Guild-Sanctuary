# Admin control centre — release gates (2026-10-28)

## Purpose
Consolidated handoff for the Admin & Moderation UI branches:
- PR #191 — moderation queue foundation and role-tier controls
- PR #198 — moderation queue workflow UX
- PR #199 — member-management workflow UX

These branches are drafts and are stacked. This document records the backend contracts that must be verified before the UI can be considered production-ready. It does not assert that any RPC exists or that a migration has been applied.

## Current UI/backend touchpoints

| Feature | Client-side call or behavior | Required verification |
| --- | --- | --- |
| Moderation access | Authenticated user lookup and active profiles role/status check | Verify the database policy/RPC independently rejects anonymous, inactive, and non-moderator users |
| Report queue | get_moderation_queue() | Confirm function signature, output columns/types, target joins for each reportable content type, visibility of hidden/deleted targets, and strict moderator/admin role gating |
| Moderation actions | apply_moderation_action(...) | Verify action allowlist, target/report relationship, role hierarchy, rationale limits, expiry semantics, atomic state transition, and immutable audit event |
| Member search | search_members_for_admin(requested_query) | Verify allowed roles, normalized/escaped query, bounded result count, privacy-safe fields, and no enumeration by unauthorized users |
| Role change | set_member_role(requested_user_id, requested_role) | Verify caller hierarchy, target hierarchy, self-target rules, last-owner protection, recognized roles, transaction/concurrency safety, and audit event |
| Content reports | submit_content_report(...) | Verify active-account requirement, valid target type/existence, duplicate/spam limits, rate limits, and reporter privacy |
| Target media | Returned media URL may open in a new tab | Verify URL comes from trusted target data, permitted protocols/origins, and does not expose private storage or unsafe redirect targets |

## Required database-side security
- Every privileged function checks auth.uid() and current server-side role/status; never trust a client-provided role.
- Use the least-privilege SECURITY DEFINER pattern only where necessary, with a fixed safe search_path and explicit grants/revokes.
- Ensure anonymous and ordinary authenticated users cannot invoke moderation or member-administration RPCs.
- Enforce action/role hierarchy and target checks in the same transaction as mutation and audit logging.
- Do not allow clients to update profile roles directly. Reconcile all historical grants and the migration ledger before applying any role-lock migration.
- Preserve privacy boundaries: member search should return only the fields required by the admin UI and must not become a general profile lookup.
- Verify moderation action audit rows include actor, target, report, action, rationale, timestamps/expiry, and outcome; restrict modification/deletion of audit records.

## Staging acceptance matrix
Use two ordinary accounts, one moderator, one admin, one developer/owner, and one inactive account in a disposable staging project.

1. Anonymous and ordinary accounts cannot load queue data, search members, or invoke any privileged RPC directly.
2. Moderator can review queue and perform only the moderator-approved actions; cannot grant roles or use admin-only suspension/ban actions.
3. Admin can perform permitted member/role operations but cannot exceed the configured hierarchy.
4. Developer/owner actions follow the explicit policy; owner assignment and last-owner safety are tested.
5. Concurrent role changes/demotions cannot bypass hierarchy checks or leave partial audit records.
6. Each destructive moderation action has a rationale, is atomic with audit logging, and is idempotent or safely rejects duplicate submission.
7. Expired suspensions restore access correctly; permanent bans and account deletion have separately specified semantics.
8. Hidden/deleted content reports remain reviewable without broadening normal user access to hidden content.
9. Search results are bounded and privacy-safe; invalid, empty, long, Unicode, and injection-like queries are handled safely.
10. Failure paths (RPC missing, timeout, permission denied, audit failure) produce a safe UI error and never falsely claim the operation completed.
11. Browser tests cover keyboard access, alert/status announcements, small screens, filters, confirmation cancellation, and refresh failures.

## Deployment gates
- Reconcile the exact migration history and existing function signatures before any migration is applied.
- Review SQL and direct grants independently; static contract tests do not prove database authorization.
- Complete the staging matrix and record exact migration/head SHAs and test evidence.
- Keep payment, ads, token spending, and other unrelated release flags unchanged.
- Do not deploy these UI branches as a live moderation system until the connected Supabase agent verifies the backend and the owner approves the release.

## Current status
- UI code and static contract coverage are in draft pull requests.
- No live Supabase session was available to this work context.
- No migration, live role change, production deployment, or staging acceptance is claimed.
