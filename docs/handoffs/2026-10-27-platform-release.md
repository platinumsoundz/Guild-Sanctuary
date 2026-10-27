# Guild Sanctuary — Platform Release Handoff

Date: 2026-10-27 UTC  
Scope: Guild Sanctuary, The 5 Sleeves 2D, The 5 Sleeves 3D

This is the current operational handoff. It distinguishes verified source/database/deployment state from behaviours that still require a signed-in browser test.

## Release and deployment status

- Current reviewed Sanctuary main commit: `a19161461d276941a63efc3caab1c9e61d4739b8` — mobile shortcuts for Token Shop and authorized Admin & Moderation.
- GitHub CI for that main commit: passed.
- Sanctuary Cloudflare deployment workflow for that main commit: passed.
- Vercel production deployment `dpl_3m95HHPAZEqsgdJKC4jHs2gk3ywU`: `READY`, with alias `https://guild-sanctuary.vercel.app`.
- Public homepage fetch confirmed the deployed app responds. It rendered the signed-out landing/sign-in shell; authenticated navigation and account-specific interactions were not browser-verified in this run.
- A separate Cloudflare candidate Worker also responds at `https://guild-sanctuary.thesmarthub.workers.dev`. Do not replace the existing `the-sanctuary` Worker solely on the basis of build success; keep host cutover separate from validation.

## Requested social fixes — source and database checks

### Shorts engagement RPC error

Reported error:
`Could not find the function public.get_short_engagement_stats(requested_short_id) in the schema cache`

Read-only database inspection confirmed:
- `public.get_short_engagement_stats(uuid)` exists with exactly one overload.
- `public.toggle_short_like(uuid)` exists.
- The function source restricts results to signed-in active users and visible Shorts.
- The live migration ledger contains the repair entries; the repository contains the reviewed repair SQL.
- Sent `NOTIFY pgrst, 'reload schema'` to refresh the PostgREST schema cache.

**Remaining verification:** retry the engagement action from a signed-in browser. The SQL catalogue and cache-reload notification are verified; a real authenticated REST call has not been run here.

### Posts, comments and reports

Source inspection confirms:
- Posts have a report action.
- Comments on posts have Like, Edit and Delete controls; Edit/Delete are only shown for the comment author.
- Each post comment also has a report action.
- Shorts have a report action, and Shorts comments have edit/delete/like/report controls for the applicable user.
- The live database has `content_reports`, comment-report target support, the report submission RPC and moderation queue/action functions.
- Live RLS policies exist on reports, comments, likes, conversations, memberships and messages.

**Remaining verification:** submit a test report and exercise comment actions in an authenticated browser, then confirm the report appears in the authorized moderation queue.

### Direct messages and privacy settings

Read-only checks confirm:
- The app's `create_sanctuary_conversation` RPC exists and delegates to the guarded conversation creator.
- The live conversation creation function reads `account_settings.preferences.allowDirectMessages` first, then the profile preference.
- An `account_settings` trigger syncs the saved DM preference back to profile privacy fields.
- The owner profile's DM setting is saved as enabled in both places.
- Conversation, membership and message tables exist in the live project with RLS policies.

**Remaining verification:** test a direct conversation between two distinct signed-in accounts with the recipient's setting enabled, then test that a disabled recipient is denied and that non-members cannot read messages. Do not enable/disable settings on another person's behalf to test this.

## Settings truth table

Settings with live persistence in the configured Supabase path include profile discovery, direct-message privacy, layout selection, profile fields and social links.

These preferences are intentionally marked disabled/coming soon in the UI and must not be described as working:
- Show my online status
- Email notifications
- Personalize my feed

The Settings screen also states that server-side account deletion is not available from that screen yet. Do not treat its confirmation UI as a production-grade erasure workflow.

## Token Shop and Admin & Moderation

- Token Shop is included in main navigation and now has a compact mobile shortcut.
- The live `token_spend_catalog` has 12 catalog rows; the UI reads the catalog, wallet balance and owned entitlements for a matching signed-in Supabase account.
- **Purchases/spending remain disabled intentionally** (`SPENDING_ENABLED = false` and the database spending guard is locked). Showing the shop is not proof that purchases are ready.
- Admin & Moderation is included in navigation but correctly hidden from guest/basic accounts. It is available only to active profiles whose role is `moderator`, `admin`, `developer` or `owner`.
- The account matched to the supplied primary email already has an active `owner` profile. The alternate name did not resolve to a second profile in the exact-name lookup, so no second account was guessed and no role was changed. If Admin remains absent while signed into the owner account, refresh the session/sign out and back in, then verify the active auth user ID matches the owner profile ID.

## Database and security gates still open

- The live migration ledger now includes entries through `20261027003633`. Earlier exact-version mismatches between live migration history and checked-in SQL are documented in `docs/SUPABASE_MIGRATION_DRIFT_INVENTORY_2026-10-26.md`. Do not replay or fabricate migrations merely to align version strings; reconcile original SQL bodies and versions first.
- Supabase Security Advisor still reports leaked-password protection disabled.
- It reports 12 authenticated-callable SECURITY DEFINER functions and `game_wallet_sessions` with RLS enabled but no policies. The functions include authorization checks; do not blindly revoke grants. Review function bodies, ACLs, call sites and intended service-role-only access before a security migration.
- Do not enable token spending, checkout, production payments or messaging until their respective release gates pass.

## Game project status and naming

- Official names are **The 5 Sleeves 2D** and **The 5 Sleeves 3D**. Never call The 5 Sleeves 3D “the training ground”.
- Latest main-branch automated roadmap/build check for The 5 Sleeves 2D passed at `868bce89dcd0521a47dd9837b52045a0fdbe6d4a`.
- Latest main-branch automated roadmap/build check for The 5 Sleeves 3D passed at `d2119e0d2f6651be7d1d7cae45f03c5eebb5a719`.
- Preserve the separate active branches and the branch-access check. No story canon, gameplay saves or existing game branches were overwritten in this release session.

## Recommended acceptance sequence

1. Sign into the intended owner account on the deployed Vercel site; confirm Token Shop navigation and Admin & Moderation visibility.
2. Retry a Short like and confirm the schema-cache error is gone.
3. Test post/comment/Short reporting and comment edit/delete/like.
4. Run the two-account DM allow/deny and non-member privacy tests.
5. Review and enable Supabase leaked-password protection, then re-test signup/reset flows.
6. Reconcile migration source history and review Security Advisor findings before any additional database changes.
7. Keep token spending disabled until purchase fulfilment, receipts, refunds/chargebacks and abuse checks are complete.

## Change boundary

No account, role, wallet balance, purchase, post, comment, Short, message, save file or story canon was mutated during this handoff inspection. The only live database operation was the non-destructive PostgREST schema-cache reload notification.
