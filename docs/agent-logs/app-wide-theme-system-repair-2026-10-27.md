# App-wide theme system repair — 2026-10-27

## Root cause
The global theme tokens in `src/app/globals.css` were applied to the document, but `src/components/AppWorkspace.module.css` overrode key tokens (`--surface`, `--surface-raised`, `--ink`, `--muted`, and `--line`) with fixed light values on the application wrapper. That meant most application pages inherited the wrapper's fixed palette instead of the selected global theme.

## Changes
- Removed fixed palette overrides from the application workspace so pages inherit the root theme tokens.
- Added selectable `stone` (grey) and `ocean` (blue) palettes alongside light, dark, and dusk.
- Updated account preference types, normalization, settings UI, and early document bootstrap for the new palettes.
- Kept profile accent colour separate from application theme selection.
- Explicitly reserved a future theme catalogue for token-unlockable cosmetics; no token purchases or entitlement checks are enabled by this change.
- Rebuilt the static theme contract test to cover all palettes and prevent the app workspace from overriding global semantic tokens.

## Verification
CI has been triggered on this branch; confirm GitHub's final result before considering it passing. Static checks do not replace visual browser verification across feed, profile, messages, shop, and settings in each theme. No provider settings, migrations, billing, or deployments were changed.
