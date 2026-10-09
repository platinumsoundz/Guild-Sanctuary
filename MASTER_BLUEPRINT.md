# Guild & Sanctuary Master Blueprint

Last updated: 2026-10-09

This document is the shared architecture and progress reference for Guild & Sanctuary. Read it before making project changes. Keep the progress checklist and relevant module scope current whenever code changes so collaborators and AI tools can understand the system without reconstructing it from scratch.

The commercial architecture, provider defaults, migration sequence, and release gates in this document are the definitive target for future implementation. They describe planned architecture, not deployed production capability: Chapter 4 is the source of truth for what is implemented today, and every production gate remains open until it has been built, tested, reviewed, and operated successfully. Provider alternatives are decision points, not simultaneous integrations; record any approved deviation here before implementation.

## Chapter 1: Architecture & Rules

### Mother-child modularity

- `src/app/` owns the Next.js App Router entry points. Pages compose the app; feature logic belongs to modules.
- `src/components/` contains shared application-level UI such as the navigation and responsive preview shell.
- Every core feature is owned by its folder under `src/modules/`. Modules expose supported components through a local `index.ts` entry point and document their scope in a local `README.md`.
- The app shell may compose modules through their public entry points. A feature module must not import another feature's private implementation. Share cross-module data through types and app-level contracts instead.
- Keep module-specific state, rendering, and services with the module that owns them. Do not move feature behavior into the root page to avoid module boundaries.
- When module isolation is needed at runtime, add an appropriate route-level or React error boundary. Separate folders alone do not prevent a render error from propagating; dedicated module error boundaries are not implemented yet.

### Shared contracts

- `src/types/index.ts` contains shared primitives and existing app-facing contracts, including `WorldType` and `Coordinates`.
- `src/types/database.ts` defines the canonical entity interfaces: `User`, `Profile`, `LocationPreference`, `Post`, `Friendship`, `Event`, `Message`, `Conversation`, `ShortVideo`, and shared social-engagement/settings contracts.
- Import shared database entities from `@/types/database`; import shared primitives from `@/types`. Avoid duplicate or subtly divergent entity definitions.
- Use ISO-8601 strings for serialized timestamps and nullable fields for values that may be absent.

### State and hydration

- `src/context/AppContext.tsx` is the client-side owner of the active world, navigation state, and current mock session.
- Initialize client state to deterministic values that are identical during server rendering and hydration. Do not read `window`, `localStorage`, current time, or browser-only preferences during initial render.
- Load client-dependent or asynchronous mock data after mount and provide explicit loading and error states. Keep server-to-client props serializable.
- The app page composes the context provider and workspace. Keep the route server-renderable and isolate interactivity behind client components.
- Run `npm run build` after implementation changes; investigate hydration warnings in the development server and browser console rather than suppressing them.

### Naming and styling

- Use lowercase feature directory names, PascalCase React component names, camelCase functions and values, and PascalCase interfaces/types.
- Use `index.ts` as a feature's supported public entry point. Use Tailwind v4 responsive utilities for shared outer layout constraints and CSS Modules named after their component or feature for feature-specific presentation; global setup belongs in `src/app/globals.css`.
- Keep component and type names specific to their owning module. Prefer explicit prop interfaces and avoid importing sibling module internals.
- Preserve keyboard access, visible focus, responsive sizing, and reduced-motion preferences in interactive UI.
- Use Tailwind v4 utility classes for shared layout constraints and keep detailed visual styling in CSS Modules. Constrain app surfaces with `w-full min-w-0 max-w-full`; use `minmax(0, 1fr)`, wrapping, and mobile breakpoints for grids and navigation.
- At widths below the `md` breakpoint, keep primary navigation in an accessible, Framer Motion off-canvas drawer opened by a Lucide hamburger; desktop retains the horizontal tab bar. Keep the world selector visible in the header, and close the drawer after selection or Escape while respecting reduced motion.
- The application shell renders at the real viewport width; do not add a simulated device frame or mobile-preview toggle.
- Scale headings and body copy down responsively (mobile body text generally `text-sm`, supporting labels `text-xs`; desktop body text generally `text-base`) and use narrower mobile gutters without letting content touch the viewport edge. Wrap long user text/media and collapse profile/editor grids to one column where needed. Avoid fixed minimum widths on mobile controls.

### Living-document rule for AI and contributors

For every code change, update this blueprint in the same work item when implementation status, ownership, contracts, environment, or roadmap changes. Update a module README when that module's scope or public interface changes. Do not mark work complete until its validation has run, and record known stubs or limitations rather than presenting them as production behavior.

## Chapter 2: Tech Stack & Environment

- Framework: Next.js 16 App Router. The currently installed build reports Next.js 16.4.0.
- Language: TypeScript with `strict: true`; React and React DOM 19.
- Styling: Tailwind CSS v4 utilities for responsive layout, with global CSS and CSS Modules for design-specific styling. Motion: Framer Motion (`^14.0.0`). Icons: Lucide React (`^1.53.0`).
- Package manager: npm, with `package-lock.json` checked in.
- Development target: GitHub Codespaces. The current workspace runs on Ubuntu 24.04; Node.js 20.9 or newer is required by the Next.js setup.
- `src/app/page.tsx` is the application route. `next.config.ts` and `tsconfig.json` are at the repository root.

Common commands:

```bash
npm install
npm run dev
npm run build
npm run start
```

## Chapter 3: Feature Module Scope

### `src/modules/auth/`

Owns registration, sign-in, sign-out, email verification challenges, session lifecycle, and mock second-factor challenges. `AuthenticationForm`, `AuthenticationGateway`, and `AuthenticationModal` are exported through the module entry point. The demo uses browser `localStorage`, fixed `000000` codes, and no password or email delivery; it is not production authentication. Google, Facebook, Microsoft/Xbox, and PlayStation federated sign-in are architecture targets only and are not live in the demo. Production requires provider application registration, server-side authorization-code/PKCE or OIDC validation, state/nonce checks, verified-subject account linking, and secure session issuance. External email verification must not silently disable a user's required 2FA or step-up policy.

### `src/modules/profiles/`

Owns profile presentation, rich customization, per-field privacy controls, own-post/media showcase, and privacy-filtered public discovery. Profile fields include picture, banner, theme color, unlocked frame, bio, location, age, star sign, belief, and visibility flags. Search is username/display-name only and returns no email. The profile view composes the dashboard and economy wallet panel.

### `src/modules/settings/`

Owns the signed-in account settings hub, persisted account preferences, profile privacy controls, social-link integration, layout arrangement, and account deletion confirmation. `AccountSettings` stores preferences per user in browser-local storage; profile visibility/privacy and `SocialLinks` remain in the canonical `Profile`. Supported links include Facebook, X/Twitter, YouTube, Xbox, PlayStation, Steam, Epic Games, and Reddit. Gaming handles may be stored directly; provider profile URLs must use HTTPS and approved hosts. `comfortable` and `compact` layouts are available.

Account deletion in this prototype requires the active local session, matching account email, exact `DELETE` confirmation, and the mock 2FA code when 2FA is enabled; it then clears local settings and in-memory content owned by the account. It is not production-grade reauthentication, durable data erasure, or an authorization boundary.

### `src/modules/feeds/`

Owns Sanctuary and Guild Hall feed views, post CRUD, likes/comments, and the `useFeed` hook. Separate in-memory stores keyed by `WorldType` isolate posts per world. Posts support text, image, audio, or video attachment metadata, timestamps, and optional story tags. The composer reads local media files into demo-only in-memory data URLs. The demo UI supports create/edit/delete and displays author identity. Shared world selection and top-level navigation belong to `src/components/Navigation.tsx`.

### `src/modules/shorts/`

Owns the immersive short-form vertical video feed, video playback, scroll-snap navigation, and short-specific likes/comment threads. `ShortVideo` records author, world, video URL, caption, and timestamp. Separate world-keyed in-memory stores hold sample and locally uploaded/recorded clips; the Shorts composer previews selected file or MediaRecorder data URLs and publishes into the active world. Production upload/transcoding, storage, moderation, and delivery remain roadmap work.

### `src/modules/events/`

Owns event CRUD, world-scoped listings, event editing, and Going/Interested/Cancelled RSVP behavior. Separate in-memory event repositories are keyed by `WorldType`; likes, comments, and RSVPs reference event IDs. The current service does not enforce capacity or server authorization.

### `src/modules/locations/`

Owns location preferences and radius-based distance filtering. The radius filter placeholder accepts a shared `LocationPreference` and change callback. Geospatial filtering, location permissions, and privacy behavior are not implemented yet.

### `src/modules/economy/`

Owns demo credit wallets, a signed ledger, mock checkout sessions, VIP tier unlocks, cosmetic products, and user inventory/equipping. No Stripe request or charge is made; balances are stored in editable browser storage and are not authoritative.

### `src/modules/messages/`

Owns direct and group conversation creation, participant-checked message reads/sends, group member selection, conversation listings, and thread UI. `Conversation` records `kind` (`direct` or `group`), `worldType`, participant user IDs, optional group name, and timestamps. Separate world-keyed conversation and message repositories prevent cross-world thread visibility; profile identity, account settings, and wallet state remain account-wide. The current adapter is in-memory with no persistence or realtime transport.

The candidate persistent implementation is `src/modules/messages/supabaseRepository.ts`; it is not yet wired into the active hooks. It relies on Supabase Auth identity, database membership RLS, and message INSERT subscriptions.

### `src/modules/profiles/` discovery boundary

Only verified profiles with public visibility enter the local demo search. Search matches username and display name and returns a `PublicProfile` that has no email property. Email lookup remains private to Auth for account access and must never be added to a public search index or response.

### App-level foundation

- `src/components/Navigation.tsx` presents the two world choices and delegates selection to the context.
- `src/components/ResponsiveShell.tsx` provides the full-width responsive application shell without a simulated-device preview toggle.
- `src/components/AppWorkspace.tsx` composes the auth gate and the feed, events, discovery, messages, profile, and economy modules.
- `src/services/mockApi.ts` retains miscellaneous in-memory examples. Domain operations live with their owning feature modules.

### Commercial target module and infrastructure map

- `src/modules/media/` owns provider-neutral media authorization, signed upload/download coordination, asset lifecycle, validation metadata, and processing state. Feature modules reference asset IDs; they do not issue provider credentials or store media bytes themselves.
- `src/modules/moderation/` owns end-user reports, review workflows, moderation policy contracts, actions, appeals, and staff-only UI. Admin APIs verify staff roles and MFA server-side; public feature modules consume only the minimal moderation state needed to enforce visibility.
- The first UI now includes report controls on posts, events, Shorts, and received messages, and a `/moderation` queue. The current RPC/RLS layer enforces the stored staff role, but MFA, role tiers, appeals, assignment, and staging verification remain outstanding.
- `src/modules/ads/` owns placement inventory, consent/eligibility checks, frequency policy, and network adapters. Feed and Shorts request typed placements; they do not embed ad SDK credentials or directly report billable events.
- `src/modules/economy/` remains the owner of catalog, provider adapter, checkout lifecycle, order/wallet ledger, VIP entitlements, and inventory fulfillment. Payment webhooks are server-only ingress and never routed through client state.
- `src/modules/auth/` owns identity-provider integration, secure session mapping, verification, recovery, and step-up flow. RLS policies/migrations are infrastructure-owned, reviewed alongside every data-contract change.
- `supabase/migrations/` (or the selected PostgreSQL migration directory) owns schema, RLS, indexes, functions, and storage policies. `src/server/` may host shared database/provider clients, request identity, and narrowly scoped server services; never import server-only credentials into client components.
- `src/platform/` owns small platform capability adapters shared by Capacitor/Tauri/Electron shells (deep links, secure storage, notifications). Platform wrappers do not fork domain logic or weaken server authorization.
- Next.js Route Handlers/server actions are transport adapters: authenticate, validate DTOs, invoke module services, and map explicit errors/status codes. Keep SQL/provider calls and business decisions inside server-only infrastructure or module services, not React presentation components.

## Chapter 4: Current Progress & Roadmap

### Completed foundation

- [x] Strict database interfaces for users, profiles, posts, friendships, events, and messages.
- [x] Shared `WorldType` contract for `sanctuary` and `guild`.
- [x] App context for active world, navigation, mock user session, and world toggling.
- [x] Async in-memory mock API functions with typed inputs and outputs.
- [x] Shared world header with distinct Sanctuary and Guild Hall themes.
- [x] Native responsive full-width shell without a mobile-preview toggle.
- [x] Five original feature folders with scope READMEs, public entry points, and initial components.
- [x] Auth gateway/modal, local email registration and code verification, login challenge, optional mock 2FA, logout, typed permissions, and persisted demo session.
- [x] Feed create/read/update/delete service and author controls.
- [x] Event create/read/update/delete and RSVP service/UI.
- [x] Mock wallet, Stripe checkout lifecycle, VIP tiers, cosmetics, and inventory UI.
- [x] Participant-checked in-memory DM threads and privacy-filtered public profile discovery.
- [x] Lucide navigation/world icons, shared animated world indicator, reduced-motion-aware Framer Motion transitions, and dynamic context-driven themes.
- [x] Interactive mobile hamburger and animated off-canvas navigation drawer, desktop horizontal navigation, mobile-scaled feed hero typography and spacing, rich profile editor/privacy switches, own-post media showcase, author metadata, local post media uploads, and story tags.
- [x] World-keyed feed, event, short-video, and message repositories with unified account-wide profile, settings, and wallet state.
- [x] Live global accent preview from profile theme selection and local banner image selection with profile-card preview.
- [x] Gaming and community profile links for Xbox, PlayStation, Steam, Epic Games, and Reddit.
- [x] Browser camera/microphone recording and local file upload for Shorts, with preview and size validation.
- [x] Free-tier demo ad placeholders in feed and Shorts, hidden for non-free VIP tiers; real ad provider and revenue reporting remain unconfigured.
- [x] Account settings hub with account preferences, privacy controls, Facebook/X/YouTube links, compact/comfortable layout choices, and confirmed local account deletion.
- [x] Short-form vertical video feed with scroll snapping, native video controls, local video uploads, live likes, and clip-specific comment threads.
- [x] Feed-post and event likes/comment threads; group DM creation, listings, membership-checked threads, and group-aware message presentation.
- [x] Production build and TypeScript validation passed for the current implementation.

### Production readiness status

The current application is still a locally interactive prototype, not a production deployment. Auth and economy use client-editable browser storage; feed, event, Shorts, and active message services remain in-memory mock repositories. A first Supabase schema/RLS migration, typed browser client, prepared world-scoped realtime messaging repository, and reporting/moderation surfaces have been added, but the migration has not been applied or tested against a Supabase project. The app's local demo session is not a Supabase Auth identity, so database-backed reports and the prepared message repository are not end-to-end usable until the Auth/session cutover is completed. Do not accept real credentials, private data, or payment until the roadmap gates below are complete.

### Supabase implementation status (2026-10-09)

- `supabase/migrations/20261009000000_social_core_and_moderation.sql` defines profiles/settings, world-scoped posts, Shorts, events/RSVPs, likes/comments, direct/group conversations, messages, reports, moderation actions, and append-only audit events. It adds owner/member/moderator RLS, a privacy-filtered public-profile projection, report/action RPCs, a protected role column, timed suspension enforcement, and message/conversation publication for Realtime.
- `src/services/supabase/` adds a typed browser client configured only by `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; missing configuration throws an explicit error. `src/modules/messages/supabaseRepository.ts` has durable conversation CRUD and filtered Realtime subscription operations, but the existing `useDirectMessages`/inbox path still uses the demo service.
- `src/modules/moderation/` adds report submission controls on posts, events, Shorts, and received messages, plus `/moderation` with report triage, hide/remove, warnings, 24-hour suspensions, and bans. The RLS/RPC boundary—not the page visibility check—authorizes report access and every action. Dashboard access requires an active Supabase Auth session and a trusted `profiles.role` provisioned out of band.
- The active feed, event, Shorts, message, and auth-session modules have not been migrated to Supabase Auth/PostgreSQL. Do not describe P2/P3/P4 as complete. This Codespace had no Supabase URL/key configured and no `psql`/Supabase CLI available; migration apply, RLS tests, real persistence, and Realtime delivery are therefore unverified.

### Immediate roadmap

- [ ] **P0 — Product, legal, and threat-model gates:** Define launch jurisdictions, age/safety policy, privacy and retention notices, data-subject request workflow, moderation operations, paid-product disclosures, subscription/cancellation/refund rules, and ad consent. Select a payments/tax model with qualified legal/accounting advice; complete a data-flow map, abuse cases, and vendor/security review before production personal data is collected.
- [ ] **P1 — Production foundation:** Apply and validate the initial Supabase migration in a disposable/development project, create separate development/staging/production projects, configure secret management, backups/PITR, monitoring, CI/CD, and a tested rollback/restore procedure. Project URL and anon key are not currently configured in this Codespace.
- [ ] **P2 — Identity and authorization:** Replace browser-local accounts with Supabase Auth or an explicitly selected identity service, secure server sessions, verified email, Argon2id-first password hashing (bcrypt only for a documented compatibility requirement), TOTP and email-code second factors, recovery, step-up verification, and database/API authorization with RLS.
- [ ] **P3 — Durable social core:** Finish the Auth cutover and migrate all active profiles, settings, friendships, feeds, Shorts metadata, comments, likes, events/RSVPs, conversations, messages, wallets, and inventory repositories to PostgreSQL. Validate the initial report/audit schema, then add authenticated server boundaries, pagination, deletion/export, backups, and migration/restore/RLS tests.
- [ ] **P4 — Media and realtime:** Add an S3-compatible or Cloudinary media adapter and signed upload/delivery; run image/audio/video validation and moderation; transcode short video to adaptive streaming formats. Add Supabase Realtime/WebSocket delivery for authorized DM/group threads, presence, and selected engagement updates, with durable database writes as the source of truth.
- [ ] **P5 — Commercial payments:** Choose Stripe as the initial payment gateway unless the jurisdiction/merchant-of-record review selects Paddle or Creem. Implement server-created checkout, verified and idempotent webhooks, immutable wallet ledger, credit top-ups, VIP membership lifecycle, cosmetic purchase/entitlement fulfillment, refunds, disputes, tax/accounting reconciliation, and launch-blocking end-to-end tests.
- [ ] **P6 — Safety and revenue operations:** Deliver reporting and admin moderation queues, suspension/ban and appeal workflows, audit logs, traffic/abuse analytics, privacy-aware feed and Shorts ad slots, consent controls, and network-specific AdSense/AdMob adapters only after policy and platform approval.
- [ ] **P7 — Cross-platform distribution:** Keep the responsive web app as the canonical client; prove the selected Capacitor build mode against Next.js runtime requirements before committing to store builds. Add tested Android `.apk`/`.aab` and iOS `.ipa` pipelines, then package desktop with Tauri by default or Electron if required capabilities justify it. Add signing, notarization, store review, release/rollback, and platform-specific privacy/consent checks.
- [ ] **P8 — Commercial launch readiness:** Pass security review and penetration testing; verify accessibility, supported browser/device matrices, load and failure testing, restore/incident drills, service-level objectives, privacy/deletion/export exercises, payment reconciliation, ad-policy compliance, store approvals, support escalation, and launch monitoring before opening registration or charging users.

## Chapter 5: Security & Auth Architecture

### Current demo behavior

- Signup collects an email address, username, display name, and entry world. The local store validates format and uniqueness, creates a `User`/`Profile`, and requires a mock email code before activating the session.
- Sign-in looks up an account by email and requires a mock email code. If mock 2FA is enabled on the account, a second fixed code is required.
- The current demo code is `000000`; no email or TOTP message is sent. Account records and active sessions are stored in browser `localStorage`.
- Sessions include `entryWorld` and a typed permission list for client UI composition. Client-held permissions are not an authorization boundary.
- The Supabase schema provisions a minimal profile from verified-auth user metadata and supports a privacy-filtered `public_profiles` view. The application has not yet moved sign-in or restored sessions to Supabase Auth; this profile trigger/schema is not a substitute for that cutover.

### Production requirements before real accounts

- Choose a server-side identity/auth provider and make account status, email verification, permissions, and session revocation authoritative on the server.
- If passwords are supported, hash them on the server with a reviewed password-hashing scheme such as Argon2id and calibrated parameters. Never store plaintext passwords or rely on client-side hashing; use unique salts and keep any pepper in a secrets manager.
- Email verification should use high-entropy, single-use, expiring tokens stored hashed at rest. Rate-limit registration, verification, resend, and login attempts; use generic responses to reduce account enumeration.
- Use opaque, rotatable sessions in `HttpOnly`, `Secure`, appropriately `SameSite` cookies, with server-side revocation/expiry and CSRF protections for state-changing requests. Do not store production bearer credentials in `localStorage`.
- Replace the fixed 2FA code with standards-based TOTP (RFC 6238) or a vetted provider. Encrypt TOTP seeds, rate-limit challenges, and issue one-time recovery codes stored hashed. Add step-up verification for sensitive account/economy actions.
- Enforce every permission and resource-ownership check in server APIs. The UI permission list is only a rendering hint.
- Add audit events for authentication, recovery, permission, and wallet actions; define account deletion, data export, retention, and abuse-response policies.

### Definitive commercial target

- Use Supabase Auth with PostgreSQL as the preferred managed identity/database pairing unless vendor diligence changes the decision. Keep auth-provider calls behind the auth module/server adapter and keep domain entities in PostgreSQL migrations. If a custom password flow is explicitly required, use a maintained server-side Argon2id implementation with parameters calibrated for deployment hardware; accept bcrypt only for interoperability or migration, with modern cost settings and rehash-on-login. Supabase-managed credentials must remain within the supported Supabase Auth flow—do not duplicate its password store or claim application-side hashing of provider-managed passwords.
- Require verified email for account activation and sensitive recovery. Offer RFC 6238 TOTP enrollment with one-time secret display/QR, confirmation before enablement, encrypted secret storage, rotation, hashed single-use recovery codes, challenge throttling, replay protection, and step-up prompts for account deletion, payment/security changes, and other high-impact actions. Email one-time codes must be high entropy, expiring, single-use, hashed at rest, rate limited, delivered through a verified transactional provider, and protected against enumeration. Email codes complement but do not silently substitute for enrolled TOTP.
- Add Google and Facebook OIDC, Microsoft identity for Xbox-linked sign-in, and PlayStation Network federation only after provider applications, callback URLs, scopes, privacy terms, and account-linking rules are approved. Use server-side authorization code with PKCE where supported; validate `state`, `nonce`, issuer, audience, signature, expiry, and verified email claims. Link identities to a stable `(issuer, subject)` key only after explicit proof of control for both existing and new accounts; never merge by unverified email alone. Provider verification may satisfy email ownership only according to a configured trust policy and must not skip required 2FA, risk checks, or sensitive-action step-up. Keep client IDs/config public as appropriate, but all client secrets, token exchange, refresh tokens, and app session issuance remain server-side.
- Keep long-lived credentials out of browser storage. Prefer provider-managed secure cookies/session refresh with `HttpOnly`, `Secure`, and appropriate `SameSite`; validate origin/CSRF on writes. Redact secrets/tokens from logs, rotate keys, and use short-lived signed service credentials scoped to server workloads.
- Authorization must be deny-by-default at both the server service boundary and PostgreSQL RLS. Derive the actor from a verified server session/JWT, never a submitted user ID. Review every `SECURITY DEFINER` function, view, storage policy, and service-role use; never ship the service-role key to clients. Test both positive and negative cross-user access cases.

## Chapter 6: In-App Economy & Monetization

### Current module contracts and demo

- `Wallet` stores integer `balanceCredits` and a `VipTier`. `WalletLedgerEntry` records signed deltas and reasons; `CreditPackage` uses integer USD cents.
- The economy module offers mock credit packages, a `stripe-mock` checkout lifecycle, Wayfinder/Champion tier unlocks, and a catalog for frames, VIP badges, and chat stickers.
- `InventoryItem` records acquired products and equipped state. Demo wallet/inventory snapshots are stored in client-editable browser `localStorage`; no payment provider is contacted and these values are not authoritative.

### Production requirements before accepting payment

- Move all wallet, inventory, entitlement, and price decisions to trusted server services backed by durable storage. Use immutable, auditable ledger entries, database transactions, integer minor units, idempotency keys, and reconciliation.
- Create Stripe Checkout sessions on the server using configured Price IDs. Fulfill only after validating signed webhooks; implement refund, dispute, duplicate-event, abandoned checkout, and chargeback flows. Never accept client-reported checkout success or balance values.
- Define VIP tier semantics, expiration/renewal/cancellation, regional taxes, refunds, consumer disclosures, and entitlements before selling subscriptions. Demo tier unlocks are permanent credit purchases, not subscriptions.
- Keep cosmetic ownership distinct from equipped state. Enforce catalog eligibility and ownership server-side; define transfer, refund, and moderation rules for user-created stickers/emojis.
- Do not let cosmetic/VIP add-ons lock core community features. Follow the free-first policy in the product blueprint.

### Commercial provider and webhook architecture

- Define a provider-neutral `PaymentProvider` contract in the economy module for catalog/price lookup, server-created checkout, cancellation/management, and normalized webhook events. Stripe is the default initial gateway. Select Paddle or Creem as Merchant of Record only after a documented jurisdiction, product, fee, payout, dispute, customer-support, and platform-policy comparison; only one provider is authoritative for a given transaction and catalog price.
- Keep tax calculation/collection responsibility explicit per product and region. A Merchant of Record may assume specified indirect-tax obligations under its contract, but it does not remove the platform's obligations for income tax, accounting, consumer protection, privacy, or recordkeeping. Do not promise universal compliance by provider choice alone.
- Browser clients request a checkout session for an allowlisted catalog product. The server resolves current price/currency, customer/account binding, tax configuration, success/cancel destinations, idempotency key, and provider metadata. Redirect to hosted checkout where practical so card data never touches Guild & Sanctuary servers; confirm applicable PCI scope with the processor/acquirer.
- A dedicated webhook endpoint verifies the provider signature against the raw request body, validates account/environment/product mapping, records provider event IDs under a unique constraint, and acknowledges duplicates without repeating fulfillment. Persist the event and normalized order state transactionally; credit immutable ledger entries and grant VIP/cosmetic entitlements exactly once. The redirect/success page only displays server-verified order state and never issues credits.
- Model asynchronous payment states, retries, delayed settlement, refunds, disputes/chargebacks, partial refunds, cancellations, renewals, failed renewals, and entitlement expiry/revocation. Reconcile internal orders, wallet ledger, provider settlement, fees, taxes, and refunds on a scheduled basis; route mismatches to an auditable operations queue. Never edit historical ledger rows to conceal corrections—post compensating entries.
- Store provider customer/price/subscription identifiers as opaque references, minimize payment metadata, and exclude card data and secrets from logs. Add sandbox end-to-end tests for duplicate/out-of-order events, invalid signatures, retries, refund/dispute handling, and transaction rollback before live mode.

## Chapter 7: Core Social & Communication Pipelines

### Feeds

- The feeds service exposes world-scoped reads and create/update/delete operations. `useFeed` manages loading/error state; the view tags new posts with the active world and offers author-only edit/delete controls.
- Production feed APIs need authenticated author identity, server-side ownership checks, pagination/cursors, rate limits, content validation, media scanning/storage, moderation/reporting, and deletion/edit audit policy.

### Events and RSVP

- Events are world-scoped and contain creator, UTC date strings, and coordinates. Demo CRUD checks creator ownership; RSVP state supports Going, Interested, and Cancelled with a per-event count.
- Production storage should enforce one RSVP per user/event, event capacity and waitlists if required, valid dates/coordinates, cancellation policy, notification consent, and server-side organizer authority.

### Direct messages

- The messages module creates/reuses a two-participant conversation and checks membership for history and sending in its mock service. Threads are currently local in-memory state without realtime delivery.
- Production messaging requires server-side participant checks on every operation, durable conversation/message storage, abuse/report/block controls, rate limits, attachment scanning, retention/deletion policy, delivery/read semantics, and a considered encryption model. Do not expose messages through public profile/search APIs.

### Social engagement and short-form video

- `SocialLike` and `SocialComment` use a discriminated `targetType` (`post`, `event`, or `short`), target ID, actor ID, and ISO timestamp; comments also include a bounded body.
- Feed and event like/comment interfaces update counts from the in-memory owning-module repositories. These counters are immediate local responses, not cross-client realtime state.
- `ShortVideo` contains `id`, `authorId`, `worldType`, `videoUrl`, `caption`, and `createdAt`. The Shorts client uses vertically scroll-snapped cards, native controls, muted inline playback, and per-video comments.
- Production likes/comments require durable uniqueness constraints, authorization, abuse/moderation controls, and event-driven count consistency. Shorts additionally require upload limits, transcoding, safe media inspection, consent/moderation, and CDN delivery.

## Chapter 8: Account Settings & Group Conversation Contracts

### Settings

- `AccountPreferences` defines `allowProfileDiscovery`, `allowDirectMessages`, `showOnlineStatus`, `emailNotifications`, `personalizedFeed`, and `layout` (`comfortable` or `compact`). `AccountSettings` scopes these preferences to a `userId` and records `updatedAt`.
- `Profile.socialLinks` contains nullable `facebook`, `x`, `youtube`, `xbox`, `playstation`, `steam`, `epicGames`, and `reddit` links. `ProfilePrivacy.socialLinks` gates public projection; `PublicProfile` omits links when this flag is false. The database stores social links as JSONB and only returns them through `public_profiles` when the privacy flag is true.
- `allowProfileDiscovery` is reflected by profile visibility and controls public-search eligibility. `allowDirectMessages` is reflected in the public messaging capability and checked before opening a direct thread. Browser-stored preferences remain demo-only.
- Before production, persist preferences via authenticated APIs, define notification consent and online-status semantics, protect connected identities, and complete deletion/export retention policy.

### Direct and group conversations

- `Conversation.kind` discriminates `direct` and `group`; `participantIds` lists current members; `name` is null for direct threads and contains a bounded group name for group threads. `createdAt`/`updatedAt` are ISO timestamps.
- Group creation requires the current user plus at least two selected public members. Every message read and send checks that the requesting user belongs to the conversation in the mock service.
- Production storage should normalize conversation membership into a join table with uniqueness constraints, preserve participant authorization at the server, define join/leave/admin rules, and cover deletion, retention, block/report, and encryption behavior.
- The initial Supabase migration now provides `conversations`, `conversation_members`, a world-keyed canonical direct-pair table, and `messages`; creation is transactional through `create_conversation`, while membership and world predicates are checked by RLS. `src/modules/messages/supabaseRepository.ts` includes authenticated persistent reads/writes and an INSERT-only Realtime listener, but the UI still calls the in-memory service pending Auth cutover.

## Chapter 9: Commercial Data Platform — PostgreSQL, Supabase, and RLS

### Provider and service boundaries

- **Default production database:** managed Supabase PostgreSQL, with standard PostgreSQL SQL, reviewed migrations, and portable repository interfaces. Keep business logic provider-independent so PostgreSQL can be moved to another managed provider without changing module contracts. Supabase Auth, Storage, and Realtime are adapters, not permission to bypass domain authorization.
- **Runtime boundary:** browser components call authenticated Next.js server actions/Route Handlers or a separately documented API. Server services validate input, derive the user identity from the verified session, enforce domain rules, and use least-privilege database credentials. Browser-to-Supabase access is limited to intentionally client-authorized operations secured by RLS.
- **Current adapter status:** `@supabase/ssr` and `@supabase/supabase-js` are dependencies; `getSupabaseBrowserClient()` requires the public environment values documented in `.env.example`, never a service-role key. No server-side Supabase cookie client or Auth bridge has been implemented yet. The current mock session cannot authorize Supabase RLS.
- **Environments:** isolate local development, staging, and production projects, credentials, webhook secrets, buckets, OAuth callbacks, and payment modes. Production data is never copied into developer fixtures without an approved, minimized, anonymized process.

### Canonical schema target

Use UUID primary keys where public unpredictability matters, UTC `timestamptz` audit timestamps, foreign keys, check constraints, explicit deletion behavior, and indexes that match access patterns. Normalize many-to-many and high-volume records; keep derived counts rebuildable.

- `users`/`profiles`: auth-provider subject ID, unique normalized username, public profile fields, profile visibility, privacy flags, social-link JSON or provider-specific columns, and moderation/account status. Do not duplicate authentication passwords in `profiles`.
- `account_settings`: one row per user with validated notification, discovery, messaging, online-presence, feed, and layout preferences. Social URL host/protocol validation is repeated server-side.
- `posts`, `short_videos`, `events`, `event_rsvps`: owner/world/status/time/media references; event coordinates are precision-limited and access-controlled. `short_videos` stores metadata and a media asset ID/manifest reference, not large video bytes.
- `social_likes`: unique `(target_type, target_id, user_id)` plus supported target validation; `social_comments`: target, author, bounded body, moderation/deletion state, and timestamps. Prefer target-specific foreign keys or a safe typed-target design that cannot create orphan references.
- `conversations`, `conversation_members`, `messages`: conversation kind/name; unique member rows and role/join/leave state; messages belong to a conversation and sender, with server timestamps and delivery/read state. Direct-thread identity must have a canonical unique pair independent of caller ordering.
- `wallets`, immutable `wallet_ledger_entries`, `orders`, `subscriptions`/entitlements, `products`, `inventory_items`: integer minor currency units and integer credits, provider references, uniqueness/idempotency keys, and transactional balance derivation.
- `media_assets`, `content_reports`, `moderation_actions`, `audit_events`, and operational aggregates: ownership, lifecycle/scan state, evidence access controls, append-only moderation/audit history, and privacy-minimized metrics. Never put private report contents in general analytics.
- **Initial migration implementation:** the committed first migration covers the social/messaging/moderation subset only; wallet, commerce, friendship, media asset, 2FA, and payment-provider tables remain roadmap items. Public profile data is projected through `public_profiles`; direct profile reads are owner/moderator-only. `profiles.role` is not client-updatable and is the database's moderator authority; assign staff roles only through a trusted administrative path.

### Row-Level Security baseline

- Enable RLS for all tables reachable from a browser key. Add explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`; absence of a policy means no client access. Use `auth.uid()`/verified server identity and membership/ownership predicates. Test anon, authenticated owner, unrelated authenticated user, moderator, and server-job actors.
- Profiles: public reads return only discoverable, approved columns through a restricted view or server DTO; private fields and email remain unavailable. Owners may edit allowlisted fields only. Do not make an unrestricted `SELECT *` profile policy and expect the frontend to hide sensitive fields.
- Posts, Shorts, comments, likes, events, RSVP, and media: visibility and moderation state gate reads; only authenticated eligible owners may write; immutable author/owner identifiers are not client-editable. Comments/likes inherit visibility from their target. Block/mute rules are part of the same access decision.
- Conversations/messages: only active conversation members may read. Inserts require the authenticated sender to equal `auth.uid()` and active membership; membership mutations require the defined group owner/admin policy. Clients cannot grant themselves membership or forge sender/read timestamps.
- **Implemented baseline:** migration policies require active profiles for social writes, enforce active conversation membership for message reads/inserts, and make moderation RPCs check the protected profile role. Direct threads are unique per participant pair and world; group creation caps membership at 50. Message subscriptions listen only for inserts on the selected conversation and depend on the same RLS read policy.
- Wallet, orders, ledger, provider events, moderation actions, audit events, and secrets: deny direct end-user writes. Expose narrow server RPC/service operations with transactional authorization and idempotency. Supabase service-role credentials are server-only and must not bypass user-specific authorization accidentally.
- Storage object policies must independently enforce bucket, owner, asset status, and visibility. RLS is not a substitute for input validation, rate limits, API authorization, or abuse monitoring.

### Migration, operations, and security gates

- All schema/index/policy/trigger/function changes are ordered, reviewed migration files committed with application changes. CI creates a clean database, applies all migrations, checks generated/shared types, executes policy tests, and validates safe forward/rollback procedures. Use expand-migrate-contract for breaking schema evolution; backfill in resumable batches with checkpoints.
- Set connection pooling, statement/lock timeouts, query budgets, indexes, pagination, and explicit transactions. Avoid N+1 reads and unbounded realtime subscriptions. Treat provider quotas and connection limits as capacity constraints.
- Configure automated encrypted backups and point-in-time recovery where available. Exercise restore to a clean staging project, verify row counts/invariants, measure RPO/RTO, and keep backups under a documented retention/access policy. A backup that has never been restored is not a recovery plan.
- Production gate: demonstrate RLS test coverage for every private table, migration reproducibility, restore drill, schema rollback/forward strategy, secret rotation, and no service key/client credential leakage.

## Chapter 10: Managed Media, Asset Lifecycle, and Video Delivery

### Storage and API

- Provide a feature-owned `MediaStorage` adapter with provider-neutral operations for authorized upload initialization, completion/verification, deletion, and delivery metadata. Select S3-compatible object storage or Cloudinary after cost, region/data-residency, transformation, egress, retention, and vendor-security review; do not couple profile/feed code to provider SDKs.
- Production assets include profile pictures, banners, post images, MP3 audio, and short-form video. Store media bytes outside PostgreSQL; `media_assets` holds opaque asset ID, owner, type, original/derived object keys, dimensions/duration, byte size, checksum, scan/transcode state, visibility, and lifecycle timestamps.
- The authenticated server authorizes each upload against user, target, MIME/type, size, quota, and policy. Issue narrowly scoped, short-lived, single-purpose presigned upload URLs or provider upload signatures; clients never receive bucket-wide credentials. On completion, verify object ownership, actual bytes/type/checksum, and declared size before making an asset readable.
- Use private buckets by default. Deliver public-approved assets through a CDN or short-lived signed URL according to visibility. Prevent path traversal and arbitrary destination URLs, remove metadata/EXIF when appropriate, strip untrusted filenames, and set restrictive content headers. Revocation/deletion must invalidate delivery or wait only for a documented cache TTL.

### Inspection and streaming pipeline

- Ingested media remains quarantined until file signature/MIME verification, malware/content safety scan, policy checks, and required moderation complete. Enforce image pixel limits/decompression defenses; cap audio/video bytes, duration, resolution, frame rate, and processing time. Do not trust browser-provided file names or MIME types.
- Images generate bounded responsive derivatives and safe thumbnails. MP3 audio is normalized/metadata-scrubbed as policy requires and streamed with range requests. Short video is transcoded asynchronously into adaptive bitrate HLS (and platform-compatible MP4 fallback where needed), with poster/thumbnail, captions/subtitles when available, and CDN manifests/segments. Avoid loading full video files into PostgreSQL, memory, or the Next.js application server.
- Track explicit lifecycle states (`pending_upload`, `quarantined`, `processing`, `ready`, `rejected`, `deleting`, `deleted`) and surface processing failures. Retry transient jobs idempotently; dead-letter permanently failed jobs for review. Only `ready` and authorized assets can appear in feed/Shorts responses.
- On account/content deletion, remove associated metadata and objects asynchronously with retries, provider verification, and an audit trail; account for legal retention holds without retaining public access. Define orphan sweeps and lifecycle expiration for incomplete multipart uploads and derivatives.

### Launch gates

- Validate signed-upload expiry and replay, oversized/mislabelled files, malware and moderation rejection, private URL authorization, range/HLS playback on supported browsers/devices, CDN purge/revocation, data-region settings, vendor outage behavior, cost/egress alerts, and deletion completion before launch.

## Chapter 11: Realtime Messaging and WebSocket Delivery

- Use Supabase Realtime or an explicitly operated WebSocket gateway behind a `RealtimeTransport` adapter. PostgreSQL remains the durable source of truth; realtime is a delivery signal, never the only record of a message or reaction.
- Authorize every channel join from verified identity and active `conversation_members` membership. Use non-guessable channel identifiers, private channels, short-lived authorization, membership rechecks/revocation, event allowlists, per-user connection/message limits, and origin checks. A subscribed client must not gain access merely by knowing a conversation ID.
- Send path: validate membership and content on the server, persist message transactionally with a server-generated ID/time, then publish an event. If publication fails, the committed message remains visible on the next history refresh and delivery retries do not duplicate it. Support cursor-based history sync, stable ordering, idempotent client send keys, acknowledgements, reconnect/backoff, missed-event catch-up, and dedupe.
- Direct and group messages share the same authorization and retention rules. Group membership lifecycle specifies creator/owner roles, invitations, member removal/leave, last-admin behavior, blocked users, and whether historical messages remain available after leaving. Reads/writes must stop after revocation takes effect.
- Define whether presence/typing/read receipts are collected and displayed; make optional presence privacy-aware with timeouts and minimize stored history. Do not broadcast email, private profile fields, provider credentials, moderation evidence, or payment information.
- Add a documented encryption model. TLS in transit and managed-database encryption at rest are baseline, not end-to-end encryption. If E2EE is later required, establish key lifecycle, group membership/key rotation, recovery, multi-device, moderation/report evidence, and backup implications before representing it as supported.
- Validate two-user and group fan-out, unauthorized subscriptions, revoked membership, reconnect/catch-up, duplicate/out-of-order events, provider outage, message persistence, moderation removal, and connection/egress limits under load.

## Chapter 12: Advertising and Commercial Revenue

### Placement and network adapters

- Ad inventory is a product-controlled set of placement slots, not arbitrary third-party code in feature components. Define stable slot IDs and eligibility for feed insertion and Shorts/Reels interstitial or in-feed placements. Every ad is clearly labeled and visually distinct from member content.
- Implement a provider adapter boundary for web display inventory (evaluate Google AdSense) and native mobile inventory (evaluate Google AdMob only under app-store and ad-network policies). Provider approval, account setup, inventory rules, consent mode, SDK support, and placement review are launch gates, not assumed capabilities.
- A server-side policy/config service controls enablement, placement frequency, user eligibility, world/age restrictions, house ads, and experiment assignment. Start with conservative frequency caps and exclude auth, account deletion, payment, private messages, moderation, and other sensitive contexts.
- Entitlement checks use a server-authoritative VIP/ad-free subscription state, not the client `Profile.vipTier` or a wallet balance. The current demo only shows disclosed placeholder slots to `free` profiles and hides them for non-free mock VIP tiers; it has no network SDK, billable impression, or revenue integration. Provider setup, consent management, viewability verification, and auditable reconciliation are required before monetization is enabled.
- Feed ads should be inserted only at defined pagination boundaries and never represented as community posts. Shorts ads must not break video controls, autoplay expectations, accessibility, reduced-motion, or consent; respect platform-required controls and interruptibility. Provide an ad-free or reduced-ad entitlement only if product/legal policy explicitly supports it.

### Measurement, consent, and revenue recognition

- CPM/CPC billing and reporting are measured by the approved network, with network callbacks/reports as reconciliation inputs. Do not fabricate impressions/clicks or count a view before the network's policy-defined, viewable impression condition. Never incentivize accidental clicks; protect against bots, refresh abuse, repeated self-impressions, and click fraud.
- Obtain legally required consent before non-essential ad storage, identifiers, personalization, or tracking. Support applicable consent signals/withdrawal and regional policy. Default to contextual/non-personalized inventory where consent is absent or the user is under the applicable age threshold. Do not send private profile fields, message content, location precision, sensitive categories, or raw user IDs to ad networks.
- Keep ad analytics pseudonymous, minimal, access-controlled, and retention-limited. Document network data flows, subprocessors, opt-outs, deletion requests, disclosures, ads.txt/app-ads.txt and store privacy declarations as applicable.
- Finance reconciles network reports, invalid-traffic adjustments, fill, gross/net revenue, and payout statements. Ads must comply with community content policies, child-safety requirements, platform rules, and local advertising laws; pause a slot/network immediately on policy or safety incidents.

## Chapter 13: Safety, Reporting, Admin Moderation, and Audit

### User reporting pipeline

- Expose report actions on posts, Shorts/videos, comments, events, public profiles, and individual messages/conversations. Reports capture target type/ID, reason taxonomy, reporter, optional bounded context, creation time, status, assigned reviewer, and resolution; private message evidence is narrowly scoped to the reported message/thread and never surfaced in public search.
- **Initial implementation:** controls currently submit reports for feed posts, events, Shorts, and received messages using `submit_content_report`; duplicate reporter/target submissions reopen the existing case. Comments and profiles do not yet have report controls, and the live path remains unavailable until Supabase Auth is connected and the migration is applied.
- A report submission is rate-limited, deduplicated where appropriate, acknowledged without exposing the target's private moderation history, and placed in a priority queue based on imminent safety risk, severity, and trusted policy. Preserve only the evidence necessary for review and any applicable legal hold.
- Define target states (visible, limited, hidden, removed, under review), reporter protection, appeal path, response SLAs, escalation contact, evidence access, and retention/deletion rules. Reporting does not guarantee automatic removal; urgent credible threats follow a documented human escalation policy.

### Admin and trust/safety console

- Build a separate protected admin surface/module and server routes. Access requires verified staff identity, MFA, least-privilege roles (triage, moderator, senior moderator, trust/safety admin, finance/admin as needed), time-bound access review, and audited step-up for destructive actions. Do not infer moderator authority from client state or a profile role label.
- **Initial implementation:** `/moderation` loads up to 100 open/reviewing reports and supports reasoned hide/remove, warn, 24-hour suspension, and ban actions through an atomic database RPC. RLS/RPC verify the protected `profiles.role`; a trusted operator must provision moderators. MFA, role tiers, appeals, assignment, restore UI, audit export/alerting, and staging tests remain launch blockers.
- Queue tools: safely preview reported content with private-field redaction; search reports by permitted metadata; assign/claim/escalate; review context; add internal notes; hide/remove content; issue warnings; suspend/ban/restrict accounts; restore content; handle appeals; and record policy category, rationale, actor, timestamps, and expiry. Require second-person approval for high-impact/global actions where policy defines.
- Enforce server-side moderation policies consistently across public feeds, Shorts, comments, events, DMs, social discovery, ads, and search. Suspended users lose write/session capabilities promptly. Content takedown must invalidate caches/CDN assets and downstream realtime visibility. Define ban evasion, repeat-offender, legal request, child-safety, and emergency handling with qualified policy/legal review.
- `moderation_actions` and `audit_events` are append-only for ordinary operators, tamper-evident where feasible, timestamped, and exported to restricted log storage with redaction and retention. Record admin logins, queries exposing private evidence, role changes, content actions, account suspension, payment adjustments, data exports, and deletion overrides. Alerts detect bulk access, unusual action volume, privilege escalation, failed MFA, and suspicious traffic.
- Keep security/operational traffic analytics separate from content, ads, and payment data. Use minimized event schemas, role-based access, retention limits, aggregation, bot/rate abuse detection, and documented incident response. Analytics dashboards do not expose message bodies or secrets.

### Safety launch gates

- Approve community guidelines, report reasons, response/escalation playbooks, age-appropriate design and ad restrictions, moderator training, appeals/quality review, retention, and regional legal obligations. Test report intake to case resolution, role boundaries, admin MFA, audit completeness, deletion/cache invalidation, abuse spikes, and staff account compromise recovery.

## Chapter 14: Mobile and Desktop Distribution

### Canonical application and wrapper boundary

- The responsive Next.js web application remains the canonical product UI and business-contract source. Native wrappers reuse web UX but must call the same authenticated server services; native plugins may only add platform capabilities behind small adapters.
- **Capacitor mobile target:** package Android and iOS clients using Capacitor when its runtime, plugin, accessibility, media playback/upload, auth callback, notification, and store-policy needs are verified. Deliver signed Android `.aab` for Google Play (and `.apk` for internal/testing channels as required) and signed/notarized iOS `.ipa` through App Store Connect/TestFlight. Do not treat generated artifacts as store-approved releases.
- A Next.js application using server components, route handlers, middleware, or dynamic server rendering cannot be assumed to run as a self-contained static Capacitor bundle. Before implementation, choose and document either (a) a supported static-export-compatible route set embedded locally with all dynamic operations on remote APIs, or (b) a Capacitor shell loading the secure, deployed web application. Prove sign-in/session persistence, deep links, OAuth return, uploads, video streaming, offline/error states, CSP, and upgrade behavior in a spike before selecting. Do not ship production secrets or service-role keys in native assets.
- Use secure native storage for refresh/session credentials through a reviewed Capacitor plugin or provider-supported flow; no plaintext web storage for production bearer tokens. Implement Universal Links/App Links, verified redirect domains, push consent/token lifecycle, permission minimization, keyboard/safe-area behavior, and accessibility. Location, camera, photo library, tracking/ads, and notification prompts must be contextual and optional where possible.
- Maintain Android API/target SDK, Play Billing requirements for digital goods, Google Play data-safety/ads/content declarations, Apple privacy manifests/ATT and in-app purchase requirements, and current review policies as release gates. Stripe or external checkout use in wrappers requires a specific policy/legal review; never assume web payment links are allowed for every storefront/region.

### Desktop packaging target

- **Preferred target:** evaluate Tauri first for a small standalone shell around the deployed responsive app or a proven compatible local frontend, using explicit allowlisted IPC commands, restrictive capabilities/CSP, signed update manifests, and minimal filesystem/network access. Select Electron only where required Node/native ecosystem capabilities, embedded server behavior, or team expertise outweigh its larger runtime and security-update burden.
- Produce signed Windows `.exe` installers and signed macOS `.app` bundles (and notarized distribution packages where required). Configure hardened runtime, code-signing identities, entitlements, update channels, auto-update signatures, rollback, privacy prompts, and platform accessibility. Never embed database/payment secrets; retain server-side authorization.
- Define deep links, secure external-link handling, app-data storage, session keychain integration, auto-update failure behavior, and enterprise proxy/support needs. Desktop ads require separate network/privacy review; mobile AdMob SDKs do not automatically apply to desktop.

### Build, signing, and support matrix

- Keep wrapper configuration, plugin versions, permissions, entitlements, icons/splash assets, platform-specific privacy disclosures, and release metadata reviewed and reproducible. Pin toolchains and dependencies; run dependency/license scans and native build scans.
- CI must build web plus Android/iOS/Windows/macOS targets on supported runners. Signing/notarization credentials live only in protected CI secret stores; releases require approvals and immutable artifacts/checksums. Never commit keystores, certificates, provisioning profiles, Apple API keys, or signing passwords.
- Maintain a device/OS/browser matrix for camera/photo selection, safe-area/keyboard, playback/audio routing, screen readers, reduce motion, offline/network transitions, authentication redirects, push, billing policy, and update install/rollback. A successful web build does not certify native behavior.

## Chapter 15: Production Deployment, Operations, and Release Gates

### Environments and continuous delivery

- Use isolated local/preview, staging, and production environments with least-privilege access and no shared production secrets. Infrastructure, DNS, CDN, database, storage, auth callbacks, payment products/webhooks, realtime policy, ad config, and native signing configuration are versioned/configured through reviewed infrastructure-as-code or documented provider configuration.
- CI gates: formatting/lint/type-check, unit/component tests, focused RLS/auth tests, migration apply and schema diff, dependency/license/security scanning, secret scanning, accessibility checks, production web build, and integration/e2e tests using isolated sandbox services. Build once and promote immutable artifacts; do not rebuild different code for production.
- Deploy with preview isolation, backward-compatible database migrations, health/readiness checks, canary or staged rollout where supported, explicit approval for production and payment-live changes, release notes, rollback owner, and feature flags for risky vendor or monetization capabilities. Disable flags immediately if safety, payments, or privacy regress.
- Configure managed TLS, secure headers/CSP, origin and redirect allowlists, rate limits/WAF/bot controls, upload limits, CSRF protections, and secrets rotation. Restrict outbound network/egress where possible. No personal production data in preview environments.

### Monitoring and resilience

- Define SLOs and actionable alerts for web availability/latency, authentication failure, DB saturation/errors, migration health, queue/transcode delay, upload rejection, realtime delivery/reconnect, webhook lag/failure, wallet/order reconciliation, report backlog, ad invalid-traffic signals, and platform crash/update rates.
- Use structured, correlated logs and traces with request/event IDs, redacting auth tokens, email, message bodies, private URLs, payment data, report evidence, and unnecessary IP/device identifiers. Configure log access and retention. Error reporting must not capture credentials, full message text, or signed media URLs.
- Set provider-specific budgets/quotas and alarms for database, storage, video transcoding, CDN egress, realtime connections, transactional email, payment fees/refunds, and advertising. Include automatic rate/cost protection, queue backpressure, graceful read-only/degraded modes, and a vendor outage playbook.
- Document incident command, on-call escalation, severity, customer communication, privacy/security breach notification review, evidence preservation, recovery roles, provider support contacts, and post-incident remediation. Exercise DB restore, key rotation, payment webhook recovery, CDN purge, realtime outage, and compromised moderator/provider credentials.

### Launch and ongoing governance gates

- **No real account launch** until production auth, verified email, recovery, TOTP/email 2FA, server sessions, RLS tests, deletion/export, and abuse controls are exercised in staging.
- **No public media launch** until signed uploads, quarantine/scanning/moderation, streaming compatibility, privacy access, deletion/retention, CDN revocation, and cost limits pass.
- **No paid commerce launch** until provider approval, jurisdiction/tax/consumer review, webhook signature/idempotency, fulfillment/refund/dispute/reconciliation, PCI scope, support ownership, and sandbox/live-checklist sign-off pass.
- **No realtime launch** until membership authorization, durable-write/reconnect behavior, rate limits, moderation takedown, retention, privacy, load, and outage recovery pass.
- **No ads launch** until network approval, consent/age handling, store rules, placement/frequency UX, data minimization, invalid-traffic controls, disclosure, and payout reconciliation pass.
- **No native store release** until signing/notarization, platform privacy declarations, billing policy, app review, deep links/auth, device matrix, crash/update monitoring, and staged rollback are verified.
- Reassess vendors, subprocessors, SDK permissions, data residency, incident contacts, terms, privacy disclosures, retention, pricing, and operational ownership at least annually and whenever a material system/data flow changes.

## Chapter 16: Public Profile Discovery & Search

- The current public search requires at least two characters, matches verified profiles by username/display name, filters private profiles, excludes the current user, and maps to `PublicProfile` without email. Public cards may show approved status text, avatar, VIP tier, and equipped cosmetic previews.
- Email is not publicly indexed, queried, or returned. Auth may perform exact email lookup for sign-in only. If private email-based invitations are later required, use verified exact-match lookup behind authorization, consent, rate limiting, anti-enumeration behavior, and audit; never mix email into public prefix/fuzzy search.
- A production index must include only consented public fields, honor visibility/deletion changes promptly, normalize handles consistently, escape query syntax, rate-limit and monitor scraping, and return a minimal public DTO. Do not expose account status, internal IDs where unnecessary, private coordinates, permissions, wallet data, or email.
- Define blocking, muting, profile visibility, status expiry, age/safety restrictions, and search result reporting before launching discovery broadly.

## Chapter 17: UI Motion & Iconography

- Use Lucide React icons for navigation and clear interface actions instead of text-character or hand-drawn icon placeholders. Keep visible text labels for primary navigation and accessible names for icon-only controls.
- Use a shared Framer Motion layout indicator for the active world toggle. Sanctuary transitions are calm and low-amplitude; Guild Hall transitions are quicker and more energetic without disorienting movement.
- Keep world background colors tied to `AppContext.activeWorld` through workspace theme variables. Animate content transitions inside the existing client workspace; keep App Router pages server-renderable.
- Use deterministic initial motion state (`initial={false}` for presence transitions) so server-rendered markup matches the first client render. Do not initialize animations from `window`, storage, random values, or time.
- Respect reduced-motion preferences with `MotionConfig reducedMotion="user"` and preserve essential state changes without large transform movement.

## Chapter 18: Rich Profiles & Multimedia

- Profile media supports avatar and banner HTTPS URLs or local JPEG/PNG/WebP files up to 1 MB each in the demo. Theme color, cosmetic frame selection, bio, location, age, star sign, belief, and status are stored on the shared `Profile` contract.
- `ProfilePrivacy` controls public visibility for bio, location, age, star sign, and belief. Public profile adapters project each field according to its matching flag; private email and coordinates are never part of that projection.
- The profile dashboard showcases the signed-in user's posts, image attachments, MP3 tracks, and story tags. Feed posts include `mediaType`, `mediaUrl`, `storyTag`, author ID, and timestamps.
- Feed image uploads accept JPEG/PNG/WebP/GIF up to 2 MB; MP3 audio and MP4 video uploads are limited to 5 MB. Mock posts and their media data URLs are in-memory only and are not durable; production must use scanned object storage.
- All media and profile previews use `max-width: 100%`, intrinsic aspect ratios, and bounded heights. Audio controls do not exceed the preview frame. Mobile tabs use a three-column grid; profile/editor grids collapse to one column. Tailwind utilities constrain shared containers while component CSS Modules handle detail styling.

Update the completed checklist and roadmap as work lands. Keep incomplete integrations clearly marked as placeholders until implemented and validated.