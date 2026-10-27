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
| Theme token system | Planned | Semantic CSS variables; no hardcoded colours in modules |
| Dark mode | Planned | `data-theme`, `prefers-color-scheme`, persisted per account + device |
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
