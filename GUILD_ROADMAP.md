# The Guild Roadmap

> Scope: The Guild console experience only. The companion platform has its own roadmap; The 5 Sleeves game repositories retain their own game-development roadmaps. This document tracks the Guild shell and integrations that surround those games.

## Product direction

Make The Guild feel like a console, not a conventional website with game links. Blend Steam Big Picture's flexibility, Xbox's continuity, PlayStation's presentation and Nintendo's simplicity while keeping Guild's own identity. The platforms share approved infrastructure and design foundations, while Guild keeps its own full-screen shell, navigation, settings, content and roadmap.

## Priority order

### P0 — HUD and visual quality first
- [ ] **Persistent quick-access HUD:** the shared notifications panel and a page-preserving Quick Menu are available from the Guild shell. The Quick Menu searches destinations, reports controller detection, toggles fullscreen and a locally persisted reduced-motion preference, and offers Home / Exit to Sanctuary. Finish real-device focus/return checks and add controller/audio diagnostics.
- [ ] **Input consistency:** make Menu/Guide, A/Select, B/Back, Escape, touch D-pad and keyboard alternatives consistent. Restore focus on close, support visible focus rings and reduced motion, and handle controller disconnect/reconnect.
- [x] **Home dashboard foundation:** the Guild home now has a dominant featured destination, a Continue Playing surface based on local launch history, and quick-access cards for Games, Trials, Collection, Music, Photos and Tools. Original custom game art and deeper dashboard data remain future polish.
- [ ] **Original game artwork:** create distinct, canon-consistent artwork for The 5 Sleeves 2D and The 5 Sleeves 3D; remove generic placeholder tiles as art assets become available.
- [ ] **Responsive console layout:** check TV/wide desktop, laptop, tablet and Android portrait/landscape. Keep touch targets comfortable, avoid clipped overlays and preserve safe-area spacing.
- [ ] **Accessibility and polish:** contrast, readable text, loading/error/empty states, focus management, reduced-motion behaviour and keyboard-only checks.

### P1 — Core console behaviour
- [x] **Local recent games / Continue Playing foundation:** launch history and favourites persist in this browser, with search, ready-to-play/favourites filters, empty states and a direct launch of the most recently played configured game from the home dashboard. Account sync and exact gameplay session restore remain unimplemented.
- [ ] **Unified search:** game-library search is implemented locally; next add Guild-page search, a controller-friendly on-screen keyboard and platform filters.
- [ ] **Game detail views:** controls, supported input, launch method, compatibility notes, verified progress and a clear return-to-library route.
- [ ] **Console settings:** controller diagnostics, touch-control visibility, UI scale, reduced motion, fullscreen guidance, audio preferences and privacy controls.
- [ ] **Reliable launch and return:** verify The 5 Sleeves 2D and The 5 Sleeves 3D on Android and desktop, including iframe restrictions, multiplayer, sign-in, audio, fullscreen and navigation back to Guild.
- [ ] **Error recovery:** understandable states for unavailable game hosts, failed embed, disconnected controller and failed account sync.

### P2 — Library and social systems
- [ ] Account-backed library sync after schema/RLS review and multi-account isolation tests.
- [ ] Favourites, collections, last-played metadata and safe backup/restore.
- [ ] Optional gaming identity, friends, invitations and parties, separate from the companion platform's personal-progress features.
- [ ] Achievements and progress only from trusted game/server/provider sources.
- [ ] Privacy controls for presence, activity sharing and notifications.

### P3 — Explicitly gated integrations
- [ ] Spotify integration, subject to provider APIs, account consent and policy requirements.
- [ ] Steam, Xbox, GOG and retro-platform integration only where authorised APIs permit it.
- [ ] Optional desktop companion for installed-game discovery/launch, with narrow permissions and explicit installation/consent.
- [ ] Cloud Lab only after isolated compute, encrypted storage, egress controls, quotas, monitoring, lifecycle handling and an approved spending limit.
- [ ] Guild Token Shop/wallet bridge stays disabled until server-authoritative balance, ownership, purchase and abuse protections pass review.

## Acceptance checks for P0
- The quick-access panel opens and closes by touch, keyboard and supported gamepad controls.
- Opening/closing the panel does not unmount or reload a game.
- The close/back action restores focus to the control that opened the panel.
- Home and Library remain reachable from every Guild page; Exit to Sanctuary is explicit.
- The home screen has one dominant featured destination and a clearly separated Continue Playing row.
- No fake achievements, invented play history, misleading online status or unverified game URL is displayed.
- Layout and controls pass a real-device browser pass in Android portrait/landscape and desktop; automated build checks alone do not count as device QA.
- Respect reduced-motion settings and visible keyboard/controller focus.
- No merge or production release is considered complete until CI, branch integration and deployment are separately verified.

## Current implementation context (2026-10-29)
- Draft PR #231 contains the Guild console player/system menu foundation.
- Draft PR #233 stacks on #231 and adds the full Guild-owned navigation shell and separate Guild destinations.
- Draft PR #234 adds the visual polish pass and roadmap contract fix.
- The current HUD/library batch adds browser-local recent launches, favourites, search, launch-readiness filters, empty states, a searchable cross-destination Quick Menu, fullscreen toggle, local reduced-motion preference and source-level contract assertions. Preferences are not account-synced.
- The Guild shell and player have controller/touch support in source, but manual device QA is still required.
- The 5 Sleeves 2D URL must remain configurable until a host is verified; do not guess it.
- The 5 Sleeves 3D URL currently configured in source is https://the-5-sleeves-3d.pages.dev/.
- Local music/photos are browser-session media and are not uploaded by default.
- Native installed-game scanning, Spotify, account-linked achievements and Cloud Lab compute are not claimed as implemented.
- Vercel preview deployment was previously blocked by the free-plan daily deployment API limit. Verify current deployment status before claiming the changes are live.


## Hidden console entry policy — 2026-10-29

- The Guild console is a separate environment with its own internal route/state. Guild game and roadmap destinations must not appear in the companion platform's ordinary navigation selector or navigation groups.
- Access is intended through the dedicated/hidden Guild entry point, not a visible page-selector item. Do not remove the Guild route or Guild's own internal navigation when hiding these selector entries.
- Messaging audit: the active inbox/thread still uses the in-memory `service.ts`; the Supabase adapter is optional and gated, and audio/video calling is not present in the current module tree. Treat durable messaging and calls as unfinished, not live features.


## Top menu and quick-settings recovery — 2026-10-29

- **Reported regression:** the Guild menu and quick settings were not appearing after the navigation was moved to the top of the console.
- Restore explicit **Menu** and **Quick settings** controls in the active Guild world top bar, with page-preserving overlay panels for Home, trial restart/pause, Exit to Sanctuary, touch controls, reduced motion, fullscreen and Big Picture layout.
- Raise the Guild navigation drawer and Quick Menu/scrim layers above parent-app shell layers at desktop and mobile widths; add regression assertions for the controls, overlay panels and stacking order.
- **Status:** implementation is on `fix/guild-top-menu-quick-settings-2026-10-29`; exact-head CI, responsive interaction tests and merge are still required. No production deployment is claimed.


## Console HUD polish batch — 2026-10-29

- Refined the Guild modal shell and HUD hierarchy, strengthened focus-visible treatment for Big Picture and game actions, and tuned wide-screen and featured-trial surfaces.
- Added dedicated breakpoints for narrow phones and short landscape screens, safe-area-aware header spacing, and reduced-motion overrides for animated fragments and hover transitions.
- Kept local-only progress disclosures, controller status, touch controls, and Big Picture actions intact. This pass does not invent achievements, cloud saves, audio output, or platform account integration.
- Added `check:guild-console-hud` to CI to guard dialog semantics, controller status, touch controls, responsive breakpoints, focus states, and roadmap status.
- **Not a device-QA pass:** desktop/TV, Android portrait/landscape, real controller navigation, screen-reader behavior, and focus restoration still require hands-on verification.


## Guild overlays and Settings launch — 2026-10-29

- Raised the portaled Guild navigation drawer, scrim, Quick Menu panel and quick-menu scrim above parent-app shell layers at all widths. Both panels remain rendered through `createPortal(..., document.body)` to avoid transformed/stacking-context parents.
- Guild navigation must use Guild-specific visibility rules and must not inherit global page-visibility preferences from the companion environment.
- Fixed the access policy so an authenticated basic user can launch The Guild from Settings. Developer/Owner restrictions continue to apply to Guild Roadmap and the separate page-visibility administration controls.
- Validation contract now checks portal rendering and top-priority stacking order. Still requires preview interaction checks on Android portrait/landscape and desktop, including click/touch and Escape-close behaviour.

## P1 — Independent Guild community

- [x] Reuse the shared feed, Shorts, events, messaging, notifications, profile-posts and moderation mechanics inside the Guild shell, with Guild console styling and Guild-native labels.
- [x] Keep content separate using the shared database's `world_type`: Each environment's content remains isolated by the database `world_type` value. Do not copy or duplicate the social tables. Do not copy or duplicate the social tables.
- [x] Scope feed reads/writes, Shorts, events/RSVPs, conversation lists and threads, notifications, report queues and profile-post retrieval to the active world.
- [x] Keep comments and reactions attached to their target content so engagement follows the target's world. Notifications and reports inherit world identity from their target.
- [x] Preserve existing non-Guild data by default; the scoped database migration is applied and schema/functions/triggers are verified.
- [ ] Run end-to-end tests with a test post in each world to confirm feeds, comments, reactions, notifications and reports stay separate before announcing beta readiness.


## Guild independence and shared design foundation — 2026-10-30

### User-facing separation
- Guild is a separate environment, not a subsection of the companion environment. Use the native labels **Home, Community, Discover, Messages, Events, Shorts, Planner, Profile, Notifications, Settings, Feedback, Admin, Moderation and Roadmap** without adding "Guild" to every page name.
- Do not show companion-platform branding, roadmap links, settings controls, or page-visibility settings inside Guild. The explicit **Exit to Sanctuary** control is the only cross-environment navigation reference.
- Guild has its own home dashboard and its own settings page. Shared account preferences may be reused, but console controls (touch navigation and reduced motion) belong to Guild.
- Admin and moderation inside Guild must operate on Guild-world content only. Do not expose account-wide role management or global page visibility from Guild administration. Account-wide warnings, suspensions and bans remain disabled from Guild until a dedicated Guild-only sanction model exists; Guild moderation can hide or remove Guild content.
- Feedback is available to all roles and guests in each environment. New submissions carry an environment marker and staff inboxes are filtered to the active environment.

### Shared UI system
- New visual components should use the shared design tokens, spacing, responsive breakpoints, focus states and accessible interaction patterns so both environments improve together.
- Reuse feature mechanics where appropriate, but let each environment keep its own home, navigation, labels, settings and world-scoped data. Treat each implementation as a maintained sibling, not a copy that must look identical.
- Keep progress dashboards visually consistent and show phase percentages, an overall estimate, next work and a disclaimer that estimates are not live telemetry.

### Progress snapshot (planning estimates)
| Guild workstream | Progress | Summary |
| --- | ---: | --- |
| Phase 1 · Independent visual foundation | **80%** | Guild-native navigation/home and compact console shell are in source; device/accessibility checks remain. |
| Phase 2 · Console and community features | **45%** | Shared mechanics are world-scoped; Guild settings, feedback, console library and navigation continue to evolve. |
| Phase 3 · Reliability and beta | **30%** | World isolation, role enforcement, feedback routing, device/controller QA and live deployment checks remain. |
| **Overall Guild project** | **50%** | Directional planning estimate; not production verification. |

