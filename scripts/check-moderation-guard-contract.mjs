import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20261027010000_enforce_moderation_role_hierarchy.sql', import.meta.url), 'utf8');

assert.match(migration, /create or replace function public\.apply_moderation_action/i);
assert.match(migration, /security definer\s+set search_path = ''/i);
assert.match(migration, /requested_target_id = caller_id[\s\S]*?cannot take account actions against themselves/i);
assert.match(migration, /target_role is null/i, 'missing target role must fail closed');
assert.ok(migration.includes("caller_role not in ('moderator','admin','developer','owner')"), 'moderator authority must be rechecked after profile locks are acquired');
assert.match(migration, /order by p\.id\s+for update/i, 'role rows must be locked in deterministic order');
for (const [role, rank] of [['owner', 6], ['developer', 5], ['admin', 4], ['moderator', 3], ['vip', 2], ['user', 1]]) {
  assert.match(migration, new RegExp(`when ['"]${role}['"] then ${rank}`), `missing role rank ${role}=${rank}`);
}
assert.match(migration, /if caller_rank <= target_rank then/i, 'equal/higher-rank targets must be rejected');
assert.match(migration, /if requested_target_type <> 'user' then[\s\S]*?target_owner_id := case requested_target_type/i, 'content actions must resolve the content owner');
for (const [kind, table, owner] of [['post', 'posts', 'author_id'], ['short', 'short_videos', 'author_id'], ['event', 'events', 'creator_id'], ['comment', 'social_comments', 'author_id'], ['message', 'messages', 'sender_id']]) {
  assert.match(migration, new RegExp(`when ['"]${kind}['"] then \\(select \\w+\\.${owner} from public\\.${table}`), `content owner lookup missing for ${kind}`);
}
assert.match(migration, /target_owner_id = caller_id[\s\S]*?cannot take content actions against their own content/i, 'self-content moderation must be rejected');
assert.match(migration, /caller_rank <= target_rank then[\s\S]*?cannot moderate content owned by a member of equal or higher rank/i, 'content owned by equal/higher roles must be protected');

assert.match(migration, /requested_rationale is null/i, 'null rationale must fail closed');
assert.match(migration, /requested_target_type is null or requested_target_id is null or requested_action is null/i, 'null target and action inputs must fail closed');
assert.match(migration, /from public, anon/i, 'public and anon execute grants must be revoked');
assert.match(migration, /to authenticated/i, 'authenticated moderation execution must be preserved');
assert.match(migration, /public\.get_report_target_owner/i, 'report/target consistency check must be preserved');
assert.match(migration, /public\.social_comments/i, 'comment moderation must be preserved');
assert.match(migration, /requested_target_type = 'message' and not exists/i, 'message target existence must be checked');
assert.match(migration, /update public\.messages set state/i, 'message moderation must update message state');
assert.match(migration, /public\.audit_events/i, 'audit event must be preserved');
console.log('Moderation guard contract passed: hierarchy, self-target rejection, fail-closed inputs, grants, comment flow and audit trail.');
