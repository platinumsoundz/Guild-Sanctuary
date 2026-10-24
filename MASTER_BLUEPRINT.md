# The Sanctuary — Master Blueprint

Last updated: 2026-10-24

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
| `shorts` | Unified short video feed and engagement | Supabase when configured; in-memory demo fallback; aggregate likes/counts use the Shorts engagement RPCs |
| `events` | Community events, RSVPs, likes, comments | Supabase when configured; in-memory demo fallback; aggregate counts via `event_rsvp_counts` |
| `messages` | Direct one-to-one/group conversations and threads | Supabase repository when configured; in-memory demo fallback. Staging RLS/Realtime checks remain unfinished |
| `profiles` / `settings` | Profile, discovery, privacy, preferences, encrypted vault | Supabase when configured; browser-local demo fallback |
| `moderation` | Report UI and moderator workflow | Supabase RPCs; navigation visible only to moderators/admins |
| `support` | Optional community support and external donation link | Donation link is returned only on explicitly enabled Vercel Production deployments; no app-side reconciliation |
| `economy` | Persistent token wallet and bundle purchase foundation | Supabase wallet/ledger migration and Edge Functions staged; checkout disabled by default; no spending/transfers yet |
| `locations` | Experimental radius filtering | Not mounted; no durable location store |
| `ads` | Consent-gated web display slots plus native AdMob entry point | AdSense requires an explicit flag plus Vercel Production; IDs come from public build-time environment; native module excluded from web bundle |

## Supabase cutover

The browser adapters are active when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present:

- Profiles load from `profiles`; public discovery uses the `public_profiles` view and trigram indexes.
- Settings load and save through `account_settings`; the profile privacy and social-link controls update `profiles`.
- Messages use the persistent repository and subscribe to Realtime INSERT events when Supabase is configured.
- Events, RSVPs, likes, and comments use the database. Aggregate RSVP and like counts come from `event_rsvp_counts` and `social_like_counts` views so the app does not expose who reacted.
- Shorts likes/counts use `get_short_engagement_stats` and `toggle_short_like` RPCs so counts are not truncated by client-side RLS. Comment reads/posts remain browser Supabase queries and depend on the social schema/RLS plus `20261011000000_repair_social_engagement_insert_policies.sql`.
- Account deletion uses `POST /api/account/delete` with the server-only service-role key. It verifies the session, email, `DELETE` phrase, and TOTP when enabled, removes stored media, then deletes the auth user.
- The private profile vault stores AES-GCM ciphertext and a PBKDF2 salt. The passphrase never leaves the browser; there is no recovery.

The local demo stores remain only as a fallback when Supabase is not configured. Production sign-in is disabled without Supabase. The local demo code `000000` must never be used for real accounts.

`supabase/migrations/20261010000000_unify_sanctuary_scope.sql` is an **expand migration** for existing databases. It normalizes legacy records to `sanctuary`, makes legacy scope columns default to `sanctuary`, and adds `create_sanctuary_conversation`. It intentionally does not drop the old columns or enum in the same release. Drop them only after the deployed application, generated database types, historical clients, RLS policies, indexes, and restore procedure have been reviewed and migrated together.

`supabase/migrations/20261023000000_harden_policies_and_views.sql` adds the aggregate views, discovery indexes, and storage policies that require an active profile for upload/read/delete.

## Shorts engagement status

- Shorts likes/counts use `get_short_engagement_stats` and `toggle_short_like` RPCs in `src/modules/shorts/service.ts`; the functions are defined in `supabase/migrations/20261013000000_short_engagement_stats.sql` so counts are not truncated by client-side RLS.
- Comment reads/posts remain browser Supabase queries and depend on `supabase/migrations/20261011000000_repair_social_engagement_insert_policies.sql` plus the existing social schema/RLS. Signed-in engagement controls are disabled in guest mode.
- These migrations are repository code only and are not confirmed applied. No staging end-to-end check has been run; verify like/unlike, counts, comment fetch/post, RLS, and guest browsing after applying the pending migrations.

## PWA installation

- Added a web manifest, generated app/Apple icons, and an install-help panel with Chromium install prompts plus iOS/macOS and other-browser instructions.
- The install experience is browser-dependent; it does not promise a universal install button. No service worker or offline cache is included, so installation does not imply offline support.
- PWA assets and install prompts have not been validated on devices/browsers or deployed. Confirm the generated icon routes and manifest in the actual host build before claiming install support is verified.

## Advertising

Web display units are consent-gated by `src/modules/ads/AdsConsent.tsx`. The server layout only enables the AdSense flow when `NEXT_PUBLIC_ADSENSE_ENABLED=true` and `VERCEL_ENV=production`; previews and local development fail closed. After that gate passes, the script is not injected until the visitor grants consent. There is no hardcoded publisher fallback; set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` explicitly. Each manually placed feed/Shorts unit also requires its numeric slot ID and consent. Configure public AdSense values before each Next.js build, since `NEXT_PUBLIC_*` values are inlined at build time. Placements remain absent when the publisher or slot ID is blank or malformed.

`public/ads.txt` and `public/robots.txt` are included. Before serving live inventory, verify domain approval, site verification, policy-compliant placement, and a Google-certified consent-management platform for applicable regions. A local banner is the minimum gate, not a certified CMP. Do not log or infer billable impressions from rendered units. Native AdMob placements are separate, imported from `src/modules/ads/native.ts`, and are not mounted in the active web shell.

## Payments and support — current state

- The Support page can show a Stripe-hosted voluntary donation link only when `VERCEL_ENV=production` and `STRIPE_DONATION_LINK_ENABLED=true`; it is not returned to previews/local builds. Donations are not associated with Sanctuary accounts or reconciled by the app.
- `/api/checkout`, `/api/webhooks/stripe`, and `/api/community-tips` remain disabled; do not register the disabled Next.js Stripe webhook.
- Token bundles use separate Supabase Edge Functions: authenticated `token-checkout` creates a Checkout Session from server-side Price IDs and requires the request Origin to exactly match the configured `APP_BASE_URL`; `stripe-token-webhook` verifies the raw Stripe signature and calls an idempotent, service-role-only database RPC.
- `TOKEN_CHECKOUT_ENABLED` defaults to `false`. Enable it only in isolated test-mode staging after migration, Edge Functions, mode-matched Price IDs, webhook secrets, and end-to-end checks are confirmed. Keep live checkout disabled until refund/chargeback handling and a customer-support policy are decided. Keep preview environments free of live payment configuration.
- The shared Stripe Payment Link is not used for token purchases because it cannot securely associate a session with the signed-in account.
- The initial token release supports balance display and bundle grants only. No spending, transfers, trading, marketplace, cash-out, VIP, promotions, or cosmetics are active. Automatic refund/chargeback reconciliation is not implemented; decide and implement that lifecycle before live sales, token redemption, or trading.

Never trust client-provided prices, amounts, user IDs, or fulfillment status. Do not represent this staged code as production-ready until migration/RLS, webhook idempotency, refund/dispute handling, backups, and staging tests are complete.

## Wallet roadmap and handoff

### Complete in the repository (not yet deployed or validated)

- Wallet navigation and page with persistent balance/history UI and fixed £1/£5/£10 bundle cards. Purchase status is origin-bound; preview URLs do not use a production checkout origin.
- Supabase wallet/ledger migration with owner-read-only policies and service-role-only transactional/idempotent purchase fulfillment.
- Authenticated Checkout Session Edge Function and raw-body Stripe-signature webhook. Checkout validates the configured Stripe Prices' mode, amount, currency, and active one-time status.
- Purchase checkout remains disabled by default. A test-mode staging enablement is allowed only after staging migration, functions, Price IDs, webhook, and end-to-end test are configured.

### Blocking before live token sales

1. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and the separate Deno Edge Function check in an environment with dependencies. Do not claim current checks passed unless they were actually run for this revision.
2. Apply the wallet migration and deploy both Edge Functions in an isolated staging project; verify RLS, paid and unpaid sessions, duplicate webhook delivery, wrong mode/price, invalid signatures, and Origin rejection.
3. Decide and implement refund/chargeback behavior. Ask the product owner about full vs partial refunds, disputes, support/manual review, and reversal if tokens have already been spent; do not guess this policy.
4. Only then configure production-mode Price IDs/secrets/webhook and consider enabling live checkout. The migration has not been applied and the functions have not been deployed to the user's project.

### Planned product scope and current status

The product owner confirmed the intended future token sinks: profile cosmetics, chat items, gifts, VIP access, and post promotion. `TOKEN_CATALOG_PROPOSAL.md` contains an illustrative catalog and prices for approval only; no price or effect is approved, and no spending/redemption is implemented. Transfers, trading, marketplace, and cash-out remain deferred. Keep token checkout disabled and do not enable redemption until refund/chargeback and reversal rules are approved and tested. Guest mode remains read-only. Account deletion currently cascades wallet and purchase history; balance treatment must be finalized before real-money sales.

`TERMS_AND_CONDITIONS_DRAFT.md` is a starter draft with placeholders, not final legal terms. The product owner requested a Terms button plus required signup checkbox and version/timestamp record. Implement consent UI and durable acceptance recording, but do not present placeholder terms as final or enable production signup/sales until operator, contact, jurisdiction, age, privacy, user-content, deletion, support, and refund language are approved and legally reviewed.

## Supabase status

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable browser clients only. Supabase Edge Function secrets and the Next.js server-only service-role key remain server-side.
- The wallet migration (`20261012000000_token_wallet_and_fulfillment.sql`), social-policy repair (`20261011000000_repair_social_engagement_insert_policies.sql`), Shorts engagement RPC migration (`20261013000000_short_engagement_stats.sql`), and aggregate-view/storage hardening (`20261023000000_harden_policies_and_views.sql`) are not confirmed applied to the user's project. From the repository, link the intended staging project, inspect `supabase migration list`, run `supabase db push --dry-run`, then `supabase db push` only after reviewing all pending migrations. `db push` applies every pending local migration, not just the wallet migration. A PostgREST cache refresh (`NOTIFY pgrst, 'reload schema';`) does not create missing tables or functions.
- Local demo auth is not production authentication; mock code `000000` is development-only.
- Production cutover requires Supabase Auth configuration, profile-creation handling, RLS/policy tests, persistent repository wiring, storage policies, session refresh/middleware strategy, and migration/restore validation.
- Never expose a Supabase secret/service-role credential to the web client. `POST /api/account/delete` uses `SUPABASE_SERVICE_ROLE_KEY` server-side; token Edge Functions use the platform-provided admin context (`ctx.supabaseAdmin`).

## Security and release gates

Do not call this a production release until all of the following are complete:

1. Apply and test every migration against a disposable project, then staging, including RLS for anonymous users, ordinary users, unrelated conversation members, moderators, suspended users, and expired suspensions.
2. Validate Supabase Auth Site URL/redirect settings, email templates (link and OTP), TOTP enrollment, session refresh through `src/proxy.ts`, and Realtime authorization.
3. Validate storage upload/read/delete policies, signed URL lifetime, media scanning, size limits, and lifecycle cleanup.
4. Test account deletion end to end, including media removal, database cascades, wallet-history cascade, and the service-role key boundary.
5. Keep live token checkout disabled until the staging flow is verified and refund/chargeback handling is implemented; keep token spending/redemption/trading disabled until reversals and account-deletion behavior are tested. The Next.js payment API routes remain disabled. Publish approved Terms and Privacy Notice, require explicit signup acceptance, and record the accepted terms version and server-side timestamp before production signup.
6. Validate ad consent, placements, `ads.txt`, and production IDs in relevant territories; keep ads disabled until approval and site policies are in place.
7. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and the repository's Deno check after changes; then manually test responsive navigation, auth, feed, Shorts engagement/comments, direct and group messaging, events, moderation, support, wallet, and PWA installation states.

## Messaging status and handoff

Direct one-to-one messages and group conversations are available in the UI. The active service is wired to the Supabase repository when Supabase is configured and falls back to the in-memory demo store otherwise. `src/modules/messages/service.ts`, `MessagesInbox.tsx`, `DirectMessageThread.tsx`, and `useDirectMessages.ts` own the flow; `supabaseRepository.ts` supplies persistent conversations/messages and Realtime subscriptions. Staging verification of conversation creation, membership policies, RLS, Realtime reconnect/duplicate events, and retention/abuse controls remains unfinished. Do not describe messaging as end-to-end encrypted; database/TLS encryption is not E2EE.

## Deployment and verification note

Cloudflare Workers is the currently observed deployment/preview target. The last observed Workers build for commit `b08d405622bc32207050824e8af8c80719d867aa` was still in progress; deployment is unconfirmed. The repository's Support and AdSense production guards use Vercel-specific environment variables. Do not assume those fail closed on Cloudflare; keep live payment/ad configuration disabled until the environment guards are reviewed and tested for the actual host.

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
