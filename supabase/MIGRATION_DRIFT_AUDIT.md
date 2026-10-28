# Supabase migration drift audit

Last checked: 2026-10-28 against the connected `Guild-Sanctuary` project.

## Important

Do not run `supabase db push` against production until this drift is reconciled. The live schema contains the expected social, moderation, messaging, wallet, and reflection objects, but several migration versions in the repository do not match the remote migration ledger. Applying the local-only files blindly may replay non-idempotent DDL or duplicate already-applied changes.

## Live ledger entries without a same-version repository file

- `20261026102223_social_notifications`
- `20261026103220_lock_token_spending_until_staging`
- `20261026103632_token_shop_schema_and_guard`
- `20261026103950_game_wallet_sessions`
- `20261026104059_game_wallet_sessions` (duplicate name/version pair in the live ledger)
- `20261026113205_terms_acceptance_records`
- `20261026113229_restrict_terms_acceptance_columns`
- `20261026115428_add_social_target_visibility_helper`
- `20261026115434_repair_social_engagement_insert_policies`
- `20261026211149_role_hierarchy_admin_tools`
- `20261026211214_revoke_anon_role_rpc_grants`
- `20261026211250_revoke_public_moderator_rpc_grant`
- `20261026232625_repair_short_engagement_rpc`
- `20261026232923_add_comment_report_target`
- `20261026233006_restore_moderation_and_comment_controls`
- `20261026233145_restore_moderation_and_comment_controls` (duplicate name in the live ledger)
- `20261027183042_create_private_daily_reflections`

## Repository migrations without a same-version live ledger entry

- `20261011000000_repair_social_engagement_insert_policies`
- `20261012000000_token_wallet_and_fulfillment`
- `20261013000000_short_engagement_stats`
- `20261026103000_social_notifications`
- `20261026120000_role_hierarchy_admin_tools`
- `20261026211500_revoke_anon_role_rpc_grants`
- `20261026211600_revoke_public_moderator_rpc_grant`
- `20261026230000_repair_persistent_messaging_schema`
- `20261026233000_repair_short_engagement_rpc`
- `20261026233100_add_comment_report_target`
- `20261026233200_restore_moderation_and_comment_controls`
- `20261026233300_token_shop_schema_and_guard`
- `20261026233400_lock_token_spending_until_staging`
- `20261027120000_keep_token_spending_locked_until_staging`
- `20261027150000_create_private_daily_reflections`
- `20261028134500_arcade_leaderboard_foundation` — explicitly owner-review-only and not applied to the live database.

Several entries share a migration name but use different versions. The live schema should be inspected and compared with each migration's SQL before deciding which historical entries to repair, rename, or preserve. Do not delete or rewrite historical migrations just to make the version lists look equal.

## Newly applied and tracked migrations

The following live migrations were added to this branch with their matching version/name:
- `20261028160632_database_health_hardening`
- `20261028160903_consolidate_social_engagement_rls`
- `20261028161009_tighten_table_privilege_grants`
- `20261028161415_restore_column_level_write_grants`
- `20261028162026_harden_remaining_table_privileges`
- `20261028162320_harden_postgres_default_privileges`
- `20261028162853_private_personal_planner_storage`
- `20261028163036_account_settings_updated_at_trigger`
- `20261028163256_moderate_reported_messages`
- `20261028163709_daily_reflection_updated_at_trigger`
- `20261028165508_scope_message_reports_to_members`

## Recommended reconciliation workflow

1. Compare the SQL for every same-name/different-version pair and inspect the live definitions/policies before deciding whether they are semantically equivalent.
2. Preserve the local-only arcade leaderboard migration as unapplied.
3. For changes already present under another live migration, use the Supabase CLI migration repair/fetch workflow only after confirming the SQL equivalence and desired history model.
4. Rebuild a fresh disposable branch/database from the proposed local migration sequence and verify it converges to the intended schema before any production migration push.
5. Re-run Security and Performance Advisors and authenticated multi-user RLS tests after reconciliation.

## Planner and admin integration follow-up — 2026-10-28

- `personal_planner_data` now stores each authenticated user's task list, daily notes, habits, and habit check-ins in a single versioned JSONB document. RLS scopes reads, inserts, updates, and deletes to `auth.uid() = user_id`; the client cannot change `user_id` or `updated_at`.
- Existing browser planner data is imported only when the database has no planner row, and the old browser key is removed only after the database confirms the import. The planner no longer writes new changes to localStorage. If Supabase is unavailable or the signed-in user does not match, the planner stays locked and displays an actionable error instead of silently saving private content locally.
- `account_settings.updated_at` and `daily_reflections.updated_at` are now database-managed by triggers, so settings/reflection writes no longer need to set protected timestamp columns.
- `apply_moderation_action` now validates that a reported message still exists and updates its visibility state for hide/remove/restore actions, with the existing moderator check, report-target match, and audit log retained.
- `submit_content_report` now permits message reports only for visible messages in conversations the reporting account actively belongs to; a rollback-only test confirmed a member can report a message while a nonmember is rejected.
- `daily_reflections` now backs the Daily Reflection UI too; legacy local entries are imported only for dates missing from the database, and new reflections are no longer written to browser storage.
- The current advisor run reports an informational `rls_enabled_no_policy` notice for `game_wallet_sessions` (consistent with server-only access), 12 signed-in-callable `SECURITY DEFINER` RPCs that need ongoing review, leaked-password protection disabled, and unused-index notices. The admin RPCs checked here verify role/status internally. Do not remove helper-function grants without first confirming RLS policies and dependent RPCs still work.

## Default privilege note

The migration owner (`postgres`) now has restrictive defaults for future public-schema tables, sequences, and functions, and existing client sequence grants were revoked. The connector cannot change the separate `supabase_admin` default ACLs due a permission boundary; avoid creating application tables/functions under that role without explicitly revoking/granting privileges. Normal tracked migrations should continue to run as `postgres`.
