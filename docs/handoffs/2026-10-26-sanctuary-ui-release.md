# Guild Sanctuary UI upgrade — release handoff

Date: 2026-10-26  
Owner project: `platinumsoundz/Guild-Sanctuary`  
Pull request: https://github.com/platinumsoundz/Guild-Sanctuary/pull/22  
Branch: `feat/unified-navigation-notifications`  
Latest reviewed commit: `b4713fe012eb11cccd2f37bcc9a4b03cf8bbfe78`

## User-approved outcome

Complete and release the unified navigation/notifications UI upgrade as soon as safely possible:
- navigation menu trigger in the top-left;
- remove duplicate/black landing-page title header;
- dedicated Notifications destination/page;
- notification shortcut in the top-right without overlapping controls;
- restore a clear “Explore as Guest” entry point;
- keep account/sign-in access clear;
- responsive layout and preserve existing auth/Supabase behavior.

## Current implementation

- `src/context/AppContext.tsx`: adds `notifications` to navigation state.
- `src/components/Navigation.tsx` and `Navigation.module.css`: top-left menu, notification shortcut, guest entry, account action and responsive styling.
- `src/components/NotificationBar.tsx` and its CSS: supports a full-page notifications view and reuses existing notification data operations.
- `src/components/AppWorkspace.tsx`: renders the notifications destination and passes guest entry action into navigation.
- `src/app/page.tsx`: removes the duplicate landing header and guest CTA so the shared shell is authoritative.

## Verification recorded for latest commit

At `b4713fe012eb11cccd2f37bcc9a4b03cf8bbfe78`:
- GitHub Actions CI `validate`: **passed** — `npm ci`, Deno checks, `npm run typecheck`, `npm run build`.
- Cloudflare build workflow `build-and-deploy`: **passed** — dependencies and `npx opennextjs-cloudflare build`; deploy step was skipped because this run was triggered by a pull request.
- Hourly roadmap/build workflow checks: **passed**.
- Two Cloudflare Workers Builds checks for worker names `the-sanctuary` and `guild-sanctuary`: **failed** on the latest commit. The checks expose Cloudflare build IDs but no useful failure logs in the GitHub check output. An attempted read of Cloudflare build configuration by worker name returned 404 because that API requires the system-generated worker script tag, not the display name.

## Final release state — 2026-10-26

- PR #22 was merged to `main` at commit `35cfc132c366f88ed1ce158c1415b8995f579ea5`.
- GitHub Actions CI passed on the merged commit: Deno checks, TypeScript typecheck, and Next.js build.
- The GitHub Actions Cloudflare deploy job built successfully but the direct deploy step failed with Cloudflare API `401 Unauthorized` while uploading assets. The GitHub Actions Cloudflare API token secret needs to be replaced/permission-checked before that path can work again.
- Independently, Cloudflare Workers Builds configuration was corrected for both `the-sanctuary` and `guild-sanctuary`: install the pinned OpenNext Cloudflare adapter, run `npx opennextjs-cloudflare build`, and use the matching OpenNext deploy command.
- Cloudflare native production build `435cec83-e591-4d85-b235-30c199fc0ea3` for `guild-sanctuary`, commit `35cfc132c366f88ed1ce158c1415b8995f579ea5`, completed with outcome **success** and deployed version `ae7b20ec-6734-4e7e-90fe-2cdfbe4c51f9` at `https://guild-sanctuary.thesmarthub.workers.dev`.
- Browser-based interactive smoke testing could not be completed in this environment. Treat deployment as successful, but keep visual/interaction verification as a follow-up.
- The duplicate `the-sanctuary` production build was still initializing at last check; `guild-sanctuary` is the canonical worker name in `wrangler.jsonc`.

## Remaining follow-up

1. Open [GitHub deployment run #68](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40393860839) and replace/permission-check the `CLOUDFLARE_API_TOKEN` Actions secret. Never paste secrets into chat.
2. Perform browser-level smoke tests against `https://guild-sanctuary.thesmarthub.workers.dev`: signed-out landing, Explore as Guest, menu open/close and keyboard escape, notifications destination, signed-in notification loading/mark-read, and narrow mobile layout.
3. Confirm guest notification state is sensible and does not query signed-in user data. Verify the app is connected to the expected Supabase project.
4. Recheck the `the-sanctuary` duplicate worker build. Do not assume it is the canonical app; `wrangler.jsonc` names `guild-sanctuary`.
5. If the GitHub deployment token is fixed, rerun the failed workflow to restore a green automated deploy path. Cloudflare native build deployment already succeeded independently.

## Access boundary / handoff note

If the next agent cannot access Cloudflare dashboard build logs or identify the system-generated script tags, ask the project owner to open the failed build IDs above in Cloudflare and share the failure summary or grant the appropriate read access. Do not ask for API tokens or secrets in chat. Do not claim deployment succeeded without evidence.
