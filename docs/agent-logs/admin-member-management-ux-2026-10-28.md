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
- Disables member selection/search controls while a role change is saving.
- Extends the existing moderation/admin static contract check to cover these behaviors.

## Safety boundaries
- The overview reflects only the caller role prop and client-visible UI capability. It is not a live service-health check or proof of database authorization.
- Role ordering is used only to decide whether to display a stronger confirmation warning. The backend remains authoritative for whether a role assignment is permitted.
- Existing `search_members_for_admin` and `set_member_role` RPC contracts remain unchanged. No SQL, migrations, secrets, or production configuration changed.
- No Supabase session was available here; no live role assignment or database behavior was verified.

## Verification plan
- CI runs the existing `check:moderation-dashboard` contract script, TypeScript typecheck and production build.
- Browser verification should cover role/status filters, empty results, failed search clearing, keyboard operation, confirmation cancel/accept, and a server-rejected role change.
- Live integration and authorization checks must be completed after the Supabase-connected agent restores access.

## Deployment and rollback
- No production deployment.
- Revert this branch's commits to roll back; no database rollback is required.
