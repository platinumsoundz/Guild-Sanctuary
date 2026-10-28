# Supabase integration follow-up — planner, reflections, account settings, and moderation

Date: 2026-10-28  
Branch: `fix/supabase-connection-hardening`  
PR: https://github.com/platinumsoundz/Guild-Sanctuary/pull/200

## Implemented

- `public.personal_planner_data` stores tasks, daily notes, habits, and check-ins as a versioned JSONB payload per authenticated user.
- `public.daily_reflections` is now the source of truth for mood, intention, and reflection history.
- Both tables have RLS owner policies. The live project was checked for RLS enabled and no anonymous SELECT grants.
- Planner/reflection components verify the active Supabase user before loading or writing, gate editing while account data loads, display database errors, and do not write new data to localStorage.
- Existing browser data is imported only when the matching database row/date is missing. The old browser key is removed only after the database confirms the transfer; database values remain authoritative for dates already present.
- The database manages `updated_at` for planner rows, reflections, and account settings. The account-settings UI no longer tries to update the timestamp directly.
- Admin/moderation RPCs were inspected: role search/changes, report target lookup, and moderation actions have database-side role/status checks; anonymous execution is not granted.
- `apply_moderation_action` now validates message targets and actually changes message visibility for hide/remove/restore actions while retaining the moderation audit trail.
- Added static contract checks for planner persistence, daily reflections, account settings, and admin/moderation integration.

## Live verification

- Read back the planner and reflection tables, RLS policies, and grants.
- Ran transaction-rolled-back RLS write/read checks using an authenticated role context for the planner and daily reflections; both owner-scoped upserts and reads succeeded. Test writes were rolled back.
- Confirmed admin RPCs are executable by `authenticated`, not `anon`, and the role-sensitive functions validate active moderator/admin authority internally.
- Re-ran Supabase advisors. Remaining items include the intentional no-policy/server-only `game_wallet_sessions` table, signed-in-callable `SECURITY DEFINER` RPC warnings that need periodic review, leaked-password protection disabled, and unused-index notices.

## Not yet verified

- The static Node contract scripts and TypeScript/production build have not been executed in this connector-only session.
- Real browser QA with two signed-in accounts remains necessary, especially cross-account isolation, save/reload, account switching, legacy-data import, clearing history, and moderation actions.
- No deployment was triggered. Vercel previously reported a daily build-rate-limit failure.
- Migration-history drift remains unresolved; do not run `supabase db push` blindly.
