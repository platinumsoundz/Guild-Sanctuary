# Sanctuary Games Hub — deployment and integration notes

## Game destinations

- **3D Training Ground:** `https://the-5-sleeves-3d.pages.dev/` (Cloudflare Pages). Keep the GitHack deployment available as a fallback until the Pages version has passed browser and device checks.
- **2D Online:** set `NEXT_PUBLIC_5_SLEEVES_2D_URL` to the canonical Render URL after verifying it in the Render dashboard or existing production configuration. It is intentionally unset by default. The launcher disables this game's launch controls while the URL is unset rather than guessing a host.

Set the public environment variable in the deployment environment (Vercel/Cloudflare configuration as appropriate) and trigger a fresh build. It is a public URL, not a secret.

## Launch behavior

The Games Hub offers an in-app iframe and a separate-tab link. Some hosts may block embedding through CSP or `X-Frame-Options`; the separate-tab option is the fallback. If input, pointer lock, authentication, or game performance behaves differently in an iframe, use the standalone host.

## What is and is not integrated

The hub currently links to the two existing game deployments. It does not provide single sign-on, shared saves, shared inventory, shared Sanctuary Tokens, or a cross-game entitlement system. Do not display a combined balance or tell players their identity/progression is shared.

## Safe next phase

1. Verify the 2D canonical Render URL and configure the variable.
2. Add a versioned server-to-server launch/session API; issue short-lived, scoped tokens only after explicit account linking and consent.
3. Verify those tokens server-side in the 2D game server; never trust a browser-supplied user ID or wallet balance.
4. Keep each game's progression/economy authoritative on its own server. Add idempotency, replay protection, expiry, revocation, origin allowlists, and audit logs before any shared reward or spend operation.
5. Keep payments and shared token spending disabled until automated security tests and end-to-end staging checks pass.

## Release gates

- [ ] CI typecheck and production build pass on the candidate commit.
- [ ] The configured 2D host is verified and responds successfully.
- [ ] 3D Pages loads modules and PWA assets; save recovery remains intact.
- [ ] Iframe and separate-tab behavior are checked automatically where feasible.
- [ ] CSP, CORS, authentication, session expiry and replay rejection are covered before account linking.
- [ ] Human mobile performance check remains pending; do not describe automated checks as device verification.


## Handover log — 26 October 2026

### Done on working branches
- Games entry wired into Sanctuary navigation/workspace.
- Responsive Games Hub added with embedded launch and open-in-new-tab fallback.
- 3D target set to the known Pages URL: `https://the-5-sleeves-3d.pages.dev/`.
- 2D target deliberately uses `NEXT_PUBLIC_5_SLEEVES_2D_URL`; the value remains unset until the canonical Render URL is verified.
- Cloudflare Wrangler config includes an Images preview binding.
- Dedicated Cloudflare build trigger corrected to use `npx opennextjs-cloudflare build` and `npx wrangler deploy --dry-run`. Dry-run is not a production deployment.
- 2D Socket.IO handshake smoke test added in its own PR; the isolated test job passed.
- 3D static asset/module smoke tests added in their own PR; CI passed.

### Build/test caveats
- Sanctuary app build/type checks passed before the most recent Cloudflare build-trigger correction.
- Cloudflare build `354e7c4f-a58d-4338-9634-591e0e8e748b` was still running at the last poll and used commit `2acc9c4d4e9e07bb961c1de96dcee9e75e2c5a97`. It may not include the latest Wrangler config commit; confirm its final result and rerun on the current branch head.
- The broader 2D test suite has four pre-existing failures to investigate: biome expectations, compact HUD bounds, fullscreen-settings assertion, and sprite sleeve positioning. Do not change gameplay behavior until expected behavior is established.
- Cloudflare Pages deployment API reported success for the 3D site, but external browser/device verification was not independently confirmed by the automation environment.
- No manual mobile QA is claimed.

### Remaining checklist
- [ ] Confirm the Cloudflare build outcome and run a fresh dry-run against the latest Sanctuary branch head.
- [ ] Verify the canonical 2D Render URL in Render/deployment settings; configure the public environment variable and rebuild.
- [ ] Run external HTTP checks for 3D Pages assets/PWA/save recovery and 2D health/Socket.IO.
- [ ] Verify iframe and new-tab launch, keyboard input, pointer lock, fullscreen, CSP/frame policy and mobile layout.
- [ ] Inspect existing Supabase auth and game-server authority before designing account linking. Do not send long-lived auth credentials in URLs.
- [ ] Before shared identity/progression/economy, implement server-verified short-lived scoped tokens, expiry, revocation, replay protection, idempotency, audit logs, origin allowlists and negative security tests.
- [ ] Keep shared rewards/spending disabled until end-to-end staging and security checks pass.
- [ ] Review all draft PRs and merge only after CI and deployment gates pass.

### Explicitly not implemented
- No shared SSO, shared saves, inventory, progression, Sanctuary Token balance or cross-game entitlement bridge.
- No verified 2D Render URL configured.
- No production deployment performed by this integration work.
- No claim of real-device/manual QA.

### Related draft PRs
- Sanctuary Games Hub: https://github.com/platinumsoundz/Guild-Sanctuary/pull/17
- Sanctuary integration contract: https://github.com/platinumsoundz/Guild-Sanctuary/pull/16
- 2D host contract: https://github.com/platinumsoundz/The-5-Sleeves/pull/2
- 2D Socket.IO smoke test: https://github.com/platinumsoundz/The-5-Sleeves/pull/3
- 3D hosting contract: https://github.com/platinumsoundz/The-5-Sleeves-3D/pull/2
- 3D static smoke tests: https://github.com/platinumsoundz/The-5-Sleeves-3D/pull/3


### Latest deployment check — 26 October 2026
- Cloudflare OpenNext build and Wrangler dry-run completed successfully for the tested commit. The output bundle was created, and Wrangler recognized the `WORKER_SELF_REFERENCE`, `IMAGES`, and `ASSETS` bindings. This was a dry run only; it did not deploy the Worker.
- Cloudflare emitted a configuration warning: Wrangler config says Worker name `sanctuary-web-auto`, while the connected build expects `guild-sanctuary`. The CI system overrode the name for the dry run. Confirm the intended production Worker name and align `name` plus the self-reference service binding in a reviewed follow-up before an actual deployment.
- GitHub's Vercel status for the latest documentation commit reports a deployment rate limit and says to retry in 24 hours. This is a hosting-plan/build-limit status, not a TypeScript/build error. Do not repeatedly trigger Vercel builds; wait for the limit window or use the successful Cloudflare dry-run evidence while keeping production unchanged.


### Public roadmap and notification preview — 26 October 2026
- Added a **Systems & Roadmap** destination to the authenticated Sanctuary navigation so known current and planned systems are visible, including placeholders and security-gated features.
- Roadmap status labels intentionally distinguish **Available**, **Preview**, **Planned**, and **Security gated**. Listing a feature is not a claim that its backend or deployment is complete.
- Added a notification bell and panel with clearly labelled sample/system-preview items and a local mark-as-read interaction.
- **Not yet connected:** real-time/persisted notification delivery, message and wallet event subscriptions, push/email notifications, cross-device read state, and notification preferences. Do not represent preview items as real account activity.
- The roadmap is a curated inventory of major known systems, not an automatically generated exhaustive inventory of every code path or private operational control. Update it as roadmap scope changes.


### Cross-host mismatch investigation — 26 October 2026
- Vercel's latest inspected build was a Preview deployment from `feature/public-roadmap-notifications`; this is not proof that the production alias is running that build.
- Vercel has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` entries targeted at production, preview and development. Their values have not been compared with the actual Cloudflare build inputs.
- The Cloudflare deployment workflow used fallback Supabase placeholder values when GitHub Actions secrets were absent, while its deploy gate checked only Cloudflare credentials. This could publish a build with placeholder Supabase configuration. Deployment is now gated on both Supabase secrets being present.
- The checked-in Wrangler config named the Worker `sanctuary-web-auto`, but the existing live Worker is `guild-sanctuary`. Deploying with that config could update/create the wrong Worker and leave the site users visit stale. The config and self-reference binding now target `guild-sanctuary`.
- Next verification: CI/typecheck/build, then confirm the actual Vercel production alias and Cloudflare Worker deployment both use the intended commit and real Supabase URL/key pair. Do not claim parity until both hosts are checked.
