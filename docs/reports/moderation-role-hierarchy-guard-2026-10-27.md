# Moderation role-hierarchy guard — implementation review

Date: 2026-10-27
Branch: `fix/phase1-moderation-hierarchy-2026-10-27`
Status: proposed migration and static contract only; **not applied to any database**. A post-lock authorization race found during review has now been guarded in the proposal; CI must verify the updated branch.

## Evidence from live function inspection

The current live `public.apply_moderation_action(...)` is SECURITY DEFINER with an empty search_path and authenticated-only execution. It validates moderator status, rationale length, target type, expiry, target existence, report/target consistency, and writes moderation/audit records. It does not compare the caller's role rank to the target member's role, and it permits account actions against the caller.

The canonical role hierarchy in the live `public.set_member_role` function is:
- owner: 6
- developer: 5
- admin: 4
- moderator: 3
- vip: 2
- user: 1

The later mainline moderation migration adds comment-aware moderation and replaces the function body after the older Phase 1 guard migration would run. This is why simply importing PR #18's earlier migration is not sufficient.

## Proposed change

Migration `20261027010000_enforce_moderation_role_hierarchy.sql` replaces the current comment-aware function while preserving its existing report matching, moderation action insert, content-state updates, report resolution, audit event and grants. It also completes the existing `message` target path by checking that the message exists and updating its content state when hidden/restored/removed; the live function accepted message targets but did not currently apply a message state change.

For account-level actions it:
- rejects self-targeting;
- locks caller/target profile rows while checking roles;
- after locking both profile rows, rechecks that the caller is still an active moderator/admin/developer/owner (the earlier `is_moderator()` check alone was vulnerable to a concurrent demotion while waiting for the row lock);
- fails closed if either role is missing or unknown;
- requires the caller rank to be strictly greater than the target rank;
- rejects null target IDs, target types, action types, and null/short/overlong rationale;
- keeps `search_path = ''` and grants execution to authenticated only.

The same strict rank rule now applies to content actions: the caller cannot moderate their own content and must outrank the content owner. Owner lookup is explicit for posts, shorts, events, comments, and messages. Inactive content owners remain eligible moderation targets; only the acting moderator must be active. Missing owners/roles fail closed. This policy avoids self-dealing and prevents a lower-ranked moderator from hiding/removing a higher-ranked member's content.

The migration is versioned after the current checked-in migration sequence but must not be applied until live migration drift is reconciled and the exact SQL has passed staging.

## Static verification

A dedicated GitHub Actions contract checks role-rank mappings, strict rank comparison, self-target rejection, the post-lock moderator-role recheck, fail-closed validation, preserved comment/report handling, empty search_path, grants and audit trail.

This static contract is not a substitute for SQL execution or authorization tests.

## Required staging negative-path tests

1. Moderator → user/VIP account action: allowed if all other rules pass.
2. Moderator → own post/short/event/comment/message: rejected.
3. Moderator → content owned by user/VIP: allowed if all other rules pass.
4. Moderator → content owned by moderator/admin/developer/owner: rejected.
5. Owner → content owned by a lower-ranked role: allowed; owner → own content rejected.
6. Moderator → moderator/admin/developer/owner account action: rejected.
7. Admin → moderator/admin/developer/owner account action: rejected; admin → user/VIP allowed.
8. Developer → admin/developer/owner account action: rejected; developer → lower roles allowed.
9. Owner → owner account action: rejected; owner → lower roles allowed.
10. Any role → self: rejected for warn/suspend/ban.
11. Unknown/missing caller or target role: rejected.
12. Missing/blank/too-short/too-long rationale: rejected.
13. Expired or missing suspension expiry: rejected.
14. Comment report, post/short/event report, and report/target mismatch regression tests still behave correctly.
15. Non-moderator and anonymous direct RPC calls are rejected.
16. Every successful action writes the expected moderation and audit rows; rejected actions write neither.

## Safety boundary

No live database schema, data, roles, grants, RLS, Auth settings, payments, or deployment settings were changed. Do not mark this guard complete until the migration dependency order is reviewed, staging negative-path tests pass on the exact commit, and an independent security reviewer signs off.
