# Live Supabase verification and Phase 1 blockers

Checked: 2026-10-27 07:36 UTC  
Project: Guild-Sanctuary production project  
Method: read-only project, migration-ledger, schema/catalog, privilege, and advisor queries; one non-destructive PostgREST schema-cache reload notification. No table data, schema, roles, secrets, or project configuration were changed.

## Summary

**Phase 1 trust-and-safety migrations are not present in the live migration ledger.** The code on PR #18 is not production-verified and should not be merged/applied as one broad change. The live project has newer unrelated migrations after the previous 2026-10-26 drift report, so that report needs a fresh comparison before any migration plan is prepared.

## Migration ledger

The live ledger currently contains 29 entries. The ledger includes the existing Terms migrations at versions `20261026113205` and `20261026113229`, and several later fixes for messaging, comment reactions, and short engagement. It does **not** include the proposed Phase 1 migration versions currently on PR #18:

- `20261026000000_token_purchase_age_gate.sql`
- `20261026000100_token_refund_clawback.sql`
- `20261026000200_account_deletion_grace_period.sql`
- `20261026000400_admin_dashboard.sql`
- `20261026000500_moderation_action_guards.sql`
- `20261027000000_admin_terms_acceptances.sql`

The exact migration history remains drifted from checked-in files. Do not run `supabase db push` blindly and do not try to force version strings to match. Recover SQL bodies for live-only migration versions, compare semantic effects against Git, and test a reconciled plan in a disposable environment before any schema change.

## Short-video reaction RPC — targeted cache recovery

The original symptom was: `Could not find the function public.get_short_engagement_stats(requested_short_id) in the schema cache`.

Live catalog inspection confirmed:
- `public.get_short_engagement_stats(requested_short_id uuid)` exists and returns `TABLE(liked boolean, likes_count bigint, comments_count bigint)`.
- `public.toggle_short_like(requested_short_id uuid)` exists with the same result shape.
- Both are SECURITY DEFINER functions.
- The `authenticated` role can execute both; `anon` cannot.

I sent `NOTIFY pgrst, 'reload schema';` to request a PostgREST schema-cache refresh. This does not alter table data or migration history and does not create missing objects.

**Still needed:** reload the deployed app and retry loading short-video reactions with a real signed-in test account. If the same error persists, collect the exact request/response and check the active deployed app commit, project URL, schema cache, and argument name. Do not loosen grants to fix a cache error.

## Role-management RPC — additional race found at 07:40 UTC

A read-only inspection of `public.set_member_role(uuid,text)` found that the live function reads the caller's role/status before locking the target profile. A concurrent change to the caller's role can race that stale authorization read. The function's live ACL grants `authenticated` and `service_role`, not `anon`/PUBLIC, and its SECURITY DEFINER search path is empty. Proposed draft PR #84 adds deterministic row locks for both actor and target, then re-reads the actor's role/status before making the decision. It is not applied; staging concurrency tests and independent review are required.

## Moderation migration collision — verified at 07:36 UTC

Two open proposals, PR #81 and PR #82, replace the same live `public.apply_moderation_action(...)` function using different migration versions. The live migration ledger still ends at `20261027003633`; neither proposal appears in the ledger. PR #81 includes explicit null-rationale handling and message-target existence/state handling. PR #82 overlaps on account role-rank checks but does not include the message-target path. If both are applied, the later replacement can overwrite safeguards in the earlier function body. Keep them unmerged/unapplied until there is one canonical reviewed migration.

The live schema confirms `public.messages.state` exists and `moderation_action_type` currently contains `ban, hide, remove, restore, suspend, warn`. The policy question of whether content actions must respect the content owner's role remains open; do not silently invent a policy in SQL. No database changes were made during this review.

## Security advisor snapshot

Observed at 2026-10-27 07:36 UTC:

- **1 INFO:** `public.game_wallet_sessions` has RLS enabled but no policies. A direct privilege check also confirmed `anon` and `authenticated` have no table-level SELECT, INSERT, or UPDATE privileges. This currently blocks direct client access; keep that boundary unless a reviewed server-side access path requires otherwise.
- **12 WARN:** authenticated users can execute SECURITY DEFINER functions, including `apply_moderation_action`, `create_conversation`, `create_sanctuary_conversation`, `get_report_target_owner`, `get_short_engagement_stats`, `is_active_conversation_member`, `is_active_user`, `is_moderator`, `search_members_for_admin`, `set_member_role`, `submit_content_report`, and `toggle_short_like`. This finding is a review signal, not proof each function is vulnerable. Audit each body, grants, caller authorization, search_path, and RLS assumptions before changing grants.
- **1 WARN:** leaked-password protection is disabled in Supabase Auth. Enablement requires an owner-approved Auth configuration change and a sign-in regression check; not changed during this audit.
- **21 INFO:** foreign-key columns without covering indexes.
- **5 INFO:** indexes reported unused by current statistics. Usage counters may reset, so don't drop indexes solely on this signal.
- **4 WARN:** multiple permissive policies on social comment/like operations. Review overlap and preserve behavior while consolidating, if warranted.

## Safe next actions

1. Consolidate PR #81 and PR #82 into one canonical moderation migration, record the content-owner hierarchy policy decision, and test on a disposable/staging database before any apply.
2. Review draft PR #84 for the `set_member_role` post-lock authority recheck and test concurrent demotion-versus-role-change behavior.
3. Retry the short-video reaction RPC from the deployed app with a real signed-in test account; if the schema-cache error persists, capture the exact request/response and verify deployed app commit/project URL before changing grants.
4. Run a source-backed review of the 12 SECURITY DEFINER functions, starting with moderation/admin functions and the two short-reaction RPCs. Check explicit role gates and ownership/visibility predicates; don't revoke all authenticated access indiscriminately.
5. Add an index proposal for the 21 foreign-key findings, grouped by high-write/large-table impact, and validate with query plans in staging.
6. Review duplicate permissive policies and document which policy is canonical before removing any.
7. Ask the owner to approve enabling leaked-password protection, then verify signup, login, password reset, and compromised-password rejection in a test account.
8. Reconcile migration drift in a disposable database and split Phase 1 into focused PRs with independent review.
9. Execute the Phase 1 staging checklist only after the code and migration set are reviewable and staging access is available.

## Boundaries

No production migrations, table updates, role changes, RLS policy changes, Auth settings changes, payment configuration changes, or deployment actions were performed. The PostgREST schema-cache reload is the only live operational action.


## Exact live migration ledger snapshot

The read-only ledger query returned these 29 entries, in version order:

| Version | Name |
|---|---|
| `20261009000000` | `social_core_and_moderation` |
| `20261009000100` | `community_tips` |
| `20261009000200` | `private_vault_and_media_storage` |
| `20261009000300` | `persistent_social_content` |
| `20261010000000` | `unify_sanctuary_scope` |
| `20261026101330` | `tighten_security_definer_rpc_grants` |
| `20261026101359` | `restrict_public_view_privileges` |
| `20261026102223` | `social_notifications` |
| `20261026103220` | `lock_token_spending_until_staging` |
| `20261026103632` | `token_shop_schema_and_guard` |
| `20261026103950` | `game_wallet_sessions` |
| `20261026104059` | `game_wallet_sessions` |
| `20261026104447` | `secure_public_view_projections` |
| `20261026113205` | `terms_acceptance_records` |
| `20261026113229` | `restrict_terms_acceptance_columns` |
| `20261026115428` | `add_social_target_visibility_helper` |
| `20261026115434` | `repair_social_engagement_insert_policies` |
| `20261026211149` | `role_hierarchy_admin_tools` |
| `20261026211214` | `revoke_anon_role_rpc_grants` |
| `20261026211250` | `revoke_public_moderator_rpc_grant` |
| `20261026232625` | `repair_short_engagement_rpc` |
| `20261026232923` | `add_comment_report_target` |
| `20261026233006` | `restore_moderation_and_comment_controls` |
| `20261026233145` | `restore_moderation_and_comment_controls` |
| `20261026235134` | `comment_likes` |
| `20261027001557` | `restore_secure_persistent_messaging` |
| `20261027002103` | `fix_direct_message_preference_source` |
| `20261027003520` | `allow_comment_reactions` |
| `20261027003633` | `sync_dm_setting_with_profile_privacy` |

The duplicate `game_wallet_sessions` and `restore_moderation_and_comment_controls` names are not automatically errors, but they must be explained by their distinct versions and SQL bodies before reconstructing migration history.


### SECURITY DEFINER function catalog detail

A follow-up read-only catalog query enumerated 23 public SECURITY DEFINER functions. Every function in that query had a function-level empty `search_path` setting (`SET search_path TO ''`). The reviewed functions had no anonymous EXECUTE grant; authenticated EXECUTE was granted only for the selected RPCs that require it.

This is a positive hardening signal: the advisor warning must **not** be interpreted as proof that search_path is unset or that all authenticated execution should be revoked. Each exposed function still needs body-level authorization review, and every table/function reference must remain schema-qualified because the search path is empty.

The live `public.apply_moderation_action(...)` definition was inspected directly. It checks active moderator status, rationale length, account/content action compatibility, suspension expiry, target existence for user/post/short/event/comment, report/target consistency, and records moderation/audit events. It allows `message` as a target type but does **not** check that a message exists or update `messages.state`. It also does **not** compare caller and target role ranks or reject self-targeted account actions. These gaps are addressed in part by proposed PR #81; no proposed hierarchy migration is applied, and the fix still requires migration reconciliation, staging negative-path tests, and independent security review.
