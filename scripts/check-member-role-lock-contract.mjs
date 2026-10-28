import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20261027030000_lock_member_role_authority.sql', import.meta.url), 'utf8');
const fn = migration.match(/create or replace function public\.set_member_role\([\s\S]*?\$function\$;/i)?.[0];
assert.ok(fn, 'migration must replace the canonical role-management RPC');

assert.match(fn, /security definer\s+set search_path = ''/i, 'function must keep its hardened execution context');
assert.match(fn, /caller_id is null/i, 'anonymous calls must be rejected');
assert.match(fn, /requested_role is null or requested_role not in/i, 'unknown/null requested roles must be rejected');
assert.match(fn, /requested_user_id is null or requested_user_id = caller_id/i, 'null and self-target role changes must be rejected');
assert.match(fn, /order by p\.id\s+for update/i, 'actor and target rows must be locked in stable order');
assert.ok(fn.indexOf('order by p.id') < fn.indexOf('select p.role, p.status into caller_role, caller_status'), 'actor authority must be read after locks');
assert.ok(fn.indexOf('order by p.id') < fn.indexOf('select p.role into target_role'), 'target role must be read after locks');
assert.match(fn, /caller_status is distinct from 'active'/i, 'inactive actors must be rejected after locking');
for (const [role, rank] of [['owner', 6], ['developer', 5], ['admin', 4], ['moderator', 3], ['vip', 2], ['user', 1]]) {
  assert.match(fn, new RegExp(`when ['"]${role}['"] then ${rank}`), `canonical rank missing: ${role}=${rank}`);
}
assert.match(fn, /if caller_rank < 4 or requested_rank >= caller_rank or[\s\S]*?end\) >= caller_rank/i, 'every actor, including owner, must strictly outrank both the requested role and current target role');
assert.ok(!fn.includes("caller_role is distinct from 'owner'"), 'owner must not bypass equal/higher-rank protection');
assert.match(fn, /update public\.profiles set role = requested_role/i, 'role update must remain present');
assert.match(fn, /insert into public\.audit_events/i, 'role changes must remain audited');
assert.match(migration, /revoke all on function public\.set_member_role\(uuid, text\) from public, anon/i, 'public and anonymous execution must be revoked');
assert.match(migration, /grant execute on function public\.set_member_role\(uuid, text\) to authenticated/i, 'authenticated execution must be preserved');
console.log('Member role lock contract passed. Static source checks only; PostgreSQL integration and concurrency tests remain required.');
