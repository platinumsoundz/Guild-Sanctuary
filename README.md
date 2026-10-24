# The Sanctuary

Cross-platform community app focused on reflection, growth, and connection.

Read [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) before making project changes. It records architecture rules, module ownership, verified progress, and the roadmap; keep it current as the codebase changes.

## Development

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Use `npm run build` to create a production build and `npm run start` to serve it.
Run `npm run typecheck` to validate TypeScript independently of the production build.

## Deployment and environment

Vercel is the selected web host. Connect the GitHub repository to a Vercel project, use pull-request deployments as isolated previews, and deploy `main` to production only after CI passes and a human approves the release. Keep personal/production data and live payment credentials out of previews.

Copy `.env.example` to `.env.local` for local work. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as public build/runtime configuration; keep Supabase secret keys, Stripe secrets, and webhook secrets server-side only. Set `APP_BASE_URL` to the exact canonical HTTPS origin used by the deployed environment. The donation link is served only when `VERCEL_ENV=production` and `STRIPE_DONATION_LINK_ENABLED=true`; configure `STRIPE_DONATION_URL` and the enable flag in Vercel Production only, with system environment variables enabled. Preview/local builds fail closed and hide it. Token checkout also checks the request origin against the Edge Function's `APP_BASE_URL`, so use a stable staging origin for test purchases; do not point previews at live functions. Set `NEXT_TELEMETRY_DISABLED=1` in Vercel's build environment as well as CI. Next.js inlines `NEXT_PUBLIC_*` values at build time, so configure them in Vercel before building each environment. Never commit `.env.local` or put private values in `NEXT_PUBLIC_*`.

The GitHub Actions workflow runs `npm ci`, TypeScript validation, and a production build without payment or database secrets. It does not deploy, apply migrations, or certify production readiness. Vercel deployment, Supabase Auth/RLS/migration validation, payment sandbox testing, restore testing, and human release approval remain separate gates.

Vercel Web Analytics is integrated through `@vercel/analytics/next`; enable it for the Vercel project in its dashboard. Web display ads use Google AdSense with the configured publisher ID; individual feed/Shorts units need their numeric slot IDs configured in Vercel before building. These public IDs are inlined at build time. Ad units stay hidden unless both a valid publisher ID and numeric slot ID exist; AdSense auto ads may also be managed from the publisher account. Configure and verify an approved consent-management platform and the AdSense site review/ads.txt requirements in the AdSense account before serving production ads. It reports page-view traffic, not ad conversion or custom behavioral events. The persistent wallet and authenticated Stripe token checkout are being staged; use `TOKEN_CHECKOUT_ENABLED=true` only for isolated Stripe-test/Supabase staging after setup, and keep live checkout disabled until the full staging test and a refund/chargeback handling policy are in place. Token spending, transfers, marketplace, VIP, post promotion, and cosmetics are not implemented. The existing `/api/checkout`, `/api/webhooks/stripe`, and `/api/community-tips` paths remain disabled; token checkout uses separate Supabase Edge Functions. Authentication and other social/economy state are not yet fully production-ready. End-to-end encrypted messaging is not implemented. Do not describe the current build as a public production release.

## Architecture

- `src/types/index.ts` contains shared primitives; `src/types/database.ts` defines database entity contracts.
- `src/modules/` contains isolated feature modules. Each module owns its implementation and documents its scope in a local README.
- Modules should depend on shared types rather than importing implementation details from sibling modules.
- Keep the root app shell independent from feature implementations so a module can evolve without coupling unrelated features.