# Sanctuary beta candidate — integration record

Tracking issue: https://github.com/platinumsoundz/Guild-Sanctuary/issues/206

## Candidate baseline
- Candidate branch is based on `feat/cosmic-mobile-ui-2026-10-28`, which previously had successful GitHub CI, install-banner accessibility contract, visual preview screenshots, and a successful Vercel status.
- This candidate is a staged integration surface, not a claim that all feature branches are merged, the app is production-ready, or a production deployment occurred.
- Owner approved automatic Vercel preview builds/comments on 2026-10-28.
- Production deployment, provider configuration changes, live billing, and Supabase migration application remain gated.

## Scope and merge policy
Integrate in small batches from the current candidate baseline. Do not merge divergent branches wholesale. For each source branch, inspect the current head, overlap, ancestry, code and tests; selectively recover work where newer mainline code has superseded its base.

## Required batch order
1. **Shell/UI:** reconcile compact header and top-left navigation, small notification overlay that preserves the current page, remove oversized Guild/Sanctuary and Community Activity areas, remove top Token Shop/Admin buttons, merge/reposition account/guest actions, and keep the PWA install option compact and dismissible. Review `feat/sanctuary-frontend-polish-2026-10-28` as a related overlapping source before taking any of its files.
2. **Roadmaps:** Sanctuary member roadmap covers Sanctuary/community and beta readiness; Guild roadmap covers the Guild games, browser arcade, game library, media lounge and integrations. Exclude The 5 Sleeves 2D/3D from both public roadmaps.
3. **Core correctness:** re-verify `public.get_short_engagement_stats(requested_short_id)`, DM preference behaviour, post/comment/short reports, comment edit/delete/like, auth and role boundaries.
4. **Persistence and events:** reconcile the overlapping Daily Reflection branches into one account-scoped implementation; consolidate event discovery/map branches and consistent member identity.
5. **Guild:** selectively recover browser arcade/controller support, companion library and media lounge. Keep calling and Cloud Lab behind explicit infrastructure/security gates.
6. **Release evidence:** run full CI and focused contracts; use available preview builds; record any rate-limit failures; prepare staging/device acceptance and rollback instructions.

## Branch inventory to reconcile
- UI overlap: `feat/cosmic-mobile-ui-2026-10-28`, `feat/sanctuary-frontend-polish-2026-10-28`, `feat/unified-navigation-notifications`, `feat/pwa-install-banner-mainline-2026-10-27`.
- Guild features: `feat/guild-browser-arcade-first-2026-10-28`, `feat/hidden-guild-world-blueprint-2026-10-28`, and Cosmic Arcade branches.
- Daily Reflection: `feat/database-backed-daily-reflection-2026-10-27`, `feat/private-daily-reflection-diary-2026-10-27`, `feat/private-database-daily-reflection-recovery-2026-10-27`.
- Events/discovery: `feat/event-discovery-map-explorer-2026-10-28`, `feat/events-map-discovery-2026-10-28`, and related connection branches.
- Product showcase: `feat/sanctuary-beta-showcase-collaboration-2026-10-27`, self-discovery and community-connection branches.

## Safety and release gates
- Do not apply migrations using a blind `supabase db push`; compare every proposed SQL change with the current live migration ledger and inspect RLS/grants first.
- Guild calling migrations are repository code only until explicitly applied; Edge Function deployment/configuration, Realtime private-channel settings, ICE/TURN setup, and two-device tests remain required.
- Do not enable live token purchases until privileged RPC grants, idempotency, ledger integrity, and owner release approval are verified.
- No production deployment or provider changes are part of this candidate preparation.
- The 5 Sleeves repositories are separate and must not be edited as part of this integration.

## Completion criteria
- [ ] All relevant open PRs and branches receive a recorded disposition: integrated, selectively recovered, blocked with an exact reason, or intentionally preserved as superseded.
- [ ] Shell/navigation behaviour matches the owner's latest UI requirements.
- [ ] Public Sanctuary and Guild roadmaps are separated and tested.
- [ ] Core feed, messaging, moderation and auth issues are verified.
- [ ] Daily Reflection and event discovery each have one coherent implementation.
- [ ] Guild features have honest implemented/tested/unapplied/deployed status labels.
- [ ] Fresh GitHub CI and available Vercel preview results are recorded.
- [ ] Staging/device/security gates and rollback plan are complete before considering production release.
