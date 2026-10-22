# Supabase setup and migration

`migrations/20261009000000_social_core_and_moderation.sql` is the initial social schema. `migrations/20261009000100_community_tips.sql` contains a server-only tip-reconciliation schema/RPC. `migrations/20261010000000_unify_sanctuary_scope.sql` normalizes legacy world-scoped data and adds the Sanctuary-scoped conversation RPC while retaining legacy scope columns for compatibility. These migrations have not been certified for production; test them against a disposable project and staging database first.

## Configure a project

1. Copy `.env.example` to `.env.local` and set the project URL and publishable/anon key. These values are public client configuration; never put a service-role key in a `NEXT_PUBLIC_*` variable or commit it.
2. Install the Supabase CLI using the team's approved package manager, authenticate locally, and link the repository to the intended development project.
3. Review the migrations against a disposable project, then apply them with `supabase db push`. Do not apply to production before staging validation and a backup.
4. Configure the Supabase Auth Site URL and Redirect URLs to include your deployed app origin and its `/auth/callback` path (plus the local development callback). Signup/sign-in sends `emailRedirectTo` to that callback; it exchanges PKCE codes or verifies token-hash links and sets the Supabase session cookies. The app currently supports either the numeric email OTP entry or clicking the confirmation link, depending on the Supabase email template. For PKCE, open the link in the same browser where signup was started.
5. Set moderator/admin roles only through a trusted SQL/editor or server-side administrative process after verifying staff identity. `profiles.role` is not client-updatable. The database checks that protected role for every moderation RPC.

Payments are disabled in this build. `/api/checkout` and `/api/webhooks/stripe` return `503`, and `/api/community-tips` reports that no contribution provider is available. Do not register the Stripe webhook or enable `COMMUNITY_TIPS_ENABLED`. The historical community-tip migration is not an active payment path and has not been validated for production use.

The browser client is typed in `src/services/supabase/` and throws an explicit configuration error when the required public settings are absent. It never creates a mock database client. The messaging repository is an optional adapter, but the existing app still uses its in-memory demo messaging service until the Supabase Auth/session cutover is completed.

## Security and operations

- Conversation creation is transactional through the Sanctuary-specific RPC after the consolidation migration. Validate the RPC, RLS predicates, and generated database types against the linked schema before activation.
- Reports are created through `submit_content_report`. Moderation queue reads are RLS-filtered; actions use `apply_moderation_action`, which checks the protected profile role and appends immutable audit evidence.
- Temporary suspension expiry is enforced by database authorization predicates; `suspended_until` is not client writable. Permanent bans remain inactive.
- Content/profile data in the migrations is a starting schema, not a completed migration of the existing demo stores. Media URLs remain references; production media requires signed object storage, scanning, and lifecycle policies.
- Run RLS tests against a disposable Supabase project for anonymous users, ordinary users, unrelated conversation members, moderators, and expired/permanent suspensions before launch. A successful Next.js build does not validate SQL, RLS, Auth configuration, or Realtime behavior.
- Community-tip records have RLS enabled and no browser grants. Only the service role can execute `record_community_tip`; keep its key server-only. Replays are constrained by Stripe event ID and Checkout session ID. No durable wallet/ledger fulfillment migration is present in the current tree.
- Lemon Squeezy checkout/webhooks and Monzo Business bank-transfer contributions are not implemented. Do not add unused credentials to deployment environments or enable live digital-goods sales until authenticated accounts, durable entitlement fulfillment, refunds, and reconciliation are ready.
