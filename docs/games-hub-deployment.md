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
