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

Vercel is the selected web host. Connect the GitHub repository to a Vercel project, use pull-request deployments as isolated previews, and deploy `main` to production only after CI passes and a human approves the release. Keep personal/production data and live payment credentials out of previews. `@vercel/analytics` is mounted in the root layout and reports only when the app runs on Vercel; it does not load in local development.

Copy `.env.example` to `.env.local` for local work. Configure public values before each build because Next.js inlines `NEXT_PUBLIC_*` values at build time.

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

Payments remain disabled. `/api/checkout`, `/api/webhooks/stripe`, and `/api/community-tips` return disabled responses, and the app does not read Stripe, Lemon Squeezy, or Monzo credentials. Do not add those values or enable live payment collection until a complete checkout, webhook, fulfillment, refund, and reconciliation design has been implemented and audited. Do not put private values in `NEXT_PUBLIC_*`.

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

Apply `supabase/migrations/` to a disposable project first, then staging, then production after a backup. See [supabase/README.md](supabase/README.md).

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

- The economy/wallet UI is a browser-local demo and is not mounted in the active shell. It must never be represented as a real balance, entitlement, or purchase system.
- Location/radius filtering is an experimental module and is not mounted.
- Content moderation, media scanning, rate limiting, pagination, retention, and abuse operations still need production hardening.
- Do not call this a public production release until the Supabase migrations, RLS policies, Auth settings, storage policies, account-deletion route, and restore procedure have been validated in staging.
