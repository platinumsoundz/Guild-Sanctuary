import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const migration = readFileSync(new URL('../supabase/migrations/20261027021800_guard_moderation_action_role_hierarchy.sql', import.meta.url), 'utf8');
const functionSql = migration.match(/create or replace function public\.apply_moderation_action\([\s\S]*?\$\$;/i)?.[0];
assert.ok(functionSql, 'migration must replace the canonical moderation RPC');

const checks = [
  ['RPC remains SECURITY DEFINER with an empty search_path', /language plpgsql\s+security definer\s+set search_path\s*=\s*''/i.test(functionSql)],
  ['signed-in moderator authorization remains enforced', /caller_id is null or not public\.is_moderator\(\)/i.test(functionSql)],
  ['account actions lock caller and target in stable UUID order', /where p\.id in \(caller_id,\s*requested_target_id\)\s+order by p\.id\s+for update/i.test(functionSql)],
  ['moderator role is rechecked after locks are acquired', /caller_role is null or caller_role not in \('moderator', 'admin', 'developer', 'owner'\)/i.test(functionSql)],
  ['self-target account actions are rejected', /if requested_target_id = caller_id then\s+raise exception 'You cannot moderate your own account\.'/i.test(functionSql)],
  ['all Sanctuary roles have explicit ordered ranks', /caller_rank := case caller_role[\s\S]*?when 'owner' then 6[\s\S]*?when 'developer' then 5[\s\S]*?when 'admin' then 4[\s\S]*?when 'moderator' then 3[\s\S]*?when 'vip' then 2[\s\S]*?when 'user' then 1/i.test(functionSql) && /target_rank := case target_role[\s\S]*?when 'owner' then 6[\s\S]*?when 'developer' then 5[\s\S]*?when 'admin' then 4[\s\S]*?when 'moderator' then 3[\s\S]*?when 'vip' then 2[\s\S]*?when 'user' then 1/i.test(functionSql)],
  ['equal or higher roles are rejected before the action is recorded', functionSql.indexOf('caller_rank <= target_rank') >= 0 && functionSql.indexOf('caller_rank <= target_rank') < functionSql.indexOf('insert into public.moderation_actions')],
  ['report and moderation target matching remains enforced', /Report and moderation target do not match/i.test(functionSql)],
  ['moderation audit event is preserved', /insert into public\.audit_events/i.test(functionSql)],
  ['post, short, event, and comment state transitions are preserved', /update public\.posts[\s\S]*?update public\.short_videos[\s\S]*?update public\.events[\s\S]*?update public\.social_comments/i.test(functionSql)],
  ['public, anonymous, and authenticated grants are reset before authenticated-only execute', /revoke all on function public\.apply_moderation_action\([\s\S]*?\) from public, anon, authenticated;[\s\S]*?grant execute on function public\.apply_moderation_action\([\s\S]*?\) to authenticated;/i.test(migration)],
  ['migration introduces no table DDL', !/\b(?:create|alter|drop)\s+table\b/i.test(migration)],
];

for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label);
  assert.ok(passed, label);
}
console.log('Moderation SQL contract checks passed: ' + checks.length + '. Static source checks only; no PostgreSQL integration is implied.');
