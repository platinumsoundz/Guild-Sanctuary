# Supabase setup and migration

`migrations/20261009000000_social_core_and_moderation.sql` adds the initial social schema, world-scoped direct/group conversations, RLS policies, Realtime publication, content reporting, and audited moderation RPCs. `migrations/20261009000100_community_tips.sql` records only minimal Stripe contribution reconciliation data and exposes a service-role-only idempotent RPC. Neither migration has been applied to or validated against a production Supabase project.

## Configure a project

1. Copy `.env.example` to `.env.local` and set the project URL and publishable/anon key. These values are public client configuration; never put a service-role key in a `NEXT_PUBLIC_*` variable or commit it.
2. Install the Supabase CLI using the team's approved package manager, authenticate locally, and link the repository to the intended development project.
3. Review the migration against a disposable project, then apply it with `supabase db push`. Do not apply to production before staging validation and a backup.
4. Configure Supabase Auth email OTP templates to deliver the numeric token expected by the application. Supabase Auth is not yet connected to the current browser-local demo authentication; do not treat the local demo session as a Supabase identity.
5. Set moderator/admin roles only through a trusted SQL/editor or server-side administrative process after verifying staff identity. `profiles.role` is not client-updatable. The database checks that protected role for every moderation RPC.
6. Before staging optional community-tip tests, set `SUPABASE_SERVICE_ROLE_KEY` only in the server secret store, set the Stripe secret, webhook signing secret, three tip Price IDs, exact HTTPS `APP_BASE_URL`, and `COMMUNITY_TIPS_ENABLED=true`. Register `/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. The tip path intentionally does not bind donor identity to an app account.

The browser client is typed in `src/services/supabase/` and throws an explicit configuration error when the required public settings are absent. It never creates a mock database client. The messaging repository is an authenticated adapter, but the existing app still uses its in-memory demo messaging service until the Supabase Auth/session cutover is completed.

## Security and operations

- Conversation creation is transactional through `create_conversation`; callers cannot insert their own memberships. Direct pairs are unique per world, and message reads/writes are scoped by active membership.
- Reports are created through `submit_content_report`. Moderation queue reads are RLS-filtered; actions use `apply_moderation_action`, which checks the protected profile role and appends immutable audit evidence.
- Temporary suspension expiry is enforced by database authorization predicates; `suspended_until` is not client writable. Permanent bans remain inactive.
- Content/profile data in the migration is a starting schema, not a completed migration of the existing demo stores. Media URLs remain references; production media requires signed object storage, scanning, and lifecycle policies.
- Run RLS tests against a disposable Supabase project for anonymous users, ordinary users, unrelated conversation members, moderators, and expired/permanent suspensions before launch. A successful Next.js build does not validate SQL, RLS, Auth configuration, or Realtime behavior.
- Community-tip records have RLS enabled and no browser grants. Only the service role can execute `record_community_tip`; keep its key server-only. Replays are constrained by Stripe event ID and Checkout session ID. No durable wallet/ledger fulfillment migration is present in the current tree.
- Lemon Squeezy checkout/webhooks and Monzo Business bank-transfer contributions are not implemented. Do not add unused credentials to deployment environments or enable live digital-goods sales until authenticated accounts, durable entitlement fulfillment, refunds, and reconciliation are ready.
