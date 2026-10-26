# Sanctuary Cloudflare deployment

The repository is configured to build the Next.js app with the OpenNext Cloudflare adapter and deploy it to a **separate Worker named `sanctuary-web-auto`**. This deliberately avoids overwriting the existing `the-sanctuary` Worker before the new build has been verified.

## Required GitHub Actions secrets

In GitHub, open **Settings → Secrets and variables → Actions → New repository secret** and add:

- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token with permission to edit/deploy Workers for this account.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID.
- `NEXT_PUBLIC_SUPABASE_URL`: the existing Sanctuary Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the existing Supabase publishable/anon key (never use the service-role key here).

Do not put secret values in source code or commit them to the repository. The Supabase URL and anon key are public client configuration, but are kept in Actions secrets here so they are supplied consistently at build time.

## Automation

- Pull requests to `main` build the app for Cloudflare without deploying.
- Pushes to `main` build and deploy when the Cloudflare credentials are configured.
- If the Cloudflare credentials are missing, the build can still run, but deployment is skipped with a notice.
- A manual run is available from **Actions → Sanctuary Cloudflare deployment → Run workflow**.

The first deployment should be tested at the `sanctuary-web-auto` workers.dev URL before switching traffic from the existing Worker. Confirm signup, email confirmation, sign-in, forgot-password, reset-password, profile loading, and the main app shell. Keep payments and donations disabled unless their host-specific production guards have been reviewed.

## Notes

- The workflow installs the adapter in CI without adding unverified dependency changes to the existing lockfile. Pin/update the adapter and Wrangler in the lockfile as a separate dependency-maintenance task after the first successful build.
- This setup does not create a paid Cloudflare plan, buy a domain, modify Supabase, or overwrite the current production Worker.
