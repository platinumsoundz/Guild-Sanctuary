# Admin member management UX — 2026-10-28

## Scope
- Branch: `feat/admin-member-management-ux-2026-10-28`
- Stacked on `feat/admin-moderation-workflow-ux-2026-10-28` (PR #198), which itself depends on moderation foundation PR #191.
- Improves member search and role-management ergonomics without adding or changing database operations.

## Changes
- Adds an admin access overview based on the role supplied to the page, with in-page navigation to available member permissions and moderation.
- Adds client-side role and status filters to the results returned by the existing `search_members_for_admin` RPC.
- Displays filtered/result counts and a clear empty-filter state.
- Clears old actionable member results on failed/empty searches to reduce the risk of acting on stale results.
- Adds a current-versus-requested role preview and explicit confirmation before every role change, with an additional warning when the selected role is higher in the existing displayed role order.
- Announces search and role-change failures through an accessible alert and visually distinguishes errors from routine status messages.
- Disables member selection/search controls while a role change is saving.
- Extends the existing moderation/admin static contract check to cover these behaviors.
- Adds a client-side moderation media URL guard that rejects non-HTTPS, malformed, credential-bearing, and excessively long URLs before rendering them as links; invalid links fail closed with explanatory UI.
- Adds `noopener noreferrer` to new-tab media links and extends the static contract check for the media URL policy. This is defense-in-depth only; the server must enforce its own media origin/access policy.
- Adds `docs/ADMIN_MODERATION_INDUSTRY_BENCHMARK_2026-10-28.md`, documenting the representative Reddit, Discord, YouTube, Shopify and GitHub comparison, current gaps, prioritized P0/P1/P2 roadmap, release gates and source links.
- Adds `docs/ADMIN_CONTROL_CENTRE_RELEASE_GATES_2026-10-28.md` with server authorization, auditability, staging and deployment acceptance requirements.

## Safety boundaries
- The overview reflects only the caller role prop and client-visible UI capability. It is not a live service-health check or proof of database authorization.
- Role ordering is used only to decide whether to display a stronger confirmation warning. The backend remains authoritative for whether a role assignment is permitted.
- Existing `search_members_for_admin` and `set_member_role` RPC contracts remain unchanged. No SQL, migrations, secrets, or production configuration changed.
- No Supabase session was available here; no live role assignment or database behavior was verified.
- Industry research is a representative public-documentation benchmark, not an exhaustive survey or live penetration test.

## Verification
- Earlier GitHub Actions CI run `40722135640` on commit `f7a26577c795361446fada9d3e2751ad5f6f16ec`: **completed successfully**.
- A new CI run `40723925501` was triggered for the frontend media-link hardening commit and was **in progress at last check**; latest-head success is not yet claimed.
- This is source/CI evidence only; no live Supabase integration, browser acceptance, or production behavior is claimed.
- Browser verification should cover role/status filters, empty results, failed search clearing, keyboard operation, confirmation cancel/accept, and a server-rejected role change.
- Live integration and authorization checks must be completed after the Supabase-connected agent restores access.

## Handoff roadmap
### P0 — required before release
1. Verify every moderation and member-management RPC enforces authorization server-side, including direct RPC calls by unauthorized roles.
2. Implement and verify an append-only audit trail for role changes and moderation actions; record actor, target, action, reason, timestamp and outcome.
3. Verify role changes are race-safe and preserve owner-level access; audit failures must not be silently swallowed.
4. Define and enforce an explicit media/link URL policy on both server and client.
5. Run multi-account staging acceptance against the exact reviewed commit.

### P1 — workflow completeness
6. Persist moderation queue lifecycle states and make transitions server-authoritative.
7. Add deterministic server-side pagination/sorting and filters for status, reason, target, age, report count and assigned moderator.
8. Add report grouping/deduplication, assignment/handoff, standard removal reasons and member enforcement history.
9. Add appeals with independent review and preserve reversal decisions as new audit events.
10. Replace broad role-only controls with granular capability permissions while retaining server-side checks.

### P2 — safety automation and scale
11. Add configurable blocked-term/link rules, spam/rate thresholds, trust/account-age gates and manual-review thresholds, initially in observe/hold mode.
12. Add real operational metrics: backlog age, resolution time, action distribution, reversals/appeals and moderator activity.
13. Add serious-report escalation, notifications, keyboard shortcuts and constrained bulk actions.
14. Consider suspicious-account and ban-evasion signals only after privacy, fairness, false-positive and appeal safeguards are defined.

## Release acceptance criteria
- Every privileged action is enforced server-side and creates an auditable event.
- Unauthorized direct RPC invocation is rejected in staging.
- Queue pagination and filters are server-bounded and deterministic.
- Queue state is persisted by the backend; UI removal alone is not treated as resolution.
- Media/link targets are validated against an explicit policy.
- Role changes are race-safe and protect owner-level access.
- Appeals and reversals preserve original events rather than rewriting history.
- Automated rules are observable and reversible, with false-positive handling.
- CI, accessibility/browser checks and multi-account staging tests pass on the exact reviewed commit.

## Deployment and rollback
- No production deployment and no database changes in this handoff.
- PR #199 remains a draft stacked on PR #198, which depends on PR #191. Do not merge these stacked PRs independently or out of order.
- Keep all three drafts blocked on Supabase/RPC security verification and staging acceptance.
- Revert this branch's commits to roll back; no database rollback is required.
