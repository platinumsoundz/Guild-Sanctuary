# The 5 Sleeves 3D inside Guild — Integration Roadmap

**Status:** Planned and partially implemented. This document is the source of truth for the Guild/game integration work.
**Scope:** `platinumsoundz/Guild-Sanctuary` integrates with `platinumsoundz/The-5-Sleeves-3D`; the game remains a separate project and independently hosted browser game.

## Product decision

Guild is the console-style launcher, account identity, wallet, entitlement ledger and storefront. The 3D repository remains responsible for its game engine, controls, world, local gameplay rules and presentation. Integrate through a narrow, versioned bridge rather than merging the codebases or duplicating the game engine.

The game should launch inside the Guild browser player, fill the display in fullscreen, work in landscape on mobile, retain a clear Guild system menu, and keep native game input functional. An external launch remains available as a compatibility fallback if browser security headers or a device prevent embedding.

## Existing implementation audit

### Guild
- `src/components/GamesHub.tsx` lists The 5 Sleeves 3D at `https://the-5-sleeves-3d.pages.dev/`.
- Selecting it opens `GuildConsolePlayer`, which renders a sandboxed iframe with fullscreen, gamepad and pointer-lock permissions.
- `GuildConsolePlayer` has a Guild overlay menu, fullscreen request, keyboard navigation, virtual menu D-pad/A/B controls and gamepad polling for the Guild menu. The primary close/exit action now returns directly to the Guild home dashboard from either the Arcade or Library entry; a separate Back to library action remains available below the player.
- Guild menu/gamepad input is distinct from the game's own controls. The overlay cannot inject gameplay input into a cross-origin iframe; the game must retain its own native touch, keyboard/mouse and gamepad input.
- The player volume setting only affects Guild-managed media; it cannot control cross-origin iframe audio.
- Recent games and favourites are currently stored locally in the browser.
- Guild wallet and Stripe foundations exist. Token bundle checkout is server-created and webhook-fulfilled, but checkout is disabled by default and is not a live purchase feature.
- The Token Shop has a hard `SPENDING_ENABLED = false` guard. Its documentation says token redemption is locked pending owner review and isolated staging verification. Relevant economy migrations are not all applied.

### The 5 Sleeves 3D
- Separate static/PWA-style browser game, hosted at the Cloudflare Pages URL above.
- Three.js is loaded as a browser module; the project has a service worker and manifest.
- `package.json` currently exposes Node's built-in test runner (`node --test`), not a framework build pipeline.
- Game README documents WASD/arrows, mouse, Space, Shift, Ctrl, Q, F, Enter; standard gamepad left/right sticks, D-pad, LT/RT, A/B/X, L3/R3; and mobile virtual stick/action buttons.
- Current save/progression is browser-local: levels, XP, in-game cash, inventory, equipment, passive skills and quests. It is not yet a Guild account save.
- In-game cash and Guild Tokens are separate currencies and must remain separate.

## Core design and security decisions

1. **No codebase merge.** Keep the game independently deployable and playable.
2. **No permanent Supabase token in a URL, iframe query, localStorage bridge, or postMessage payload.**
3. **Account bridge:** a future authenticated Guild server endpoint issues a short-lived, audience-bound, single-use launch ticket. The game exchanges it server-side for a narrow game session. Validate origin, audience, expiry, nonce/replay, user identity and allowed scopes.
4. **Cross-origin messaging:** use an explicit origin allowlist, strict message schemas, request IDs, versioning and source-window checks. Never trust a message as proof of payment or ownership.
5. **Authoritative purchases:** game clients request an item purchase; Guild server validates catalogue item, account, price and wallet; a single atomic database operation deducts tokens and creates the permanent entitlement/ledger record. The game receives only a verified result.
6. **Idempotency:** purchase request IDs and unique entitlement/ledger constraints prevent duplicate charges or duplicate grants on retries.
7. **No browser-side wallet edits.** No game JS can directly deduct tokens, mint currency, grant DLC or change account entitlements.
8. **Guest access:** guest can play only content explicitly marked free/demo; no wallet access, purchases or account cloud saves.
9. **Economy separation:** Guild Tokens purchase approved DLC/cosmetics; game cash is earned/spent only inside gameplay. Do not sell ordinary game cash, XP, combat power or story-critical abilities.
10. **No paid infrastructure or new Supabase project/branch.** Reuse existing infrastructure only after its current permissions, functions and environment support are verified. No migrations or remote writes without explicit owner approval.

## Store model

The proposed store is account-bound and permanent:
- Character and outfit cosmetics.
- Weapon appearance packs.
- Cosmetic bundles.
- Optional exploration/region expansions.
- Optional story chapters/mission packs, clearly labelled and priced before purchase.

Core story completion, essential abilities, progression balance and fair play remain available without payment. No pay-to-win stats, gambling/loot boxes, cash-out, trading or user-to-user transfers. All catalogue items need stable IDs, clear descriptions, prices, compatibility/version metadata, ownership rules, refund policy and content delivery checks before sale.

Illustrative pricing in mockups is not a final price list. Do not publish prices or enable purchases until the owner approves the catalogue and the purchase infrastructure passes staging.

## Delivery phases

### Phase 1 — Embedded console player
- Fullscreen should use the full viewport, hiding Guild chrome while retaining a small Guild quick-menu affordance.
- Landscape-first layout and best-effort orientation lock after a direct user gesture; portrait remains usable.
- Keep game iframe permissions minimal but sufficient for fullscreen, pointer lock, autoplay where appropriate and gamepad.
- Confirm touch, keyboard, mouse and physical controller gameplay controls remain native to the game.
- Reliable exit to the Guild home dashboard from every Guild game entry, a separate return-to-library action, browser Escape/fullscreen-change orientation cleanup, pause/resume behaviour, safe area handling and external-launch fallback.
- Audio controls must be presented honestly: Guild cannot directly control cross-origin game audio without a deliberate bridge.
- Test Android Chrome, installed PWA/WebView if used, desktop browsers and a physical controller.

### Phase 2 — Account identity and cloud saves
- Define versioned game profile/save schema and migration from current local save without overwriting it.
- Add short-lived launch ticket and authenticated ticket exchange.
- Add server-side save read/write endpoints with owner checks, schema validation, size limits, rate limits and revision/conflict handling.
- Preserve offline/local play and sync safely after reconnect.
- Account switching must never leak one player's save to another.

### Phase 3 — Storefront and catalogue
- Build a game-specific store UI in Guild and in-game entry point.
- Read enabled catalogue items and owned entitlements from the server.
- Show owned, unavailable, upcoming and compatible-version states.
- Implement permanent cosmetic and DLC entitlements; do not grant content based on client-side flags.
- Content packs need delivery/version compatibility and rollback behaviour.

### Phase 4 — Token purchases
- Reuse the Guild wallet only after reviewing current RPC, RLS, ledger and migrations.
- Add atomic, idempotent purchase-and-entitlement operation with server-verified catalogue pricing.
- Add purchase history, failure states, retry safety, refund/chargeback reversal policy and admin audit trail.
- Keep real-money top-ups disabled until Stripe test flow, webhook replay, refunds, host-origin protections and legal/store policies are verified.
- No live token spending or payment activation as part of the current development batch.

### Phase 5 — Closed beta and release
- Automated contracts for launch ticket, origin/message validation, save isolation, catalogue visibility, entitlement checks, spend idempotency and refund handling.
- Manual Android landscape/portrait, fullscreen, touch, controller, keyboard/mouse, account switching, offline/reconnect and accessibility passes.
- Release to close friends with purchases disabled first; enable token purchases only after separate owner approval and verified staging evidence.

## Current implementation checkpoint

- [x] Existing Guild game entry and iframe player audited.
- [x] Existing 3D controls, PWA structure and local-save model audited from the game README and source tree.
- [x] Product, security and economy boundaries recorded.
- [x] Full-viewport fullscreen chrome removal and best-effort landscape lock.
- [x] Exit-to-Guild-home action wired from both Arcade and Library launch paths; Back to library remains a separate action.
- [ ] Physical Android and controller QA.
- [ ] Secure account launch ticket and cloud save bridge.
- [ ] Game store catalogue and entitlement UI.
- [ ] Atomic token spend/DLC grant and purchase tests.
- [ ] Live checkout (explicitly disabled; separate approval required).

**Guardrails:** no merge, production deployment, Supabase migration/branch, paid plan change, live checkout or token-spending activation is implied by this roadmap. A green build is not device QA or purchase certification.


## Phase 1.1 — Embedded game lifecycle bridge (30 October 2026)

A small, versioned `guild.5-sleeves` postMessage contract is being added in the separate The 5 Sleeves 3D repository (draft PR #11) and connected by the Guild console player in this branch.

- The game announces `ready` to the exact embedding origin derived from `document.referrer`; standalone play without an embedding parent remains unchanged.
- The Guild accepts messages only when both `event.origin` matches the configured game URL origin and `event.source` is the active iframe window.
- The Guild sends only versioned `pause` and `resume` lifecycle commands to the exact game origin; no wildcard target origin is used.
- The game accepts commands only from its actual parent window and the exact parent origin, then acknowledges the command.
- Pausing releases held keyboard, gamepad, touch-stick and pointer input, preventing movement/actions from sticking behind the Guild overlay.
- The Guild sends request IDs and reflects game acknowledgements for the pause/resume state; the game preserves its pre-existing pause state so opening the Guild menu does not accidentally resume a title, story or in-game menu.
- The bridge does not expose account identity, save data, Supabase credentials, Guild Token balance, purchases or DLC entitlements.

**Preview routing:** Vercel preview builds use the dedicated game branch preview by default; production builds continue to use the canonical Pages URL. An explicit HTTPS-only `NEXT_PUBLIC_5_SLEEVES_3D_URL` can override either host.

**Dependency:** deploy the game-side bridge branch before expecting the Guild's `Guild link ready` indicator and pause/resume acknowledgements to activate in a hosted preview. Until then, the existing iframe player and Guild overlay continue to work independently. This is not account linking or cloud-save integration.


**Staging host:** `NEXT_PUBLIC_5_SLEEVES_3D_URL` may override the canonical Pages URL for preview testing. The override is accepted only as an HTTPS URL without embedded credentials; otherwise the canonical game URL is used. This allows the Guild preview to target a game-branch preview without changing production defaults.


## Phase 1.2 — Input safety and preview handoff (30 October 2026)

- [x] Added a dedicated input-release operation that clears held keys, gamepad buttons, analog movement, touch-stick state and pointer actions when the Guild opens its overlay.
- [x] Kept the existing game restart input reset semantics separate from the new release-all behaviour.
- [x] Added acknowledgement correlation to the Guild player so pause/resume status is reflected only for the latest request.
- [x] Added bridge tests for unsupported commands, protocol-version rejection and repeated pause/resume calls.
- [x] Routed Vercel preview builds to the matching Cloudflare Pages game branch preview while retaining the canonical game host for production.
- [ ] Verify the live embedded bridge on an actual Android device, including held movement/action input while opening the Guild menu.
- [ ] Confirm Vercel preview and production environment resolution after build.
