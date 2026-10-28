import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const dashboard = readFileSync(new URL('../src/modules/moderation/ModerationDashboard.tsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/modules/moderation/service.ts', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../src/modules/moderation/AdminDashboard.tsx', import.meta.url), 'utf8');

assert.ok(admin.includes('<ModerationDashboard role={role} />'), 'admin dashboard must pass the authenticated role into moderation controls');
assert.ok(dashboard.includes("['moderator', 'admin', 'developer', 'owner'].includes(role)"), 'warning capability must be limited to moderator-level roles and above');
assert.ok(dashboard.includes("['admin', 'developer', 'owner'].includes(role)"), 'suspension capability must be limited to admin-level roles and above');
assert.ok(dashboard.includes("['developer', 'owner'].includes(role)"), 'ban capability must be limited to developer/owner roles');
assert.ok(dashboard.includes("rationales[report.id]?.trim()"), 'actions must require a non-empty rationale');
assert.ok(dashboard.includes('minLength={3}'), 'rationale input must communicate a minimum length');
assert.ok(dashboard.includes('targetContent?.trim()'), 'queue must render reported content returned by the backend');
assert.ok(dashboard.includes('report.details'), 'queue must render reporter details when supplied');
assert.ok(dashboard.includes('role="alert"'), 'backend failures must be visible to assistive technology');
assert.ok(service.includes("client.rpc('get_moderation_queue')"), 'reported content must come through the dedicated role-gated backend RPC');
assert.ok(service.includes(".rpc('apply_moderation_action'"), 'moderation actions must go through the backend action RPC');
assert.ok(service.includes('requested_rationale: rationale'), 'action rationale must be sent to the backend audit path');
assert.ok(service.includes('client.auth.getUser()'), 'queue access must verify an authenticated account');
assert.ok(service.includes("profile.status !== 'active'"), 'queue access must reject inactive accounts');

console.log('Moderation dashboard contract checks passed.');
