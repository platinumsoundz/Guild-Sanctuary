# Guild-Sanctuary

Cross-platform social app for two connected worlds: The Sanctuary for spiritual growth and The Guild Hall for gaming and community.

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

Copy `.env.example` to `.env.local` for local work. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as public build/runtime configuration; keep `SUPABASE_SERVICE_ROLE_KEY`, Stripe secrets, and webhook secrets server-side only. Set `APP_BASE_URL` to the exact canonical HTTPS origin and leave `COMMUNITY_TIPS_ENABLED=false` until the Stripe webhook and Supabase migration have been validated in staging. Optional `LEMON_SQUEEZY_CHECKOUT_URL` and `MONZO_CONTRIBUTION_URL` values are hosted payment destinations; leave them blank until their terms and privacy implications are reviewed. These configured URLs are returned to the support UI and must be HTTPS. Digital purchases currently do not grant in-app entitlements. Set `NEXT_TELEMETRY_DISABLED=1` in Vercel's build environment as well as CI. Next.js inlines `NEXT_PUBLIC_*` values at build time, so configure them in Vercel before building each environment. Never commit `.env.local` or put private values in `NEXT_PUBLIC_*`.

The GitHub Actions workflow runs `npm ci`, TypeScript validation, and a production build without payment or database secrets. It does not deploy, apply migrations, or certify production readiness. Vercel deployment, Supabase Auth/RLS/migration validation, payment sandbox testing, restore testing, and human release approval remain separate gates.

Vercel Web Analytics is integrated through `@vercel/analytics/next`; enable it for the Vercel project in its dashboard. It reports page-view traffic, not ad conversion or custom behavioral events. The application is not ready to accept real accounts or full commerce: authentication and active social/economy state still use local or in-memory demo stores. Stripe community tips are disabled by default; Lemon Squeezy product checkout and Monzo Business hosted contributions are optional URL slots only, and do not fulfill in-app entitlements. End-to-end encrypted messaging is not implemented. Do not describe the current build as a public production release.

## Architecture

- `src/types/index.ts` contains shared primitives; `src/types/database.ts` defines database entity contracts.
- `src/modules/` contains isolated feature modules. Each module owns its implementation and documents its scope in a local README.
- Modules should depend on shared types rather than importing implementation details from sibling modules.
- Keep the root app shell independent from feature implementations so a module can evolve without coupling unrelated features.