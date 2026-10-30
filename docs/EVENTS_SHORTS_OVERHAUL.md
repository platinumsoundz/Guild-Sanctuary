# Events and Shorts — Product Overhaul

Status: planned implementation programme. This document is the acceptance contract for the Events and Shorts rebuild in both Sanctuary and Guild.

## Product principles

- Sanctuary and Guild share components and service contracts, but every read, write, notification, count, report, and moderation action is scoped to the active `world_type`.
- Guests may browse only content explicitly marked public and may not publish, RSVP, react, comment, save, or upload.
- Basic members can use stable community features. Experimental creator and organiser tools remain hidden behind the existing role/feature gates until verified.
- Mobile-first, accessible, reduced-motion aware, keyboard and controller navigable.
- No fake engagement, invented attendance, placeholder links, or UI that implies a payment/ticket is confirmed when it is not.
- Reuse the shared inbox badge standard in `docs/INBOX_BADGE_STANDARD.md` for all new inbox and notification surfaces.

## Events: rebuild into a community events hub

### Member experience
- Replace the map-first placeholder presentation with a clear Events landing page: featured/upcoming event, date-based browse, search, category chips, and list/calendar/map views.
- Event cards show title, host, date/time with local timezone, venue/address when available, online/in-person status, attendance summary, and privacy/access label.
- Event detail view includes full description, organiser profile, venue/map or online joining information, attendee/interest counts, discussion, and report action.
- RSVP states are explicit: Going, Interested, Not going. Show the member's current state and prevent duplicate or stale counts.
- Filters: upcoming/past, date range, category, online/in-person, and location radius only when a reliable location is available.
- Search covers event title, description, venue, and category.
- Calendar export/reminders are opt-in and clearly distinguish local reminders from server notifications.

### Organiser experience
- Guided create/edit flow with title, description, cover image, category, start/end time, timezone, venue or online URL, visibility, attendee capacity, and optional registration notes.
- Preview before publishing; draft, publish, cancel, and delete states with clear confirmation.
- Organisers can view attendee lists only where privacy settings and permissions allow, update event details, and send scoped updates to RSVPed members.
- Capacity and waitlist handling must be atomic server-side; never rely on client-side counts.
- Online event URLs must not be exposed to users who are not eligible to attend.

### Reliability and moderation
- Durable Supabase persistence and RLS policies scoped by owner, event visibility, and world.
- Server-side validation for dates, timezones, URLs, coordinates, capacity, and ownership.
- Event create/edit/cancel and RSVP notifications follow the shared inbox badge contract.
- Reports, moderation states, audit trail, and owner/moderator actions remain world-scoped.
- Preserve existing event comments/reactions where schema-compatible; migrate without losing records.

## Shorts: rebuild into a polished short-video experience

### Viewer experience
- Immersive vertical, snap-scrolling feed with one active playback target, pause-on-exit, muted autoplay defaults, and accessible playback controls.
- Feed modes: For You (only when a transparent ranking contract exists), Following, Latest, and Saved. Do not label a chronological feed as algorithmic.
- Video cards include creator identity/profile link, caption, timestamp, sound/audio attribution where supported, and accessible action labels.
- Like, comment, share/copy link, save, and report actions with optimistic UI only when rollback is handled.
- Comments support loading, empty/error states, pagination, editing/deleting own comments, and moderation reporting.
- Respect reduced motion, data saver, low-power and autoplay preferences; never autoplay multiple clips.
- Empty, upload, network, and playback failure states must be designed rather than left as blank space.

### Creator experience
- Upload and recording flow with preview, caption, thumbnail/cover selection, visibility, draft/publish, and clear progress/error states.
- Validate MIME type, duration, size, dimensions, and quota both client- and server-side. Limits must be configuration-backed and communicated before upload.
- Creator library with drafts, published clips, processing/rejected states, and edit/delete controls.
- Display meaningful processing states; do not expose a clip as playable until processing and safety checks succeed.

### Media and safety pipeline
- Private storage by default, signed playback URLs, explicit ownership checks, world-scoped database records, and cleanup on failed upload/delete.
- Add server-side video scanning, metadata inspection, transcoding to adaptive formats, poster generation, duration enforcement, and delivery optimisation before public launch.
- Rate limits and upload quotas; abuse/report workflow and moderation review; prevent unsupported or unsafe media types.
- Fix and regression-test the short engagement RPCs (including `get_short_engagement_stats`) and verify function grants, search_path, RLS, and world isolation before enabling production engagement.
- Preserve media references during migrations and avoid deleting source media until replacement assets are verified.

## Shared navigation, notifications, and permissions

- Events and Shorts counts use the shared `src/lib/navigationBadges.ts` contract when a meaningful unread/attention count exists.
- Every query and mutation must include the active world; do not leak Guild content into Sanctuary or vice versa.
- Moderation actions are role-gated; reporting remains available to ordinary signed-in members.
- Guests are read-only and have fewer privileges than Basic members.
- Stable member-facing pages stay visible in Basic navigation; experimental tools stay in tester/privileged navigation.

## Delivery sequence and acceptance gates

1. **Audit and stabilise:** inspect current schemas, RLS, migrations, media storage, existing event/short actions, and known RPC failures. Add regression tests for world isolation and permissions.
2. **Events UX and organiser flow:** responsive landing/list/detail/create/edit experiences using existing service contracts; do not invent unsupported database fields.
3. **Shorts viewer and creator UX:** immersive feed, reliable playback lifecycle, accessible controls, composer states, creator identity, and pagination.
4. **Backend hardening:** durable event/short persistence, media processing and limits, RPC repairs, atomic RSVP/capacity, RLS, moderation and cleanup.
5. **Cross-world integration:** shared navigation badges, notifications, discovery links, profile links, and Guild/Sanctuary parity.
6. **Release verification:** typecheck, lint, unit/integration tests, migration dry-run, RLS checks, mobile viewport review, guest/basic/moderator/developer role matrix, preview deployment, and explicit production approval.

A phase is not complete because its UI renders. It is complete only when its data, permissions, failure states, and cross-world boundaries pass the relevant checks.
