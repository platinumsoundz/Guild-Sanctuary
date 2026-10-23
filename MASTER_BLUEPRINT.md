# The Sanctuary — Master Blueprint

Last updated: 2026-10-23

## Product decision

The Sanctuary is one community system for reflection, growth, care, and connection. The former Guild Hall is retired. There is no world selector, no world-specific navigation, and no application-facing `WorldType` contract.

## Architecture

- `src/app/` owns Next.js App Router entry points.
- `src/context/AppContext.tsx` owns client navigation and the current session. It does **not** own world state.
- `src/components/AppWorkspace.tsx` composes the authenticated feature surface; `Navigation.tsx` is a single Sanctuary navigation shell.
- `src/types/database.ts` contains shared entity contracts. Posts, Shorts, events, and conversations are community-wide entities.
- `src/modules/` owns feature UI, local state, and service APIs. Modules use their `index.ts` public entry points rather than sibling internals.
- `src/services/` owns shared integrations: Supabase clients, public-profile lookup, account deletion, and media helpers.
- `src/proxy.ts` is the Next.js 16 proxy (the renamed middleware convention). It refreshes Supabase session cookies and does not redirect.

## Current feature ownership

| Module | Scope | Current persistence |
| --- | --- | --- |
| `auth` | Email link/OTP sign-in and sign-up, optional TOTP, session lifecycle | Supabase Auth when configured; browser-local demo fallback otherwise |
| `feeds` | Unified post feed, media, likes, comments | Supabase when configured; in-memory demo fallback |
| `shorts` | Unified short video feed and engagement | Supabase when configured; in-memory demo fallback |
| `events` | Community events, RSVPs, likes, comments | Supabase when configured; in-memory demo fallback; aggregate counts via `event_rsvp_counts` |
| `messages` | Direct/group conversations, Realtime updates | Supabase when configured; in-memory demo fallback |
| `profiles` / `settings` | Profile, discovery, privacy, preferences, encrypted vault | Supabase when configured; browser-local demo fallback |
| `moderation` | Report UI and moderator workflow | Supabase RPCs; navigation visible only to moderators/admins |
| `support` | Explains optional community support and external donation link | No in-app payment provider; Stripe-hosted donation link is external |
| `economy` | Persistent token wallet and bundle purchase foundation | Supabase wallet/ledger migration and Edge Functions staged; checkout disabled by default; no spending/transfers yet |
| `locations` | Experimental radius filtering | Not mounted; no durable location store |
| `ads` | Consent-gated web display slots plus native AdMob entry point | AdSense IDs via public build-time environment; native module excluded from web bundle |

## Supabase cutover

The browser adapters are active when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present:

- Profiles load from `profiles`; public discovery uses the `public_profiles` view and trigram indexes.
- Settings load and save through `account_settings`; the profile privacy and social-link controls update `profiles`.
- Messages use the persistent repository and subscribe to Realtime INSERT events.
- Events, RSVPs, likes, and comments use the database. Aggregate RSVP and like counts come from `event_rsvp_counts` and `social_like_counts` views so the app does not expose who reacted.
- Account deletion uses `POST /api/account/delete` with the server-only service-role key. It verifies the session, email, `DELETE` phrase, and TOTP when enabled, removes stored media, then deletes the auth user.
- The private profile vault stores AES-GCM ciphertext and a PBKDF2 salt. The passphrase never leaves the browser; there is no recovery.

The local demo stores remain only as a fallback when Supabase is not configured. Production sign-in is disabled without Supabase. The local demo code `000000` must never be used for real accounts.

`supabase/migrations/20261010000000_unify_sanctuary_scope.sql` is an **expand migration** for existing databases. It normalizes legacy records to `sanctuary`, makes legacy scope columns default to `sanctuary`, and adds `create_sanctuary_conversation`. It intentionally does not drop the old columns or enum in the same release. Drop them only after the deployed application, generated database types, historical clients, RLS policies, indexes, and restore procedure have been reviewed and migrated together.

`supabase/migrations/20261023000000_harden_policies_and_views.sql` adds the aggregate views, discovery indexes, and storage policies that require an active profile for upload/read/delete.

## Advertising

Web display units are consent-gated by `src/modules/ads/AdsConsent.tsx`. No AdSense script is injected until the visitor grants consent. There is no hardcoded publisher fallback; set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` explicitly. Each manually placed feed/Shorts unit also requires its numeric slot ID. Configure public AdSense values before each Next.js build, since `NEXT_PUBLIC_*` values are inlined at build time. Placements remain absent when the publisher or slot ID is blank or malformed.

`public/ads.txt` and `public/robots.txt` are included. Before serving live inventory, verify domain approval, site verification, policy-compliant placement, and a Google-certified consent-management platform for applicable regions. A local banner is the minimum gate, not a certified CMP. Do not log or infer billable impressions from rendered units. Native AdMob placements are separate, imported from `src/modules/ads/native.ts`, and are not mounted in the active web shell.

## Payments and support — current state

- The Support page contains a public Stripe-hosted voluntary donation link. Those donations are not associated with Sanctuary accounts or reconciled by the app.
- `/api/checkout`, `/api/webhooks/stripe`, and `/api/community-tips` remain disabled; do not register the disabled Next.js Stripe webhook.
- Token bundles use separate Supabase Edge Functions: authenticated `token-checkout` creates a Checkout Session from server-side Price IDs; `stripe-token-webhook` verifies the raw Stripe signature and calls an idempotent, service-role-only database RPC.
- `TOKEN_CHECKOUT_ENABLED` defaults to `false`. Enable it only in isolated test-mode staging after migration, Edge Functions, mode-matched Price IDs, webhook secrets, and end-to-end checks are confirmed. Keep live checkout disabled until refund/chargeback handling and a customer-support policy are decided.
- The shared Stripe Payment Link is not used for token purchases because it cannot securely associate a session with the signed-in account.
- The initial token release supports balance display and bundle grants only. No spending, transfers, trading, marketplace, cash-out, VIP, promotions, or cosmetics are active. Automatic refund/chargeback reconciliation is not implemented; decide and implement that lifecycle before live sales, token redemption, or trading.

Never trust client-provided prices, amounts, user IDs, or fulfillment status. Do not represent this staged code as production-ready until migration/RLS, webhook idempotency, refund/dispute handling, backups, and staging tests are complete.

## Wallet roadmap and handoff

### Complete in the repository (not yet deployed or validated)

- Wallet navigation and page with persistent balance/history UI and fixed £1/£5/£10 bundle cards.
- Supabase wallet/ledger migration with owner-read-only policies and service-role-only transactional/idempotent purchase fulfillment.
- Authenticated Checkout Session Edge Function and raw-body Stripe-signature webhook. Checkout validates the configured Stripe Prices' mode, amount, currency, and active one-time status.
- Purchase checkout remains disabled by default. A test-mode staging enablement is allowed only after staging migration, functions, Price IDs, webhook, and end-to-end test are configured.

### Blocking before live token sales

1. Local code validation has been run after the merge: `npm run lint`, `npm run typecheck`, `npm test` (6/6), and `npm run build` (Next.js 16.4.2) passed. These checks do not validate SQL/RLS, deployed Edge Functions, Stripe staging, or live payments.
2. Apply the wallet migration and deploy both Edge Functions in an isolated staging project; verify RLS, paid and unpaid sessions, duplicate webhook delivery, wrong mode/price, and invalid signatures.
3. Decide and implement refund/chargeback behavior. Ask the product owner about full vs partial refunds, disputes, support/manual review, and reversal if tokens have already been spent; do not guess this policy.
4. Only then configure production-mode Price IDs/secrets/webhook and consider enabling live checkout. The migration has not been applied and the functions have not been deployed to the user's project.

### Deferred product scope

Token spending and entitlements (profile cosmetics, chat items, gifts, VIP, post promotion), transfers, trading, marketplace, and cash-out are not implemented. Keep them deferred until purchase, refund, and ledger rules are complete. Guest mode remains read-only. Account deletion currently cascades wallet and purchase history; the UI discloses this behavior.

## Supabase status

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable browser clients only. Supabase Edge Function secrets and the Next.js server-only service-role key remain server-side.
- Local demo auth is not production authentication; mock code `000000` is development-only.
- Production cutover requires Supabase Auth configuration, profile-creation handling, RLS/policy tests, persistent repository wiring, storage policies, session refresh/middleware strategy, and migration/restore validation.
- Never expose a Supabase secret/service-role credential to the web client. `POST /api/account/delete` uses `SUPABASE_SERVICE_ROLE_KEY` server-side; token Edge Functions use the platform-provided admin context (`ctx.supabaseAdmin`).

## Security and release gates

Do not call this a production release until all of the following are complete:

1. Apply and test every migration against a disposable project, then staging, including RLS for anonymous users, ordinary users, unrelated conversation members, moderators, suspended users, and expired suspensions.
2. Validate Supabase Auth Site URL/redirect settings, email templates (link and OTP), TOTP enrollment, session refresh through `src/proxy.ts`, and Realtime authorization.
3. Validate storage upload/read/delete policies, signed URL lifetime, media scanning, size limits, and lifecycle cleanup.
4. Test account deletion end to end, including media removal, database cascades, wallet-history cascade, and the service-role key boundary.
5. Keep live token checkout disabled until the staging flow is verified and refund/chargeback handling is implemented; keep token spending/trading disabled until reversals and account-deletion behavior are tested. The Next.js payment API routes remain disabled.
6. Validate ad consent, placements, `ads.txt`, and production IDs in relevant territories; keep ads disabled until approval and site policies are in place.
7. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` after code changes, then manually test responsive navigation, auth, feed, event, message, moderation, wallet, and support states.

## Local development

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Copy `.env.example` to `.env.local`. Public Supabase URL/key values are not secrets. Never commit `.env.local`, service-role keys, Stripe keys, or webhook secrets.
