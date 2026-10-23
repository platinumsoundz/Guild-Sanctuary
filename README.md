# The Sanctuary

A cross-platform community app focused on reflection, growth, and connection. The web app is a Next.js 16 App Router project; the Android shell uses Capacitor.

Read [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) before making project changes. It records architecture rules, module ownership, verified progress, and the roadmap; keep it current as the codebase changes.

## Development

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run start` serves the production build. The demo/local data paths are a development fallback; production sign-in is disabled unless Supabase is configured.

## Deployment and environment

Vercel is the selected web host. Connect the GitHub repository to a Vercel project, use pull-request deployments as isolated previews, and deploy `main` to production only after CI passes and a human approves the release. Keep personal/production data and live payment credentials out of previews. `@vercel/analytics` is mounted in the root layout and reports only when the app runs on Vercel; it does not load in local development. Enable Vercel Web Analytics for the project in its dashboard if you want page-view traffic reporting. It does not report ad conversion or custom behavioral events.

Copy `.env.example` to `.env.local` for local work. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as public build/runtime configuration; keep Supabase secret keys, Stripe secrets, and webhook secrets server-side only. Set `APP_BASE_URL` to the exact canonical HTTPS origin. Set `NEXT_TELEMETRY_DISABLED=1` in Vercel's build environment as well as CI. Next.js inlines `NEXT_PUBLIC_*` values at build time, so configure them in Vercel before building each environment. Never commit `.env.local` or put private values in `NEXT_PUBLIC_*`.

Required for a real deployment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; required by the account-deletion route
- `APP_BASE_URL` — canonical HTTPS origin

Optional:

- `NEXT_PUBLIC_ADSENSE_CLIENT_ID` and the numeric slot IDs for feed/Shorts placements
- `CAPACITOR_SERVER_URL` for release Android builds
- `ADMOB_ANDROID_APP_ID` and native AdMob unit IDs for Android
- `NEXT_TELEMETRY_DISABLED=1` in CI/Vercel

### Payments and token checkout

The existing `/api/checkout`, `/api/webhooks/stripe`, and `/api/community-tips` paths remain disabled. Token purchases use separate Supabase Edge Functions: authenticated `token-checkout` creates a Stripe Checkout Session from server-side fixed Price IDs, and `stripe-token-webhook` verifies the raw Stripe signature before calling an idempotent, service-role-only database function.

`TOKEN_CHECKOUT_ENABLED` defaults to `false`. Keep it false until the wallet migration, Edge Functions, test-mode Price IDs, webhook secret, and end-to-end staging checks are complete. Live sales also need refund/chargeback handling and a customer-support policy; that policy is not specified yet, so ask the product owner before implementing refunds, disputes, manual support, or reversals, especially if tokens may already have been spent.

The voluntary Stripe-hosted donation link is external and does not grant tokens or account benefits. Do not use the shareable Stripe Payment Link for wallet purchases: it cannot safely attribute a payment to the signed-in Sanctuary account. Never trust client-provided prices, amounts, user IDs, or fulfillment claims, and never put private values in `NEXT_PUBLIC_*`.

The GitHub Actions workflow runs `npm ci`, lint, TypeScript validation, unit tests, and a production build without payment or database secrets. It does not deploy, apply migrations, or certify production readiness. Vercel deployment, Supabase Auth/RLS/migration validation, payment sandbox testing, restore testing, and human release approval remain separate gates.

## Supabase

The app uses Supabase Auth, Postgres, Storage, and Realtime when the public Supabase values are set.

- Email sign-in/up supports the confirmation link or a numeric email OTP, depending on the Supabase email template. The callback route is `/auth/callback`; allow the deployed origin and that path in Supabase Authentication → URL Configuration.
- `src/proxy.ts` is the Next.js 16 proxy (the renamed middleware convention) and refreshes Supabase session cookies on each request.
- Profiles, discovery, settings, events, RSVPs, likes, comments, conversations, messages, and media use Supabase adapters. The local/in-memory stores remain available only as a demo fallback when Supabase is not configured.
- Moderator/admin roles must be assigned through trusted SQL or a server-side administrative process. `profiles.role` is not client-updatable.
- Account deletion is handled by `POST /api/account/delete`. It verifies the current session, email, `DELETE` phrase, and TOTP code when 2FA is enabled, removes the user's media, then deletes the auth user (database rows cascade). The service-role key must be set on the server for this route.
- The private profile vault encrypts optional details in the browser with AES-GCM and a PBKDF2-derived key. The server stores ciphertext and salt only. There is no passphrase recovery.
- Messaging is not end-to-end encrypted. Database/TLS encryption is not E2EE; do not describe it as such.
- The token wallet stores balances and purchase history in Supabase. Wallet balances are read-only to clients; grants happen only through the verified webhook path.

Apply `supabase/migrations/` to a disposable project first, then staging, then production after a backup. See [supabase/README.md](supabase/README.md). The wallet migration and Edge Functions have not been applied or deployed by this repository change.

## Advertising

Web display ads use Google AdSense and are consent-gated by `src/modules/ads/AdsConsent.tsx`. The script is not loaded until a visitor chooses “Allow ads”; the choice is stored locally. There is no hardcoded publisher fallback: ads stay disabled unless `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is configured. `public/ads.txt` and `public/robots.txt` are included.

Each manual feed/Shorts placement also needs its numeric slot ID. Empty or malformed IDs leave placements absent. Before serving production ads, complete the AdSense site review, verify `ads.txt`, and use a Google-certified CMP where required (for example, the EEA/UK). A local consent banner alone is not a substitute for a certified CMP in regulated regions.

Native AdMob placements live in `src/modules/ads/native.ts` and are imported only by Capacitor-specific code. They are not part of the web bundle.

## Architecture

- `src/app/` owns Next.js App Router entry points.
- `src/context/AppContext.tsx` owns client navigation and the current session.
- `src/components/AppWorkspace.tsx` composes the authenticated feature surface; `Navigation.tsx` is a single Sanctuary navigation shell.
- `src/types/database.ts` contains shared entity contracts. Posts, Shorts, events, and conversations are community-wide entities.
- `src/modules/` owns feature UI, local state, and service APIs. Modules use their `index.ts` public entry points rather than sibling internals.
- `src/services/` owns shared browser/server integrations such as Supabase clients and public-profile lookup.

## Current limits

- The token wallet supports balance display and verified bundle grants only. Checkout is staged and disabled by default. Token spending, transfers, trading, marketplace, cash-out, VIP, cosmetics, gifts, and promotions are not implemented.
- Guest mode is read-only. Guest and local-demo accounts cannot buy tokens or change wallet balances.
- Location/radius filtering is an experimental module and is not mounted.
- Content moderation, media scanning, rate limiting, pagination, retention, and abuse operations still need production hardening.
- Refund/chargeback reconciliation is not implemented. Do not enable live token sales until the product owner defines that policy and staging validation is complete.
- Do not call this a public production release until the Supabase migrations, RLS policies, Auth settings, storage policies, account-deletion route, wallet migration/functions, and restore procedure have been validated in staging.
