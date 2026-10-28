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

A read-only check against the active Guild-Sanctuary Supabase project confirmed that `public.get_moderation_queue()` is **absent**. This matches the dashboard's known backend blocker. No SQL, migration, grant, role, policy, or data was changed during this audit.

The live project does expose `public.apply_moderation_action(...)`, but its existence and an authenticated execute grant alone do not prove that its hierarchy checks, target/report matching, rationale validation, audit behaviour, or concurrent role-demotion handling are safe. Inspect the complete live definition and its dependent helpers before designing a queue RPC or relying on any moderation action.

### Required next batch

1. Capture the live definitions, signatures, grants, enum labels, and relevant table columns for the report queue and action path.
2. Compare them with the checked-in migration ledger and every candidate migration; record drift without attempting a blind `supabase db push`.
3. Build the queue RPC only against verified live column names. Keep the result bounded and read-only, avoid leaking reporter/target private fields, and preserve reports whose targets were deleted.
4. Test with disposable staging accounts at every role tier and across every supported report target type. Include inactive users, self-targets, equal/higher-ranked targets, mismatched report/target IDs, deleted content, missing rationale, report resolution and audit evidence.
5. Keep this PR draft until the RPC and action path have independent security review plus staging evidence. Production remains explicitly out of scope.

This audit update documents evidence and sequencing only; it does not claim the moderation queue is fixed or ready to release.


## Security review findings from the live action RPC

A read-only inspection of the current `public.apply_moderation_action(...)` definition found concrete items that must be resolved before the moderation UI is considered release-ready:

- The function checks `public.is_moderator()` and a non-empty rationale, but the inspected definition does not compare actor and target role ranks, reject self-targeting, or serialize authorization against concurrent role changes.
- The function checks that a supplied report ID points at the requested target, but the inspected definition does not require the report to still be pending before applying an action. Concurrent or repeated actions need an explicit, tested policy.
- It updates target state and resolves a report in the same function, which is useful for atomicity, but tests must verify all supported target types and failure/rollback behaviour.
- The live role values observed in `profiles` are `admin`, `developer`, `owner`, and `vip`; no `moderator` role appeared in the current distinct-role result. The helper `is_moderator()` nevertheless includes the string `moderator`. This is an observed data snapshot, not proof that the role is invalid or cannot be assigned later.
- Live report target enum labels are `post`, `short`, `event`, `message`, and `comment`; content states are `visible`, `hidden`, and `removed`.

These findings are based on the inspected live function definition and metadata, not an exploit test. Do not treat the existing function as proven vulnerable to a specific attack without reproducing it in disposable staging; equally, do not treat its current guards as sufficient. Before implementing the queue, prepare a separate security-focused correction to the action function and test role hierarchy, self-targets, report-state transitions, deleted targets, and concurrent role demotion. Do not hot-patch production from this note.


## Migration-ledger reconciliation snapshot — 2026-10-28

A second read-only query of the active project's `supabase_migrations.schema_migrations` table returned recent versions through `20261028203010` (`harden_call_signal_sender`), including `20261028163256` (`moderate_reported_messages`) and the earlier messaging/DM fixes. The live ledger therefore contains migrations later than some feature branches' recorded baselines. The latest 30 rows also show repeated migration names at distinct versions (for example, `restore_moderation_and_comment_controls`), so reconciliation must use version IDs and file contents, not migration names alone.

At the same time, live metadata still shows `public.get_moderation_queue()` absent while `public.apply_moderation_action(...)` is present. The ledger name `moderate_reported_messages` is not proof that a queue RPC was installed. Before writing a queue migration, compare exact version IDs and SQL file hashes/contents from the repository against the live ledger and inspect the deployed function definitions. No ledger rows or database objects were changed by this audit.

### Additional release gate
- Produce a version-by-version migration reconciliation table (repo migration version/file, live ledger presence, object effects verified, drift/conflict notes).
- Do not re-run a version, rename live ledger rows, or apply a guessed replacement migration to production.
- Test the queue and action path against a disposable staging clone after reconciliation; require an explicit owner-approved deployment plan and independent security review.
