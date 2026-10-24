# The Sanctuary — Master Blueprint

Last updated: 2026-10-24

## Product decision

The Sanctuary is one community system for reflection, growth, care, and connection. The former Guild Hall is retired. There is no world selector, no world-specific navigation, and no application-facing `WorldType` contract.

## Architecture

- `src/app/` owns Next.js App Router entry points.
- `src/context/AppContext.tsx` owns client navigation and the current demo/Supabase session. It does **not** own world state.
- `src/components/AppWorkspace.tsx` composes the authenticated feature surface; `Navigation.tsx` is a single Sanctuary navigation shell.
- `src/types/database.ts` contains shared entity contracts. Posts, Shorts, events, and conversations are community-wide entities.
- `src/modules/` owns feature UI, local state, and service APIs. Modules use their `index.ts` public entry points rather than sibling internals.
- The current social data layer is mostly in-memory for local demos. Supabase browser adapters are present for selected modules but are not production-ready without a complete Auth/RLS deployment and tests.

## Current feature ownership

| Module | Scope | Current persistence |
| --- | --- | --- |
| `auth` | Email-code sign-in/up, mock 2FA, session lifecycle | Browser-local demo store; optional Supabase browser flow |
| `feeds` | Unified post feed, media metadata, likes, comments | In-memory or optional Supabase adapter |
| `shorts` | Unified short video feed and engagement | In-memory or optional Supabase adapter |
| `events` | Community events and RSVPs | In-memory |
| `messages` | Direct one-to-one/group conversations and threads | Active UI uses in-memory demo service; optional Supabase repository is not wired into the UI |
| `profiles` / `settings` | Profile, discovery, privacy, local preferences | Browser-local demo store |
| `moderation` | Report UI and moderator workflow contracts | Supabase-dependent when configured |
| `support` | Optional community support | Stripe donation link returned only on explicitly enabled Vercel Production deployments; no app-side reconciliation |
| `economy` | Persistent token wallet and bundle purchase foundation | Supabase wallet/ledger migration and Edge Functions staged; checkout disabled by default; no spending/transfers yet |
| `ads` | Responsive web display slots plus optional native AdMob placements | AdSense IDs via public build-time environment; native AdMob module not wired into the active shell |

## Sanctuary consolidation

The application contracts and local repositories have been unified: `worldType`, `activeWorld`, `entryWorld`, world switching, and per-world local stores were removed.

`supabase/migrations/20261010000000_unify_sanctuary_scope.sql` is an **expand migration** for existing databases. It normalizes legacy records to `sanctuary`, makes legacy scope columns default to `sanctuary`, and adds `create_sanctuary_conversation`. It intentionally does not drop the old columns or enum in the same release. Drop them only after the deployed application, generated database types, historical clients, RLS policies, indexes, and restore procedure have been reviewed and migrated together.

## Shorts engagement status

- Shorts likes/counts use `get_short_engagement_stats` and `toggle_short_like` RPCs in `src/modules/shorts/service.ts`; the functions are defined in `supabase/migrations/20261013000000_short_engagement_stats.sql` so counts are not truncated by client-side RLS.
- Comment reads/posts remain browser Supabase queries and depend on `supabase/migrations/20261011000000_repair_social_engagement_insert_policies.sql` plus the existing social schema/RLS. Signed-in engagement controls are disabled in guest mode.
- These migrations are repository code only and are not confirmed applied. No staging end-to-end check has been run; verify like/unlike, counts, comment fetch/post, RLS, and guest browsing after applying the pending migrations.

## PWA installation

- Added a web manifest, generated app/Apple icons, and an install-help panel with Chromium install prompts plus iOS/macOS and other-browser instructions.
- The install experience is browser-dependent; it does not promise a universal install button. No service worker or offline cache is included, so installation does not imply offline support.
- PWA assets and install prompts have not been validated on devices/browsers or deployed. Confirm the generated icon routes and manifest in the Cloudflare Worker build before claiming install support is verified.

## Advertising

Web display units are wired through `src/modules/ads/AdSenseScript.tsx` and `AdSlot.tsx`. The script and slots are disabled by default. They require `NEXT_PUBLIC_ADSENSE_ENABLED=true`; the server script additionally requires `VERCEL_ENV=production`, so previews and local development fail closed. Configure the flag and live IDs in Vercel Production only, with system environment variables enabled. Publisher/slot IDs are public and `NEXT_PUBLIC_*` values are inlined at build time.

Before serving live inventory, verify domain approval, site verification/`ads.txt` requirements, policy-compliant placement, and an approved consent-management platform for applicable regions. Do not log or infer billable impressions from the rendered units. The native AdMob consent and placements module is separate and is not currently mounted in `AppWorkspace`.

## Payments and support — current state

- The Support page can show a Stripe-hosted voluntary donation link only when `VERCEL_ENV=production` and `STRIPE_DONATION_LINK_ENABLED=true`; it is not returned to previews/local builds. Donations are not associated with Sanctuary accounts or reconciled by the app.
- `/api/checkout`, `/api/webhooks/stripe`, and `/api/community-tips` remain disabled; do not register the disabled Next.js Stripe webhook.
- Token bundles use separate Supabase Edge Functions: authenticated `token-checkout` creates a Checkout Session from server-side Price IDs and requires the request Origin to match the configured `APP_BASE_URL`; `stripe-token-webhook` verifies the raw Stripe signature and calls an idempotent, service-role-only database RPC.
- `TOKEN_CHECKOUT_ENABLED` defaults to `false`. Enable it only in isolated test-mode staging after migration, Edge Functions, mode-matched Price IDs, webhook secrets, and end-to-end checks are confirmed. Keep live checkout disabled until refund/chargeback handling and a customer-support policy are decided.
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

1. Run `npm run typecheck`, `npm run build`, and the separate Deno check in an environment with dependencies and command execution. A GitHub `validate` run was reported passing for commit `b08d405622bc32207050824e8af8c80719d867aa`, before the latest Shorts/PWA edits; the current edits have not been validated. Do not treat that earlier result as validation for current code.
2. Apply the wallet migration and deploy both Edge Functions in an isolated staging project; verify RLS, paid and unpaid sessions, duplicate webhook delivery, wrong mode/price, and invalid signatures.
3. Decide and implement refund/chargeback behavior. Ask the product owner about full vs partial refunds, disputes, support/manual review, and reversal if tokens have already been spent; do not guess this policy.
4. Only then configure production-mode Price IDs/secrets/webhook and consider enabling live checkout. The migration has not been applied and the functions have not been deployed to the user's project.

### Planned product scope and current status

The product owner confirmed the intended future token sinks: profile cosmetics, chat items, gifts, VIP access, and post promotion. `TOKEN_CATALOG_PROPOSAL.md` contains an illustrative catalog and prices for approval only; no price or effect is approved, and no spending/redemption is implemented. Transfers, trading, marketplace, and cash-out remain deferred. Keep token checkout disabled and do not enable redemption until refund/chargeback and reversal rules are approved and tested. Guest mode remains read-only. Account deletion currently cascades wallet and purchase history; balance treatment must be finalized before real-money sales.

`TERMS_AND_CONDITIONS_DRAFT.md` is a starter draft with placeholders, not final legal terms. The product owner requested a Terms button plus required signup checkbox and version/timestamp record. Implement consent UI and durable acceptance recording, but do not present placeholder terms as final or enable production signup/sales until operator, contact, jurisdiction, age, privacy, user-content, deletion, support, and refund language are approved and legally reviewed.

## Supabase status

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable browser clients only. Supabase Edge Function secrets remain server-side.
- The wallet migration (`20261012000000_token_wallet_and_fulfillment.sql`), social-policy repair (`20261011000000_repair_social_engagement_insert_policies.sql`), and Shorts engagement RPC migration (`20261013000000_short_engagement_stats.sql`) are not confirmed applied to the user's project. From the repository, link the intended staging project, inspect `supabase migration list`, run `supabase db push --dry-run`, then `supabase db push` only after reviewing all pending migrations. `db push` applies every pending local migration, not just the wallet migration. A PostgREST cache refresh (`NOTIFY pgrst, 'reload schema';`) does not create missing tables or functions.
- Local demo auth is not production authentication; mock code `000000` is development-only.
- Production cutover requires Supabase Auth configuration, profile-creation handling, RLS/policy tests, persistent repository wiring, storage policies, session refresh/middleware strategy, and migration/restore validation.
- Never expose a Supabase secret/service-role credential to the web client. The token Edge Functions use the platform-provided admin context (`ctx.supabaseAdmin`); no service-role key belongs in the Next.js runtime.

## Security and release gates

Do not call this a production release until all of the following are complete:

1. Replace local/mock authentication and data with tested authenticated APIs or RLS-protected browser access.
2. Test Supabase migrations, RLS policies, backup restore, and forward/rollback behavior in staging.
3. Complete media validation, scanning, storage, moderation, rate limits, and abuse controls.
4. Keep live token checkout disabled until the staging flow is verified and refund/chargeback handling is implemented; keep token spending/redemption/trading disabled until reversals and account-deletion behavior are tested. Publish approved Terms and Privacy Notice, require explicit signup acceptance, and record the accepted terms version and server-side timestamp before production signup.
5. Validate ad consent, placements, and production IDs in relevant territories; keep ads disabled until approval and site policies are in place.
6. Run `npm run typecheck`, `npm run build`, and the repository's Deno check after changes; then manually test responsive navigation, auth, feed, Shorts engagement/comments, direct and group messaging, events, support, wallet, and PWA installation. The current Shorts/PWA edits have not passed these checks.

## Messaging status and handoff

Direct one-to-one messages already exist in the demo flow: Messages → Find people → search a public profile → Message. Group creation is also available in Messages and requires at least two other selected members. `src/modules/messages/service.ts`, `MessagesInbox.tsx`, `DirectMessageThread.tsx`, and `useDirectMessages.ts` implement the active in-memory UI. `src/modules/messages/supabaseRepository.ts` is an optional adapter, not used by that UI; durable Supabase messaging, realtime, RLS verification, and production abuse/moderation/retention decisions remain unfinished. The current inbox emphasizes the group form, so a small UX improvement is to make the one-to-one entry point explicit. Do not describe messaging as persistent or end-to-end encrypted.

## Deployment and verification note

Cloudflare Workers is the currently observed deployment/preview target. The last observed Workers build for commit `b08d405622bc32207050824e8af8c80719d867aa` was still in progress; deployment is unconfirmed. The repository's Support and AdSense production guards use Vercel-specific environment variables. Do not assume those fail closed on Cloudflare; keep live payment/ad configuration disabled until the environment guards are reviewed and tested for the actual host.


## Local development

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Copy `.env.example` to `.env.local`. Public Supabase URL/key values are not secrets. Never commit `.env.local`, service-role keys, Stripe keys, or webhook secrets.
