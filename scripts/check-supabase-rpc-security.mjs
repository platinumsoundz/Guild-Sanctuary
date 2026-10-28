import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const moderation = read('../supabase/migrations/20261028163256_moderate_reported_messages.sql');
const reporting = read('../supabase/migrations/20261028165508_scope_message_reports_to_members.sql');
const planner = read('../supabase/migrations/20261028162853_private_personal_planner_storage.sql');
const reflections = read('../supabase/migrations/20261027150000_create_private_daily_reflections.sql');

const checks = [
  ['moderation RPC is SECURITY DEFINER only with an empty search_path', /SECURITY DEFINER\s+SET search_path TO ''/i.test(moderation)],
  ['moderation RPC derives the caller from the verified auth context', /caller_id uuid := auth\.uid\(\)/i.test(moderation)],
  ['moderation RPC enforces active moderator authorization server-side', /caller_id is null or not public\.is_moderator\(\)/i.test(moderation)],
  ['moderation RPC bounds the required rationale', /char_length\(trim\(requested_rationale\)\) not between 3 and 1000/i.test(moderation)],
  ['moderation RPC validates that a supplied report matches the target', /Report and moderation target do not match/i.test(moderation)],
  ['moderation RPC records an audit event for every applied action', /insert into public\.audit_events[\s\S]*?moderation\.'\|\|requested_action/i.test(moderation)],
  ['moderation RPC changes message visibility for hide/remove/restore', /requested_target_type='message'[\s\S]*?update public\.messages set state=case requested_action/i.test(moderation)],
  ['report RPC is SECURITY DEFINER only with an empty search_path', /SECURITY DEFINER\s+SET search_path TO ''/i.test(reporting)],
  ['report RPC requires a signed-in active account', /caller_id is null or not public\.is_active_user\(\)/i.test(reporting)],
  ['report RPC rate-limits repeated reports under a transaction lock', /pg_advisory_xact_lock[\s\S]*?Report rate limit exceeded/i.test(reporting)],
  ['reported messages must be visible and belong to an active conversation', /state = ''visible''::public\.content_state[\s\S]*?public\.is_active_conversation_member\(conversation_id\)/i.test(reporting)],
  ['report RPC rejects targets that fail its visibility and membership checks', /if not target_exists then raise exception 'Report target is unavailable'/i.test(reporting)],
  ['planner payload has a versioned shape and one-megabyte database size ceiling', /planner_data ->> 'version' = '1'[\\s\\S]*?pg_column_size\\(planner_data\\) <= 1048576/i.test(planner)],
  ['planner rows enforce owner-scoped RLS for reads and writes', /enable row level security/i.test(planner) && /for select to authenticated[\\s\\S]*?auth\\.uid\\(\\) = user_id/i.test(planner) && /for update to authenticated[\\s\\S]*?using \\(\\(select auth\\.uid\\(\\)\\) = user_id\\)[\\s\\S]*?with check \\(\\(select auth\\.uid\\(\\)\\) = user_id\\)/i.test(planner)],
  ['planner grants avoid anonymous access and restrict client-writable columns', /revoke all on public\\.personal_planner_data from anon, authenticated/i.test(planner) && /grant insert \\(user_id, planner_data\\)/i.test(planner) && /grant update \\(planner_data\\)/i.test(planner) && !/grant[^;]*\\bto\\s+anon\\b/i.test(planner)],
  ['reflection rows have bounded text and array-shaped JSON fields', /char_length\\(intention\\) <= 180/i.test(reflections) && /char_length\\(content\\) <= 1200/i.test(reflections) && /jsonb_typeof\\(prompts\\) = 'array'/i.test(reflections) && /jsonb_typeof\\(tags\\) = 'array'/i.test(reflections)],
  ['reflection rows enforce owner-scoped RLS and deny anonymous grants', /enable row level security/i.test(reflections) && /for select to authenticated[\\s\\S]*?auth\\.uid\\(\\) = user_id/i.test(reflections) && /for update to authenticated[\\s\\S]*?with check \\(auth\\.uid\\(\\) = user_id\\)/i.test(reflections) && /revoke all on public\\.daily_reflections from anon/i.test(reflections)],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}

console.log(`Supabase privileged-RPC contract checks passed: ${checks.length}. Static checks only; database role tests and staging/browser QA are still required.`);
