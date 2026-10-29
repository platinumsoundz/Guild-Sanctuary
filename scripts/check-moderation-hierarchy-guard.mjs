import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261029130000_moderation_action_hierarchy_guard.sql', 'utf8');
assert.match(migration, /before insert on public\.moderation_actions/, 'hierarchy enforcement runs at the moderation action table boundary');
assert.match(migration, /new\.actor_id is distinct from caller_id/, 'actor identity cannot be spoofed');
assert.match(migration, /target_role <> 'active'/, 'inactive actors are denied');
assert.match(migration, /when 'moderator' then 2[\s\S]*when 'admin' then 3[\s\S]*when 'developer' then 4[\s\S]*when 'owner' then 5/, 'moderator rank hierarchy is explicit');
for (const target of ['user', 'post', 'short', 'event', 'comment', 'message']) {
  assert.ok(migration.includes(`when '${target}' then`), `target owner is resolved for ${target}`);
}
assert.match(migration, /if actor_level <= target_level/, 'equal and higher-ranked targets are blocked');
assert.match(migration, /order by p\.id[\s\S]*?for update/, 'actor and target roles are locked in deterministic order before final authorization');
assert.match(migration, /select lower\(p\.role\), p\.status[\s\S]*?where p\.id = caller_id/, 'actor role and status are re-read after locking');
assert.match(migration, /new\.action = 'suspend'[\s\S]*actor_role not in \('admin', 'developer', 'owner'\)/, 'moderator-only callers cannot suspend accounts');
assert.match(migration, /new\.action = 'ban'[\s\S]*actor_role not in \('developer', 'owner'\)/, 'moderator and admin callers cannot ban accounts');
assert.match(migration, /else 999/, 'unknown target roles fail closed');
assert.match(migration, /revoke all on function public\.enforce_moderation_target_hierarchy\(\) from public, anon, authenticated/, 'trigger function cannot be called directly by API roles');
console.log('Moderation hierarchy guard contract checks passed.');
