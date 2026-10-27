# Sanctuary personal log, schedule, and growth planner contract

**Status:** implementation contract, not a claim of a finished planner.  
**Date:** 2026-10-27

## Product intent

Help a member turn their own goals and reflections into manageable daily actions. The planner should support wellbeing and self-directed growth without diagnosing, pressuring, or treating productivity as a measure of personal worth.

## Core experiences

1. **Today view** — today's planned items, reminders, and a small optional check-in.
2. **Schedule** — user-created events and time blocks with timezone-aware start/end times, recurrence, and explicit reminder preferences.
3. **Daily log** — optional mood/energy notes, what went well, what was difficult, and a free-text journal entry.
4. **Goals and habits** — member-defined goals, small next actions, cadence, and completion history.
5. **Reflection links** — members may manually choose to use a self-discovery insight as a goal prompt; never automatically share questionnaire answers with the planner or community.
6. **Review** — weekly private summary based only on data the member opted to record, with the ability to correct or delete entries.
7. **Export and deletion** — clear member-controlled export, deletion, and retention behaviour.

## Data contract (proposed; do not migrate until schema inventory and RLS review)

Use existing canonical naming and schema conventions after checking the repository and live migration ledger. The names below describe logical entities, not instructions to create duplicate tables.

- **planner_items**: owner_id, title, optional description, item_type (event/task/habit), start_at, end_at, timezone, due_at, status, recurrence_rule, created_at, updated_at.
- **daily_logs**: owner_id, log_date in member-local calendar, optional energy/mood selections, optional gratitude/wins/challenges, optional private journal text, created_at, updated_at.
- **goals**: owner_id, title, optional description, status, target_date, created_at, updated_at.
- **goal_steps**: owner_id, goal_id, title, due_at, completed_at, position.
- **habit_definitions**: owner_id, title, cadence, active flag, created_at, updated_at.
- **habit_checkins**: owner_id, habit_id, local_date, status, optional note, created_at; unique per habit and local date.
- **reminder_preferences**: owner_id, channel, enabled, quiet hours, timezone, updated_at.
- **planner_audit_events**: minimal security-relevant events only; never duplicate journal text into audit records.

Do not add these tables if equivalent canonical tables already exist. Use migrations with exact version ordering, rollback notes, and tests.

## Privacy and authorization

- Every row has a trusted owner identity derived from the authenticated session, not a client-supplied owner ID.
- RLS requires owner-only SELECT/INSERT/UPDATE/DELETE for logs, goals, planner items, habit records, and reminder preferences.
- Validate parent ownership when writing goal steps or habit check-ins; a valid child ID must not bypass parent ownership.
- No public profile, guild, admin dashboard, analytics event, or AI prompt receives journal text by default.
- Sensitive optional fields must be excluded from logs, traces, search indexing, and notification content.
- Any summarization or AI processing must be explicit opt-in, disclose what is sent and where, and allow the member to use the core planner without it.
- Export and account deletion must cover planner records and any derived summaries according to the published retention policy.
- Enforce length limits, input validation, rate limits, and safe rendering for free text.

## Time and recurrence rules

- Persist timestamps in UTC with an IANA timezone for user intent; do not infer timezone from server location.
- Store all-day items as local dates plus timezone semantics, not as arbitrary midnight UTC timestamps.
- Recurrence must be expanded consistently across daylight-saving changes and timezone changes.
- Reminders must respect quiet hours, opt-out, and notification permissions. A reminder being scheduled does not guarantee delivery.
- Completion history should be append-safe and idempotent; edits to a recurring series must define whether they change past instances.

## UI and accessibility

- All sensitive fields are optional and clearly marked private.
- Provide keyboard navigation, labelled controls, visible focus, reduced-motion support, screen-reader status updates, and responsive layouts.
- Avoid streak-shaming language. Missing a day should not reset a person's identity or imply failure.
- Provide undo for accidental completion/deletion where feasible.
- Explain what is saved before the first journal entry and when data leaves the device.

## Acceptance tests before release

- Member A cannot read or alter member B's planner/log/goal rows, including through nested IDs.
- Forged owner IDs are ignored or rejected server-side.
- Cross-timezone and daylight-saving recurrence tests pass.
- Duplicate check-in submissions do not create duplicate records.
- Deleted entries disappear from ordinary reads and follow the documented backup/retention policy.
- Journal content never appears in application logs, analytics, push previews, or public APIs.
- Data export includes the member's supported planner records and is access-controlled.
- Reminder opt-out and quiet hours are respected.
- Free-text rendering is safe; invalid dates and oversized payloads fail validation.
- The full test suite runs against isolated staging before production migrations.

## Delivery sequence

1. Inventory current calendar, log, goal, and profile code plus existing tables before proposing new schema.
2. Implement a local UI slice with clear unsaved/saved states only if that matches the existing app architecture.
3. Reconcile migration history and nominate a dedicated disposable/staging Supabase project.
4. Submit schema and RLS as a focused migration PR; verify owner isolation with automated tests.
5. Connect UI to authenticated persistence and explicit save/delete states.
6. Add timezone-aware recurrence, reminders, export, and account deletion integration.
7. Add optional, transparent summaries only after privacy and retention review.

## Out of scope for the initial slice

- Automatic diagnosis or mental-health scoring.
- Sharing journals or questionnaire answers with other users.
- Silent AI analysis of private notes.
- Public leaderboards or shame-based streak mechanics.
- Production migrations before schema drift and staging are resolved.
