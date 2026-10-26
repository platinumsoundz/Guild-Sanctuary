# Supabase setup and migrations

The schema is defined in `supabase/migrations/`:

- `20261009000000_social_core_and_moderation.sql` — profiles, settings, content, events, conversations, reports, moderation RPCs, and RLS.
- `20261009000100_community_tips.sql` — server-only historical tip reconciliation; payments are disabled.
- `20261009000200_private_vault_and_media_storage.sql` — encrypted profile vault table and the `community-media` bucket.
- `20261009000300_persistent_social_content.sql` — active-user checks, visible-content like policy, and engagement cleanup triggers.
- `20261010000000_unify_sanctuary_scope.sql` — normalizes legacy world-scoped rows and adds the Sanctuary conversation RPC while retaining legacy columns.
- `20261011000000_repair_social_engagement_insert_policies.sql` — restores authenticated, owner-scoped like/comment inserts on visible social content.
- `20261012000000_token_wallet_and_fulfillment.sql` — read-only-to-clients token wallet, purchase ledger, and service-role-only idempotent purchase RPC.
- `20261013000000_short_engagement_stats.sql` — Shorts aggregate engagement RPCs.
- `20261023000000_harden_policies_and_views.sql` — aggregate count views, discovery indexes, and active-user storage policies.
- `20261024000000_token_spending.sql` — server-owned spend catalog, spend ledger, entitlements, equipped profile frame, and the idempotent `spend_tokens` RPC.
- `20261024000001_signup_token_bonus.sql` — 100-token welcome grant for new profiles, `signup_bonus` ledger entries, and a one-time backfill for existing profiles without a wallet.
- `20261024000002_profile_cosmetics.sql` — 12-item permanent cosmetic catalog, equipped effect/badge/banner slots, updated `spend_tokens`, and the `equip_profile_cosmetic`/`clear_profile_cosmetic` RPCs.
- `20261026000000_token_purchase_age_gate.sql` — 18+ purchase verification time, `log_audit_event`, and `confirm_token_purchase_age`.
- `20261026000100_token_refund_clawback.sql` — refund/dispute event ledger, purchase-review queue, and `record_token_refund`.
- `20261026000200_account_deletion_grace_period.sql` — seven-day deletion requests, restore, purge, and `hidden_for_deletion` visibility flags.
- `20261026000400_admin_dashboard.sql` — appeals, internal notes, member search/overview, role management, audit browsing, and purchase-review RPCs.
- `20261026113205_terms_acceptance_records.sql` — `terms_acceptances` table with a server-generated timestamp and an owner-only read/insert policy.
- `20261026113229_restrict_terms_acceptance_columns.sql` — restricts clients to inserting only `user_id` and `terms_version`.
- `20261027000000_admin_terms_acceptances.sql` — moderator-facing `admin_list_terms_acceptances` read path.

These migrations have not been certified for production. Apply them to a disposable project first, then staging, then production after a backup. For the Dashboard SQL Editor, use `../SUPABASE_SQL_HANDOFF.md` and `handoff/`; `economy_migrations.sql` combines the six economy migrations, `all_migrations.sql` is for a fresh project, and `verify_economy.sql`/`verify_all.sql` are read-only checks. Run `npm run check:sql-handoff` after changing a migration.

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

## Payments and token checkout

The Support page exposes a Stripe-hosted voluntary donation link only when `VERCEL_ENV=production` and `STRIPE_DONATION_LINK_ENABLED=true`; configure `STRIPE_DONATION_URL` and the enable flag for the Vercel Production environment only, and enable Vercel system environment variables. Preview/local deployments fail closed. Donations are not associated with accounts. `/api/checkout`, `/api/webhooks/stripe`, and the fixed-amount `/api/community-tips` flow remain disabled. Token purchases use the authenticated `token-checkout` Edge Function and signed `stripe-token-webhook`, not the shareable Payment Link; direct Payment Link purchases cannot be safely attributed to a wallet.

### Token checkout setup

1. Link the Supabase CLI to an isolated staging project, apply the four token migrations (`20261012000000_token_wallet_and_fulfillment.sql`, `20261024000000_token_spending.sql`, `20261024000001_signup_token_bonus.sql`, and `20261024000002_profile_cosmetics.sql`) in order, then deploy `token-checkout` and `stripe-token-webhook` with `supabase functions deploy <function-name>`. Do not apply these migrations to production before staging validation and a backup.
2. Use a stable staging app origin (not an ephemeral preview URL) for staging checkout, because the function accepts requests only when the browser Origin exactly matches its `APP_BASE_URL`. In Stripe test mode, create/identify one-time GBP Prices at £1/£5/£10. Configure these as **Supabase Edge Function secrets** (Dashboard → Edge Functions → Secrets, or the approved secure CLI workflow): `STRIPE_SECRET_KEY`, `STRIPE_TOKEN_WEBHOOK_SECRET`, `STRIPE_TOKEN_MODE=test`, `STRIPE_TOKEN_PRICE_100_ID`, `STRIPE_TOKEN_PRICE_600_ID`, `STRIPE_TOKEN_PRICE_1200_ID`, `APP_BASE_URL`, and `TOKEN_CHECKOUT_ENABLED=false` initially. The checkout function checks each Price is active, one-time, the expected amount/currency, and matches the configured test/live mode.
3. Register a Stripe **test-mode** webhook at `https://<project-ref>.supabase.co/functions/v1/stripe-token-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Store that endpoint's signing secret as `STRIPE_TOKEN_WEBHOOK_SECRET`. Never share or commit Stripe secret/signing keys.
4. Once staging config is verified, set `TOKEN_CHECKOUT_ENABLED=true` in staging only. Test one purchase per bundle, duplicate webhook delivery, unpaid sessions, invalid signatures, wrong-mode events, and incorrect/inactive Price IDs. Confirm only paid valid sessions credit exactly once. Keep the production flag false until these tests pass **and refund/chargeback handling has been implemented and reviewed**. Test and live keys, Price IDs, and webhook signing secrets are different; use separate staging and production projects/configurations.

The wallet currently supports balance/history, verified bundle grants, a 100-token signup grant, and 12 permanent profile cosmetics (frames, effects, emoji badges, and curated GIF banners). Spending is atomic and idempotent through `spend_tokens`; the client sends only a catalog item ID. Owned cosmetics can be equipped or removed through `equip_profile_cosmetic` and `clear_profile_cosmetic`. Transfers, cash-out, trading, VIP, gifts, chat items, and promotions are not implemented. Refund/chargeback reconciliation is not implemented; keep live sales off until a refund policy and handling path are in place, and do not expand redemption/trading until reversals are tested. Account deletion currently cascades to the wallet, spend history, and unlocks (the UI discloses that forfeiture). The historical community-tip migration is not an active payment path and has not been validated for production use.

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
- Community-tip records have RLS enabled and no browser grants. Only the service role can execute `record_community_tip`; keep its key server-only. Replays are constrained by Stripe event ID and Checkout session ID. The historical tip flow is not an active payment path.
- Token wallet fulfillment is defined in `migrations/20261012000000_token_wallet_and_fulfillment.sql`; spending and the signup grant are in `20261024000000_token_spending.sql` and `20261024000001_signup_token_bonus.sql`. They are staged but not applied or validated against the user's project. The Next.js `/api/checkout`, `/api/webhooks/stripe`, and `/api/community-tips` routes remain disabled.
- Lemon Squeezy checkout/webhooks and Monzo Business bank-transfer contributions are not implemented. Do not add unused credentials to deployment environments. Keep token checkout disabled until the account, migration, Stripe test flow, webhook fulfillment, and refund policy have been verified.
