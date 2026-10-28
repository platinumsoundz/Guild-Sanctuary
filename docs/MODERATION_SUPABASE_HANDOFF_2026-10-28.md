# Moderation queue backend integration handoff

Status: **application/UI work prepared; Supabase RPC implementation intentionally deferred**.

This branch updates the moderation dashboard to render reported content, reporter-provided details, target author, publication state/time, and an attached-media link. It adds required rationale fields and role-sensitive action controls, and makes queue errors visible instead of silently presenting an empty/placeholder state.

## Required work for the Supabase-connected agent

The current ChatGPT session does not have a Supabase connection. Do not apply database changes from this branch without the connected agent reviewing the real schema and migration ledger.

1. Inspect live and checked-in schema for `content_reports`, `posts`, `short_videos`, `events`, `social_comments`, `messages`, and `profiles`. Confirm actual column names, target enums, and content state semantics before writing SQL.
2. Implement and test an authenticated, role-gated `public.get_moderation_queue()` RPC that returns report metadata plus the reported target's body/title/media/state/creation time and safe author display fields. It must be read-only, limit results, preserve reports when content is deleted, and fail closed for inactive/non-moderator callers.
3. Confirm the role hierarchy and target-owner authorization in `public.apply_moderation_action()`. Use the existing approved hierarchy guard PR as a starting point, but reconcile it against the current live function and migration order; do not blindly apply an older replacement function.
4. Confirm the client RPC argument/return contract matches `src/modules/moderation/service.ts` and `src/services/supabase/database.types.ts`.
5. Add database integration tests for unauthorized roles, hidden/removed content, missing targets, every report target type, target/report mismatch, self-moderation, equal/higher role targets, action rationale, report resolution, audit events, and concurrent role demotion.
6. Reconcile the active Supabase migration ledger before applying any migration. Apply only to an explicitly designated disposable/staging database first; production remains out of scope for this session.

## Role policy currently presented in the UI

- user / VIP: no moderation queue or actions.
- moderator: review reports; hide/remove eligible lower-ranked members' content; warn eligible lower-ranked accounts if permitted by the verified backend.
- admin: moderator capabilities plus temporary suspension, subject to strict target-rank checks.
- developer / owner: elevated actions only where the backend hierarchy permits them; no self-targeting or equal/higher-rank actions.

The UI is not an authorization boundary. The connected agent must enforce every permission inside the RPC and database policies, regardless of which buttons the client renders.

## Verification status

No Supabase connection was available in this session. No live database, roles, grants, RLS policies, data, Auth settings, or deployments were changed. The RPC added to the client is an integration contract and will not work until the connected agent implements and validates it. Run the repository type/build/contract checks after the database contract is finalized.


## Live schema audit update — 2026-10-28

A read-only check against the active Guild-Sanctuary Supabase project confirms that `public.get_moderation_queue()` is absent. The live `public.apply_moderation_action(...)` function exists, but existence and an authenticated execute grant alone do not prove that hierarchy checks, target/report matching, audit behaviour, rationale validation, or concurrency handling are safe. No SQL, migration, grant, role, policy, data or deployment was changed.

### Verified live schema facts
- Report target enum labels: `post`, `short`, `event`, `message`, `comment`.
- Content state labels: `visible`, `hidden`, `removed`.
- The inspected target tables expose the fields needed for a bounded queue: posts (`title`, `content`, author/media/state/time), shorts (`caption`, `video_url`, author/state/time), events (`title`, `description`, creator/state/time), comments (`body`, author/state/time), messages (`body`, sender/state/time), and profiles (username/display name/avatar/role/status).
- The current distinct role values returned by the read-only query were `admin`, `developer`, `owner`, and `vip`; the moderator helper also recognises `moderator`. This is a current data snapshot, not proof that the role cannot be assigned later.

## Security review findings from the live action RPC

The inspected `apply_moderation_action` definition checks `is_moderator()`, validates a rationale, validates target existence, checks that a supplied report matches the target, performs the content/account update, resolves the report, and writes an audit event. The inspected definition does **not** explicitly compare actor and target role ranks, reject self-targeting, serialize authorization against concurrent role changes, or require a report to remain pending before applying an action. These are concrete review gaps in the inspected definition, not claims that an exploit has been reproduced.

### Required next batch and release gate
1. Reconcile the active migration ledger against the live schema; do not run a blind `supabase db push`.
2. Design the bounded read-only queue against the verified columns and preserve reports when content has been deleted.
3. Separately harden the action RPC with role hierarchy, self-target rejection, report-state transition and concurrency protections.
4. Run disposable-staging tests for every target type, every role tier, unauthorized/inactive callers, self/equal/higher-rank targets, report/target mismatch, deleted targets, missing rationale, duplicate/concurrent actions, role demotion, rollback and audit evidence.
5. Require independent security review before any production migration or moderation enablement. This PR remains draft and does not change production.
