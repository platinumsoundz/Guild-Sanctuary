# App-wide theme system repair — 2026-10-27

## Problem found
The root theme tokens in `src/app/globals.css` were being applied to the document, but `src/components/AppWorkspace.module.css` redefined `--surface`, `--surface-raised`, `--ink`, `--muted`, and `--line` on the main application wrapper using fixed light values. Those wrapper-level values override the selected global theme for much of the application, so the selector could change the browser/document chrome without consistently recolouring the pages.

## Changes
- Removed the fixed light palette overrides from the main workspace wrapper so pages inherit the active semantic theme tokens.
- Added `stone` (grey) and `ocean` (blue) palettes alongside light, dark and dusk.
- Added both palettes to the account preference type, normalization and early theme bootstrap.
- Exposed both palettes in Settings.
- Kept profile accent colour independent from the application theme.
- Documented token-unlockable themes as a future catalogue extension only. No token spending, purchase, entitlement, or shop integration is claimed or enabled.
- Expanded static theme contract checks for new palettes and protection against workspace token overrides.

## Verification / limits
- CI is triggered by this branch; do not treat it as passing until GitHub reports the result.
- Static checks do not replace a visual browser pass across feed, profile, messages, shop, and settings in each palette.
- No migrations, provider settings, payments, or deployments were changed.
