import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const moderation = read('../supabase/migrations/20261028163256_moderate_reported_messages.sql');
const reporting = read('../supabase/migrations/20261028165508_scope_message_reports_to_members.sql');

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
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}

console.log(`Supabase privileged-RPC contract checks passed: ${checks.length}. Static checks only; database role tests and staging/browser QA are still required.`);
