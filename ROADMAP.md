# The Sanctuary — Roadmap

Last updated: 2026-10-27
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
- Current rename touchpoints:
  - `src/components/ResponsiveShell.tsx` — renders `GUILD / SANCTUARY` and a
    `G` brand mark. Change to `THE SANCTUARY` (or just `SANCTUARY`) with a sun
    mark to match `Navigation.tsx`.
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
| Dark mode | In code | Working theme application path and pre-render device storage bootstrap; CI and visual review pending |
| Theme presets and future flavours | Planned | Start with Light, Dark, and a low-contrast "Dusk"; leave room for seasonal themes |
| Typography scale | Planned | Raise body from 9–12px Arial to 15–16px; humanist sans UI + serif display option |
| Component primitives | Planned | Button, Card, Dialog, Sheet, Tabs, Toast, EmptyState, Skeleton, Avatar, Badge |
| Navigation restructure | Planned | Desktop rail / mobile bottom tabs: Today, Community, Circles, Practice, Messages, You |
| Feed polish | Planned | Relative/local timestamps; replace raw author UUIDs in comments; move Report into an overflow menu |
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
- Guards against self-ban and non-admin action on admins

Do not enable live checkout, ads, or the terms gate until the checklist has
actually run. This workstream is a hard gate, not a suggestion.

### W2 — Connection layer

| Item | Status | Notes |
| --- | --- | --- |
| Notifications data model and in-app bell | Planned | `notifications`, unread count, mark-all-read |
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
| Personality and motivation prompts | Member | Private by default | 16-type-style and Enneagram-inspired prompts delivered gradually; optional summary only with separate opt-in |
| Energy rhythm | Derived from check-ins | Private | "Morning / evening" patterns, no judgement |
| Practice interests | Member | Public by choice | Meditation, breathwork, journaling, philosophy |

### Outputs

- Star sign description written as reflection prompts, not predictions.
- Personality profile with strengths, stressors, and how the member likes to
  communicate; clearly labelled as self-reflection, not a diagnosis.
- Suggested practices based on stated interests and mood patterns.
- A private reflection card with a tentative pattern, a practical next step, a journal prompt, and a short lesson based on answers so far. The personal playbook also gives separate practical tips for each answered topic (recharge, decisions, motivation, communication, and learning) so the output is more useful than a single personality label.
- Optional educational wellbeing guidance explaining the limits of personality prompts and encouraging qualified support for persistent or distressing symptoms; it must not diagnose or add a condition to the member profile.
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
- **Separate consent for collection and visibility.** Ask one small, optional question at a time; explain why it helps; allow skip, pause, review, edit, and delete. Saving answers and showing a summary on a profile are separate choices. Profile visibility is off by default, and no individual answer is public unless the member explicitly chooses to share it.
- **More than one lens, never one verdict.** Offer the 16-type-style questionnaire, Enneagram-inspired motivations, and zodiac reflection as distinct optional lenses. Explain that they differ in evidence and purpose; do not merge them into a supposedly objective identity score.

### Suggested implementation order

1. Birthday → derived star sign, with privacy controls.
2. Likes/dislikes/values tags on the profile.
3. 16-type questionnaire with a private result and optional summary card.
4. Private insight cards from check-ins.
5. Gentle suggestions (practices, circles, people).

## 6. Messaging privacy and end-to-end encryption

**Current state:** connected direct-message records use a server-side message body. The current messaging UI does not provide end-to-end encryption (E2EE). The conversation database and its access controls are not equivalent to E2EE; only authorised participants can read messages through the app, but server-side plaintext may be available to the service and permitted operational processes. The message composer must disclose this honestly until E2EE is implemented and independently reviewed.

### Recommended direction

- **Default target:** E2EE for one-to-one conversations first, then group conversations after the multi-device and membership-change design is reviewed.
- **Cryptography:** use a maintained, independently reviewed protocol/library with established device identity, authenticated key agreement, forward secrecy and post-compromise recovery where supported. Do not invent a home-grown encryption protocol or write cryptographic primitives ourselves.
- **Key custody:** private keys remain on the user's devices. A server stores public key bundles and opaque ciphertext only; it must not receive private keys or message plaintext. Recovery is explicit and explained, not a silent server-side backdoor.
- **Multi-device:** each device has its own identity/key material. Adding/removing devices and changing group membership must rotate or refresh access appropriately, with visible device/session management.
- **Metadata:** E2EE does not automatically hide who messaged whom, timing, IP/log data, account identities, or message size. Minimise retained metadata, define retention, and explain the limits honestly.
- **Moderation/reporting:** users may explicitly report a message by choosing to submit the selected message and context for review. This must be a deliberate disclosure, not routine plaintext scanning hidden behind an E2EE claim. Provide block, mute, rate limits, abuse reporting, and safety workflows.
- **Local browser storage is not a substitute for E2EE.** It can expose messages to anyone using an unlocked/shared device, browser extensions, malware, or a compromised account. Optional local caching should be encrypted where feasible, cleared on sign-out/shared-device sessions, and never be the only copy without a recovery warning.
- **Release gates:** threat model; protocol/library review; migration and key lifecycle; two-device tests; account recovery and device-loss tests; revoked-device tests; group-member removal tests; report/abuse flows; backup/log checks; security review before calling messaging end-to-end encrypted.

### Implementation readiness document

See [Messaging E2EE Implementation Plan](docs/MESSAGING_E2EE_PLAN.md) for the threat model, data-flow audit checklist, protocol selection criteria, phased delivery, and mandatory release gates. The current UI now exposes a plain-language privacy explanation directly inside every open message thread. This is transparency work only: no cryptographic behavior or production message storage has changed.

### Messaging privacy and end-to-end encryption
- **Current truth:** E2EE is not implemented. The active inbox/thread still uses the in-memory messaging service by default; the Supabase repository/schema are optional and must not be represented as active until configuration, RLS and two-account integration tests are verified.
- **In code on this branch:** updated the message-thread privacy notice so it does not falsely claim server persistence and makes clear that no E2EE protection is active.
- **Design added:** docs/MESSAGING_E2EE_PLAN.md defines staged delivery, key lifecycle, metadata disclosure, user-initiated reporting, test gates and no-go release conditions.
- **Implementation rule:** do not invent cryptography. Evaluate a maintained, independently reviewed protocol and keep private keys on client devices. Browser-local storage alone is not a substitute for E2EE.
- **Release gate:** no production activation or “end-to-end encrypted” claim until protocol review, device/key recovery, group key rotation, RLS/Realtime isolation, reporting, metadata, cross-device tests and security review pass.

### Phased delivery

1. Keep the current privacy disclosure visible and audit every message storage, logging, moderation and export path.
2. Write a threat model and select a maintained E2EE protocol/library suitable for web and mobile/PWA clients.
3. Prototype one-to-one E2EE in a separate feature branch with no production data migration.
4. Test key establishment, identity verification, offline delivery, replay/tampering, multi-device enrolment, revocation, account recovery and user-reported messages.
5. Release one-to-one E2EE only after security review; then design group E2EE and device/session settings.

Do not claim that Sanctuary messaging is end-to-end encrypted until the protocol, key management, all message paths and security review are complete.

## 7. Comparison findings adopted into this roadmap

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

## 8. Deliberately out of scope

- Anonymous or throwaway posting (revisit only with a safety design).
- Live video streaming (audio rooms first).
- Token transfers, trading, marketplace, cash-out, gifts, VIP, post promotion.
- Public follower leaderboards or engagement scores.
- Medical, therapeutic, or diagnostic claims.
- Advertising inside journal, circles, or crisis surfaces.
- Under-13 accounts.
- Official MBTI branding.
- A recommendation algorithm that optimises time-on-app.

## 9. Open questions for the product owner

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

## 10. Change log

- **2026-10-27** — Roadmap created. Locked naming, friend + follow
  relationships, no anonymous posting, free wisdom with future guide
  monetisation, spiritual + mental wellbeing focus, self-discovery inputs, and
  dark mode with theming. Recorded comparison findings and UI fixes.


## 11. Visible beta showcase and collaboration (2026-10-27)

- **In code on feature branch** — Today is the new product-first landing screen, accessible before sign-in. It features live route shortcuts and a filtered feature explorer.
- **In code on feature branch** — Concept cards for Daily Reflection, Practice Library, Circles, and Self-discovery show illustrative mini-previews and explicitly state that they are concepts, not live features.
- **In code on feature branch** — A beta feedback form prepares a copyable report locally. It does not submit feedback to a server.
- **In code on feature branch** — Added a beta testing guide, collaboration guide, pull-request checklist, and structured GitHub issue templates.
- **In code on feature branch** — Added a small automated contract check for Today routing, visible status labels, and feedback disclosure.
- **In code on feature branch** — Added an optional six-step beta onboarding mission board with browser-local progress, completion controls, a reset option, and shortcuts into real routes or concept previews. Progress is not public and is not tied to account identity.
- **In code on feature branch** — Added a visual Now / Next / Later build radar, including a clear guardrail that wallet purchases and high-impact actions remain gated behind release checks. It is directional, not a delivery promise.
- **In code on feature branch** — Added a local concept preference picker that lets beta testers choose which idea interests them and carries that choice into a copyable feedback report. No vote is transmitted or aggregated.
- **In code on feature branch** — Replaced the local-only questionnaire with an account-backed Self-discovery Centre on the member profile. Members can answer one prompt at a time across recharge, decision-making, motivation, communication preferences, learning preferences, and an optional zodiac-sign lens; receive a private reflection with an actionable tip, micro-lesson, and journal prompt; explicitly consent to saving answers to the website; choose summary fields; and separately enable/disable public profile visibility.
- **Database migration in the PR, not applied to production** — `self_discovery_responses` stores raw answers behind owner-only RLS. `profiles.self_discovery_summary` stores only the curated fields selected for sharing; `self_discovery_visible` defaults false. The public profile projection returns only the curated summary when the member explicitly enables it.
- **In code on feature branch** — Public profile cards can display a consented self-discovery summary. A comparison panel compares a signed-in member's own saved answers against only the other member's published summary; it labels exact answer matches/differences, not compatibility or identity scores.
- **In code on feature branch** — Added a private, rule-based reflection output from the user's current answers: a plain-language pattern, one practical action, a micro-lesson, and a journal prompt. It is explicitly non-diagnostic and excluded from public profile summaries; it is not yet an AI mental-health assessment or a full personality framework score.
- **Release boundary** — The migration has not been applied to production, so account-backed UI saving will remain unavailable until the migration is reviewed and applied in a safe release process. No answers are saved in browser local storage.
- **Not yet merged or deployed** — This work remains in a reviewable branch/PR. A passing contract or build does not prove browser-level behavior. Verify desktop/mobile, unauthenticated access, guest flow, clipboard fallback, theme contrast, and preview deployment before merge.
- **Collaboration rule** — Use issues to capture tasks, branches for changes, PRs for review, and verified deployments for release evidence. Never share credentials or apply production database changes as part of a UI-only task.

