# Private daily reflection diary — 2026-10-27

## Decision
Daily reflections must persist in the authenticated user's database account and be browsable as a chronological private diary/feed. Do not treat browser local storage as the source of truth.

## Schema proposal
- `public.daily_reflections` stores one saved reflection per entry, with date, title, content, optional mood, prompts/tags JSON arrays, and timestamps.
- RLS policies allow authenticated users to select, insert, update, and delete only rows whose `user_id = auth.uid()`.
- Anonymous access is revoked. Reflection content is private by default and is not inserted into the public `posts` feed.
- Index supports a user's reverse-chronological diary.

## Important boundaries
- This branch contains a proposed migration only. It has **not** been applied to Supabase; provider-side migration execution remains an owner-only action.
- Frontend wiring and end-to-end persistence tests still need implementation after locating the current reflection UI. The migration alone does not make the UI work.
- Do not mirror reflection text into public posts or analytics. Any future explicit share/export action must be separate and opt-in.
- Avoid diagnostic claims or inferred mental-health labels in reflection summaries.

## Verification
- Confirmed the active Supabase project currently has no public table named like reflection, journal, or diary.
- Static review only; no database migration or application tests run in this documentation/schema handoff.
