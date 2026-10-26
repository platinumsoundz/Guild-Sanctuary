# Supabase Migration Drift Inventory — 2026-10-26

This is a read-only comparison of the linked Guild Sanctuary Supabase migration ledger and the checked-in `supabase/migrations/` directory. It is an audit artifact, not a migration plan that should be applied as-is.

## Verified target

- Supabase project: `xgpzvmhldyoyrwwebcic` (Guild-Sanctuary)
- Status: `ACTIVE_HEALTHY`
- Region: `eu-west-1`
- Inspection date: 2026-10-26 UTC
- No SQL or data was changed during this inspection.

## Exact version comparison

### Present in the live migration ledger, with no exact-version file in Git

| Live version | Live migration name |
| --- | --- |
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

### Present in Git with no exact-version entry in the live ledger

| Git migration file | Checked-in version |
| --- | --- |
| `20261011000000_repair_social_engagement_insert_policies.sql` | `20261011000000` |
| `20261012000000_token_wallet_and_fulfillment.sql` | `20261012000000` |
| `20261013000000_short_engagement_stats.sql` | `20261013000000` |
| `20261026103000_social_notifications.sql` | `20261026103000` |
| `20261026120000_role_hierarchy_admin_tools.sql` | `20261026120000` |
| `20261026211500_revoke_anon_role_rpc_grants.sql` | `20261026211500` |
| `20261026211600_revoke_public_moderator_rpc_grant.sql` | `20261026211600` |

An exact-version mismatch does **not** prove that the SQL is absent from the database: later migrations may have replaced, split, renamed, or reapplied equivalent logic. Conversely, an applied ledger entry does not prove the repository contains its original SQL. Recover and compare actual migration bodies before changing the ledger or replaying anything.

## Related schema finding: persistent messaging

The live `public` schema listing contained these community tables: `posts`, `profiles`, `social_likes`, `social_comments`, `short_videos`, `events`, `event_rsvps`, `account_settings`, `token_wallets`, `token_ledger`, `token_spend_catalog`, `token_spend_ledger`, `token_entitlements`, `notifications`, `game_wallet_sessions`, and `terms_acceptances`.

No `public.conversations`, `public.conversation_members`, or `public.messages` table appeared in the catalog inspection. Therefore `NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES` must remain `false` until the intended schema is identified, checked into Git, reviewed, applied to the correct environment, and tested with at least two test accounts. Do not infer a production schema from client repository code alone.

## Security advisor snapshot

Read-only advisor output reported:
- Four authenticated-callable `SECURITY DEFINER` functions: `is_active_user()`, `is_moderator()`, `search_members_for_admin(text)`, and `set_member_role(uuid,text)`.
- Leaked-password protection disabled.
- `game_wallet_sessions` has RLS enabled but no policies.
- Performance advisor previously reported 14 foreign keys without covering indexes and four unused indexes.

These are audit findings, not automatic authorization to revoke grants or modify policies. Review current function bodies, grants, callers, RLS policies and the original migration SQL first.

## Safe reconciliation sequence

1. Export the complete live migration ledger and retrieve the SQL bodies corresponding to all 15 live-only versions from the correct project.
2. Diff each body against checked-in migrations and current schema definitions; mark equivalent, superseded, missing, or unexplained changes with evidence.
3. Resolve the duplicate `game_wallet_sessions` migration names by comparing their versions and SQL bodies.
4. Reconstruct the repository history using reviewable files and documented provenance. Do not create no-op migrations merely to make version strings match.
5. Validate the reconstructed migration set in a disposable local/staging database before applying any new DDL.
6. Keep production unchanged until a reviewed, reversible migration plan is approved and its preconditions are verified.
7. Separately design and test the conversation/message schema, membership constraints, recipient scoping, RLS, indexes and Realtime publication before enabling persistent messaging.

## Change boundary

This document only records observed state. It does not authorize schema changes, role changes, wallet changes, account deletion, or activation of messaging, token spending, or checkout.
