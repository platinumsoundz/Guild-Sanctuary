# Guild console player and hosting contract

The Guild is a hidden browser-game hub within Sanctuary, not just a route to hide.

## Preferred hosting and launch pattern

**Reference implementation: The 5 Sleeves 3D.** It is a static browser game deployed at `https://the-5-sleeves-3d.pages.dev/` and embedded into Sanctuary's game library. The user experiences it inside Sanctuary's page; the current implementation uses an iframe to the separately hosted game page. This is not the same as bundling the game's source into the Sanctuary application.

For The 5 Sleeves 2D, first investigate adapting this proven static-client hosting and in-page embedding pattern. Do not default to a Render-hosted all-in-one game URL or opening a separate tab. The 2D project has a Node.js/Express/Socket.IO multiplayer server, so preserve its server-authoritative simulation and multiplayer services while evaluating whether its browser client can be served as a static web app (for example, on the same kind of static hosting used for 3D) and connect to its game server over the appropriate secure WebSocket/HTTP endpoint.

Before changing deployment:
1. Identify the 2D client/server boundary and all runtime assumptions (relative asset paths, API routes, Socket.IO URL, cookies/auth, CORS, WebSocket TLS).
2. Confirm which client files can be served statically and what must remain on a server.
3. Deploy a test build to the static host used by the 3D game, without deleting or breaking the existing multiplayer service.
4. Embed the candidate URL in The Guild and test the game loop, login/guest flow, persistence, multiplayer, audio, controller, fullscreen and return-to-library behaviour.
5. Keep the existing deployment as a rollback until the replacement passes the test suite and device checks.

Use a configurable client URL such as `NEXT_PUBLIC_5_SLEEVES_2D_URL` rather than hardcoding an unverified host. Do not guess a production URL. If the game needs a server-side runtime, that server may remain separately hosted even if the browser client follows the 3D static-page pattern.

## Player experience
- Library is opened through manual Settings access or controller discovery.
- Selecting a supported game loads it inside the Guild player where its host permits embedding.
- Player provides fullscreen and a persistent route back to the Guild library.
- A controller Home/Guide button opens a system overlay while leaving the game mounted behind it.
- Overlay exposes resume, Guild home, display, controller diagnostics and Guild-managed music controls.

## Compatibility constraints
- Gamepad button index 16 is a common Home button mapping, but browser/controller combinations may omit or remap it. Keep the on-screen menu available.
- Browsers can reserve the controller's Guide/Home button at OS level; the Gamepad API may never expose it.
- Fullscreen must be requested from a direct user gesture and may be denied by a browser.
- An iframe's allowlist cannot override host CSP/X-Frame-Options. A game that disallows embedding must be marked external-only or opened separately.
- Parent-page music controls cannot mute audio inside a cross-origin iframe. Only Guild-managed audio can be controlled directly.
- Controller status should be tested in a real browser/device matrix, especially Android/Samsung Internet, Brave, Chrome and desktop browsers.

## Current implementation scope
GuildConsolePlayer provides the system overlay and fullscreen controls for iframe-hosted games. Integration into the main library is in progress. This component alone does not mean production is deployed or all games are compatible.


## Product architecture: Sanctuary and Guild are distinct worlds

**Sanctuary is the public-facing experience:** a spiritual journey connecting space, reflection, growth and community. **The Guild is a hidden, activated console community:** a gaming-focused world with its own intention, culture and member experience. Do not treat these names as interchangeable and do not present the Guild as merely a visible Sanctuary page.

They are two experience modes built on the same Sanctuary application codebase, infrastructure, identity, shared systems and database. The Guild should reuse the Sanctuary's working foundations so improvements to shared code and services benefit both worlds without duplicating entire systems. Keep the Guild's entry hidden/activated and preserve its distinct interface, language, community purpose and gaming tools. Shared infrastructure must not erase the difference in intent or expose the hidden Guild entry by accident.

### Guild feature requirements and direction

- **Themes:** Guild must use the same theme-selection system as Sanctuary. Apply the selected theme consistently to the Guild shell, game library, system overlay and settings. Do not create a disconnected second theme store or hardcode a theme that ignores the user's selection.
- **Shared tokens and wallet:** reuse the Sanctuary identity and token balance/ledger, with the same security, authorization and transaction rules. Do not create a parallel Guild currency or client-only token balance.
- **Sanctuary Token Shop customizations:** Guild should be able to use eligible customizations unlocked or owned through the existing Sanctuary Token Shop wherever compatible, while allowing Guild-specific presentation.
- **Separate Guild Token Shop:** build a distinct Guild shop/catalog for Guild-oriented digital items and gaming customizations, but connect purchases to the shared token wallet and authoritative transaction/ownership records. Keep shop inventory and product identity separate from the general Sanctuary shop where needed; do not duplicate the wallet or bypass server-side spending checks. Token spending remains gated until migrations, guarded RPCs, grants, idempotency and staging checks pass.
- **Expanded gaming settings:** grow the Guild settings beyond the basic player overlay: controller detection and mappings, input sensitivity/deadzones where the game supports them, keyboard/touch controls, display/fullscreen, audio and music levels, accessibility, performance/quality preferences, game-specific options, and clear diagnostics. Persist settings to the user's account where appropriate and use local device settings only for device-specific preferences. Never imply a parent-page setting can control a cross-origin game's internals unless an integration actually supports it.
- **Future Spotify integration:** design a future integration point for account linking, playback controls and permissions, but treat it as planned—not implemented. Respect Spotify authentication, API availability, licensing/playback restrictions, and user consent. Keep the Guild usable without Spotify.
- **Future Guild systems:** expose planned systems as clearly labelled placeholders only when useful, with no false claim that an unfinished integration is live.

### Implementation rules

1. Prefer shared components, hooks, services, theme tokens, wallet APIs and database tables over Guild-only copies.
2. Keep Guild-only presentation and features behind the activated Guild experience and appropriate authorization checks.
3. Use feature boundaries/configuration for different experience intent, not forked versions of shared logic.
4. Make database/schema changes backward-compatible for Sanctuary and Guild; test both experiences against the same staging data and identity model.
5. Any wallet/shop write must be server-authoritative, authorized, auditable and idempotent. Never enable production spending solely because the UI exists.
6. Track each item as planned, in progress, tested or live; do not describe planned features as delivered until verified.
