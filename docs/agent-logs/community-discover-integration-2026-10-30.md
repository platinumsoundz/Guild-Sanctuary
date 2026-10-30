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
