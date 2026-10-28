import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const admin = read('../src/modules/moderation/AdminDashboard.tsx');
const moderation = read('../src/modules/moderation/ModerationDashboard.tsx');
const service = read('../src/modules/moderation/service.ts');
const messageMigration = read('../supabase/migrations/20261028163256_moderate_reported_messages.sql');
const types = read('../src/services/supabase/database.types.ts');

const checks = [
  ['role management uses database-enforced member search', /rpc\('search_members_for_admin'/.test(admin)],
  ['role changes call the guarded database RPC', /rpc\('set_member_role'/.test(admin)],
  ['only authorized role levels see role-management controls', /canManageRoles = \['admin', 'developer', 'owner'\]/.test(admin)],
  ['moderation tools are gated by the account role', /canModerate = \['moderator', 'admin', 'developer', 'owner'\]/.test(admin)],
  ['moderation queue checks the authenticated active account', /auth\.getUser\(\)/.test(service) && /profile\.status !== 'active'/.test(service)],
  ['every moderation action requires a bounded rationale', /rationale\.length < 3 \|\| rationale\.length > 1000/.test(service)],
  ['moderation buttons stay disabled until a rationale is supplied', /!rationales\[report\.id\]\?\.trim\(\)/.test(moderation)],
  ['moderation actions use the server-side authorization RPC', /rpc\('apply_moderation_action'/.test(service)],
  ['message hide/remove/restore actions update message visibility', /requested_target_type='message'[\s\S]*?update public\.messages set state/.test(messageMigration)],
  ['message moderation validates that the target still exists', /requested_target_type = 'message' and not exists\(select 1 from public\.messages/.test(messageMigration)],
  ['message target-owner lookup is typed for the frontend', /get_report_target_owner:[\s\S]*?Returns: string \| null/.test(types)],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Admin settings contract checks passed: ${checks.length}. Static checks only; browser role-permission QA remains required.`);
