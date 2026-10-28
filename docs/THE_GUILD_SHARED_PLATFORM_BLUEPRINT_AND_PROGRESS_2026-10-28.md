# The Guild — Shared-Platform Blueprint and Release Progress

**Date:** 2026-10-28  
**Status:** Approved concept and roadmap; implementation has not started.  
**Branch:** `feat/hidden-guild-world-blueprint-2026-10-28`

This document records the product owner's approved Guild concept and a planning-level release-readiness estimate. Percentages and timelines are engineering estimates based on the repository's documented state, not automated measurements or a promise of a release date. Recalculate them after a code/schema audit and staged end-to-end testing.

## 1. Product definition

The Guild is a hidden, controller-first gaming world within The Sanctuary. It is **not a second application or a second codebase**. It inherits the Sanctuary's existing shared capabilities and adds only the gaming-specific extensions required for the Guild experience.

### Locked decisions

- **Entry:** a working controller reveals the Guild; provide an accessibility override for people or environments where controller detection is unsuitable.
- **Disconnect:** use a reconnect grace period, initially proposed at 15 seconds, with state/draft preservation. Tune after testing.
- **Scope:** full parallel gaming world, delivered in phases.
- **Progression:** mixed rewards from personal quests, verified platform achievements and moderated community activities.
- **Identity:** reuse the authenticated Sanctuary identity and account. Provide optional gaming preferences/profile fields without creating a second account or automatically exposing linked platform data.
- **Cross-world sharing:** explicit user action only. Sharing publishes a distinct item to a chosen audience; it does not grant broad read access to the source record.
- **Gaming platform ambition:** Windows PC and Android, plus browser-playable games. The first playable deliverable is a controller-friendly browser Arcade; Steam account/data integration and external launchers come later as separate capabilities.
- **First platform data integration:** Steam, starting with a feasibility check and a narrow, documented subset of supported data.
- **External gaming environments:** Winlator, DroidDeck, GameHub or streaming clients are future feasibility targets, not assumed capabilities. Verify exact app identity, supported launch mechanisms and platform restrictions before promising integration.
- **Controller input:** consistent mapped defaults through a shared input abstraction. Remapping can follow later.
- **Orientation:** landscape-first where suitable, with a deliberately designed portrait experience. Do not rely on forced rotation.
- **Visibility:** completely hidden from ordinary navigation and public entry points for now. Controller detection/accessibility override reveals the entry path. A future URL is possible, but not part of the initial scope.
- **Security:** hidden navigation is not an access-control boundary. Backend authorisation and Supabase Row Level Security (RLS) must protect Guild data.

## 2. Non-negotiable architecture

### Build shared capabilities once

The Guild must inherit Sanctuary capabilities rather than fork them. Every future Sanctuary feature should be assessed for Guild compatibility and inherit automatically when it is a shared capability.

Shared foundations include:
- Authentication, account identity and shared profile foundations.
- Theme registry, design tokens, components and appearance preferences.
- Common settings, accessibility, responsive UI primitives and notifications.
- Feed, messaging, search and moderation infrastructure.
- Admin dashboard, permission model, audit trails and shared utilities.
- Common planner/task foundations and service/API patterns.

Guild-specific configuration can change presentation and scope: the Guild Hall landing page, controller-first navigation, Guild feed query, gaming planner presentation and gaming-specific routes. Guild-only extensions include Steam integration, achievement evidence, XP/rank ledger, game communities and gaming challenges.

Prefer composition/configuration and shared module entry points over duplicated components or copied services.

### Shared services, separate data

Use the existing Supabase project/authentication unless the audit establishes a compelling reason otherwise. Do not assume every existing table needs a `world_id`; inspect the actual schema first and select ownership relationships appropriate to each entity.

Guild community posts, conversations, gaming planner records, progression, provider links and imported activity must remain protected by appropriate ownership, membership, participant and moderation rules. Sanctuary and Guild feeds/messages must not leak into one another. Explicit cross-world sharing creates a separately governed publication with clear audience, edit and revoke/delete behaviour.

RLS and server-side permissions enforce the boundary. Client-supplied world identifiers, achievement claims and XP amounts are not authoritative. Reward awards must be server-validated, auditable and idempotent.

### Controller service

A shared input abstraction translates supported gamepads into logical actions (navigate, select, back, menu and contextual tab changes). Shared components should expose consistent focus/action behaviour; Guild activates the controller-first profile. Keyboard, touch and assistive technology continue to work. Handle delayed Gamepad API visibility, varying mappings, sleeping/disconnected controllers, active text inputs and backgrounded tabs.

### Steam integration

First audit provider access and data coverage. Verify account linking and identity; then evaluate supported profile, owned-game and achievement data against API permissions, privacy settings, access requirements and rate limits. Store credentials safely on the server where required. Imported data needs source and timestamp metadata, safe retries, deduplication, unlinking and deletion behaviour. Do not promise detection/control of arbitrary installed or running games. Manual tracking remains usable when provider data is unavailable.

## 3. Guild delivery roadmap — browser games first

The target is an all-in-one gaming hub for Windows PC and Android, with browser-playable games as the first real gaming deliverable. Keep the launch mechanism abstract so native launchers and streaming can be added later without rebuilding the Guild. A website cannot generally inspect or control arbitrary installed games, so each external environment requires a verified, supported handoff mechanism.

### Phase 0 — Repository and gaming feasibility audit
Map existing routes, shared components, themes, authentication, admin/moderation, feeds, messages, planner, Supabase schema/RLS, migration drift and test coverage. Classify capabilities as shared, configurable or Guild-specific. Separately inventory browser-game options/licences and define the supported desktop/mobile browser and controller matrix. Identify unresolved Sanctuary beta blockers.

**Exit:** reviewed reuse map, data ownership proposal, risk register, game selection criteria and acceptance tests.

### Phase 1 — Hidden world shell and shared controller layer
Define world context/routing and hidden-entry rules; add controller detection, mapped logical actions, keyboard/touch coexistence, accessibility override, disconnect grace behaviour and adaptive layouts. Keep Guild out of ordinary public navigation.

**Exit:** reliable entry, focus movement, selection, back/menu actions and reconnect handling on the supported device/browser matrix without Sanctuary regressions.

### Phase 2 — Guild Arcade: playable browser games
Build the Arcade catalogue and a small curated set of controller-friendly games that run directly in supported browsers. Prefer original, open-source or explicitly licensed games. Define fullscreen where allowed, pause/exit, touch/keyboard fallback, saved game state where supported, and a game adapter contract. Distinguish local game progress from server-verified achievements; never trust client-submitted rewards without validation.

**Exit:** users can enter the hidden Guild with a controller, select and play at least one complete browser game on target desktop and Android browsers, and return to the Guild cleanly.

### Phase 3 — Secure Guild data and shared-service configuration
Establish Guild-owned community and gaming records, world-aware shared services, RLS, explicit cross-world publishing and audit rules. Include negative tests for cross-world reads, message participation, unauthorised membership, account deletion and forged rewards. Keep the Arcade usable if optional backend or integration services fail.

**Exit:** access-boundary tests pass and game progress/rewards have a defined trusted source.

### Phase 4 — Guild Hall, Codex and progression
Build the hub, game catalogue metadata, personal goals, manual session tracking, quests, achievements, XP/ranks and progress history by extending the Sanctuary's shared planner and UI foundations. Support mixed rewards while clearly distinguishing self-reported, server-verified browser-game and imported platform evidence.

**Exit:** a useful end-to-end gaming and progression loop works without Steam or an external launcher.

### Phase 5 — External launch feasibility and Steam data
First verify Steam's supported API/data scope and implement account linking/import as a separate adapter. In parallel, investigate exact Winlator, DroidDeck and GameHub products and supported Android handoff mechanisms. Test app links/intents only where documented and permitted. Treat launching a game, importing game data and streaming gameplay as distinct capabilities.

**Exit:** Steam data integration is reliable for the documented supported subset, and any external launch flow has been proven on actual compatible devices before being advertised.

### Phase 6 — Guild community and shared administration
Extend shared feeds, messaging, game communities, parties and group challenges. Reuse the existing admin/moderation dashboard with world filters and distinguish account-wide from world-specific enforcement. Implement explicit cross-world sharing as a deliberate publish action with audience preview and defined revocation behaviour.

**Exit:** reporting, blocking, moderation, publishing, sharing and deletion rules work end to end.

### Phase 7 — Hardening and future URL readiness
Run controller, accessibility, browser/device, performance, integration-failure and security tests. Confirm Guild failures cannot take down Sanctuary features. Document future domain/origin/cookie/auth requirements without launching a separate URL now.

**Exit:** evidence-backed release criteria pass; exact tested commit and environment are recorded.

## 4. Release-readiness snapshot — 2026-10-28

### Important interpretation

The repository already contains a meaningful amount of frontend and feature code, but documented services still include browser-local, in-memory or optional Supabase paths. Migrations in Git are not proof that they have been applied. CI/static contracts are not proof of browser, device, RLS or production verification. The percentages below deliberately distinguish implementation from release readiness.

| Workstream | Approx. implemented | Approx. verified for release | Confidence / main caveat |
|---|---:|---:|---|
| Frontend and user-facing features | 60–70% | 35–45% | Many screens, navigation, themes, planner and game prototypes exist; browser/device, accessibility and complete real-user journeys remain outstanding. |
| Backend, persistence and security | 25–40% | 10–20% | Supabase adapters, migrations and server foundations exist, but some active flows remain demo/in-memory/local; migration application, RLS, account lifecycle and staging tests are unresolved. |
| Guild | 0% code | 0% verified | Product concept and architecture are agreed and recorded; no Guild implementation is included in this planning branch. |
| **Sanctuary beta readiness overall** | **Approx. 45–55%** | **Approx. 30–40%** | Planning estimate weighted toward release blockers, not a count of screens or commits. |
| **Public release readiness overall** | **Approx. 30–40%** | **Approx. 20–30%** | Public release adds stronger privacy/security evidence, operational reliability, moderation, legal/content and device coverage. |

These are approximate judgement calls, not measured telemetry. They should be revised after a focused audit and after each release gate is backed by evidence.

### Beta: rough remaining timeframe

**Planning estimate: 4–8 weeks of focused work** to reach a small, controlled beta, assuming a developer can work consistently, the product owner can provide required access/decisions, and staging services are available. This is not a promise and may expand if auth/RLS, migrations or moderation uncover architectural blockers.

Likely sequence:
1. **Week 1:** reconcile open work and release scope; inspect mainline, migrations, auth and real persistence.
2. **Weeks 1–3:** close critical backend/persistence/RLS gaps and complete account, privacy, messaging and moderation journeys.
3. **Weeks 2–4:** responsive, keyboard/controller-independent frontend QA; accessibility and mobile/browser fixes.
4. **Weeks 3–6:** isolated staging migration, multi-account security tests, backup/restore and end-to-end journeys.
5. **Weeks 5–8:** controlled friend-group beta, bug fixes, release evidence and rollback/support readiness.

Work can overlap; these are calendar ranges rather than additive estimates. Owner-controlled credentials, provider limits, migration review and live-host settings can extend the schedule. Do not enable live payments as part of this estimate; the existing roadmap explicitly keeps checkout disabled pending owner-approved staging and policy/legal gates.

### Public release: rough remaining timeframe

**Planning estimate: 8–16 weeks total from the start of focused release hardening**, potentially longer if beta feedback causes substantial changes or unresolved provider/deployment issues remain. This includes the beta work above, then a feedback/stabilisation window and public-release gates.

Public release should not be declared until:
- Authenticated persistence and RLS are verified with multiple accounts.
- Migrations are applied in a controlled environment and restore/rollback procedures are tested.
- Signup, recovery, account deletion, privacy, messaging, feed, events and moderation journeys are tested.
- Browser/device, keyboard, screen-reader, responsive and PWA behaviour are checked on the supported matrix.
- Hosting/environment guards and exact deployed commit are verified.
- Terms, privacy notice, support/moderation operations and any commerce/advertising approvals are resolved for the features actually enabled.

### Guild timeline

The Guild should not be allowed to silently delay the existing Sanctuary beta. Build its reusable foundation alongside release-hardening only where changes are low-risk and independently testable; keep the hidden world disabled until its access and privacy gates pass.

Indicative estimate after a current-code audit:
- **Hidden shell and controller layer:** 1–3 weeks.
- **Curated browser Arcade prototype and first playable games:** 2–4 weeks, depending on game scope, licences and device testing.
- **Secure Guild data boundary:** 2–4 weeks.
- **Guild Hall/Codex and mixed progression:** 2–4 weeks.
- **Steam data feasibility/integration:** 2–5+ weeks, depending on provider access and data scope.
- **External Android launch adapters:** unknown until exact apps and supported launch mechanisms are verified; allow a separate feasibility spike.
- **Community/admin integration and hardening:** 2–4 weeks.

Several phases can overlap. A small internal alpha with the shell and a playable browser game may be possible in roughly **3–6 weeks** after work starts, subject to audit findings. A broader controlled Guild beta with multiple browser games, community, progression and one reliable Steam data flow is more plausibly **10–18+ weeks**. These are estimates, not commitments. These are rough estimates, not commitments. A public Guild launch should be separately approved and should not be inferred from the Sanctuary public release.

## 5. Priorities across frontend, backend and Guild

### Frontend — next priorities
1. Verify responsive behaviour and accessible journeys on real browsers/devices.
2. Finish key interaction states and identify screens that are only visual/demo implementations.
3. Keep themes/components shared and make world-specific differences configuration-driven.
4. Add controller-compatible focus/action contracts as a shared capability, not per-page one-offs.

### Backend — critical release gate
1. Audit active code paths vs optional adapters and local/in-memory stores.
2. Reconcile migration drift and inspect current Supabase project only with owner-approved access.
3. Verify auth/session lifecycle, RLS, storage policies, messaging persistence, privacy and deletion.
4. Test moderation hierarchy, account-wide vs world-specific enforcement, audit logs and abuse controls.
5. Record evidence for each environment; never label a migration applied or a feature production-ready based on repository presence alone.

### Guild — parallel planning and staged implementation
1. Keep this blueprint as the source of truth for the hidden-world concept.
2. Audit shared Sanctuary capabilities before introducing new abstractions.
3. Build controller/world configuration without duplicating existing feature modules.
4. Establish RLS/data boundaries before Guild feeds/messages.
5. Build the Codex/progression loop before depending on Steam.
6. Deliver browser-playable games first; treat external game launching and streaming as separate, evidence-gated capabilities.
7. Do not expose Guild navigation or launch a separate URL until explicitly approved.

## 6. Reporting rule

At each meaningful checkpoint, report separate percentages for:
- Frontend implementation and verification.
- Backend implementation and verification.
- Guild implementation and verification.
- Beta release readiness.
- Public release readiness.

Each percentage update should state what changed, which tests/evidence support it, what remains blocked and the revised calendar range. A passing build alone must not increase the verified percentage for browser/device, database or production behaviour.

**Current status:** the Guild concept and revised browser-games-first roadmap are recorded on this branch; no Guild feature code, migrations, secrets or deployment changes are included in this planning work.
