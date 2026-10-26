# Integration status — 26 October 2026

This is the current handover note for the Sanctuary + The 5 Sleeves integration work. It records verified implementation and known gaps; it is not a claim that production is fully integrated.

## Completed on working branches

- Added a Games destination to Sanctuary navigation and routed it through the existing app workspace.
- Added a responsive Games Hub with an iframe launch path and open-in-new-tab fallback.
- Added the 3D Training Ground destination: https://the-5-sleeves-3d.pages.dev/
- Made the 2D game URL explicit configuration (`NEXT_PUBLIC_5_SLEEVES_2D_URL`) rather than guessing a Render hostname. When unset, launch is intentionally disabled.
- Added deployment/integration documentation covering hosting, iframe limitations, trust boundaries, future session exchange and release gates.
- Updated `wrangler.jsonc` to declare the Images preview binding as well as the normal Images binding.
- Corrected the dedicated Cloudflare build trigger to run the OpenNext Cloudflare build and use `wrangler deploy --dry-run` for validation. This is deliberately a dry run, not a production deployment.

## Validation status

- Sanctuary application build/type checks passed on the branch before the latest Cloudflare build-trigger correction.
- A Cloudflare build was started against commit `2acc9c4d4e9e07bb961c1de96dcee9e75e2c5a97`; it was still running at the last status poll. This commit may predate the latest `wrangler.jsonc` update, so rerun against the current branch head before treating the worker bundle as validated.
- Browser/device checks of the deployed 3D Pages site and iframe behavior have not been confirmed by this automation session.
- Production was not intentionally deployed or changed as part of this branch work.

## Remaining work — priority order

1. **Finish build verification:** check the Cloudflare build result/logs and rerun using the latest branch SHA. Resolve any OpenNext/Wrangler issues without changing production deploy commands.
2. **Verify the 2D URL:** confirm the canonical Render URL in the Render dashboard or existing deployment settings; then set `NEXT_PUBLIC_5_SLEEVES_2D_URL` in the correct preview/production environment and rebuild.
3. **Run hosted smoke checks:** verify Pages response, JavaScript modules, manifest/icons, save recovery, 2D health endpoint and Socket.IO handshake from an external runner.
4. **Verify launch behavior:** test both embedded and separate-tab flows, including pointer lock, keyboard input, fullscreen, mobile layout and CSP/frame restrictions.
5. **Security architecture before shared identity:** inspect the existing Supabase auth model and each game's authority model. Design an explicit account-linking consent flow and short-lived, audience-scoped launch tokens; do not pass long-lived auth tokens through URLs.
6. **Shared progress/economy only after security review:** add server-side token verification, expiry, revocation, replay prevention, idempotency, audit logs, origin allowlists and automated negative tests. Keep cross-game rewards/spending disabled until staging passes.
7. **Release process:** review all draft PRs, resolve CI failures, merge only reviewed changes, and confirm production deployment separately.

## Explicitly not done

- No shared Sanctuary login / SSO between games.
- No shared saves, inventory, progression, wallet, or Sanctuary Token balance.
- No verified canonical Render URL configured.
- No production deployment performed by this work.
- No claim of manual mobile/device QA.

## Related PRs

- Sanctuary Games Hub: https://github.com/platinumsoundz/Guild-Sanctuary/pull/17
- Sanctuary integration contract: https://github.com/platinumsoundz/Guild-Sanctuary/pull/16
- 2D host/integration contract: https://github.com/platinumsoundz/The-5-Sleeves/pull/2
- 2D Socket.IO smoke test: https://github.com/platinumsoundz/The-5-Sleeves/pull/3
- 3D host/integration contract: https://github.com/platinumsoundz/The-5-Sleeves-3D/pull/2
- 3D static hosting smoke tests: https://github.com/platinumsoundz/The-5-Sleeves-3D/pull/3
