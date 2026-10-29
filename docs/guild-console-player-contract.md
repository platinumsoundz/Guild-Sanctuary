# Guild console player contract

The Guild is a hidden browser-game hub within Sanctuary, not just a route to hide.

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
GuildConsolePlayer provides the system overlay and fullscreen controls for iframe-hosted games. Integration into the main library is the next change; this component alone does not mean production is deployed or all games are compatible.
