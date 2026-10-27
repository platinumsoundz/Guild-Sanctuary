# The Sanctuary

Cross-platform community app focused on reflection, growth, and connection.

Read [ROADMAP.md](ROADMAP.md) for product direction and agreed decisions, then [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) for architecture and current implementation state. Keep both aligned as the codebase changes.

## Development

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Use `npm run build` to create a production build and `npm run start` to serve it.
Run `npm run typecheck` to validate TypeScript independently of the production build.

## Deployment and environment

Cloudflare Workers is the currently observed preview/deployment target; the last reported Worker build for commit `b08d405622bc32207050824e8af8c80719d867aa` was still in progress, so deployment is unconfirmed. The repository's donation and AdSense safety checks use Vercel-specific environment variables. Do not assume those guards fail closed on Cloudflare; keep live payment/ad configuration disabled until host-specific safeguards are reviewed and tested. Keep personal/production data and live credentials out of previews.

Copy `.env.example` to `.env.local` for local work. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as public build/runtime configuration; keep Supabase secret keys, Stripe secrets, and webhook secrets server-side only. Set `APP_BASE_URL` to the exact canonical HTTPS origin used by the deployed environment. The donation link is served only when `VERCEL_ENV=production` and `STRIPE_DONATION_LINK_ENABLED=true`; configure `STRIPE_DONATION_URL` and the enable flag in Vercel Production only, with system environment variables enabled. Preview/local builds fail closed and hide it. Token checkout also checks the request origin against the Edge Function's `APP_BASE_URL`, so use a stable staging origin for test purchases; do not point previews at live functions. Set `NEXT_TELEMETRY_DISABLED=1` in Vercel's build environment as well as CI. Next.js inlines `NEXT_PUBLIC_*` values at build time, so configure them in Vercel before building each environment. Never commit `.env.local` or put private values in `NEXT_PUBLIC_*`.

The earlier GitHub `validate` run was reported passing for commit `b08d405622bc32207050824e8af8c80719d867aa`; that predates the latest Shorts, messaging-UX, and PWA edits. Those current edits have not been typechecked, built, or deployed. Re-check the current GitHub workflow (including the separate Deno check) and Cloudflare Worker status. CI does not apply migrations or certify production readiness; Supabase Auth/RLS, payment sandbox, restore, browser/device, and human release checks remain separate gates.

Vercel Web Analytics is integrated through `@vercel/analytics/next`; enable it for the Vercel project in its dashboard. Web display ads use Google AdSense. The script and placements are disabled by default and remain off in previews/local development; enable `NEXT_PUBLIC_ADSENSE_ENABLED=true` and configure live IDs in Vercel Production only. The server also requires `VERCEL_ENV=production`, so enable Vercel system environment variables. Publisher and slot IDs are public and inlined at build time. AdSense auto ads may also be managed from the publisher account. Configure and verify an approved consent-management platform and the AdSense site review/ads.txt requirements in the AdSense account before serving production ads. It reports page-view traffic, not ad conversion or custom behavioral events. The persistent wallet and authenticated Stripe token checkout are being staged; use `TOKEN_CHECKOUT_ENABLED=true` only for isolated Stripe-test/Supabase staging after setup, and keep live checkout disabled until the full staging test and a refund/chargeback handling policy are in place. Token spending, transfers, marketplace, VIP, post promotion, and cosmetics are not implemented. The existing `/api/checkout`, `/api/webhooks/stripe`, and `/api/community-tips` paths remain disabled; token checkout uses separate Supabase Edge Functions. Authentication and other social/economy state are not production-ready. Messages supports direct and group demo flows, but the active inbox/thread still use in-memory services; the optional Supabase repository is not wired into the UI. End-to-end encrypted messaging is not implemented. PWA manifest/icons and browser-specific install guidance are in the repository, but they have not been browser/device tested; there is no service worker or offline cache. The signup Terms checkbox/version/timestamp record is not implemented, and the current Terms are a non-final draft. Do not describe the current build as a public production release.

## Architecture

- `src/types/index.ts` contains shared primitives; `src/types/database.ts` defines database entity contracts.
- `src/modules/` contains isolated feature modules. Each module owns its implementation and documents its scope in a local README.
- Modules should depend on shared types rather than importing implementation details from sibling modules.
- Keep the root app shell independent from feature implementations so a module can evolve without coupling unrelated features.

## Beta and collaboration

- [Beta testing guide](docs/BETA_TESTING_GUIDE.md)
- [Collaboration guide](docs/COLLABORATION_GUIDE.md)
- [Contributor guide](CONTRIBUTING.md)
