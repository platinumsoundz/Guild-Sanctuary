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


## Console-first UX and touchscreen requirements (owner direction, 2026-10-29)

The Guild should feel like **Steam Big Picture Mode**: a controller-friendly console interface for browser-based games, entered from the hidden Guild activation. In the initial release, prioritize the owner's own games—**The 5 Sleeves 2D and The 5 Sleeves 3D**—before adding third-party catalog breadth. This is a design direction, not a claim of Steam affiliation.

### Navigation and input parity
- All core Guild flows must remain usable with touchscreen, mouse/tap and gamepad. Do not make a physical controller a requirement.
- Make cards, settings, dialogs, back/close, launch, resume and return-to-library controls tappable with appropriately large touch targets and visible focus/pressed states.
- Provide an on-screen console navigation control surface when helpful: directional pad or virtual joystick plus **A / Select / Confirm** and **B / Back/Cancel** at minimum. Add Start/Menu and other game-specific buttons where supported.
- The D-pad/joystick and A/B controls must operate the Guild's own menus and selection model accessibly, including focus movement, selection and back/cancel. They must not be decorative.
- In a game, virtual controls must map to actual game input. A parent-page overlay cannot inject keyboard/gamepad events into a cross-origin iframe reliably. Prefer the games' native touch controls; where missing, implement a deliberate, documented bridge such as a narrow postMessage protocol with strict origin/source validation and explicit game-side handlers, or put controls inside the game client. Never present buttons as working game controls until that path is implemented and tested.
- Preserve ordinary taps/clicks even when a controller overlay is visible. Let users hide/reposition the virtual controller surface; avoid covering critical game HUD or touch targets. Adapt layout for portrait and landscape mobile screens.
- Gamepad, touchscreen and keyboard/mouse should converge on the same semantic actions (up/down/left/right, confirm, back, menu) wherever practical, rather than building three unrelated navigation systems.
- Test on Android touch browsers and desktop browsers, including touch-only operation, orientation changes, fullscreen exit/recovery, keyboard navigation, controller hot-plug and game iframe restrictions.

### Initial delivery order
1. Make the Guild library and system menu fully touch-usable and console-navigable.
2. Verify the existing native touch controls in The 5 Sleeves 2D and 3D; fix gaps in those games rather than assuming a wrapper can control them.
3. Add a visible, collapsible virtual D-pad/joystick + A/B console controls for Guild navigation and selection.
4. For game controls, integrate only with game-side input support and verify actual movement/selection in each game.
5. Keep the 2D static-client hosting investigation separate from input work; preserve its authoritative multiplayer server and avoid changing the existing deployment until the replacement is tested.


## Native game touch support — repository documentation reviewed

The 2D repository README describes its browser client as supporting keyboard, touch and gamepad input. The 3D repository README describes its existing mobile-shooter touch layout (analog movement, right-side camera drag, AIM, SWAP and action buttons) and gamepad mappings. This confirms that game-side touch support is documented in both projects; it does **not** substitute for running either game inside the Guild on actual Android devices. The 3D game notes that touch-button sizing and placement remain deferred by owner request, so that is a concrete follow-up for the device pass. The 2D launch remains disabled until `NEXT_PUBLIC_5_SLEEVES_2D_URL` is configured to a verified client host.

## Console navigation implementation status

The player now includes a touch D-pad plus A/Select and B/Back controls for the Guild system menu, directional focus movement across menu actions, keyboard arrow navigation, gamepad D-pad/stick focus movement, A/confirm and B/back handling, Start/Home menu toggling where exposed, focus-visible styling and a hide/show quick-menu affordance. These controls navigate the Guild UI only. They intentionally do not claim to steer a game inside a cross-origin iframe; the two games' own native touch controls remain responsible for in-game movement and actions.

The Guild library roadmap now explicitly exposes the Guild Token Shop and Spotify as planned, non-functional placeholders. The shop must use the shared Sanctuary wallet and server-authoritative ownership/transaction checks; no token spending is enabled by these UI additions. Spotify remains optional and depends on API access, permissions and playback restrictions.


## 2D static-client feasibility findings (source inspection, 2026-10-29)

- The 2D app's browser client is under `public/`; the Node server serves it with `express.static(path.join(__dirname, 'public'))`.
- The client currently creates its Socket.IO connection with `window.io()` in `public/src/netcode.js`, which means it targets the page's own origin by default.
- The modular client boot flow requests `/api/client-modules` in `public/src/module-runner.js`; that endpoint is served by the Node server and currently also assumes the page and game server share an origin.
- Consequently, putting `public/` on a static host is feasible as a client/server separation, but it is **not yet a drop-in deployment**. A tested implementation needs a configurable HTTPS game-server origin used by both Socket.IO and the module manifest request, a strict server-side CORS allowlist for the chosen static origin, Socket.IO CORS configuration, and checks for all remaining absolute API/asset paths.
- Keep the authoritative server, profile persistence, combat/progression services, current host and rollback path unchanged until the separate static client can connect and pass guest/account, module loading, multiplayer, persistence, mobile touch, audio and iframe tests. The Guild must continue to use only a confirmed client URL; do not set one based on a guess.
