# Member-role authorization lock — implementation report

Date: 2026-10-27  
Branch: `fix/member-role-authorization-lock-2026-10-27`  
Status: proposed migration and static contract only; **not applied to any database**.

## Live finding

A read-only query of the live `public.set_member_role(uuid,text)` definition confirmed it reads the caller's role/status before locking the target profile. A concurrent role change to the caller can therefore race the authorization decision. The function is SECURITY DEFINER with `search_path = ''`; its live ACL grants execution to `authenticated` and `service_role`, not `anon`/PUBLIC.

## Proposed change

Migration `20261027030000_lock_member_role_authority.sql` replaces only `public.set_member_role(uuid,text)`. It preserves the owner/developer/admin/moderator/VIP/user rank order, prevents self-role changes, validates requested roles, retains the active-account requirement, updates the target profile, writes the existing audit event, and keeps the empty search path. The hierarchy is strict for every actor, including the owner: an actor must outrank both the target's current role and the requested new role. This prevents an owner account from silently changing another owner or granting a peer-level role.

The key change is to lock the actor and target profile rows in deterministic ID order before reading either role/status. This ensures the authorization decision is made against the current locked state and reduces opposite-direction deadlock risk. The migration revokes execution from PUBLIC/anon and preserves authenticated execution; it does not change service_role's existing explicit grant.

## Verification

A dedicated GitHub Actions workflow runs the static contract, TypeScript typecheck, and production build. The contract checks lock ordering, that role reads happen after the lock, active status, canonical role ranks, self-target rejection, strict hierarchy without an owner bypass, and audit logging.

Static checks do not prove PostgreSQL execution or concurrency safety. Required before merge/apply:
- run against a disposable/staging database with the reconciled live schema;
- run concurrent demotion-versus-role-change tests;
- verify owner/admin/developer permissions, equal/higher-role rejection including owner-to-owner, target-not-found behavior, self-target rejection, and audit rows;
- inspect resulting function grants and rerun Supabase advisors.

## Safety boundary

No live database schema, data, roles, grants, RLS, Auth settings, payments, or deployments were changed. The live migration ledger currently ends at `20261027003633`; this proposed version follows the current ledger and the competing moderation migration proposals, but migration drift must be reconciled before any apply.
