# Guild Sanctuary — Database Recovery Memory

Last updated: 2026-10-26
Purpose: Persistent handoff for Supabase recovery and database integration.
Status: IN PROGRESS — do not treat the database as a fresh installation.

## 1. Project identity

- Repository: platinumsoundz/Guild-Sanctuary
- Working branch: audit/fixes-2026-10-23
- Linked Supabase project ref: xgpzvmhldyoyrwwebcic
- Supabase CLI observed: v2.121.0
- Local Docker/Podman unavailable in the terminal environment previously checked.
- Work against the linked remote database; local Supabase status failure does
  not by itself mean the remote database is disconnected.

## 2. Operating rules

1. Preserve existing accounts, profiles, posts, messages if present, wallets,
   ledger entries, signup bonuses, and other user data.
2. Never run the fresh-install handoff SQL against the existing live database.
3. Do not blindly run `supabase db push` or repair migration history.
4. Do not replace the hardened live `is_active_user()` function with an older
   migration version.
5. Preserve the existing profile creation and signup-bonus triggers.
6. Prefer idempotent, targeted SQL and transactions. Verify prerequisites
   before applying schema changes.
7. Do not grant direct report insertion or unnecessary table privileges.
8. Use repository migrations, handoff notes, README files, and source-code
   database calls as the primary architecture evidence.
9. Keep recovery work in small, documented stages. Record each actual result;
   never mark an operation successful without output confirming it.
10. Terminal command blocks provided to the user must start with `clear` and
    end with an explicit newline command such as `printf '\n'`.

## 3. Completed repairs — preserve these

### Profiles and account settings
- Repaired RLS and privileges on `profiles` and `account_settings`.
- Profiles: authenticated users can read profiles and update only permitted
  non-privileged fields under the relevant policies.
- Profile creation is handled by the existing auth/profile trigger.
- Account settings: own-row SELECT, INSERT and UPDATE policies exist.
- Grants were intentionally restricted, including column-level grants.

### Posts
- Removed the legacy own-post insert policy.
- Restricted table privileges and added column-level INSERT/UPDATE grants.
- Current intended policies include read, add, edit and delete.
- Do not assume the grants are missing because table-level grant summaries
  omit column-level grants.
- Live `posts` columns include:
  `id,user_id,title,content,created_at,author_id,media_type,media_url,
   story_tag,state,updated_at,world_type`.
- Before changing post grants, compare actual app insert/update payloads with
  the current permitted columns. Do not add columns to grants speculatively.

### Token economy
- Hardened `is_active_user()` and the economy SQL were applied successfully.
- Verified functions include:
  `record_token_bundle_purchase`,
  `spend_tokens`,
  `equip_profile_cosmetic`,
  `clear_profile_cosmetic`,
  `grant_signup_token_bonus`.
- Verified tables include:
  `token_entitlements`, `token_ledger`, `token_spend_catalog`,
  `token_spend_ledger`, `token_wallets`.
- RLS is enabled on these tables; catalog has 12 enabled items.
- Three existing profiles have signup bonus wallet/ledger entries.
- Purchase RPC is service-role-only and validates purchase data/replay.
- Spend RPC validates active caller, enabled item, wallet balance and
  idempotency, then creates the entitlement/equips the cosmetic.
- Never reset wallets, replay bonuses, or overwrite hardened functions with
  stale migration definitions.

## 4. Missing messaging/moderation foundation

The last live audit found these seven tables MISSING:
- `conversations`
- `conversation_members`
- `direct_conversation_pairs`
- `messages`
- `content_reports`
- `moderation_actions`
- `audit_events`

Related functions/triggers were also absent, including:
- `is_moderator()`
- `is_active_conversation_member(uuid)`
- `create_conversation(...)`
- `create_sanctuary_conversation(...)`
- `submit_content_report(...)`
- `get_report_target_owner(...)`
- `apply_moderation_action(...)`
- `prevent_audit_mutation()`
- `touch_conversation_updated_at()`
- `sync_profile_message_preference()`
- `social_target_is_visible(...)`
- `validate_social_target()`

The relevant enum types already exist. Do not recreate them:
- `world_type`: sanctuary, guild
- `conversation_kind`: direct, group
- `content_state`: visible, hidden, removed
- `report_status`: open, reviewing, resolved, dismissed
- `report_target_type`: post, short, event, message
- `moderation_action_type`: warn, hide, remove, restore, suspend, ban

Source of truth:
- `supabase/migrations/20261009000000_social_core_and_moderation.sql`
- `supabase/migrations/20261010000000_unify_sanctuary_scope.sql`
- `src/modules/messages/README.md`
- `src/modules/messages/supabaseRepository.ts`
- `src/modules/moderation/service.ts`

The messaging repository uses `conversation_members`, `conversations`,
`messages`, and RPC `create_sanctuary_conversation`.
The moderation service uses RPCs `submit_content_report`,
`get_report_target_owner`, `apply_moderation_action`, and `content_reports`.

### Safe restoration requirements
- Recover only the missing schema/functions/triggers/policies from source.
- Do not reapply old auth/profile creation or signup-bonus definitions.
- Do not replace the hardened `is_active_user()`.
- Use `CREATE TABLE IF NOT EXISTS` where appropriate and preserve any data if
  an object unexpectedly already exists.
- Enable RLS and install intended policies on the new tables.
- Authenticated users may read authorized conversation data; message INSERT
  must be limited to sender/conversation/member checks.
- Do not grant direct INSERT on `content_reports`; reports must go through
  the validating/rate-limited RPC.
- Moderation and audit access must remain restricted to moderators.
- Audit events must be append-only.
- Restore the account-settings preference sync and social target validation
  only after checking current definitions and dependencies.
- Register `messages` and `conversations` in `supabase_realtime` only if not
  already registered.
- Keep the changes transactional where possible.

## 5. Other live schema and dependencies

Existing live tables include:
- `profiles`
- `account_settings`
- `posts`
- `short_videos`
- `events`
- `event_rsvps`
- `social_comments`
- `social_likes`

`public_profiles` view exists.
The current `social_comments` SELECT policy may depend on the missing
`social_target_is_visible()` helper. Check the live policy definition before
changing it.

The live profile signup-bonus trigger exists:
`profiles_grant_signup_token_bonus` -> `grant_signup_bonus_on_profile`.
Preserve it.

The last audit found no registered tables in the `supabase_realtime`
publication, even though the publication itself exists.

## 6. Migration history warning

Previously observed `supabase migration list --linked`:
- Applied locally and remotely:
  20261009000000
  20261009000100
  20261009000200
  20261009000300
  20261010000000
- Local but not recorded as applied remotely:
  20261011000000
  20261012000000
  20261013000000
  20261023000000
  20261024000000
  20261024000001
  20261024000002

Some SQL effects may have been applied manually already. Inspect each pending
migration and compare its intended changes with live objects before deciding
whether to apply it or reconcile migration history. Never blindly push all.

## 7. Verification already completed

- `npm run check:sql-handoff` passed: 12 migrations, no Markdown fences.
- `npm run typecheck` passed.
- Git status was clean at the last recorded check.
- A prior repair attempt exited with code 1; do not blindly repeat it.
- `supabase db query --linked --file` may display only the final SELECT result
  set from a multi-statement SQL file. Prefer one consolidated JSON SELECT
  for final verification or separate targeted queries.

## 8. Recovery plan — next actions

1. Review the latest combined source inventory and migration list from the
   user's current terminal. Avoid repeating completed audits unnecessarily.
2. Build a targeted SQL recovery file for messaging/moderation from the
   original migrations, selecting only needed definitions and excluding
   unsafe/stale auth and profile sections.
3. Inspect the generated SQL before execution; verify function signatures,
   policies, grants, dependencies and idempotence.
4. Execute the targeted SQL against the linked Supabase project only after
   reviewing the file. Preserve all existing data.
5. Run one consolidated verification for tables, columns, RLS, policies,
   function signatures/security, triggers, grants and Realtime registration.
6. Inspect the project's documented verification SQL, especially
   `supabase/handoff/verify_all.sql` and `verify_economy.sql`.
7. Inventory app `.from()`, `.rpc()`, `.storage`, and `.channel()` calls.
   Map each database-dependent module to live schema, RPCs, storage buckets,
   RLS and grants. Check feed, shorts, comments, likes, events/RSVPs,
   account settings, vault/media storage and token economy.
8. Reconcile remaining migration history only after comparing actual schema
   and migration effects.
9. Update this file after every successful stage, recording commands,
   outcomes, remaining issues, and the next single action.

## 9. Resume instructions

Read this file first before doing more database work.
Use the live database and repository source as evidence; this file is a
handoff summary, not proof that unverified steps have succeeded.
Do not ask the user to repeat information already recorded here.
Prefer one well-scoped batch command and one final verification over repeated
overlapping audits.

## SESSION CHECKPOINT — 2026-10-26

### Current position
- Repository: /public/Guild-Sanctuary
- Branch: audit/fixes-2026-10-23
- Linked Supabase project: xgpzvmhldyoyrwwebcic
- Recovery notes file: RECOVERY_MEMORY.md
- Existing handoff checker passes: npm run check:sql-handoff
- Node.js is available (v22.23.2).
- Required messaging/moderation migration source files exist.
- No recovery_messaging_moderation.sql file has been created yet.
- The latest commands did not modify the live Supabase database.

### Next task — resume here
Build a targeted, standalone recovery SQL file for the seven missing messaging/moderation tables and their required functions, policies, triggers, grants, indexes, and Realtime registration.

Safety requirements:
- Preserve the hardened live is_active_user() function.
- Preserve existing signup-bonus and other profile triggers.
- Do not replay the original migration wholesale.
- Do not create a direct INSERT policy for content_reports; reports must use the validated RPC.
- Restore social_target_is_visible and missing social target validation triggers.
- Avoid broad privilege revocations or overwriting existing economy functions.
- Review the generated SQL and check it before executing anything against Supabase.
- Do not blindly run supabase db push or repair migration history.
- Keep the existing handoff files intact.

### Working preference
The user is tired and wants to resume later. Avoid repeating completed checks, long speculative audits, or fragile shell pipelines. Use short, actionable steps and explain any failure clearly.

## SESSION CHECKPOINT — 2026-10-26 (Phase 1 launch gates and navigation)

### Branch isolation
- Work is isolated on `feature/phase1-trust-safety`, created from `audit/fixes-2026-10-23`.
- A separate agent is working on password sign-in, database/domain work, and Cloudflare/Vercel/Supabase configuration. Its branches include `main`, `feature/domain-database-improvements`, `fix/supabase-signin-recovery`, `security/supabase-function-and-view-grants`, and `build/cloudflare-ads-host-neutral`.
- The Phase 1 feature content is not duplicated on those branches, but they touch the same auth, migration, and Supabase type files. Review `git diff` for both sides before any merge or rebase.
- Nothing has been committed or pushed from this checkpoint yet.

### Added in code (not applied or deployed)
- `supabase/migrations/20261026000000_token_purchase_age_gate.sql` — 18+ date-of-birth verification; stores only `profiles.purchase_age_verified_at`; adds `log_audit_event`.
- `supabase/migrations/20261026000100_token_refund_clawback.sql` — `record_token_refund`, refund/dispute event tables, purchase-review queue; never creates a negative balance.
- `supabase/migrations/20261026000200_account_deletion_grace_period.sql` — seven-day deletion schedule/restore/purge, `hidden_for_deletion` flags.
- `supabase/migrations/20261026113205_terms_acceptance_records.sql` and `20261026113229_restrict_terms_acceptance_columns.sql` (from the parallel database/auth branch) — `public.terms_acceptances`, owner-only policies, server-generated timestamp.
- `supabase/migrations/20261027000000_admin_terms_acceptances.sql` — `admin_list_terms_acceptances` moderator read path used by the Members tab.
- `supabase/migrations/20261026000400_admin_dashboard.sql` — appeals, notes, member search/overview, role management, audit browsing, purchase-review RPCs.
- App: age-gated Wallet, terms gate (`NEXT_PUBLIC_TERMS_REQUIRED`, default false), deletion notice/restore, Settings appeals panel, moderation tabs, Games hub, Token Shop catalogue.
- Edge Functions: checkout requires stored 18+ verification; webhook handles `charge.refunded` and `charge.dispute.created`.

### Not done
- No Phase 1 migration has been applied to the linked project.
- `token-checkout` and `stripe-token-webhook` have not been deployed.
- `ACCOUNT_PURGE_SECRET` and its scheduler are not configured.
- No staging test has verified refunds, disputes, deletion, restore, purge, roles, appeals, or the terms gate.
- `/terms` is still a marked draft; keep the terms gate off.

### Checks actually run
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test -- --run` passed (17/17).
- `npm run check:sql-handoff` passed (19 migrations).
- `npm run build` passed.
