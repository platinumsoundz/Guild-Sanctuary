# Cosmic Sanctuary Visual Direction — 2026-10-28

## North star

Use the approved Sanctuary concept image (project reference artwork) as the visual destination: a welcoming celestial sanctuary with luminous angel wings, a portal/citadel skyline, floating islands, planets, stars, cosmic-energy clouds, and a deep indigo/violet palette accented by electric cyan and soft magenta. The result should feel like a living world, not a generic dashboard with a purple background.

## First implementation slice

- Add a semantic cosmic palette to the workspace so existing pages inherit consistent midnight-indigo surfaces, lavender highlights, readable cool-white text, and subtle cyan accents.
- Add a lightweight, CSS-only starfield and layered nebula gradients; no external network calls, large background downloads, or new dependencies.
- Preserve current navigation, feature behavior, theme contrast, responsive layouts, keyboard focus visibility, and reduced-motion preferences.
- Keep real Sanctuary feature routes and Support the Creator distinct. Cosmic Games remains a separate destination; creator links belong in Support the Creator.

## Design language

- **Palette:** void navy `#07091d`, deep indigo `#0d1230`, raised cosmic glass `#15183c`, starlight `#f6f2ff`, lavender `#b18cff`, cyan highlights, restrained magenta.
- **Atmosphere:** layered radial nebulae, sparse stars, soft luminous edges, distant skyline silhouettes, and aurora/cosmic-energy ribbons.
- **Surfaces:** translucent glass panels with fine violet borders, soft depth, and restrained glow. Avoid making every card equally bright.
- **Typography:** elegant display serif for major emotional statements; clean sans-serif for navigation, body copy, controls, and data.
- **Imagery:** use the supplied concept art as art direction. Prioritise bespoke wings, portals, skyline panoramas, planets, and cosmic clouds. Optimise imagery, provide meaningful alt text, and never let decorative art obscure content.
- **Motion:** slow ambient drift only where useful; reduced-motion users get a still experience. Avoid distracting parallax and heavy animation on mobile.
- **Accessibility:** maintain WCAG-aware text contrast, visible keyboard focus, clear labels, usable touch targets, and content that remains legible over imagery.

## Build sequence

1. **Theme foundation (this PR):** introduce scoped semantic cosmic tokens, a layered CSS starfield, focus states, and reduced-motion safeguards without changing feature logic.
2. **Sanctuary home hero:** rebuild the top of Today around a wide portal-and-wings visual, strong headline, two clear calls to action, and a mobile-first crop.
3. **Navigation and glass surfaces:** refine header, active route indicators, panels, buttons, notification surfaces, and small-screen navigation without compromising current behavior.
4. **World discovery tiles:** build distinct destinations for Community, Cosmic Games, Support the Creator, and Shop; ensure external creator projects are only represented on the creator-support route.
5. **Worldscape art and polish:** add skyline/planet/energy artwork, responsive image delivery, subtle hover/focus treatments, empty/loading states, and visual regression checks.
6. **QA and batch release:** run typecheck, build, contract tests, contrast/responsive checks, and mobile browser QA; then batch-merge/deploy after review.

## Guardrails

- This PR is a foundation, not a claim that the full concept image has already been reproduced.
- Do not invent or imply backend capabilities, and do not alter Supabase/security boundaries as part of visual work.
- Avoid adding large binary assets through text-only APIs. The concept image can be committed as a normal image asset in a follow-up using a binary-capable Git workflow if it is not already present in the repository.
- No production deployment is performed by this change.


## Default theme decision — 2026-10-28

The cosmic Sanctuary theme is now the product's default visual direction, not merely a homepage skin. The global semantic tokens in `src/app/globals.css` define midnight-indigo surfaces, lavender-violet accents, cyan highlights, and celestial status colors. Shared body atmosphere and feature modules should consume these semantic tokens so Feed, Events, profile, Support, shop, notifications, navigation, and future pages remain coherent. Existing `light`, `stone`, `ocean`, and `dusk` theme overrides remain separate alternatives; this work does not remove future theme choice.

### Rollout sequence
1. Global cosmic tokens as the default and a regression contract to keep them stable.
2. Shared shell, navigation, notifications, buttons, inputs, cards, dialogs, and page surfaces adopt the semantic tokens consistently.
3. Feature-by-feature refinement for Feed, Events, profiles, creator support, shop, Sanctuary Intelligence, and Cosmic Arcade.
4. Mobile and accessibility review: contrast, focus, reduced motion, safe areas, overflow, and touch targets.
5. Run full CI/typecheck/build and visual QA before merging or deployment. No deployment is implied by this theme change.


## Shared interaction and destination styling — continued work

The default cosmic theme is intended to be the baseline for the whole product. Global styles now provide the atmospheric page backdrop, consistent focus indicators, selection colour, form-control accents, disabled-state clarity, and reduced-motion handling. These are semantic-token based so future themes can override the palette without removing the interaction affordances.

The shared navigation shell and notification panel use semantic cosmic glass surfaces and accent gradients. Cosmic Arcade has a dedicated treatment for its hero, game tabs, play areas, active states, and phone layout; it remains a separate Sanctuary destination and does not absorb creator links.

Before release, run the repository's full CI, typecheck and production build on the final PR head. The CSS-only additions have regression assertions, but they are not a substitute for real browser visual QA, contrast review, or checking all feature-specific modules.


## Theme compatibility and motion guardrails

The home hero and routed-workspace surfaces now derive their page, card, border, and accent colours from the shared semantic theme tokens. This keeps the cosmic palette as the default while preventing the shared shell from forcing midnight colours onto the alternate light, stone, ocean, and dusk themes. The winged portal artwork uses only subtle, slow vertical drift and a soft star pulse; both animations are disabled when reduced motion is requested. The contract script checks these token and motion guardrails alongside the existing destination and responsive-layout assertions.
