# Guild Console 2.0 — Mobile Landscape First

**Status:** Active implementation batch · 30 October 2026  
**Branch:** `feat/guild-mobile-console-overhaul-2026-10-30`

## Product decision
The primary Guild experience is a phone held horizontally. Design and acceptance decisions must start at common Android landscape dimensions, then adapt to portrait, tablet, desktop and wide-screen layouts. Landscape is not a squeezed desktop page: it is the default console posture.

## Workstreams
1. **Guild Home 2.0:** cinematic featured-game stage, local Continue Playing, horizontally scrollable collection rail, quick community destinations and compact HUD-friendly density.
2. **Guild Design System:** semantic theme tokens, consistent surfaces, focus states, motion, touch targets, spacing and reusable console visual language. Guild-specific styling must not unintentionally restyle Sanctuary.
3. **Game Library 2.0:** image-led horizontal collection, favourites and recent launch history, details and clear launch readiness. Never invent availability, achievements or session restore.
4. **Console HUD 2.0:** persistent Menu/Quick Menu, notifications, controller state, fullscreen, touch controls and page-preserving overlays. Preserve the currently open game/page when opening and closing overlays.
5. **Community 2.0:** native-feeling destination cards and Guild-scoped activity while preserving world_type data isolation and role gates.
6. **Settings 2.0:** Guild-owned theme, UI density/scale, touch-control visibility, reduced motion, controller diagnostics and display options. Do not expose companion/global administration.
7. **Mobile Console 2.0:** Android landscape first, safe areas, thumb reach, 44px minimum touch targets, horizontal rails, no accidental vertical overflow, then portrait fallback.

## Acceptance gates
- Android landscape at 360×800, 393×873 and 432×960 CSS-pixel-equivalent viewport classes (verify actual devices; these are test targets, not device claims).
- Main home hero, Continue Playing and game rail are immediately discoverable without a long vertical scroll.
- Game rails use touch-friendly horizontal scrolling and snap points.
- No clipped HUD, notification panel, menu, safe-area or keyboard overlays.
- All interactive controls have visible focus and accessible labels; reduced-motion is respected.
- Portrait remains usable, but landscape receives primary visual priority.
- Verify on actual Android Chrome and installed/PWA shell, desktop, and a physical controller.
- Run typecheck, production build and relevant navigation/theme/HUD contracts.
- No Supabase schema/migration work or new paid infrastructure in this batch.
- Do not claim production deployment or device QA until actually verified.

## Current batch note
The first code pass replaces the generic Guild home dashboard with a console-led, landscape-aware home and documents the full seven-workstream programme.

The next implementation batch now:
- Passes the active role and guest state into the Guild home and filters destinations through the existing page-access gates. Guest mode does not show Events or Shorts; basic users do not see VIP-gated destinations.
- Carries the shared console interaction language into the game library, including horizontal recent-play rails, consistent focus rings, thumb-friendly controls and landscape density.
- Refines Guild community feed presentation for landscape without changing feed services, world scoping or persistence.
- Refines account settings for landscape with a compact two-column cockpit, while retaining the existing settings service and account preference model.
- Keeps notifications in the existing compact overlay and leaves navigation/controller quick-menu behaviour intact.

## Verification state
- Code changes are committed to the feature branch and remain in draft PR #309 (17 commits ahead of main, zero behind at the latest comparison).
- Role-gate behaviour is implemented in the Guild home; the existing `canAccessSanctuaryPage` policy remains the source of truth.
- No Supabase migration/branch, schema write, new paid service, production deployment or physical Android QA has been performed.
- The first CI pass exposed two issues: a stale Guild-home roadmap-copy contract and invalid use of Sanctuary navigation types for Guild-only routes. Both were corrected in the latest commit.
- A fresh CI run and Cloudflare build/deploy workflow were queued for the corrected head. Do not merge until those finish successfully and the actual phone QA pass is complete.
- Vercel's separate build status still reports the plan build-rate limit. Do not bypass the limit or upgrade without approval.
