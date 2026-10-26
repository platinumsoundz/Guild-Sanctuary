# Domain and Supabase hosting improvements

## Goal

Keep the existing Sanctuary URLs usable while making the Cloudflare Workers deployment and the Vercel deployment connect to the same existing Supabase project. Do not buy a domain, migrate databases, or replace the existing production Worker as part of this work.

## Verified repository state

- The browser and server Supabase clients both require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The Cloudflare deployment is configured to target a separate Worker named `sanctuary-web-auto`; the existing `the-sanctuary` Worker should remain untouched until the new Worker passes the checks below.
- The Cloudflare build workflow can successfully build with placeholders when Supabase settings are absent. Deployment must therefore be blocked unless both real Supabase settings and Cloudflare credentials are present.
- The Cloudflare deploy workflow is set up in GitHub Actions. A successful build does not prove a live deployment or successful Supabase authentication.

## Required configuration

### GitHub Actions for Cloudflare

Set these repository Actions secrets:

- `CLOUDFLARE_API_TOKEN`: scoped to deploy Workers for the correct account.
- `CLOUDFLARE_ACCOUNT_ID`: the account containing the target Worker.
- `NEXT_PUBLIC_SUPABASE_URL`: the existing Sanctuary Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the project's publishable/anon key only. Never use the service-role key in browser or build-time public configuration.

The deployment workflow now skips deployment if any of these values are missing or if the Supabase settings are still build placeholders.

### Vercel

In the Vercel project settings, verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set for Production and Preview as appropriate. Use the same Supabase project values as Cloudflare. Do not copy service-role credentials into these public variables.

### Supabase Auth URL configuration

In Supabase Dashboard → Authentication → URL Configuration:

- Keep the configured Site URL aligned with the intended canonical URL.
- Add the current Vercel production URL and the Cloudflare `workers.dev` URL to the allowed redirect URLs.
- Include the exact auth callback and password-reset paths used by the app, for each host.
- Preserve any existing working URL entries while adding the second host. Do not narrow the allow-list until both deployments have been tested.
- If Vercel preview URLs are needed for authentication testing, allow only the required preview pattern rather than an unnecessarily broad wildcard.

## Verification checklist

Run these checks independently against both the Vercel URL and the new Cloudflare Worker URL:

1. Open the home page and verify there is no Supabase configuration error.
2. Register a test account and verify the confirmation link returns to the same host that initiated registration.
3. Sign in and confirm the profile/session survives a page refresh.
4. Request a password reset; open the email link and complete the reset on the same host.
5. Sign out, then verify protected account actions require authentication.
6. Load profile, feed, events, and other database-backed screens and inspect for failed Supabase requests.
7. Confirm browser console/network logs do not expose service-role keys or session tokens to embedded games.
8. Only after all checks pass, decide whether to point any preferred URL at the new Worker. Keep the old URL as a fallback.

## Database and migration safety

- Do not run `supabase db push` or apply a migration just because this branch exists.
- Review migration history and compare the remote schema before any schema-changing operation.
- Use a new migration for database changes; do not edit migrations that have already been applied to the connected project.
- Test RLS as `anon` and `authenticated` for any changed tables/views.
- Keep token spending, live checkout, and donations disabled until their separate staging/release gates are approved.

## Current blockers / honest status

The code and workflow can be prepared in GitHub, but deployment secrets and Supabase Auth dashboard redirect settings cannot be inferred from repository files. Until those settings are verified and the Cloudflare Worker is deployed, neither host should be described as fully verified against Supabase.
