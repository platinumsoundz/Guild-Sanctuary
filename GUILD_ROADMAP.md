# The Guild Roadmap

> Scope: The Guild console experience only. Sanctuary has its own roadmap; The 5 Sleeves game repositories retain their own game-development roadmaps. This document tracks the Guild shell and integrations that surround those games.

## Product direction

Make The Guild feel like a console, not a conventional website with game links. Blend Steam Big Picture's flexibility, Xbox's continuity, PlayStation's presentation and Nintendo's simplicity while keeping Guild's own identity. Sanctuary and Guild continue to share identity and approved foundations, but Guild keeps its own full-screen shell, navigation and roadmap.

## Priority order

### P0 — HUD and visual quality first
- [ ] **Persistent quick-access HUD:** the shared notifications panel and a page-preserving Quick Menu are available from the Guild shell. The Quick Menu searches destinations, reports controller detection, toggles fullscreen and a locally persisted reduced-motion preference, and offers Guild Home / Exit to Sanctuary. Finish real-device focus/return checks and add controller/audio diagnostics.
- [ ] **Input consistency:** make Menu/Guide, A/Select, B/Back, Escape, touch D-pad and keyboard alternatives consistent. Restore focus on close, support visible focus rings and reduced motion, and handle controller disconnect/reconnect.
- [x] **Home dashboard foundation:** the Guild home now has a dominant featured destination, a Continue Playing surface based on local launch history, and quick-access cards for Games, Trials, Collection, Music, Photos, Tools and Sanctuary. Original custom game art and deeper dashboard data remain future polish.
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
- [ ] Optional gaming identity, friends, invitations and parties, distinct from Sanctuary spiritual progress.
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

- The Guild console remains part of the Sanctuary codebase and keeps its internal route/state, but `Guild Arcade` and `Guild Roadmap` must not appear in Sanctuary's ordinary navigation selector or navigation groups.
- Access is intended through the dedicated/hidden Guild entry point, not a visible page-selector item. Do not remove the Guild route or Guild's own internal navigation when hiding these selector entries.
- Messaging audit: the active inbox/thread still uses the in-memory `service.ts`; the Supabase adapter is optional and gated, and audio/video calling is not present in the current module tree. Treat durable messaging and calls as unfinished, not live features.


## Top menu and quick-settings recovery — 2026-10-29

- **Reported regression:** the Guild menu and quick settings were not appearing after the navigation was moved to the top of the console.
- Restore explicit **Menu** and **Quick settings** controls in the active Guild world top bar, with page-preserving overlay panels for Guild Home, trial restart/pause, Exit to Sanctuary, touch controls, reduced motion, fullscreen and Big Picture layout.
- Raise the Guild navigation drawer and Quick Menu/scrim layers above the Sanctuary shell at desktop and mobile widths; add regression assertions for the controls, overlay panels and stacking order.
- **Status:** implementation is on `fix/guild-top-menu-quick-settings-2026-10-29`; exact-head CI, responsive interaction tests and merge are still required. No production deployment is claimed.
