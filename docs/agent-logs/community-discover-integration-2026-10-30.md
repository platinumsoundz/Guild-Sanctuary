# Community + Discover integration work log

- Date: 2026-10-30
- Tracking issue: #281
- Branch: `work/community-discover-integration-2026-10-30`
- Base: `main` at `6e399ff0b3fe9be5e52f99602078f2bda88f0424`
- Status: branch reserved; audit underway; no feature code merged.

## Branch audit

Community candidates compared with main:
- `feat/community-connection-toolkit-2026-10-28`: 25 ahead / 119 behind. Main FeedContent already imports communityConnection; inspect remaining deltas only.
- `feat/guild-independent-community-space-2026-10-30`: 78 ahead / 24 behind. Broad overlap across feed, events, messages, Shorts, moderation and Guild isolation; selective recovery only.
- `fix/community-comment-action-reliability-2026-10-28`: 7 ahead / 109 behind. Review PostEngagement fixes and tests.
- `fix/community-integration-phase-1-2026-10-29`: 4 ahead / 38 behind; `fix/community-integration-phase-1b-2026-10-29`: 7 ahead / 38 behind. Overlapping RPC/DM migration lineage; reconcile before reuse.
- `integration/community-toolkit-ci-clean-main-2026-10-29`: 4 ahead / 60 behind; `test/community-toolkit-ci-coverage-2026-10-28`: 4 ahead / 110 behind. Compare as likely predecessor/successor.
- Support-creator branches are separate from core Community/Discover; review independently.
- `ui/remove-top-community-strip` is 1 ahead / 287 behind and appears stale against current main.

Discover candidates:
- `feat/sanctuary-connection-discovery-2026-10-28`: 145 ahead / 110 behind. Contains expanded member discovery, public profile interests/intentions, relationship code and migrations; selective recovery only after privacy/RLS review.
- `feat/event-discovery-map-explorer-2026-10-28`: its changed-file set matched the connection toolkit, not event UI. Verify branch lineage before reuse.
- `feat/events-map-discovery-2026-10-28`: 31 ahead / 119 behind; contains event component/service changes. Review for current event-world isolation before reuse.
- Self-discovery branches overlap one another and are not public Discover content. Preserve private-by-default boundaries; never expose journals/reflections in public discovery.

## Verified main-tree observations

- Main FeedContent already imports `buildCommunityPost` from `communityConnection`.
- Main PostEngagement already supports comment create/edit/delete, comment likes, and a `worldType` prop; older branches that omit worldType must not replace it.
- Main Events component already accepts `worldType`; keep Guild/Sanctuary event data isolated.
- Main ProfileDiscovery exists; the connection-discovery branch contains a substantially expanded version, but also carries unrelated code and migrations.
- PRs #200, #227, #232 and #261 are not safe wholesale merges due to divergent branches and outstanding release gates. See issue #281.

## Constraints and next steps

1. Recover only changes missing from current main; do not merge whole stale branches.
2. Keep Community/Discover data isolated by `world_type`.
3. Guest remains read-only; discovery fails closed when privacy settings are absent.
4. Private self-discovery and journal content never appear in public Discover.
5. No new service, paid dependency, production migration, RLS weakening or deployment as part of UI recovery.
6. Finish Community feed, engagement, Shorts and event browsing; then complete member discovery UI with privacy/RLS review.
7. Run exact-head CI and independent privacy/security review before merge.

## Rollback

All work is isolated on this branch from canonical main. Close the PR/branch if regressions are found. No production database or deployment changes are made by this audit.


## Focused source review (continued 2026-10-30)

### Community

- Re-fetched current main and the Guild-independent branch versions of FeedContent.tsx, FeedContent.module.css, MeetupCalendarPlaceholder.tsx, and event CSS. The core feed and event components are already substantially aligned; the broad branch versions do not provide a clean replacement.
- Current feed already has free-form, life-lesson and conversation-starter composition; media upload/preview; author identity and timestamps; edit/delete controls; reporting; and the worldType passed into useFeed and PostEngagement.
- Current PostEngagement is newer than the stale community candidates for comment edit/delete/like and carries worldType. Do not regress it by copying older versions.
- The remaining Community work should be based on targeted bug reproduction and tests, not wholesale replacement of these components. No reliable reproduction or executable test environment was available through the GitHub connector in this session.

### Discover

- Current main ProfileDiscovery.tsx only searches public usernames/display names and has no interest/intention filters, suggestions, relationship controls, topic discovery or event discovery.
- The connection-discovery branch contains a much larger candidate implementation plus discoveryInterests.ts, discoveryIntentions.ts, connectionService.ts, profile editors, notification integration, four migrations, and an RLS contract test. It is a feature bundle, not a standalone component that can safely be copied.
- The candidate's topic discovery calls fetchFeed() without a worldType, and event discovery calls fetchEvents(currentUserId) without a worldType. That is not acceptable for Guild/Sanctuary isolation without first changing those APIs and proving their filters.
- The candidate depends on profile_interests, profile_discovery_intentions, relationship tables, block-aware policies/triggers, profile-report enum/RPC changes and matching notification behavior. These migrations are not present in current main and cannot be safely introduced by a UI-only cherry-pick.
- The branch's own Supabase handoff explicitly says the migrations have not been confirmed applied and requires checking the connected project's migration ledger, schema, grants, RLS and multi-account behavior. Static contract checks do not prove live database security.
- Its localStorage fallback is useful for a local preview but is not a production privacy/security boundary. Public visibility must be enforced by database RLS and verified against the connected Supabase project.
- Private self-discovery reflections remain a separate feature family and are not imported into public discovery.

### Integration decision

No candidate feature branch was merged or copied in this pass because every substantial Discover candidate is coupled to unverified database changes and currently lacks the required world isolation in its content-discovery calls. Copying it would create a superficially larger UI while risking cross-world leakage and privacy regressions. The correct next implementation is to adapt the discovery service/API contracts to require worldType, then stage the schema/RLS bundle separately after a connected-project migration review. Community's current implementation is retained rather than replaced with older overlapping code.

### Verification status

- GitHub source files and branch trees were inspected.
- No repository checkout, local package install, TypeScript run, build, browser session, Supabase connection, migration execution or live QA was available through the connected GitHub operations used here.
- Therefore this pass does not claim CI success, feature completion, PR merge, migration application or deployment.


## Connected Supabase verification (read-only, 2026-10-30)

The connected Supabase project named Guild-Sanctuary was inspected without changing schema or data:

- Its migration ledger currently ends at `20261030032022` (`sanctuary_feedback`). The candidate discovery migrations `20261028150000_member_discovery_interests`, `20261028170000_connection_relationships`, `20261028180000_add_profile_report_target`, and `20261028180100_profile_report_rpc` are not recorded as applied.
- A read-only catalog query found no `profile_interests`, `profile_discovery_intentions`, `profile_follows`, `profile_connections`, `profile_blocks`, `profile_discovery_hidden`, or `profile_discovery_saved` tables in the inspected public/private schemas.
- The same catalog query confirmed `posts`, `events` and `profiles` are present with RLS enabled. `public_profiles` is a view, not a base table; the simple catalog flag does not establish its view security mode, so that still needs separate review.
- Current main's feed service accepts `fetchFeed(worldType)` and filters `posts.world_type`. Current event service accepts `fetchEvents(userId, worldType)` and filters `events.world_type`. Both default to Sanctuary when callers omit the argument. The expanded Discover component must therefore receive worldType and explicitly pass it to both calls.

No migrations were applied. This was a read-only verification; a staging database/multi-account RLS test is still required before adopting the feature bundle.


## First implementation batch (2026-10-30)

Implemented on the isolated integration branch:

- Reworked Discover into two clear areas: public member search and upcoming community gatherings.
- Added a required `worldType` prop to `ProfileDiscovery` and passed the active world from `AppWorkspace`.
- Gatherings load through the existing `fetchEvents(currentUserId, worldType)` service, which already filters visible events by `world_type`. Guild discovery therefore does not silently fall back to Sanctuary.
- Added event search, chronological upcoming-event ordering, RSVP totals, date/time display and external map links.
- Kept people discovery on the existing `public_profiles` projection and `searchPublicProfiles` service. No private profile fields, interests, intentions, journals or reflections are added to public search.
- Added responsive event cards, keyboard focus styling, reduced-motion support, loading/error/empty states.
- Added `scripts/check-discover-scope.mjs` and npm script `check:discover-scope` to guard world-scope and private-reflection boundaries.

### Validation
- Branch compares cleanly against its original main base (0 commits behind at the latest compare).
- GitHub Actions has started for exact head `d17ef5db6264c3e67595bbb9f038fdc556c8427e`: CI, dependency-map contract, daily-reflection contract and visual preview are queued; Cloudflare PR workflow is pending. Results must be read before considering merge.
- No production database schema or data was changed. No discovery/relationship migrations were applied.
- A local checkout/build/browser session is unavailable in this execution environment; static contract coverage and GitHub Actions are the verification path for this batch.

### Remaining scope
This batch delivers world-scoped event discovery, not the full relationship/interests feature set from the larger candidate branch. Follows, connection requests, blocks, saved/hidden profiles, public interests and intentions remain gated on a separate migration/RLS implementation and staging multi-account verification. Community feed and engagement were retained from current main because their newer world-scoped implementation already supersedes several stale candidate branches.

- Wired `check:discover-scope` into the repository's pull-request CI workflow so the new scope/privacy contract is not merely an optional local script.
