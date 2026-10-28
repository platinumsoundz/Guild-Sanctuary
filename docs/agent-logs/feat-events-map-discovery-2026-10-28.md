# feat/events-map-discovery-2026-10-28

## Agent run — 2026-10-28 UTC
- Project / workstream: The Sanctuary — events geographic discovery
- Status: In code; awaiting source checks and final release batch
- Reservation: https://github.com/platinumsoundz/Guild-Sanctuary/issues/180
- Branch: feat/events-map-discovery-2026-10-28
- Canonical base: main @ eba8beafc67932f10287aa7147cee3073ea1e1ed
- Commits:
  - 1b596538809bf1666b8e349b887a6a25142aad2d — reserve work log
  - 305d4359054820a78eb86b45e0740cbc042c41d8 — add map pin discovery and location preview
  - 07e3764a1fc0769b384392206e75d3d3cf842503 — responsive map explorer styling
  - 38e18d357d4bce3244dd65a316534c2fde23d42f — map/accessibility regression contract
  - 29e3bfa1eb39f31153fe50758d3fed2ab908736e — show organizer usernames
  - af6e6133171231d6daec83c818898ca64fb41acc — organizer identity styling
  - 172fa1934b86b04cb88c5c8f60c1835c0e0b4390 — persist edited event coordinates
  - 78ce92eb513220846ee40a46bbf38b7c229a90b5 — update event state type for coordinate edits
  - 62e677e430c28004e64e6f2bf7b40cf8e1aa9dd7 — submit edited map pin
  - 6ff35fc4fb9ff48f028364dedd5f81ce9802043a — coordinate-edit regression assertions
- Files changed:
  - src/modules/events/components/MeetupCalendarPlaceholder.tsx
  - src/modules/events/components/MeetupCalendarPlaceholder.module.css
  - scripts/check-event-time-contract.mjs
  - src/modules/events/service.ts
  - src/modules/events/useEvents.ts
  - docs/agent-logs/feat-events-map-discovery-2026-10-28.md
- Changes: added a keyless OpenStreetMap embed centered on the selected event, accessible event-pin selector, show-on-map actions, open-full-map links, map attribution, location-pin preview for event creation, invalid-coordinate guard, mobile layout, keyboard focus and reduced-motion styles. Event cards now show organiser display name and @username where the public profile is available. Editing an event now validates and persists changed latitude/longitude, with regression assertions.
- Security/privacy: existing event fetch, RSVP and account-isolation service paths are unchanged. No schema, RLS, migrations, or provider settings changed. Venue names/address search are not stored yet; UI says so explicitly rather than inventing a place name.
- Checks: source contract assertions reviewed against current component/styles. Node contract, typecheck, and build have NOT been executed in this environment because this session cannot clone the repository (GitHub host DNS unavailable); do not mark CI/typecheck/build as passed. No GitHub Actions, Vercel, Cloudflare, or deployment build was intentionally triggered.
- Deployment: deferred per owner instruction; not deployed or browser-verified.
- Rollback: close the eventual PR or revert the isolated UI commits; no data migration is planned.
- Next: resolve profile UI/security overlap with open draft PR #85 and audit server-side profile visibility before implementing independent search/messages/feed privacy controls.


## Invalid-coordinate resilience follow-up — 2026-10-28 UTC
- Hardened selected-event map rendering so invalid or missing coordinates never become an undefined iframe URL or an unusable external link.
- Added an accessible fallback message and changed event cards to disclose unavailable locations instead of presenting invalid values as usable pins.
- Extended the event contract assertions for validated map URLs and fallback UI.
- Source checks, typecheck, production build, browser/device QA, and deployment remain unrun; automatic preview/deployment is not being treated as verification.


## Nearby-area discovery follow-up — 2026-10-28 UTC
- Added a “Happening within 10 km” panel around the selected event, ranked by Haversine distance with readable metres/kilometres.
- Nearby event cards are keyboard accessible and select/focus that event on the map; invalid/missing coordinates are excluded from proximity results.
- Added responsive styling and contract assertions for distance ranking and the empty state.
- Source contract execution, typecheck/build, and browser/device QA remain outstanding; this is source progress only, not a verified release.


## Release-readiness upgrades — 2026-10-28 UTC
- Added a user-selectable nearby search radius (5, 10, 25, or 50 km), with results re-ranked by distance and a radius-aware empty state. The currently selected event is excluded from its own nearby results.
- Improved map bounding-box generation by clamping latitude/longitude bounds at the poles and date line so valid edge coordinates do not create out-of-range map extents.
- Fixed the event-edit flow end-to-end so edited latitude/longitude values are submitted, validated, and persisted through the existing event service and hook. This necessarily touches `src/modules/events/service.ts` and `src/modules/events/useEvents.ts`; account isolation and database schema remain unchanged.
- Expanded the existing event contract script to cover adjustable radius behavior, selected-event exclusion, coordinate edit persistence, and map bounds at geographic edges.
- Responsive CSS allows the radius controls to wrap on narrow screens.
- Verification blocker: the runtime cannot resolve `github.com` for a local clone. No local contract execution, typecheck, build, browser/device review, or GitHub Actions run has been completed on the current head. Vercel previously reported a build-rate-limit failure. The next verification step is a draft PR CI/preview during this owner-requested release pass; production deployment remains separately gated.
- Remaining known product limitation: event records store coordinates but no venue name/address, so the UI cannot reliably show human-readable place names without a separately reviewed schema/migration and location-source decision.


## Final source review follow-up — 2026-10-28 UTC
- Added an opt-in “Include past events” filter so the page's “Upcoming events” view no longer mixes expired gatherings into the default discovery results. Map pins, nearby-event discovery, selected event, count, and cards now use the same filtered set; the empty state explains how to reveal past events.
- Added keyboard-focus styling and regression assertions for the filter.
- Previously verified at head 7d2d995da71a3237ca2e5a9a983c07624ebe2057: GitHub CI passed install, security/contracts, event contract, typecheck and production build; Cloudflare worker build passed while deployment was correctly skipped for this PR; automated roadmap check passed. This new filter change requires those checks to rerun on the new head before release.
- Vercel preview remains blocked by its reported build-rate limit, so browser/device and screen-reader QA still require a usable preview. Keep this PR draft; no production deployment, schema/RLS/provider changes, or production writes.


- CI follow-up: the new past-event regression assertion initially referenced the CSS variable as `css` instead of the script's existing `styles` variable. GitHub CI caught the test-script typo; corrected in the follow-up commit. Rerun CI on that commit before release.
