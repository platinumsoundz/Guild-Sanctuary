# The Sanctuary — Roadmap

Last updated: 2026-10-30

Status reconciliation: this update corrects stale theme/notification labels from repository and coordination evidence. It does not claim browser QA, migration application, or production deployment.


## Shared design foundation and independent Guild — 2026-10-30

The Guild and the Sanctuary share approved UI foundations and feature mechanics, but remain separate environments. This update is being developed on `fix/guild-independent-navigation-settings-feedback-2026-10-30`; it is not considered live until CI, merge and deployment are verified.

- Guild navigation uses Guild-native labels (Home, Community, Messages, Events, Settings, Feedback, Admin and Moderation) and no longer inherits the companion environment's global page-visibility preferences.
- Guild has its own home dashboard, console settings and feedback destination. Only the explicit exit control points users back to the companion environment.
- Guild administration and moderation are scoped to `world_type = 'guild'`; global member-role management and global page visibility are not exposed inside Guild administration.
- Feedback submissions include an environment marker, and the staff inbox filters to the selected environment.
- Both roadmap dashboards use the same phase-card structure, percentage bars, responsive behaviour and estimate disclaimer. Shared components should keep the design system consistent while each environment retains its own labels, settings, navigation and data.

## Phase completion dashboard — 2026-10-30

> **Estimated overall Sanctuary project progress: 50%**  
> Phase completion and beta readiness are different measures. These percentages are planning estimates from repository/deployment evidence, not live telemetry. The Guild is a separate co-existing project and is excluded from Sanctuary progress percentages.

| Phase | Progress | Status and remaining work |
| --- | ---: | --- |
| 🟢 **Phase 1 — Visual foundation** | **100% implementation** | Compact header, top-left navigation, compact notification overlay, merged account entry, install prompt area, Today-page simplification, and dedicated Feedback destination are implemented in source. Production/browser/device verification remains part of Phase 3 rather than being counted as unfinished visual design. |
| 🟡 **Phase 2 — Console experience** | **25%** | Build out the console-style dashboard, HUD/navigation consistency, library and discovery, touchscreen controls, and role-aware visibility for stable versus experimental features. |
| 🟡 **Phase 3 — Reliability and beta readiness** | **30%** | Verify persistent messaging, account journeys, role/RLS enforcement, community interactions, deployment consistency, accessibility, and real-device behaviour. |
| **Overall project estimate** | **50%** | Weighted planning estimate across implementation and integration scope; not a percentage of lines of code. |

### At-a-glance bars

| Work area | Progress |
| --- | --- |
| Phase 1 · Visual foundation | `██████████ 100%` |
| Phase 2 · Console experience | `██▌░░░░░░░ 25%` |
| Phase 3 · Reliability and beta | `███░░░░░░░ 30%` |
| Overall Sanctuary project | `█████░░░░░ 50%` |

### Phase 1 exit checklist

- [x] Remove oversized branding/activity header space; keep the shell compact.
- [x] Keep main navigation accessible from the top-left.
- [x] Keep notifications as a compact overlay that preserves the current page.
- [x] Keep Token Shop and Admin out of the top bar; role-aware navigation controls their page access.
- [x] Present account entry as one compact control with sign-in/guest options.
- [x] Provide a dismissible PWA install prompt area.
- [x] Keep Today focused on useful destinations and provide a dedicated Feedback page for members and guests.
- [ ] Final production/browser/device QA — tracked under Phase 3; do not treat source implementation as proof that every deployment is current.

### Current messaging blocker

- The production Supabase project `Guild-Sanctuary` (`xgpzvmhldyoyrwwebcic`) has the persistent messaging tables, the typed `create_scoped_conversation` RPC, RLS policies, and the `messages` table in the Supabase Realtime publication.
- Vercel's project environment inventory has `NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES=true` targeted at Production. Because Next.js public environment variables are embedded at build time, a stale deployment or a different host/build configuration can still produce the “not connected to the live conversation database” guard message.
- **Not yet resolved:** perform a fresh build/deployment using the verified production environment, then test message creation and two-account send/receive/refresh. Check Cloudflare's build environment separately if that is the URL being used. Do not apply guessed migrations or weaken RLS to bypass the guard.


## Focused accessibility task — compact notification overlay

- **Task completion target: 100% of the code-and-contract scope.** When the compact notifications panel is closed with its close button, keyboard focus returns to the notification bell, consistent with the existing Escape-key behaviour.
- Added the focus restoration to `NotificationBar.tsx` and a dedicated regression assertion to `check-notification-panel-contract.mjs`; merged in PR [#263](https://github.com/platinumsoundz/Guild-Sanctuary/pull/263) on 2026-10-29.
- **Still not release-verified:** the merge was made at the owner's request without waiting for pending checks. Preview interaction, keyboard/mobile QA, and production deployment remain unconfirmed.

## Beta readiness dashboard — Sanctuary only

> **Estimated beta readiness: 45%**  
> Planning estimate based on the current roadmap and known verification gaps — not a live telemetry measurement. Percentages describe each Sanctuary workstream's overall readiness, including integration and testing, not just how much code exists. **The Guild is a separate co-existing project and is not included here.**

| Sanctuary workstream | Progress | Snapshot |
| --- | ---: | --- |
| Core pages and navigation | **75%** | Today, main destinations and responsive navigation are in code; browser/device verification remains |
| Community, posts and member discovery | **65%** | Core experiences are progressing; end-to-end edit, delete, like, report and discovery checks remain |
| Authentication and account management | **60%** | Account flows exist; password recovery, session edge cases and real-user verification remain |
| Daily Planner and Reflection | **65%** | Planner experience is in progress; account-backed private reflection needs migration/RLS review and isolation tests |
| Notifications and messaging | **55%** | Main surfaces exist; notification actions and DM preference behaviour need end-to-end checks |
| Moderation and member permissions | **50%** | Role-aware moderation UI is merged; live database grants, hierarchy and RPC behaviour need security testing |
| Sanctuary theme and responsive UI | **75%** | Theme foundation and visual polish are in code; visual accessibility and device QA remain |
| Cosmic Arcade mini-games | **60%** | Several playable client-side prototypes exist; gameplay QA, persistence and accessibility checks remain |
| Supabase integration and data security | **50%** | Important functions exist across inspected projects, but migration drift and the deployed database target must be reconciled |
| Wallet, tokens and payment safeguards | **40%** | Design and prototypes only; server-authoritative economy, ledger and approved staging tests are still required; spending stays disabled |
| Deployment and production verification | **35%** | Cloudflare deploy is guarded; Vercel preview has hit a provider rate limit; live SHA and production smoke tests are unconfirmed |
| Beta acceptance testing | **35%** | Automated checks cover selected contracts/builds; full browser, mobile, accessibility and real-user journeys remain |

### At-a-glance progress

| Readiness area | Progress bar |
| --- | --- |
| Pages, navigation and visual foundation | `███████░░░ 75%` |
| Community and daily-use features | `██████░░░░ 65%` |
| Accounts, notifications and messaging | `██████░░░░ 57%` |
| Security, moderation and backend integration | `█████░░░░░ 50%` |
| Arcade and token economy | `█████░░░░░ 50%` |
| Release verification and beta QA | `████░░░░░░ 35%` |

**How to read this:** a feature can be present in the repository and still be short of beta-ready if its database migration, permissions, deployed version or real-user behaviour has not been verified. Treat these figures as directional planning estimates and update them only when new evidence supports a change.

### Recommended order to reach beta

1. **Close the account and community journeys:** verify sign-in, session refresh, password recovery, post/comment actions, Shorts reactions/reports, notifications and DM preferences with real test accounts.
2. **Resolve backend certainty and permissions:** identify the Supabase project used by the live app, reconcile migration histories, investigate the Shorts engagement schema-cache error, and test role hierarchy/RLS in approved staging.
3. **Finish private reflection safely:** approve the storage transition, then test save/read/update/delete, account isolation and failure handling before merging or applying its migration.
4. **Complete release checks:** confirm the deployed commit on each host, resolve the Vercel rate-limit blocker, and run responsive, keyboard/accessibility and production smoke tests.
5. **Keep spending locked until safe:** do not enable token purchases or deductions until server-side ownership, balance checks, idempotency, immutable ledger and staging tests are verified.


## Integration batch checkpoint — 2026-10-28

The following focused PRs have been merged into `main` as a single integration batch:

- PR [#185](https://github.com/platinumsoundz/Guild-Sanctuary/pull/185), merge commit `a832dd366b7cd5f397cc5d47a4a269fb4dc7c585`: production Cloudflare deploys now require explicit workflow dispatch while this integration batch is assembled. PR/main CI and Cloudflare builds remain enabled; provider secrets/settings were not changed.
- PR [#184](https://github.com/platinumsoundz/Guild-Sanctuary/pull/184), merge commit `3a74b959761d76ffc68e0aad7d50080b16031c54`: map-based event discovery, accessible pins, nearby radius, past-event filtering and coordinate-edit persistence.
- PR [#183](https://github.com/platinumsoundz/Guild-Sanctuary/pull/183), merge commit `5b09b2d6e7a935bbae978624b6b9b4f95d9809ae`: Life Lesson and Conversation Starter feed templates.
- PR [#181](https://github.com/platinumsoundz/Guild-Sanctuary/pull/181), merge commit `4e8c276e7d429f9b706d91c7aa935b014e874c98`: explainable, deterministic personalised learning path in Sanctuary Intelligence.
- PR [#178](https://github.com/platinumsoundz/Guild-Sanctuary/pull/178), merge commit `b611c7cda823dcebbd22a3682b395d820705837b`: Today landing page and responsive navigation.
- PR [#179](https://github.com/platinumsoundz/Guild-Sanctuary/pull/179), merge commit `5e0b06afb0884374779fb62a667e96319eae470c`: separate Sanctuary-built Cosmic Arcade from external creator projects; add classic mini-games and progression contracts; keep token spending disabled. The leaderboard migration is repository code only and has not been applied.

### Verification and release status

- The exact feature heads passed their GitHub CI / contract / build checks, including typecheck and production build. The final #179 integration head `093c8c29c4325617651428b7096665a50621e222` passed CI, the Cloudflare Worker build, and focused contracts. An intermediate typecheck caught a malformed JSX grouping during navigation integration; it was corrected and the final head passed.
- Mainline CI passed on merge head `5e0b06afb0884374779fb62a667e96319eae470c` (run [40703200916](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40703200916)).
- Mainline Cloudflare Worker build was still running at the time of this entry. The deploy step is guarded to skip on PR/push and run only for explicit `workflow_dispatch`; verify the completed workflow before claiming its build result. No production deployment was intentionally initiated.
- Vercel preview checks report a provider build-rate-limit failure. Browser/device, keyboard/screen-reader and real-user journey QA remain outstanding; CI success is not a substitute for those checks.

### Remaining open work — do not merge blindly

- [#145 — database-backed Daily Reflection](https://github.com/platinumsoundz/Guild-Sanctuary/pull/145): branch is behind current main and includes a private-storage migration. Owner must approve the local-to-account-backed storage transition, reconcile migration history, and run authenticated cross-account/deletion/failure tests before merge or application.
- [#81 — moderation hierarchy](https://github.com/platinumsoundz/Guild-Sanctuary/pull/81) and [#84 — member-role authorization lock](https://github.com/platinumsoundz/Guild-Sanctuary/pull/84): static contracts pass on recorded heads, but the SQL changes remain gated on independent security review and owner-approved staging/concurrency authorization tests.
- [#85 — beta showcase](https://github.com/platinumsoundz/Guild-Sanctuary/pull/85): broad, heavily diverged and non-mergeable. Do not force-merge; split/reconcile unique work against the now-merged Today, Arcade and Intelligence slices.
- [#5 — game wallet bridge](https://github.com/platinumsoundz/Guild-Sanctuary/pull/5): targets `feature/token-shop-and-games-hub`, not `main`; that base is substantially diverged from current main. Reconcile the wallet/session/migration dependency chain and retarget only after reviewing the full diff. Token spending remains disabled.
- Old unreferenced feature branches have not been deleted: identify unique work and confirm it is merged or superseded before cleanup. No branch was force-pushed or deleted in this pass.


## Support and creator-project navigation (2026-10-28)

- **Merged to main; QA pending:** The Support page presents voluntary contribution options first, then embeds the external creator-project hub beneath them.
- The Support page heading is “Support the creator”; the navigation label remains “Support the community”.
- The dedicated **Cosmic Arcade** navigation entry opens Sanctuary-built mini-games; the Support page keeps external creator projects separate. The Arcade/creator separation is merged in PR #179.
- Contribution checkout, provider settings, and external game host configuration remain gated by owner-only setup and verification.

## Sanctuary home showcase — clean integration slice (2026-10-28)

- **Merged to main; automated checks passed, browser/device QA pending:** Ported the Today landing/showcase component and responsive styles from the conflicted beta showcase branch onto current `main` in PR #178.
- Added a dedicated Today route and made it the initial destination for fresh sessions, with Today accessible on mobile and desktop navigation.
- Added a focused static contract for route wiring, navigation reachability, responsive CSS, reduced motion, and non-clinical copy.
- This slice intentionally does **not** port the conflicted self-discovery persistence UI or migration. Private self-discovery remains a separate privacy/RLS review and owner-approved staging task.
- Source: PR #178, merge commit `b611c7cda823dcebbd22a3682b395d820705837b`. Browser/device QA remains pending.

## Mainline PR reconciliation (2026-10-28)

The following focused changes are now merged into `main`:

- PR [#172](https://github.com/platinumsoundz/Guild-Sanctuary/pull/172), merge commit `3b2eba2b58135b3c65de67abe4ae21798719f00d`: subtle theme-aware cosmic visual polish. CI, Cloudflare workflow, and Vercel check passed on its PR head; visual/device QA remains pending.
- PR [#173](https://github.com/platinumsoundz/Guild-Sanctuary/pull/173), merge commit `089a0a0bcc92ca32c089f9208d99d1cb15b2ff33`: public-profile names in feed and messaging surfaces. CI and Cloudflare workflow passed on its PR head; Vercel check failed with a build-rate-limit link.
- PR [#175](https://github.com/platinumsoundz/Guild-Sanctuary/pull/175), merge commit `9492d65944dbaa1e2424999752023418b74aca2a`: Cosmic Arcade prototypes and README refresh. CI and Cloudflare workflow passed on its PR head; Vercel check failed with a build-rate-limit link.
- PR [#176](https://github.com/platinumsoundz/Guild-Sanctuary/pull/176), merge commit `b8499f255ee08826b35b83c53b0b16d44bc37f61`: Support page creator-project hub integration, reconciled against the merged arcade navigation. CI and automated roadmap/build check passed on its PR head; Cloudflare workflow was still running at merge time and Vercel reported the build-rate-limit blocker.

**Important:** a green CI or Cloudflare workflow is not proof that the current public production domain serves that commit. Vercel build-rate-limit failures require owner-side account/plan action; provider and deployment settings remain owner-controlled. Browser/device QA and exact live-deployment SHA confirmation remain outstanding.

## Cosmic Arcade update (2026-10-28)

- **In code, QA pending:** Restored a dedicated Games navigation entry labelled “Cosmic Arcade”; existing creator/community game links remain in the Games hub.
- **Playable prototypes:** Starseed Word Search supports two-tap straight-line selection (horizontal, vertical, and diagonal), exact found-cell highlighting, progress, reset, and completion feedback. Cosmic Snake has keyboard and mobile controls, score, personal-best tracking for the current visit, and restart.
- **Playable preview:** Lunar Solitaire has a shuffled 52-card deal, seven tableau columns, stock/waste recycling, alternating-colour descending tableau moves, Ace-to-King suit foundations, automatic reveal of newly exposed cards, restart, and responsive card styling. It is a client-side single-visit prototype; persistence and automated gameplay QA remain pending.
- **Playable preview:** Celestial Crossword has across/down clues, shared letter cells, answer checking, keyboard arrow navigation between open cells, clue selection that focuses the first letter, reset, and responsive layout. It is a small starter puzzle, not yet a larger puzzle pack.
- **Planned:** Zodiac Mahjong remains a concept and is not labelled playable.
- **Regression contract added:** `npm run check:cosmic-arcade` checks key gameplay, crossword keyboard/clue-focus guardrails, navigation, styles, and spending-lock guardrails; it is a static source contract, not browser QA. CI typecheck/build and the arcade contract passed for the PR #175 head before merge. Interactive browser/device QA, accessibility review, persistence tests, and wallet/RPC tests remain pending.
- **Token economy — design only / spending locked:** Theme previews and example consumables (hints, extra lives, and a 50-token Snake revive) are shown as future ideas. No arcade item is purchasable and this UI does not deduct tokens.
- **Required before token spending:** Implement a server-authoritative game economy/RPC with authenticated ownership, wallet balance checks, idempotency keys, game-session validation, and immutable ledger entries. Define whether revives/boosts are consumables, expiry/refund rules, and exploit/rate limits. Require owner-approved Supabase migration and isolated staging tests before enabling spending.
- **Validation status:** The arcade PR's CI and Cloudflare workflow completed successfully before merge; the Vercel check failed with a build-rate-limit link, so no Vercel deployment is claimed. Keyboard/screen-reader review, interactive mobile gameplay QA, persistence tests, and end-to-end wallet/RPC tests remain pending.

Owner: product owner (Ashley)
Status: planning document. Nothing here is built unless it says so.

This is the single product roadmap for The Sanctuary. `MASTER_BLUEPRINT.md` records implementation state; `AI_RESTORE_PROMPT.md` is the session handoff. The current database migration inventory is recorded in `docs/SUPABASE_MIGRATION_DRIFT_INVENTORY_2026-10-26.md`. Keep these sources aligned when a decision or status changes.

Status labels used below:

- **Idea** — discussed, not designed.
- **Planned** — agreed direction, no code.
- **In code** — implemented in the repository.
- **Unapplied** — code exists but its SQL/functions are not applied or deployed.
- **Verified** — actually tested against a named staging/production build, with evidence recorded. Do not infer verification from source code or a successful build.
- **Deferred** — deliberately postponed.
- **Rejected** — decided against; do not reintroduce without the owner.

## 1. Identity and naming

- The product is **The Sanctuary**. It is no longer "Guild Sanctuary" or
  "The Guild Sanctuary".
- Retire "Guild" from user-facing copy, docs headings, and the app shell. The
  GitHub repository name (`Guild-Sanctuary`) and the Android application ID
  (`com.guildsanctuary.app`) stay for now: changing the app ID breaks installed
  builds and store identity, and the repository name is not user-facing.
- Current shell inspection (2026-10-27):
  - `src/components/ResponsiveShell.tsx` currently renders the install banner
    above the app stage; it does **not** contain a `GUILD / SANCTUARY` title or
    `G` brand mark in the checked-in main revision. The install banner has an
    Install action and a dismiss button that persists the choice in local
    storage.
  - The theme foundation from PR #69 is merged to `main` according to the
    current coordination issue. Treat theme tokens and theme selection as
    **in code**, but keep browser/device QA and production deployment as
    **unverified** until exact-SHA and live-host evidence is recorded.
  - The oversized black `Guild / Sanctuary / Community Activity` area reported
    by the owner was not found in the checked-in shell/feed source inspected on
    2026-10-27. Before editing another component blindly, verify the live
    deployment commit and capture which route/component renders that area.
  - `package.json` — `"name": "guild-sanctuary"` is internal only; rename when
    convenient, not urgent.
  - Documentation headings still say "Guild Sanctuary" in places.
- The brand should be quiet and warm: sun/light imagery, green and gold, no
  hype language. "Guild" implied a game faction; "Sanctuary" implies safety.

## 2. Product principles

1. **Connection first, content second, commerce last.** Tokens buy expression,
   never reach, status, or another person's attention.
2. **Personal growth inside a social environment.** The point is to grow with
   people, not alone and not in competition.
3. **Nobody should feel alone here.** The default emotional tone is warmth,
   honesty, and permission to be unfinished.
4. **Positivity without fakery.** People can share hard days; the community
   responds with care, not performative positivity.
5. **Mental wellbeing sits beside spirituality.** Reflection, mood, grief,
   burnout, and everyday mental health are in scope. Diagnosis and treatment
   are not.
6. **Wisdom is free.** Members share life lessons and practice through posts,
   replies, and circles at no cost. Paid guides are a future option, not a
   gate on community support.
7. **Privacy is a feature.** Private by default for sensitive self-knowledge;
   explicit sharing only.
8. **No anonymous posting for now.** Guest mode is read-only and is enough.
   Members post under their account. Revisit only with a real safety design.
9. **Calm technology.** No infinite scroll pressure, no streak punishment, no
   public follower leaderboards, no ads in vulnerable spaces.
10. **Small and trustworthy beats large and opaque.** Prefer curated guides,
    small circles, and explainable moderation.

## 3. Decisions locked on 2026-10-27

| Area | Decision |
| --- | --- |
| Name | The Sanctuary only; retire Guild branding in the UI and docs |
| Relationships | **Friend** (mutual, request/accept) and **follow** (one-way). One-way relationships are allowed. |
| Anonymous posting | Not now. Guest mode remains read-only. |
| Practices and guides | In scope. Free wisdom sharing first; guide account monetisation is a future option. |
| Focus | Personal growth in a social environment; spiritual *and* mental wellbeing; positivity and emotional honesty |
| Self-knowledge | Derive insight from details the member provides (birthday → star sign; likes/dislikes; personality questionnaire; optional body metrics) |
| Personality typing | Use a 16-type style questionnaire, described as a self-reflection profile — **not** official MBTI and not clinical |
| Dark mode | Wanted as soon as possible, with a theme system designed for future themes/flavours |
| Commerce | Tokens stay cosmetic-only; no gifts, transfers, trading, marketplace, or cash-out |
| Guest mode | Read-only; no posting, spending, or DMs |
| Moderation hierarchy | Strict rank hierarchy applies to account and content actions; no self-targeting; actor must strictly outrank target/owner; missing role/owner data fails closed; all actions require rationale and audit trail |

## 4. Workstreams

Workstreams are not strict phases; several can run in parallel. W1 is the
existing launch gate and must complete before any live payment.

### W0 — Identity and visual foundation (do first)

| Item | Status | Notes |
| --- | --- | --- |
| Rename the app shell to The Sanctuary | Planned | `ResponsiveShell.tsx` only code touchpoint |
| Fix shell contrast | Planned | Body is `#0a0a0a`, toolbar text `#4c5b50`/`#3f6049` outside the light surface; near-invisible |
| Single app shell | Planned | Remove the duplicate toolbar/header/nav layers |
| Theme token system | In code | Semantic CSS variables and global focus/reduced-motion styles added; CI and visual review pending |
| Cosmic visual polish | In code, QA pending | Subtle theme-aware star field and aurora gradients; reusable AI tags, cosmetic badges, gradient outlines, and chat bubble styling added. Integrated designed labels into the private self-discovery entry/result states and profile header. Static contract coverage added; run CI and verify visually across themes/devices before marking verified |
| Dark mode | In code | Working theme application path and pre-render device storage bootstrap; CI and visual review pending |
| Theme presets and future flavours | In code, QA pending | Theme foundation includes Light, Dark, Dusk, and System options; verify the exact merged implementation and browser persistence before marking verified |
| Typography scale | In code, partial | Planner form controls are 15px, supporting copy 14px, and desktop navigation labels 14px; a whole-app typography pass and visual review remain planned |
| Component primitives | Planned | Button, Card, Dialog, Sheet, Tabs, Toast, EmptyState, Skeleton, Avatar, Badge |
| Navigation restructure | In code, partial | Desktop labels and touch targets improved; mobile fixed bottom tabs currently expose Today, Community, Discover, Messages, You with safe-area/content spacing. Circles and Practice destinations plus desktop rail redesign remain planned; browser/device QA pending |
| Feed polish | In code, partial | Relative/local post timestamps with exact local time available, readable post metadata, comment author IDs replaced by display names or a safe fallback, and Report moved into a compact post overflow menu; CI and browser QA pending |
| Social author identity | In code, QA pending | Feed posts, inbox direct-conversation rows, direct-thread headers, and group-message sender labels resolve public profile names instead of showing generic labels or raw sender IDs; missing-profile fallback remains; CI and browser QA pending |
| Event form fix | Planned | Replace raw latitude/longitude with place search, timezone, online/offline |

**Dark mode and theming design**

- Define tokens once: `--bg`, `--surface`, `--surface-raised`, `--ink`, `--muted`,
  `--line`, `--accent`, `--accent-contrast`, `--danger`, `--success`, radii,
  spacing, shadow, and motion duration.
- `:root` holds light; `[data-theme="dark"]` overrides. Use
  `color-scheme: light dark` correctly and stop the current mixed state where
  the page declares dark but renders a light surface.
- Profile accent (`--profile-accent`) stays separate from the app theme so a
  member's colour choice does not repaint the whole product.
- Persist theme choice in `account_settings.preferences` and mirror it locally
  to avoid a flash before settings load.
- Future themes should be data-driven presets (token maps), not new CSS files.
- Respect `prefers-reduced-motion` and keep the existing Framer Motion
  `MotionConfig reducedMotion="user"`.

### W1 — Trust, safety, and launch gates (existing "Phase 1")

Status: **Partially in code; not verified end-to-end.** Check the current main-branch implementation and the release gates before treating any item as complete. The prior branch's `PHASE1_STAGING_CHECKLIST.md` is not present on main and is not a release approval.

- 18+ token purchase gate with server-side record
- Refund/chargeback clawback with manual review flags
- Seven-day account deletion grace, restore, and purge
- Terms acceptance version and timestamp, flag off until approved text
- Admin/moderation dashboard: reports, members, appeals, refund reviews, audit
- Strict account and content moderation hierarchy, self-target rejection, post-lock role rechecks, rationale validation, and audit logging (proposed in PR #81; not staging-verified)
- Member role changes lock actor/target rows before authorization and enforce strict hierarchy even for owner-to-owner changes (proposed in draft PR #84; not staging-verified)

Do not enable live checkout, ads, or the terms gate until the checklist has
actually run. This workstream is a hard gate, not a suggestion.

### W2 — Connection layer

| Item | Status | Notes |
| --- | --- | --- |
| Notifications data model and in-app bell | In code, live event delivery unverified | Notification table/UI and read-state handling exist in the repository; live migration state and event delivery need owner/staging verification |
| Notification preferences | Planned | Per type and channel; quiet hours; digest |
| Email notifications | Planned | Daily/weekly digest; make the existing inert setting real |
| Web push + Android push | Planned | Requires a service worker; Capacitor push later |
| Follow (one-way) | Planned | `follows` table, follower/following lists, privacy control |
| Friend (mutual) | Planned | Request → accept/decline; `friendships` with status |
| Relationship-aware feed | Planned | Community / Friends / Following tabs, all reverse-chronological at first |
| Global search | Planned | People, posts, events, tags, practices; grouped results |
| Save / Keep | Planned | Private bookmarks for posts, events, practices, reflections |
| Share | Planned | External (Web Share API) and internal (send to DM) |
| Public URLs and previews | Planned | `/@username`, `/post/:id`, `/event/:id`; SSR metadata + Open Graph |
| Block / mute / restrict | Planned | Block prevents DMs and mutual visibility; mute hides; restrict hides comments |
| Message requests | Planned | Stranger DMs go to a request folder, not the inbox |
| Rich messaging | Planned | Read receipts, unread counts, typing, attachments, message search |
| Onboarding | Planned | Intention, interests, privacy defaults, safety briefing, display name |

**Relationship model**

- `follows(follower_id, followee_id, created_at)` — one-way, unique pair.
- `friendships(requester_id, addressee_id, status, created_at, responded_at)` —
  `pending` / `accepted` / `declined` / `blocked`. One row per pair; the pair is
  normalised so the same two people cannot create duplicates.
- Friend request and accept generate notifications.
- Blocking is separate and overrides both. A blocked person cannot follow,
  friend, message, or see the blocker's content.
- Show counts only as context ("12 friends"), never as a ranking.
- Privacy controls: who may follow (everyone / approved), who may friend
  (everyone / friends of friends / nobody), who may DM.

**Notification types (initial)**

- Social: follow, friend request, friend accept, like, comment, reply, mention
- Messaging: new DM, message request
- Community: circle invite, circle post, event reminder, event change
- Growth: daily prompt (opt-in), weekly reflection digest
- Account: moderation outcome, appeal outcome, token/refund outcome, security
- Never notify on every like by default; batch low-priority events.

### W3 — Personal growth and self-discovery

| Item | Status | Notes |
| --- | --- | --- |
| Daily Planner + reflection | In code, QA pending | Tasks, habits, notes and daily reflection are grouped in the private planner; planner and reflection data remain browser-local and are not synced. Authenticated browser QA pending |
| Today home | Planned | Daily prompt, mood, one practice, one reflection, next circle |
| Mood/energy check-in | Planned | 10-second entry, private history, gentle patterns |
| Private journal | Planned | Prompts, tags, search, export, optional share-as-post |
| Self-discovery profile | Planned | See section 5 |
| Insights | Planned | Private patterns across mood, practice, sleep, and social energy |
| Gentle feed / content care | Planned | Sensitive tags, spoiler blur, hide debate/politics |
| Private milestones | Planned | Practice and journaling milestones visible only to the member |
| Life lessons format | Planned | A longer, structured post type: lesson, context, what helped |

**Life lessons** are the bridge between wisdom sharing and the feed. Suggest a
light structure (situation → what I learned → what helps now) but never force
it. They are normal posts with an optional template and tag, not a paywalled
product.

### W4 — Community, practices, and guides

| Item | Status | Notes |
| --- | --- | --- |
| Circles | Planned | Small topic groups with named stewards and a member cap |
| Practice library | Planned | Guided meditation, breathwork, readings, journaling prompts |
| Practice sessions | Planned | Timer/player, completion, private history, optional circle check-in |
| Guides | Planned | Credibility label, tradition, disclosures, no medical claims |
| Live audio rooms | Planned | Meditation sits, talks, Q&A; audio-first, video later |
| Events upgrade | Planned | Place search, timezone, online option, capacity, host card |
| Circle safety | Planned | Clear norms, steward tools, report/escalate path |

**Circles** are the Discord-server/subreddit pattern sized for trust: 8–50
members, a topic, a named steward, and a pinned intention. Start with a small
curated set. Do not open public circle creation until moderation can cope.

**Practices** are first-party and curated. A practice has a title, intention,
duration, audio or text, tradition/source, and an optional guide. Free at
launch. Downloads and offline playback come with the service worker.

**Guides** are members with a verified credibility label, not a separate
account type at first. A guide profile adds tradition, training, disclosures,
and a statement of what they do not offer (medical or crisis care). Guide
monetisation is deferred; see W7.

### W5 — Wellbeing and safety maturity

| Item | Status | Notes |
| --- | --- | --- |
| Crisis resources in-app | Planned | Persistent, quiet link in support, circles, and journal |
| Teen defaults | Planned | Stricter discovery, DMs, and spending for 13–17 |
| Suspended/banned appeals | Planned | Restricted sign-in state or out-of-band appeal form |
| Ban-evasion mitigation | Planned | Retain a hashed identifier through purge; manual re-registration review |
| Moderator wellbeing training | Planned | Self-harm, grief, abuse, exploitation, CSEA escalation |
| Transparency summary | Planned | Annual reports received/actioned/appealed |
| Peer-support boundaries | Planned | Listening, not therapy; clear escalation language |

Mental wellbeing is in scope, so the safety floor has to be higher than a
generic social app: no medical claims, no diagnosis, no crisis service
pretence, and a visible route to real help.

### W6 — Platform maturity

| Item | Status | Notes |
| --- | --- | --- |
| Service worker / offline | Planned | Cache shell, journal, and practices |
| Push infrastructure | Planned | Web push + Capacitor push |
| Data export | Planned | GDPR portability; journal, posts, profile, wallet |
| Retention and deletion clarity | Planned | Show what is hidden, retained, and purged |
| i18n and RTL | Planned | Needed earlier if the audience is global |
| Passkeys and OAuth | Planned | Reduce OTP friction; keep TOTP |
| Analytics and health dashboards | Planned | Privacy-respecting product metrics, no ad-tech profiling |
| Rate limiting and media scanning | Planned | Production hardening |

### W7 — Future monetisation (deferred)

| Item | Status | Notes |
| --- | --- | --- |
| Guide subscriptions | Deferred | Optional paid offerings; community help stays free |
| Paid practices or courses | Deferred | Curated, clearly labelled, refundable per policy |
| 1:1 sessions | Deferred | Needs booking, safety, and refund design |
| Token cosmetics | In code, Unapplied | The only current sink; keep it that way |
| Gifts, VIP, post promotion | Deferred | Do not implement without explicit approval |
| Transfers, trading, marketplace, cash-out | Rejected | Keep rejected |

Rules for any future monetisation:

- Never paywall peer support, crisis content, or the ability to ask for help.
- Never sell reach or ranking.
- Prices and entitlements stay server-side.
- Refund clawback rules apply to any new paid product.
- A guide's paid offering must be separable from their free community presence.

## 5. Self-discovery and insight design

The goal is to give something back to the member from what they share, without
turning the profile into a horoscope gimmick or a medical chart.

### Inputs (all optional unless needed)

| Input | Source | Default visibility | Notes |
| --- | --- | --- | --- |
| Birthday | Member | Private, or month/day only | Derive star sign; do not ask twice |
| Star sign | Derived | Public if birthday sharing is on | Never hand-enter a conflicting sign |
| Height / weight | Member | **Private only** | Self-tracking framing; no BMI labels |
| Likes / dislikes | Member | Public by choice | Tags and free text; used for circles and people suggestions |
| Values | Member | Public by choice | e.g. honesty, family, nature, service |
| Personality questionnaire | Member | Private by default | 16-type style, shareable summary |
| Energy rhythm | Derived from check-ins | Private | "Morning / evening" patterns, no judgement |
| Practice interests | Member | Public by choice | Meditation, breathwork, journaling, philosophy |

### Outputs

- Star sign description written as reflection prompts, not predictions.
- Personality profile with strengths, stressors, and how the member likes to
  communicate; clearly labelled as self-reflection, not a diagnosis.
- Suggested practices based on stated interests and mood patterns.
- Suggested circles and people based on values, interests, and mutual friends.
- Private insight cards: "You tend to check in lower on Sundays", "You finish
  more practices in the morning" — with an easy way to turn insights off.

### Guardrails

- **Birthday:** storing a full date of birth is sensitive. Prefer storing
  month/day plus an optional year, or derive and store only the sign. The 18+
  purchase gate keeps its own verification record.
- **Height and weight:** do not compute or display BMI, "ideal" weight, or
  calorie targets. Do not show body metrics publicly. Offer a hide option and
  make the feature adult-only if it ships at all. This needs a wellbeing review
  before implementation.
- **Personality:** do not use "MBTI" as an official label unless licensed.
  Call it a "16-type personality profile". Do not use results for moderation,
  advertising, ranking, or matching that could disadvantage someone.
- **Quiz data:** answers are private, retakeable, exportable, and deletable.
- **No predictions, no certainty.** Language is "some people find", "you might
  notice", never "you are" or "this will happen".
- **No public scores.** No attractiveness, mental-health, or compatibility
  score visible to others.

### Suggested implementation order

1. Birthday → derived star sign, with privacy controls.
2. Likes/dislikes/values tags on the profile.
3. 16-type questionnaire with a private result and optional summary card.
4. Private insight cards from check-ins.
5. Gentle suggestions (practices, circles, people).

## 6. Comparison findings adopted into this roadmap

The 2026-10-27 platform comparison reviewed Meta, TikTok, X, Reddit, Discord,
WhatsApp/Telegram, YouTube, MySpace, Patreon/Substack, Meetup, Insight Timer,
Calm, and 7 Cups. The findings that shaped this roadmap:

- **Adopted:** notifications, social graph, global search, saved items,
  sharing, block/mute, public pages, rich messaging, circles, live audio,
  guide credibility, mood/journal, push, offline, data export.
- **Adapted:** "followers" → friend + follow; "streaks" → gentle return;
  "creator monetisation" → deferred guide offerings; "anonymous" → rejected
  for now; "algorithmic feed" → community/friends/following tabs.
- **Rejected:** public vanity rankings, infinite feed pressure, gifting and
  creator rankings, over-customised profiles, ads in vulnerable spaces.

The full gap analysis lives in the session report and is summarised here; it is
not a separate permanent document.

## 7. Deliberately out of scope

- Anonymous or throwaway posting (revisit only with a safety design).
- Live video streaming (audio rooms first).
- Token transfers, trading, marketplace, cash-out, gifts, VIP, post promotion.
- Public follower leaderboards or engagement scores.
- Medical, therapeutic, or diagnostic claims.
- Advertising inside journal, circles, or crisis surfaces.
- Under-13 accounts.
- Official MBTI branding.
- A recommendation algorithm that optimises time-on-app.

## 8. Open questions for the product owner

1. Should new members follow the whole community by default, or start empty?
2. Can strangers send friend requests, or only follow first?
3. Do we store a full birthday, month/day, or only the derived star sign?
4. Should height/weight ship at all, and should it be 18+ and private-only?
5. How long should the personality questionnaire be (10, 20, or 40 questions)?
6. Should personality results be shareable as a profile card?
7. What is the first set of circles (grief, meditation, philosophy, creativity,
   sobriety, parenthood)?
8. Who are the first guides, and what evidence earns the label?
9. Should guides be able to accept tips before subscriptions exist?
10. Which theme presets ship first (Light, Dark, Dusk, High contrast)?
11. What is the first public URL shape: `/@name`, `/u/name`, or `/members/name`?
12. When do teen defaults become a launch requirement?

## 9. Change log

- **2026-10-27** — Roadmap created. Locked naming, friend + follow
  relationships, no anonymous posting, free wisdom with future guide
  monetisation, spiritual + mental wellbeing focus, self-discovery inputs, and
  dark mode with theming. Recorded comparison findings and UI fixes.
- **2026-10-27** — Locked moderation policy: self-targeting is prohibited;
  actors must strictly outrank account/content owners; unknown role or owner
  data fails closed; owner role changes cannot target an equal-ranked owner.
  PR #81 contains the moderation proposal and PR #84 the role-change race fix;
  both remain unapplied pending staging/concurrency tests and independent review.


## 10. Competitive research and product learning

The owner asked for a comparison against real-world apps and platforms. Treat this as ongoing product research, not a mandate to copy competitors. Record findings and sources in a dated report under `docs/reports/`, then summarise accepted product implications here.

### Comparison set

- **Community and conversation:** Discord, Reddit, Facebook Groups, WhatsApp, Mighty Networks.
- **Identity, discovery, and creator ecosystems:** Instagram, YouTube, Twitch, Patreon.
- **Habits, reflection, and wellbeing:** Finch, Daylio, Headspace, Duolingo, Habitica.
- **Play, belonging, and creation:** Roblox, Steam.
- **Personal knowledge and organisation:** Notion.

For each platform, compare concrete user journeys and publicly documented capabilities: onboarding, discovery, social graph, group/community structure, messaging, creation tools, accessibility, privacy controls, moderation/reporting/blocking, safety for vulnerable users, notification pressure, monetisation, portability/deletion, platform constraints, and known user complaints. Separate verified facts, source-backed criticism, and the team's hypotheses. Prefer official product/help/privacy documents and current high-quality reporting; use community feedback as qualitative evidence rather than universal truth.

### Sanctuary differentiation guardrails

- Borrow useful patterns only when they reinforce growth with people, free community wisdom, emotional honesty, optional/private self-discovery, calm technology, privacy, and explainable safety.
- Do not introduce infinite-scroll pressure, streak punishment, public vanity leaderboards, selling reach, paid access to core peer support, manipulative notifications, or medical/diagnostic claims.
- Every proposed competitor-inspired feature must include member benefit, likely harms, privacy/safety impact, accessibility, engineering cost, success measure, and a decision of adopt / adapt / defer / reject.
- Keep the core community and safety experience useful without purchases. Tokens remain cosmetic-only.

## 11. Phase 1 execution and exit criteria

Phase 1 is the trust/safety launch gate in W1. It is **not complete** merely because code, a branch, or a checklist exists. Current status remains partially implemented and not end-to-end verified until evidence is attached.

### Parallel work packages

| Work package | Owner lane | Branch / anchor | Completion evidence |
| --- | --- | --- | --- |
| P1-A: visual foundation and accessible shell | Product & Experience | Existing PR #69, `build/roadmap-theme-foundation-2026-10-27` | CI for exact head, reviewed diff, browser/device checks; no claim of deploy until observed |
| P1-B: trust and safety | Engineering & Reliability | Existing PR #18, `feature/phase1-trust-safety` (verify live head before work) | Unit/integration tests plus `PHASE1_STAGING_CHECKLIST.md` executed against disposable staging |
| P1-C: operating model and agent handoff | Roadmap & Integration | `build/phase1-agent-coordination-2026-10-27` | Agent rules, ownership, acceptance criteria, and reports available to all supported coding agents |
| P1-D: independent review | Separate reviewer agent | Branch/PR chosen after P1-B diff inventory | Review findings and resolutions recorded; security-sensitive changes not self-approved |

### Phase 1 release gate

Before any release is called Phase 1 complete, verify: age eligibility is enforced server-side; terms version/time acceptance is recorded while the gate stays off until approved legal text; deletion request, restore, and purge respect the seven-day grace and authorization checks; refund/dispute processing is idempotent and never creates an automatic negative wallet balance; admin/moderation actions enforce role boundaries and audit events; migration state matches the target staging database; CI and security acceptance tests pass on the exact revision; backup/restore and rollback are understood; and a human owner approves the release.

Until these criteria pass, keep live checkout, ads, mandatory Terms gate, and production migrations disabled. If staging access or secrets are unavailable, mark the item **Blocked** and leave a precise safe next action. Do not represent a local build as end-to-end verification.

## 12. Multi-agent development rules

The authoritative operating model is `docs/AI_AGENT_OPERATING_MODEL.md`; all agents must read it through `AGENTS.md` and their platform entry file. Product & Experience and Engineering & Reliability may run in parallel only when file ownership and dependencies are separated. The roadmap coordinator owns canonical roadmap, blueprint, handoff, and agent-rule updates. Each task uses its own branch and focused PR; security-sensitive changes require an independent review. Keep The 5 Sleeves Online/2D and The 5 Sleeves 3D aligned to this roadmap through explicit contracts and separate repository work.


## Verified delivery checkpoint — 2026-10-27

- **Merged to `main`:** PR #157, commit `6deb72e684f237020458d5bfdeca3dd6a5bdb739`. Includes moving Daily Reflection into Personal Planner, mobile primary navigation, desktop navigation polish, community-feed improvements, and added regression contracts.
- **Checks:** CI / build-and-deploy workflow and contract checks passed on PR #157's recorded head. Cloudflare production deployment was skipped. Vercel reported the daily deployment quota limit; no new production deployment is claimed.
- **Not release-verified:** authenticated browser/device QA, account-switch testing, mobile accessibility checks, and Phase 1 staging checklist remain outstanding. Planner/reflection data are browser-local, not cloud-synced.
- **Open follow-up stack:** PRs #158–#170 remain separate, mostly stacked draft work for notification UX, reflection export/storage safety, account-switch isolation, messaging RPC contracts, and E2EE readiness documentation. Check exact current heads and dependencies before merging; do not claim messaging is end-to-end encrypted.
- **Superseded/overlapping drafts:** PR #155 (move Daily Reflection to planner) and #156 (planner/theme contract coverage) overlap changes now included in #157; review and close as superseded once their unique diffs are confirmed absent.
- **Owner-only provider work:** Supabase, Stripe, Lemon Squeezy, Cloudflare, and Vercel account configuration/migrations/secrets remain explicit owner handoff tasks. Do not change provider configuration or enable checkout as part of code cleanup.
- **Next release gate:** integrate the remaining stack in dependency order, re-run CI against each final head, then complete authenticated two-account and device/browser QA. Phase 1 remains not end-to-end verified.

## Integration and release checkpoint — 2026-10-27 (latest)

### Merged to `main`
The following PRs are merged and present in the current mainline: #157–#170. The integration sequence covered responsive navigation/feed polish; notification accessibility and event-time clarity; private self-discovery export and session-state cleanup; an explicit end-to-end encryption readiness plan; notification action/session guards; static messaging RPC security contracts; message-thread and inbox account isolation; event and planner account isolation; fail-closed local reflection storage; and account-settings isolation. PR #155 and #156 were closed as superseded because their unique file changes were included in #157.

### Verification and deployment
- Integration commit after PR #170 merged (before memory-document commits): `d101c2dcf504fae4b8aa54855e293acd77b69700`.
- Mainline CI passed: run [40587495814](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495814).
- Automated roadmap/build check passed: run [40587495899](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495899).
- The repository's Cloudflare deployment workflow completed successfully: run [40587495817](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40587495817). This records workflow success, not a substitute for authenticated browser/device verification.
- Vercel had previously reported its daily deployment quota limit on preview checks. Do not treat that as a failure of the mainline CI or as proof of Vercel production deployment.

### Remaining release gates
- Authenticated browser/device QA is still outstanding: test account switching and isolation for settings, planner, reflections, events, inbox, message threads, and notification actions; verify mobile navigation, keyboard/focus behavior, event timezone display, and reflection storage-denial recovery.
- Messaging remains **not end-to-end encrypted**. The merged readiness document is a plan/gate, not cryptographic implementation. Static messaging contract checks do not prove live Supabase RLS/RPC authorization; two-account staging tests are required.
- Planner, daily reflection, and self-discovery answers/results remain browser-local/session-only as documented; do not describe them as account-synced or cloud-backed.
- Phase 1 is not end-to-end verified until the staging checklist, safety authorization tests, backup/restore and rollback review, and human release approval are complete.

### Open draft work to triage
- #145 — database-backed Daily Reflection recovery: review carefully against the now-merged local-only reflection implementation before integrating; it may change storage/privacy assumptions.
- #122 — guarded token-shop spending plus its merged static contract check: remains a draft; require full CI on the final feature head and live authorization/ledger tests before enabling spending.
- #84 and #81 — member-role authorization and moderation hierarchy: security-sensitive; require independent review and staging authorization tests.
- #85 — beta showcase collaboration; validate feature scope and safety before promotion.
- #5 — game wallet bridge; check compatibility with the token wallet/ledger and keep any spending/transfer claims disabled until verified.

### Owner-only provider handoff
Supabase schema/migrations/RLS and owner bootstrap; Stripe and Lemon Squeezy payment setup; Cloudflare/Vercel account settings, secrets, domains and provider configuration remain owner tasks. The successful Cloudflare workflow was the repository's existing automated release path; no provider account settings or secrets were edited in this cleanup.

## Continued cleanup checkpoint — 2026-10-27

### Mainline and draft status
- Mainline contains the merged privacy/reliability stack #157–#170. The preceding roadmap/recovery checkpoint commit is `aa70be864d8471aeb6af58fab010f758d4514415`; its CI run [40591789913](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591789913), roadmap/build check [40591789891](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591789891), and Cloudflare workflow [40591789945](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591789945) all passed. This documentation commit follows that checkpoint.
- Latest mainline CI, roadmap/build check, and repository Cloudflare deployment workflow passed on the pre-checkpoint mainline. Authenticated browser/device QA is still outstanding; workflow success alone is not proof of user-level acceptance.
- PR #145 (private database-backed Daily Reflection) has now been reconciled onto current main. Its CI, Daily Reflection contract, and dependency-map contract passed on head `b68da680269498b43a30e62635ce6e2848a3bd78`. It remains draft: the owner must approve the storage transition and apply the migration through the approved Supabase workflow, then run authenticated cross-account and failure-path tests. Do not merge/apply automatically.
- PR #122 (token redemption) now includes the token-spend contract from #124, rebased onto current main and merged into its draft branch at `f635b54712df8c3f8c520c2668d39c5a623c5b6a`. The purchase handler and buttons explicitly remain locked with `SPENDING_ENABLED = false`; CI [40591929788](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591929788), dependency-map [40591929744](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591929744), roadmap/build [40591929814](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591929814), and Cloudflare workflow [40591929809](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40591929809) all passed on that exact feature head. Do not enable spending until the owner-approved migration and isolated staging ledger/authorization matrix pass.
- PR #124 was merged into PR #122's feature branch only (merge commit `f635b54712df8c3f8c520c2668d39c5a623c5b6a`) and is closed as merged; this did **not** merge token spending to `main`.
- PR #81 moderation hierarchy is rebased on current main at `3f113c7612eb5c0282512d705e7302aa2dda74d2`; CI, moderation contract, dependency-map and repository workflow checks passed. PR #84 member-role locking is rebased at `a4e816100e8a31a44c45c0ddf28769b79492bc3d`; CI, role-lock contract, dependency-map and repository workflow checks passed. Both remain draft because SQL migrations are not applied and independent staging/concurrency tests and security review are still required.
- PR #85 beta showcase remains non-mergeable and draft; reconcile its broad overlapping changes before promotion. PR #5 game-wallet bridge remains draft on a separate feature base and is blocked on migration/schema reconciliation and scoped game-ticket staging tests.

### Release gates and owner handoff
- Do not enable token spending, game-credit transfers, checkout, ads, mandatory Terms gating, or production migrations merely because source checks pass.
- Supabase schema/migrations/RLS/owner bootstrap, Stripe and Lemon Squeezy payment setup, and Cloudflare/Vercel account configuration, secrets, domains and provider settings remain owner-only handoff tasks. No provider account settings were changed in this cleanup.
- Messaging is not end-to-end encrypted. The readiness document is a plan only. Planner/reflection/self-discovery data must not be described as cloud-synced until the approved database work is applied and tested.
- Phase 1 remains **not end-to-end verified** until the staging checklist, authenticated two-account tests, browser/device QA, backup/restore and rollback review, independent security review, and owner release approval are recorded.
- **Dependency audit blocker resolved:** PR #171 updated Next.js to patched 16.4.3 and aligned the lockfile; its exact-head `npm ci` reported 0 vulnerabilities. Post-merge checks are pending.


## Critical dependency security fix — 2026-10-28

- Merged PR #171: https://github.com/platinumsoundz/Guild-Sanctuary/pull/171.
- Merge commit: `bb0fc5240a2bf571e86384197a37256a8faf85fb`.
- Updated Next.js from 16.4.0 to patched 16.4.3 and aligned `@next/env` and all eight platform-specific `@next/swc-*` lock entries with SHA-512 integrity pins. Existing `sharp` is 0.35.5.
- Added `npm run check:framework-security` to CI to prevent the locked Next.js version falling below 16.4.1 or the @next/env/SWC versions drifting from it, and to require sharp >= 0.35.5.
- On the exact PR head `7815b278c0f9938b5b3fa0dcf27e1071ea45fa22`, `npm ci` succeeded, the framework-security contract passed, full CI/typecheck/build passed, dependency-map contract passed, roadmap/build check passed, and the repository Cloudflare workflow passed. The same install log reported **0 vulnerabilities**.
- Post-merge verification passed on mainline documentation head `edb5f63c571cc69852024920409f81de507e4461`: CI [40672038270](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672038270), roadmap/build [40672037990](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672037990), and Cloudflare build/deploy [40672038151](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672038151). The CI install reports **0 vulnerabilities**, the framework-security contract passes, and the production build compiles.
- This dependency patch does not replace browser/device QA, staging authorization tests, independent security review or the Phase 1 release gates. Token spending remains disabled; messaging is not end-to-end encrypted; owner-only provider setup remains unchanged.


## Latest cleanup continuation — 2026-10-28

### Mainline and checks
- Current mainline integration/security checkpoint: `718210f99f9cc2316af784cf356219f9c42d8593`.
- Mainline CI passed: [40672381006](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672381006).
- Mainline automated roadmap/build check passed: [40672381046](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672381046).
- Mainline repository Cloudflare workflow passed: [40672380786](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40672380786). This does not substitute for authenticated browser/device acceptance.
- PR #171 is merged. Next.js was patched to 16.4.3 with aligned lockfile entries; its recorded exact-head `npm ci` reported zero vulnerabilities. The mainline post-merge checks above are green.

### Current open draft queue (verified 2026-10-28)
- [#145 — private database-backed Daily Reflection](https://github.com/platinumsoundz/Guild-Sanctuary/pull/145): fixed a duplicate SQL mood-constraint declaration and added a contract assertion that catches duplicates. CI, Daily Reflection contract, and dependency-map checks passed on exact head `e85ac8654cf678b15d6e1d843c94296af96b12cc`; Cloudflare deployment run was cancelled by a later branch update and must not be called deployed. Keep draft until the owner approves the local-to-account-backed storage transition and applies the migration through the approved Supabase workflow; then test authenticated cross-account, storage failure, and deletion behavior.
- [#122 — token shop redemption](https://github.com/platinumsoundz/Guild-Sanctuary/pull/122): title/body now correctly state redemption remains locked pending staging. Fixed the static contract, which previously had contradictory grant-vs-revoke assertions and referenced undefined `resolve(root)`. The updated contract check passed on exact head `d87da8b8c7ac2063cd00d2f6c9a493bbb8f62247` ([run 40673060021](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40673060021)). `SPENDING_ENABLED = false`; the UI guard and SQL revoke migration keep spending disabled. Do not enable or merge as a live purchase feature until owner-approved migration reconciliation and authenticated staging ledger/idempotency/authorization tests pass.
- [#81 — moderation hierarchy](https://github.com/platinumsoundz/Guild-Sanctuary/pull/81) and [#84 — member-role locking](https://github.com/platinumsoundz/Guild-Sanctuary/pull/84): their recorded static CI/contracts passed; keep draft pending independent security review and owner-approved staging/concurrency tests for the SQL functions.
- [#85 — beta showcase](https://github.com/platinumsoundz/Guild-Sanctuary/pull/85): still non-mergeable; resolve overlapping broad changes before promotion.
- [#5 — game wallet bridge](https://github.com/platinumsoundz/Guild-Sanctuary/pull/5): still draft; recorded Cloudflare Workers builds failed. Diagnose build errors and reconcile wallet schema/session authorization before considering merge.

### Release gates remain open
- Authenticated browser/device QA for account-switch isolation, private planner/reflection/settings, inbox/thread/events/notifications, mobile navigation, keyboard/focus, and storage-denial recovery.
- Live Supabase RLS/RPC authorization and two-account messaging tests; static checks alone are insufficient.
- Messaging is **not end-to-end encrypted**. Planner and reflection currently remain browser-local until the owner-approved Daily Reflection storage migration is applied and verified; self-discovery results remain session-only.
- Phase 1 is not end-to-end verified until staging security tests, migration reconciliation, backup/restore and rollback review, independent review, and human owner release approval are documented.

### Owner-only provider handoff
Supabase schema/migrations/RLS/owner bootstrap; Stripe and Lemon Squeezy payment setup; Cloudflare/Vercel account settings, secrets, domains and provider configuration remain owner tasks. No provider account settings or secrets were changed in this cleanup.


## Final cleanup checkpoint — 2026-10-28 10:15 UTC

### Latest mainline verification
- Current main commit at the start of this checkpoint: `2342b8d6f061239ca46ffe88d6208998b3b94613` (token-spending fail-closed integration).
- CI passed on that exact SHA: [run 40674535609](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40674535609).
- Automated build/roadmap check passed on that exact SHA: [run 40674535516](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40674535516).
- Phase 1 dependency-map contract passed on that exact SHA: [run 40674535505](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40674535505).
- Repository Cloudflare workflow completed successfully on that exact SHA: [run 40674535617](https://github.com/platinumsoundz/Guild-Sanctuary/actions/runs/40674535617). Treat this as workflow evidence only; authenticated browser acceptance is still outstanding.

### Completed integration and safety decisions
- PR #122 is now merged as [commit 2342b8d](https://github.com/platinumsoundz/Guild-Sanctuary/commit/2342b8d6f061239ca46ffe88d6208998b3b94613). Token-shop spending is intentionally disabled in the UI and the spend RPC remains revoked until owner-approved migration reconciliation and authenticated staging checks pass. This is a safety lock, not a live purchase feature.
- PR #124's static token-spend contract check is merged as [commit f635b54](https://github.com/platinumsoundz/Guild-Sanctuary/commit/f635b54712df8c3f8c520c2668d39c5a623c5b6a).
- The account/session isolation and reflection-storage changes from #157–#170 remain integrated in mainline as previously documented.

### Remaining open draft PRs (current queue)
- [#145 — private database-backed Daily Reflection](https://github.com/platinumsoundz/Guild-Sanctuary/pull/145): do not merge until the owner approves the local-to-account-backed privacy/storage transition and applies/reconciles the migration. Require authenticated cross-account, deletion and failure-recovery tests.
- [#84 — member-role authorization](https://github.com/platinumsoundz/Guild-Sanctuary/pull/84) and [#81 — moderation hierarchy](https://github.com/platinumsoundz/Guild-Sanctuary/pull/81): remain draft pending independent security review and owner-approved staging/concurrency authorization tests.
- [#85 — beta showcase](https://github.com/platinumsoundz/Guild-Sanctuary/pull/85): remains draft/non-mergeable; reconcile broad overlapping changes before promoting.
- [#5 — game wallet bridge](https://github.com/platinumsoundz/Guild-Sanctuary/pull/5): remains draft; prior Cloudflare Workers builds failed. Diagnose the build and reconcile wallet schema/session authorization before promotion.

### Explicit release gates — not complete
- Authenticated browser/device QA across settings, planner, reflections, events, inbox, threads, notifications, mobile navigation, keyboard/focus, and storage-denial recovery.
- Live Supabase RLS/RPC authorization and two-account messaging tests; static contracts are not proof of production authorization.
- Messaging is **not end-to-end encrypted**. The E2EE readiness document is a plan, not a cryptographic implementation.
- Planner and reflection are still browser-local unless and until the owner-approved Daily Reflection migration is applied and verified; self-discovery results remain session-only.
- Backup/restore and rollback review, independent security review, staging sign-off and human release approval remain required for Phase 1.

### Owner-only provider handoff
Supabase schema/migrations/RLS/owner bootstrap; Stripe and Lemon Squeezy payment setup; Cloudflare/Vercel account settings, secrets, domains and provider configuration remain owner tasks. No provider account settings or secrets were edited as part of this cleanup.


## Sanctuary Intelligence — first-release learning path (2026-10-28)

- **In code on feature branch; validation pending:** Extend the existing private, session-only self-discovery questionnaire with an explainable personalised learning suggestion based on the member's chosen learning approach and, when provided, motivation and decision-support preferences.
- Suggestions include a starting action, a practice step, a reflection prompt, and explicit explanation that these are changeable preferences—not a validated learning style, diagnosis, or prediction.
- Raw answers remain in component memory for the active session. No account persistence, analytics, profile projection, public sharing, new database table, migration, or provider setting is introduced.
- Reuses the existing self-discovery module and contract check to avoid duplicating questionnaire engines or overlapping the unfinished account-backed work in PR #145 and the broad beta showcase PR #85.
- **Release status:** feature branch only; run the existing self-discovery contract, TypeScript check, and production build on the exact head. Browser/device and accessibility QA remain outstanding.


- **Follow-up polish (2026-10-28):** Learning-path results show the exact selected preferences used to shape the suggestion, and the user-requested local text export includes the learning path, its rationale and its non-clinical disclaimer when a learning preference was answered. Answers remain session-only; export remains an explicit local user action.


## Community comment reliability — 2026-10-28

- **Merged to `main` in PR #217**, commit `f968b4f0feba6ac1ac3b73c13ddea09180c3c85a`: comment loading now has a visible pending state and prevents repeat loads; successful empty results are distinguished from failed/uncompleted loads; posting trims empty text and blocks duplicate submits while pending.
- Existing edit/delete/like/report actions are preserved. The focused static contract is wired into CI.
- Exact-head CI, typecheck, production build and Cloudflare Worker build passed before merge. Remaining gates: desktop/mobile authenticated interaction tests and backend authorization/RLS verification. This is a client reliability improvement, not a replacement for database authorization/RLS.
- No database migration, production deployment, account, payment, or provider settings changed.


## Front-end navigation clarity (2026-10-28)

- **In code on branch `feat/sanctuary-frontend-polish-2026-10-28`:** the main navigation drawer groups destinations by member intent: Start here, Connect, Your space, Explore, Sanctuary tools, and Stewardship. The admin group remains hidden unless the existing role gate allows access.
- The existing top-left navigation trigger, persistent page underneath the compact notification panel, unread indicator, Escape/outside-click dismissal, and “Open full notifications” path are preserved.
- This is a front-end-only change based on current `main`; no backend schema, moderation workflow, deployment configuration, or live service was changed.
- Automated/browser/device QA has not been run for this branch. Check keyboard navigation, mobile drawer scrolling, active destination highlighting, and role-gated Stewardship visibility during normal front-end QA.


## Responsive front-end refinement (2026-10-28)

- Improved small-screen home hero and quick-action layouts, including narrow-device typography, full-width primary actions and touch-friendly spacing.
- Added consistent keyboard focus visibility and reduced-motion handling to home interactions.
- Refined feed spacing for compact viewports and devices with bottom safe-area insets.
- Improved profile editor field stacking and save-action sizing on narrow screens, with visible focus treatment for form controls.
- **Scope:** presentation-only CSS; no admin/moderation, backend integration, data contract, or deployment changes.
- **Verification status:** changes are committed to the front-end feature branch. Browser/device visual QA and automated checks have not been run in this session.


## Cross-surface mobile and accessibility pass (2026-10-28)

- Added keyboard-focus treatments and touch-friendly controls to compact notifications, the shared workspace, community feed composer/posts, profile discovery, public profiles, and self-discovery.
- Tightened narrow-screen feed attachment layouts and public-profile action wrapping; constrained notification popover width on small viewports.
- Reinforced responsive shell safe-area padding and media sizing.
- **Scope:** CSS/presentation only; no API contracts, backend, moderation logic, database, or provider configuration changed.
- **Verification:** source edits are committed to the feature branch. Automated checks and browser/device visual QA have not been run here.


## Cosmic mobile front-end polish — 2026-10-28

- **Implemented on feature branch:** Establish a midnight-indigo / violet cosmic default for the dark theme, with restrained nebula lighting, semantic theme tokens, refined borders and card surfaces.
- **Implemented on feature branch:** Improve mobile navigation glass styling, active-item affordance, sticky header treatment, touch target sizing, full-width shell spacing, and safe-area handling for devices with display cut-outs.
- **Implemented on feature branch:** Tighten shared page typography and responsive spacing, preserve content above fixed bottom navigation, and respect reduced-motion preferences.
- **Validation outstanding:** Run the theme and theme-contrast contract scripts, TypeScript check, production build, and visual QA at narrow phone widths and desktop widths. Verify light/ocean/dusk/stone themes, keyboard navigation, screen-reader names, and iOS/Android safe areas before merge/release.
- This pass is CSS-focused and intentionally avoids changing auth, persistence, database schemas, or service integrations.


## Release-candidate integration batch update — 2026-10-28

- **Merged into the release-candidate branch only:** PR [#212 — keep Shorts videos full size](https://github.com/platinumsoundz/Guild-Sanctuary/pull/212), squash commit `49260ef65e06aaced2f0a487edfeb1c49505d345`.
- The change gives each Shorts clip its own full-height grid row, preserves vertical scroll snapping, and adds a CI contract against the layout regression.
- **Not merged to `main`; not deployed to production.** GitHub reported all exact-head PR checks passing before merge. Vercel preview remained rate-limited and Cloudflare skipped deployment on the PR event, so this is not live-device acceptance evidence.
- Guest-safe preview PR #213 remains the next dependency. It is still draft because its route-level guard must be reviewed alongside service/RLS authorization and real sign-in journeys. Guild Arcade PR #214 and creator games PR #215 remain stacked behind it; do not retarget/merge them until the guest-access dependency is reviewed and integrated.
- Daily Reflection PR #216 remains draft pending authenticated account-isolation and save/read/delete failure-path acceptance. Messaging/comment/Shorts backend runtime checks remain separate release gates.
- No Supabase writes, migrations, production settings, secrets, payment settings or production deployment were changed in this batch.


## Integration and merge reconciliation — 2026-10-29

- **Merged to main:** PR [#218 — reconciled beta candidate](https://github.com/platinumsoundz/Guild-Sanctuary/pull/218), merge commit `645edf23d6507e11935c94e10735835d95513186`. Rebuilt from current main to resolve the original #210 divergence without overwriting the mainline community-comment reliability change.
- Exact-head checks passed for CI/typecheck/build, screenshot capture, install-banner accessibility contract, dependency-map contract, Daily Reflection contract, community connection toolkit contract, and Cloudflare Worker build. Desktop, mobile and small-mobile screenshot artifacts were reviewed for the compact header, top-left navigation, install banner, notification control and responsive shell.
- Vercel preview remains blocked by provider build-rate-limit status. No production deployment is claimed; Cloudflare's PR workflow completed successfully with production deployment guarded.
- The original PR #210 was closed unmerged as superseded by #218. Old stack-dependent PRs #213, #214, #215 and #222 were closed after clean-mainline replacements were built.
- PR #220 is the conflict-resolved current-main reconstruction of private Daily Reflection. Exact-head CI and screenshot capture passed. Keep it gated on live migration-ledger/RLS verification and authenticated two-account save/read/delete/failure-path tests.
- Moderation PRs #191/#199 remain gated on the absent live `get_moderation_queue()` RPC and independent authorization review. No production migrations or database writes have been performed.


## Guest-mode safety and preview access — 2026-10-28

- **Rebuilt against current `main` on 2026-10-29:** guest sessions start on the public Today page; public read-only routes are limited to support, Cosmic Arcade and the two roadmaps; account-only routes show a sign-in explainer.
- Guest profile-post loading is skipped so the synthetic guest identity is not passed into the author-post service.
- Added `check:guest-access` contract to CI while preserving current compact-shell and community-comment changes.
- **Automated validation passed:** exact-head CI, screenshot capture and dependency-map checks passed on PR #221 before merge. Mobile/desktop guest-route interaction and service/RLS authorization tests remain outstanding. This UI gate does not replace backend authorization.
- No migration, production data change, provider setting, secret, billing or production deployment is included.


## Guild browser arcade recovery — 2026-10-29

- Rebuilt directly from current `main` to avoid the one-commit divergence created when guest access was merged.
- Adds Guild Arcade navigation, a browser-playable Guild World, companion hub, Comet Dodge mini-game and controller-input helpers.
- Guest route restrictions already present on main remain intact; Guild World receives authenticated user identity only for signed-in non-guest sessions.
- A focused Guild browser arcade contract is wired into CI. PR #223 merged after exact-head CI, typecheck/build and screenshot workflows passed; desktop/mobile gameplay interaction QA remains outstanding.
- No production deployment, database migration or token spending enablement is included.


## Creator games moved into the Guild — 2026-10-28

- **Merged to main in PR #225 after exact-head CI, typecheck/build and screenshot capture passed:** Move the creator-project and community-world hub (The 5 Sleeves 2D, The 5 Sleeves 3D, Roblox, and Platinum Survival Java/Bedrock) out of the Support the creator page and into the Guild experience.
- The Support page now remains focused on voluntary contributions and checkout notices. The existing Cosmic Arcade mini-games remain a separate Sanctuary-built games area.
- Add a static contract requiring the games hub to render in the Guild and not in Support. This does not change game hosting URLs, game saves, account linking, or token integration.
- **Release status:** automated contracts, typecheck/build and screenshot capture passed on the exact head; interactive browser/device QA remains required. No production deployment is claimed.

## Roadmap status reconciliation — 2026-10-29 (current main)

- **Merged to main:** #218 compact responsive shell/release-candidate reconciliation; #221 guest-safe read-only route boundary; #223 Guild browser arcade; #225 creator-game lobby relocation; #224 strengthened Shorts RPC migration security contract. These are repository merges, not confirmation of production deployment.
- **Open, owner decision required:** #226 Daily Reflection account-backed persistence (clean reconstruction; exact-head CI and screenshots are running). Do not merge until the owner approves the local-to-account-backed transition and two-account isolation plus save/read/update/delete failure-path checks are completed.
- **Open, fresh CI running/required:** creator-game/Guild interactions are still subject to real desktop/mobile browser QA. Vercel preview is still subject to provider rate limiting; Cloudflare PR workflows are guarded against production deployment.
- **Still blocked:** #191 moderation queue and #199 role management require a live-schema reconciliation because public.get_moderation_queue() is absent, plus independent review of role hierarchy, self-targeting, concurrency and action authorization. No production SQL/migrations or permission changes have been applied.
- **Superseded and closed:** #210, #213, #214, #215, #216, #220, #222 and #192. Their relevant work was either rebuilt on current main or superseded by the strengthened #224 contract.
- **No production deployment, live database write, payment/provider/secret change, or token-spending enablement is claimed by this reconciliation.


## Integration batch checkpoint — 2026-10-29

- **Merged PR [#247](https://github.com/platinumsoundz/Guild-Sanctuary/pull/247)** (squash commit `74e20fe553ebd1994286b54883bfa2a6a8c0eb4f`): integrated the role-aware moderation dashboard into current `main`. The branch passed CI, dependency-map contract, visual preview workflow, and Cloudflare workflow on its reviewed head.
- The moderation dashboard now renders bounded reported-content context and applies role-specific UI gates for warning, suspension, and bans; actions still depend on backend authorization and audit behaviour.
- **Not yet verified:** live Supabase migration state, function grants, role hierarchy and report-owner RPC compatibility across both connected projects. Do not treat a passing source/build contract as proof that live moderation is safe or enabled.
- PR [#249](https://github.com/platinumsoundz/Guild-Sanctuary/pull/249) has passed CI, visual preview, dependency-map and Cloudflare workflows on head `5731d30e65eeeab74f5dadf1fae92849f5f42b2e`, but remains a draft. Vercel reported the free daily deployment rate limit; this is not a successful Vercel deployment and no production rollout is claimed.

### Next large integration batch

1. **Mainline UI and console shell:** reconcile the top-left navigation, compact notification overlay, removed oversized black header, PWA install banner, console-style home/HUD and responsive layouts into one tested experience. Keep token shop/admin out of the global top bar; retain access through the navigation.
2. **Social/community journey:** verify post/comment edit-delete-like-report flows, Shorts engagement RPC and loading/error states, notification read/dismiss behaviour, and direct-message privacy/settings as one end-to-end batch.
3. **Account and permission journey:** registration/login/session refresh/password recovery, profile access, role display and protected admin/moderation entry points. Never grant/promote live accounts as part of a code-only integration.
4. **Games and wallet journey:** make the games hub and external game links discoverable, verify the scoped game-wallet session bridge and token shop presentation, and keep spending disabled until receipt verification and backend balance rules are tested.
5. **Release/branch convergence:** identify unique work in stale or stacked PRs, port only needed changes onto current `main`, close duplicates only after their functionality is accounted for, and keep migration-dependent features behind explicit staging approval.

### Batch completion rules

A feature is complete only when its UI, data/service path, permissions, failure states, and regression checks agree. Record separately: merged to `main`, CI/build verified, database migration applied, preview verified, and production domain verified. No one status implies the others. Do not force-merge diverged branches or spend money to bypass hosting limits.


## Read-only Supabase parity audit — 2026-10-29

Two connected Supabase projects were inspected read-only: `kchrskkchoyqweowskxv` and `xgpzvmhldyoyrwwebcic`.

- Both projects are active and expose the expected function signatures for `get_short_engagement_stats(requested_short_id uuid)`, `toggle_short_like(requested_short_id uuid)`, `get_report_target_owner(requested_target_type report_target_type, requested_target_id uuid)`, `get_moderation_report_context(requested_target_type report_target_type, requested_target_id uuid)`, `apply_moderation_action(...)`, and `set_member_role(requested_user_id uuid, requested_role text)`.
- The inspected function ACLs grant execution to `authenticated` and `service_role` (plus the owning `postgres` role); no `PUBLIC` or `anon` execution grant appeared in the returned ACLs.
- The projects have materially different migration ledgers. Matching function names and signatures are useful parity evidence, but do **not** prove their function bodies, RLS policies, or concurrent role checks behave identically.
- The reported Shorts schema-cache error is therefore **not yet explained** by a missing function name in either inspected database. Next diagnostics must identify which project the failing deployment actually calls, inspect PostgREST/schema-cache and API logs, compare the exact function definition and grants, and reproduce the call as an authenticated user. Do not apply another migration or reset either project merely to clear the error.
- The moderation dashboard merge is code integration only. Complete a read-only body/policy review and approved staging authorization tests before claiming the moderation system is release-ready.

## Console-style Today launcher batch — 2026-10-29

- **Implemented on current-main feature branch:** replace the minimal three-link Today panel with a console-style launcher for Guild Arcade, Cosmic Arcade, Community and Shorts, plus a separate toolkit for Planner, Discover, Messages, Events and Wallet.
- Add a context-aware time-of-day greeting, compact home-base identity, clearly grouped destinations, per-space visual accents, and consistent keyboard-focus behaviour.
- Responsive layout: four launcher columns on wide screens, two on tablets, and stacked touch-friendly cards on narrow phones. Motion is disabled when the member requests reduced motion.
- Extend the existing Today contract to cover all launcher destinations, semantic section labels, responsive breakpoints and reduced-motion behaviour. The existing `check:today-dashboard` package script remains the contract entry point.
- **Release boundary:** this is a feature branch, not a production deployment. Exact-head CI, typecheck/build, and screenshot checks must pass; desktop/tablet/phone interaction review remains required before merge. This batch does not change authentication, database schema, payment settings, role assignments or token spending.


## Guild phone navigation and touch controls — 2026-10-29

- **Fix branch / PR #254:** correct the mobile console shell where fixed-position navigation overlays and touch controls were nested inside a sticky, blurred header. Render the drawer, Quick Menu, and touch-control cluster as viewport-level siblings so phone positioning is based on the viewport rather than the header.
- Keep the Guild navigation drawer and Quick Menu above the Sanctuary mobile bottom bar; place the D-pad plus A/Select and B/Back controls above the bottom navigation while respecting safe-area insets.
- Show touch navigation controls by default on narrow phone layouts, with the existing Hide controls toggle retained. Compress the toolbar at widths below 420px and hide nonessential text below 370px to prevent horizontal crowding.
- **Release status:** PR #254 is open; changes are not merged or confirmed live. Vercel reported the free daily deployment limit. Exact-head CI/build and physical Android verification remain required. Check 320px, 360px, 390px and 430px widths, including drawer, Quick Menu, notifications, bottom navigation and touch controls.

- Added `scripts/check-guild-mobile-navigation.mjs` and `npm run check:guild-mobile-navigation` to guard overlay placement, narrow-phone defaults, D-pad/A/B affordances, safe-area offsets and z-index ordering. This is a static regression contract, not a substitute for visual viewport or Android testing.


## Guild menu viewport overlay fix — 2026-10-29

- **Fix branch:** `fix/guild-menu-viewport-portal-2026-10-29`. Move the Guild navigation drawer, its scrim, Quick Menu panel/scrim, and touch controls into viewport-level React portals attached to `document.body` after client mount.
- This prevents transformed, clipped, blurred, or stacking-context ancestors in the game shell from trapping fixed-position menus behind the active page. Keep the page visible beneath the scrim and preserve existing close actions, navigation selection, keyboard handling, and touch controls.
- **Release boundary:** not merged or confirmed live. Exact-head CI, typecheck/build, screenshot checks, and a real phone interaction check are required. No database, role, payment, or production configuration changes.

## Basic-user navigation and route restrictions — 2026-10-29

- Hide **Wallet**, **Cosmic Arcade**, **Token Shop**, and **Shorts** from basic users in the main navigation.
- VIP and higher roles retain access to those destinations; moderation tools remain moderator-and-above, while the hidden Guild and Guild roadmap remain developer/owner-only.
- Use one shared page-role allowlist for navigation and workspace rendering, redirect unauthorized direct navigation to Today, and fail closed for unknown roles/pages.
- Preserve the lower-privilege guest policy: guests retain only Today, public Cosmic Arcade, Sanctuary Roadmap, and Support entry points.
- Add navigation and role-page regression contracts to CI.
- **Status:** code and checks committed on `fix/basic-user-navigation-restrictions-2026-10-29`; exact-head CI/build, branch integration, and live deployment verification remain pending. Client-side route guards improve UX but do not replace server/database authorization for sensitive data or actions.

## Role-aware notification routing — 2026-10-29

- Check the destination page role before marking a community notification as read or navigating to its target.
- Basic users who receive a notification for a VIP-only Short or Event are told the destination is restricted; the notification stays unread and the current page is preserved.
- Posts and other destinations continue through the shared Sanctuary page-role allowlist, preventing notification clicks from bypassing navigation visibility.
- Add a regression contract for access-check ordering, unread preservation, and the restricted-destination message.
- **Status:** implementation and source-contract check committed on `fix(notification-role-routing-2026-10-29`; exact-head CI/typecheck/build and live preview verification remain pending.


## Community integration batch — 2026-10-29

Branch: `fix/community-integration-phase-1b-2026-10-29`

- Added an idempotent integration migration, `20261029100000_integrate_short_engagement_and_dm_preferences.sql`, which reasserts the authenticated Shorts engagement/read and like RPCs, refreshes PostgREST's schema cache with `notify pgrst, 'reload schema'`, and creates the idempotent trigger that keeps saved direct-message/profile-discovery preferences aligned with profile privacy fields.
- Expanded the Shorts RPC and messaging contract scripts to assert the schema-cache refresh and preference trigger are present.
- This is **repository work only**. The migration has not been applied to any Supabase project, and static contract checks do not prove the connected live schema is repaired. Do not blindly push migrations because migration-history drift is already documented.
- Next integration scope: verify comment like/edit/delete/report actions across posts and Shorts; verify DM preference save/read and recipient blocking with two real accounts; verify notification links, unread state, and role restrictions across stable and VIP destinations.
- Release gates remain: run exact-head CI/typecheck/build, inspect the migration against the actual staging schema, apply only through the approved migration process, and perform real-account/browser tests before calling the systems beta-ready.


## Comment reaction concurrency hardening — 2026-10-29

Branch: `fix/comment-engagement-concurrency-2026-10-29`

- Added a per-comment in-flight lock to both post comments and Shorts comments so repeated taps cannot send overlapping like/unlike mutations for the same comment.
- Reaction controls expose a disabled/busy state while the mutation is pending and release the lock in `finally`, including failure paths.
- Extended `check-community-comment-actions.mjs` to cover both surfaces.
- This prevents a common rapid-tap race in the UI; database uniqueness/RLS remains the authoritative protection. Exact-head CI and preview checks are required before merge; no production deployment is claimed.


## Private-message report authorization hardening — 2026-10-29

Branch: `fix/private-message-report-access-2026-10-29`

- Found a security gap in the SECURITY DEFINER `submit_content_report` RPC: message targets were checked only for UUID existence, not whether the reporter belonged to the conversation.
- Added an additive repair migration that allows reporting a message only when the signed-in active user is an active member of that conversation and the message is visible. If the messaging schema or membership helper is absent, the RPC fails closed.
- Tightened report-reason validation and retained report rate limiting, idempotent upsert behaviour, authenticated-only execution grants, and explicit PostgREST schema reload.
- Extended the messaging persistence contract to guard the membership check and fail-closed behaviour.
- **Not yet deployed:** this migration must be reviewed and applied through the approved staging process. Validate both a conversation member and a non-member using separate test accounts before production.


## Navigation governance and staff-page separation — 2026-10-29

Branch: `feat/admin-page-controls-and-guild-overlays-2026-10-29`

- Split the staff navigation into **Admin** (member-role management) and **Moderation** (feed, Shorts, comment, event and message reports). Admin is admin+; Moderation is moderator+.
- The Guild's hidden launch route is now available to authenticated basic users from Settings; Guild Roadmap remains developer/owner-only. This corrects the earlier role gate that accidentally treated the Guild console itself as a developer-only destination.
- Added the `platform_page_visibility` table with RLS. Active members can read the global page switches; only active developer/owner accounts can change them. The Admin page exposes those controls to Developer and Owner.
- Main Sanctuary navigation, mobile navigation, Guild navigation/quick search, and direct Sanctuary routing now read the shared visibility settings. Role gates remain independent: showing a page does not grant a role that cannot access it.
- **Database migration applied:** the `platform_page_visibility` table and its two RLS policies were applied to the Supabase project named `Guild-Sanctuary` (ref `xgpzvmhldyoyrwwebcic`). A read-only SQL check confirmed the table and the public-read / authenticated developer-owner write policies exist. No page switches have been set, so every page remains visible by default. App-level save/read interaction still needs verification with an active Developer or Owner account. The second connected Supabase project was not modified because its deployment role could not be confirmed.
- Guild menu and Quick Menu are portaled to `document.body` and their overlays now use top-priority fixed stacking layers, so they should render above the active page and Sanctuary shell. Preview/browser confirmation is still needed across desktop and Android.
- Added `check:admin-visibility` to CI and strengthened the Guild overlay contract checks.


## Live migration verification — 2026-10-29

- Applied `platform_page_visibility_controls` to Supabase project `Guild-Sanctuary` (`xgpzvmhldyoyrwwebcic`) after checking the target table was absent and inspecting the existing profile role/status columns.
- Verified by SQL that `public.platform_page_visibility` exists and has the `public can read page visibility` SELECT policy plus the `developers and owners manage page visibility` ALL policy for authenticated users.
- Security Advisor returned pre-existing findings involving other tables/functions and leaked-password protection; the new table did not appear in the reported findings. These broader findings remain a separate security-hardening task.
- The second Supabase project, `platinumsoundz's Project`, was left untouched because its environment/deployment mapping is not confirmed.

## Role-targeted visibility and moderation reliability — 2026-10-30

- Admin page visibility now has a role selector for Guest, Basic User, VIP, Moderator, Admin, Developer and Owner. Each page/role pair is persisted independently; existing rows remain as the fallback `all` setting.
- Navigation in Sanctuary, The Guild and direct route guards evaluates the current account role against the role-specific override, then falls back to the preserved global setting. This changes discoverability only; feature and server-side authorization checks remain authoritative.
- Added migration `20261030022341_role_targeted_visibility_and_moderation_fixes.sql` to extend the visibility table's key, align the moderator RPC gate with Developer/Owner permissions, and support comment report submission, ownership lookup and hide/remove/restore actions.
- Applied the migration to the confirmed `Guild-Sanctuary` Supabase project (`xgpzvmhldyoyrwwebcic`) on 2026-10-30. Read-only SQL verified the `role_key` column, composite `(page_key, role_key)` primary key, Developer/Owner role gate and comment-action branch. The table currently has zero rules, so existing pages remain visible by default until a role-specific switch is changed. The separate Supabase project remains untouched.
- The moderation queue no longer fails entirely when one report's owner lookup fails. Account actions remain disabled until the target owner is verified, and moderation actions are serialized in the UI to prevent overlapping submissions.
- Contract checks, TypeScript typecheck and Next.js build passed on the merged feature branch. **Still outstanding:** confirm the latest main-branch Cloudflare deployment, then exercise the live UI with an authenticated Developer/Owner account and verify that hiding a test post changes its database state and removes it from the public feed. No production post was modified as part of this work.

## Independent Sanctuary and Guild communities — 2026-10-30

- Restore the existing `world_type` boundary across posts, Shorts, events, persistent conversations, notifications and moderation reports. Both environments continue to use the same accounts, database and social mechanics.
- Sanctuary content remains tagged `sanctuary`; new Guild content is explicitly tagged `guild`. Existing content and notifications are retained in Sanctuary by default.
- Shared pages receive the active world from the shell. Feed, Shorts, events, inbox/thread, notifications and moderation queue reads/actions filter by that world; profile-post retrieval is scoped to the active world too.
- Social likes/comments remain attached to globally unique target IDs, so they follow the content they belong to instead of creating duplicated engagement tables.
- Guild navigation uses Guild-specific labels and console styling while reusing the shared feature components. Notification destinations stay inside The Guild when opened from the Guild shell.
- Added a CI contract check for world-scoped writes, reads, notification triggers, moderation queues and conversation creation.
- **Database migration applied:** `20261030025452_restore_guild_community_scope.sql` is applied to the confirmed `Guild-Sanctuary` Supabase project (`xgpzvmhldyoyrwwebcic`). Read-only SQL verified the new `notifications.world_type` and `content_reports.world_type` columns, the report world-sync trigger, scoped conversation RPC and notification trigger functions. Existing posts, conversations, notifications and reports remain tagged `sanctuary`; no production posts were created or modified by verification.
- **Still required:** live end-to-end verification with test posts and separate reactions/comments/notifications/reports in each world, then confirm the merged build is live on Cloudflare/Vercel. The second Supabase project remains untouched.


## Cosmic daylight theme — 2026-10-30

- **PR #297:** `feat/cosmic-light-theme-2026-10-30` introduces a light counterpart to the cosmic dark default, using lavender-tinted backgrounds, white/lilac surfaces, the same purple accent identity, and lighter theme-specific nebula ambience across desktop and mobile.
- Updated the Appearance option label and extended the theme contract to guard the palette and atmosphere.
- Calculated primary text contrast pairs exceed WCAG AA 4.5:1 for normal text. This is a token-level check, not a substitute for full-page visual/accessibility testing.
- **Not merged / not visually verified:** the reported Vercel check failed due to a build-rate-limit response. Run the theme contract, contrast contract, typecheck and production build on the exact PR head when CI capacity is available, then review key pages at desktop and narrow-phone widths.
- **Theme-system follow-up:** centralize shared theme tokens once (the global stylesheet currently repeats the root/default palette and has layered body background declarations), use semantic tokens for remaining hard-coded feature colours, and add automated screenshots for each theme across representative Sanctuary and Guild pages. Keep theme identity independent from layout density and world-specific Guild styling.


## Central theme system — 2026-10-30

- Added `src/lib/themes.ts` as the central theme catalogue: supported IDs, display labels, descriptions, light/dark colour-scheme metadata, Tailwind dark-mode metadata, preference validation, system-preference resolution and DOM application.
- The Appearance selector, account/local preference normalization, session restoration and pre-render theme bootstrap now consume the catalogue instead of maintaining separate hard-coded theme lists.
- Removed the duplicate base/dark token declarations from the responsive CSS layer. Theme palette tokens remain grouped in the global theme-token section; responsive CSS now controls layout/interaction rather than redefining the palette.
- Extended the theme contract to verify catalogue ownership, palette registration and single base token ownership.
- **Remaining verification:** run `npm run check:theme`, `npm run check:theme-contrast`, `npm run typecheck` and `npm run build` against the latest PR head. Full browser screenshots and page-by-page semantic-colour audit are still required; connector-only GitHub editing cannot run the repository scripts or inspect rendered pages.
- **How to add a theme:** add its typed palette ID and metadata to `THEME_CATALOGUE`, add its matching `:root[data-theme="..."]` semantic-token block in the central theme-token section of `globals.css`. The settings selector, preference validation, bootstrap and contrast checks discover registered themes automatically.

- Updated the contrast contract to discover every palette ID from `THEME_CATALOGUE`, so newly registered palettes are included automatically rather than requiring a second hard-coded theme list.

## Permanent theme architecture — 2026-10-30

- **Foundation rule:** The central theme catalogue and shared semantic-token palette are permanent platform architecture, not a one-off light-theme implementation.
- Future themes should be palette-first. A new theme normally adds one catalogue entry (identity, label and colour-scheme metadata) plus one semantic-token palette block in the central theme-token section of `src/app/globals.css`. Existing pages, components, navigation, responsive layouts, interaction patterns and world-specific behaviour remain shared.
- Do not create theme-specific page trees, component forks, duplicate layout systems, or separate responsive styling projects to launch a palette. Theme-specific visual effects should be exceptional, minimal, and expressed through reusable tokens or shared theme-aware primitives.
- Keep feature styling on semantic variables such as `--bg`, `--surface`, `--ink`, `--muted`, `--line`, `--accent` and status tokens. When a hard-coded feature colour is genuinely semantic, promote it into the shared token contract rather than adding per-theme overrides to individual components.
- Keep theme identity independent from layout density, accessibility preferences, user role, and Sanctuary/Guild world context. A theme must work across both worlds and all supported viewport sizes without changing feature behaviour.
- The Appearance selector, preference validation, account persistence, session restoration, pre-render bootstrap and contrast checks must discover supported themes from the central catalogue. Avoid maintaining secondary hard-coded theme lists.
- **Adding a palette:** register its ID and metadata in `THEME_CATALOGUE`; add its semantic-token block to the central theme-token section; verify the catalogue-driven contrast contract; then review representative Sanctuary and Guild pages at desktop and narrow-phone widths. The contrast script already discovers registered IDs automatically.
- **Long-term quality gate:** migrate remaining feature-level hard-coded colours to semantic tokens and add browser screenshot coverage for every registered theme across representative Sanctuary and Guild surfaces. Static token checks do not replace visual, keyboard, contrast or device testing.


## Token shop — permanent cosmetic collection — 2026-10-30

- Establish a first-party cosmetic catalogue using permanent account-bound entitlements. No user listings, trading, transfers, cash-out or competitive gameplay advantages.
- Keep Cosmic dark and Cosmic light free. Four new premium themes (Nebula, Aurora, Celestial and Eclipse) unlock once and remain owned permanently; existing Dusk, Stone and Ocean palettes remain available to avoid removing previously selectable options. Active selection is separate from ownership and applies across Sanctuary and Guild.
- Add premium profile frames, portrait effects, identity badges and profile banners. Catalogue pricing is in tokens and is seeded idempotently by `20261030100000_token_cosmetics_and_premium_themes.sql`.
- Premium palette IDs remain part of the central theme catalogue and use semantic CSS tokens. Do not create theme-specific page or component forks.
- **Release gate:** shop items can be browsed, but token redemption remains disabled and the `spend_tokens` RPC remains revoked. The migration is not applied to production by this code change. Owner review, isolated staging migrations, authenticated spend/equip tests, balance/idempotency/ledger checks, theme entitlement bypass tests and security-advisor review are required before unlocking.


## Token economy update — affordable cosmetics and founding members — 2026-10-30

- Reprice all 32 cosmetic catalogue items to 20–50 tokens (20p–50p at the standard 100 tokens = £1 rate); themes and top-tier cosmetics are capped at 50 tokens.
- Replace the old proposed 1,000-token first-100 beta offer with 500 tokens total for the first 100 eligible verified accounts.
- Existing accounts among the first 100 retain their original 100-token welcome balance and receive a one-time +400 top-up; future eligible signups receive +500.
- A database-locked allocation pool, unique account award and unique rank prevent duplicate or over-cap awards. The award path runs only from trusted database triggers after email verification/profile creation.
- Both migrations are repository-only and **NOT APPLIED**. Supabase account counts, balances, and the eventual first-100 allocation must be confirmed in isolated staging before any production application. Token redemption remains disabled.
