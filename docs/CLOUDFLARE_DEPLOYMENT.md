# Cloudflare automatic deployment

The Sanctuary's production Worker is deployed from GitHub Actions using OpenNext for Cloudflare Workers. A push to `main` runs type-checking, builds the Next.js app for Cloudflare, and deploys the Worker configured in `wrangler.jsonc`. A manual run is also available from GitHub Actions.

## One-time setup

In GitHub, open **Settings → Secrets and variables → Actions** for this repository.

Add these **repository variables**:
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID.
- `NEXT_PUBLIC_SUPABASE_URL` — the existing Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the Supabase publishable/anon key (public client key, never a service-role key).

Add this **repository secret**:
- `CLOUDFLARE_API_TOKEN` — a Cloudflare API token scoped to this account with permission to edit Workers Scripts and deploy Workers. Do not use or commit a global API key.

Then merge the deployment setup to `main`. Run **Actions → Cloudflare Workers deployment → Run workflow** to trigger the first deployment. If required configuration is missing, the workflow intentionally stops before deployment.

## Before first production deployment

- Confirm the Worker name and service binding in `wrangler.jsonc` match the existing Cloudflare setup.
- Confirm the existing runtime environment variables/secrets needed by the app are configured in Cloudflare. Never add service-role keys, Stripe secret keys, or webhook secrets to `NEXT_PUBLIC_*` variables.
- Confirm Supabase Auth's allowed redirect URLs include the Cloudflare production URL and the reset-password callback paths.
- After the first successful deployment, verify sign-in, new account creation, email confirmation, password recovery, and session persistence on the Cloudflare URL.

The workflow does not create or alter the Supabase project and does not enable checkout or donations. If the build fails, review its GitHub Actions logs and fix that before treating Cloudflare as updated.
