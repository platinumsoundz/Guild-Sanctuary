# Community Connection Toolkit — branch task contract

**Branch:** `feat/community-connection-toolkit-2026-10-28`  
**Base:** `main`  
**Owner:** Product & Experience  
**Status:** implementation complete; automated contract/runtime tests, typecheck, production build, and repository CI passed on the current implementation head. Browser/device QA remains pending because the Vercel preview hit its daily deployment limit.

## User outcome
Members who want to share something meaningful can use a gentle structure for a life lesson or a conversation starter, making it easier for others to understand, respond, and connect.

## Scope
- Add optional “Life lesson” and “Conversation starter” modes to the existing feed composer.
- Convert guided answers into ordinary posts through the existing `publishPost` path and current story-tag field.
- Add clear validation, character limits, accessible labels/errors, responsive styling, and a static regression contract.
- Keep free-form posting and existing media attachments intact.

## Non-scope
- No event discovery or map features (a separate active branch already exists).
- No Today/home dashboard, questionnaire, self-discovery, planner, or reflection feature duplication.
- No circles/groups, friend/follow graph, new database schema, migration, RLS policy, API, analytics, or persistence mechanism.
- No changes to owner-only provider settings, secrets, payment behavior, deployment, or production data.

## Dependencies and privacy
- Reuses the existing feed, authenticated posting checks, current post schema, and moderation/reporting surfaces.
- Guided fields are component state only and are submitted only when the member explicitly publishes.
- Guest mode remains read-only; this does not add anonymous posting.
- This is a writing aid, not a therapeutic intervention or promise of improved wellbeing.

## Acceptance criteria
- Members can choose free-form, life-lesson, or conversation-starter mode.
- Life lessons require a lesson learned; context, what helps now, and a question are optional.
- Conversation starters require an explicit question; context is optional.
- Validation rejects empty required fields, oversized fields, and composed posts over 2,800 characters.
- Publishing still uses the existing feed service; no new persistence or network path is introduced.
- Mobile layout, keyboard access, visible focus, and error announcements are covered by source contract and then browser QA.

## Verification
- `node scripts/check-community-connection-toolkit.mjs`
- `node --experimental-strip-types scripts/test-community-connection.mjs` (runtime cases for all composer modes and validation)
- `npm run typecheck`
- `npm run build`
- Manual QA: guest/read-only state, all three modes, validation errors, attachments, keyboard-only use, narrow mobile viewport, theme contrast, and publishing failure recovery.

## Risk and rollback
- Low data risk: only client-side composition changes; persisted post content remains compatible with existing post schema.
- Rollback by reverting the focused feed composer, helper, style, test, and task-contract changes on this branch.
- No migrations, production operations, merge, or deployment are part of this task.
