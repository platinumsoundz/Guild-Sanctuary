# Supabase setup and migrations

The schema is defined in `supabase/migrations/`:

- `20261009000000_social_core_and_moderation.sql` — profiles, settings, content, events, conversations, reports, moderation RPCs, and RLS.
- `20261009000100_community_tips.sql` — server-only historical tip reconciliation; payments are disabled.
- `20261009000200_private_vault_and_media_storage.sql` — encrypted profile vault table and the `community-media` bucket.
- `20261009000300_persistent_social_content.sql` — active-user checks, visible-content like policy, and engagement cleanup triggers.
- `20261010000000_unify_sanctuary_scope.sql` — normalizes legacy world-scoped rows and adds the Sanctuary conversation RPC while retaining legacy columns.
- `20261023000000_harden_policies_and_views.sql` — aggregate count views, discovery indexes, and active-user storage policies.

These migrations have not been certified for production. Apply them to a disposable project first, then staging, then production after a backup.

## Configure a project

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These are public client values. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; it is required by the account-deletion route.
2. Install the Supabase CLI, authenticate locally, and link the repository to the intended development project.
3. Review the migrations against a disposable project, then apply them with `supabase db push`. Do not apply to production before staging validation and a backup.
4. Configure Supabase Auth → URL Configuration:
   - Site URL: the canonical HTTPS origin.
   - Redirect URLs: the deployed `/auth/callback`, local development callback, and any preview origins you intentionally support.
   - The email template may send a confirmation link, a numeric OTP, or both. The app supports the link and the code entry path.
5. Set moderator/admin roles only through trusted SQL or a server-side administrative process after verifying staff identity. `profiles.role` is not client-updatable.
6. Enable Realtime for `messages` (the migration adds it to the `supabase_realtime` publication) and confirm RLS is respected for Realtime subscriptions.

## Account deletion

`POST /api/account/delete` verifies the current Supabase session, matching email, exact `DELETE` phrase, and TOTP when the account has a verified factor. It then removes objects under the user's folder in `community-media` and deletes the auth user. Database rows cascade from `auth.users`/`profiles`.

Required server environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If the service-role key is missing, the route returns `503` and the app surfaces a configuration error. Never expose this key to the browser.

## Current application wiring

- `src/services/supabase/client.ts` creates the browser client and throws an explicit configuration error when public values are absent.
- `src/lib/supabase/server.ts` creates the cookie-backed server client used by `/auth/callback` and `/api/account/delete`.
- `src/lib/supabase/admin.ts` creates the server-only administrative client.
- `src/proxy.ts` refreshes session cookies on requests. This is the Next.js 16 proxy convention, not `middleware.ts`.
- Profiles, settings, messages, events, RSVPs, likes, comments, and moderation use the database when Supabase is configured. The in-memory stores remain a development fallback.

## Security and operations

- Conversation creation is transactional through `create_sanctuary_conversation`. Validate the RPC, RLS predicates, and generated database types against the linked schema before activation.
- Reports are created through `submit_content_report`. Moderation reads are RLS-filtered; actions use `apply_moderation_action`, which checks the protected role and appends immutable audit evidence.
- Temporary suspension expiry is enforced by database predicates; `suspended_until` is not client writable. Permanent bans remain inactive.
- The `event_rsvp_counts` and `social_like_counts` views expose aggregates without revealing which member reacted. They run with the view owner's privileges, so keep their definitions narrow.
- Storage policies require an active profile for upload, read, and delete. Media is served through short-lived signed URLs. Production still needs scanning, lifecycle cleanup, and abuse controls.
- Run RLS tests against a disposable Supabase project for anonymous users, ordinary users, unrelated conversation members, moderators, suspended users, and expired suspensions. A successful Next.js build does not validate SQL, RLS, Auth, or Realtime behavior.
- Community-tip records have RLS enabled and no browser grants. Only the service role can execute `record_community_tip`; keep its key server-only. Payments are disabled.
- Lemon Squeezy checkout/webhooks and Monzo contributions are not implemented. Do not add unused credentials or enable live digital-goods sales.
