# Game integration contract — The 5 Sleeves

Status: planning contract. This does not claim that either game currently shares Sanctuary accounts, saves, wallet, or entitlements.

## Current game destinations

- **The 5 Sleeves 2D:** the existing Render-hosted Node.js/Express/Socket.IO game. Preserve its configured canonical URL; do not invent or hard-code an unverified Render hostname.
- **The 5 Sleeves 3D:** Cloudflare Pages project `the-5-sleeves-3d`, `https://the-5-sleeves-3d.pages.dev/`. GitHack remains the fallback/reference until Cloudflare is verified by automated browser checks and an owner device pass.
- Repository sources: [2D](https://github.com/platinumsoundz/The-5-Sleeves) and [3D](https://github.com/platinumsoundz/The-5-Sleeves-3D).

## Phase 1 — safe game hub

Sanctuary should link to each game as an external destination. Present each as a separate game with a status label and a clear “opens game” action. Keep a fallback link for the 3D prototype while its Cloudflare path is being validated. Do not embed cross-origin games in an iframe unless framing, input, privacy and CSP policies are deliberately configured.

The launcher must not require Sanctuary authentication to play the existing standalone games. If Sanctuary is down, the games remain independently reachable.

## Phase 2 — integration readiness

Before building shared identity or progression, define a versioned API contract and ownership boundaries:

- Sanctuary is the identity/consent authority only if the user explicitly links accounts.
- The 2D server remains authoritative for its multiplayer state, combat, inventory and economy.
- The 3D browser game remains local/offline-first until a real server adapter is implemented; its current multiplayer module is scaffolding, not a live transport.
- Game-specific saves remain separate. No silent conversion or merging of 2D and 3D progression.
- Use short-lived scoped launch tokens verified server-side; exact HTTPS origin allowlists, expiry, replay protection, revocation and audit events are required.
- Never expose Supabase service-role credentials, Stripe secrets, webhook secrets or durable session tokens to browser code or URLs.
- Payments, wallet, VIP and cross-game entitlements stay disabled until a dedicated security and end-to-end test plan is complete.

## Phase 3 — release gates

- [ ] Both game links resolve to their canonical hosts.
- [ ] 2D staging smoke tests cover HTTP health, Socket.IO handshake, reconnect and CORS.
- [ ] 3D staging smoke tests cover HTML, modules, WebGL startup, PWA manifest/service worker and save recovery.
- [ ] GitHub Actions tests pass on the exact release commits.
- [ ] Origin allowlists and failure behaviour are verified.
- [ ] The 3D Pages deploy has passed browser smoke checks; the old GitHack link remains available until then.
- [ ] Human mobile play/performance test remains a final gate, but it is not required for ongoing offline build work.
- [ ] Sanctuary shows honest status: “automated checks passed”, “host deployed”, and “device verification pending” are separate states.

## Suggested implementation order

1. Keep the two games on their existing runtime-appropriate hosts.
2. Make the Cloudflare Pages 3D host reproducible from Git and add browser smoke tests.
3. Add a minimal Sanctuary game directory using explicit, configured URLs and status metadata.
4. Add no shared-login claim until a versioned session API and server-side verification are implemented.
5. Later, implement optional account linking and cloud-save adapters as separate opt-in milestones.
