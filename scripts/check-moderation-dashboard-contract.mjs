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

assert.ok(dashboard.includes('searchQuery'), 'queue must expose client-side report search');
assert.ok(dashboard.includes('typeFilter'), 'queue must expose report-type filtering');
assert.ok(dashboard.includes('filteredReports.map'), 'rendered queue must respect active filters');
assert.ok(dashboard.includes('onClick={() => void refresh()}'), 'moderators must be able to refresh the queue manually');
assert.ok(dashboard.includes('window.confirm'), 'destructive moderation actions must require an explicit confirmation');
assert.ok(dashboard.includes('setNotice('), 'successful action submission must provide visible status feedback');

assert.ok(admin.includes('Admin access overview'), 'admin dashboard must explain role-scoped capabilities');
assert.ok(admin.includes('filteredMembers.map'), 'member search results must support role/status filtering');
assert.ok(admin.includes('availableStatuses'), 'member status filters must use observed status values');
assert.ok(admin.includes('window.confirm'), 'role changes must require explicit confirmation');
assert.ok(admin.includes('This increases the member’s privilege level'), 'privilege increases must show a clear warning');
assert.ok(admin.includes('setMembers([])'), 'failed member searches must not leave stale member results actionable');
assert.ok(admin.includes('roleChangePreview'), 'role editor must show current and requested roles before submission');
assert.ok(admin.includes("role={messageIsError ? 'alert' : 'status'}"), 'member-management failures must be announced as alerts');
assert.ok(admin.includes('messageError'), 'member-management errors must have distinct visual styling');


const mediaGuard = readFileSync(new URL('../src/modules/moderation/media-url.ts', import.meta.url), 'utf8');
assert.ok(dashboard.includes("import { getSafeModerationMediaUrl } from './media-url'"), 'moderation media links must pass through the client-side URL guard');
assert.ok(dashboard.includes('getSafeModerationMediaUrl(report.targetMediaUrl)'), 'untrusted media URL values must be validated before rendering as links');
assert.ok(dashboard.includes('rel="noopener noreferrer"'), 'new-tab media links must not expose the opener window');
assert.ok(dashboard.includes('Media link hidden because its URL is invalid or uses an unsupported protocol.'), 'invalid media URLs must fail closed with a clear explanation');
assert.ok(mediaGuard.includes("url.protocol !== 'https:'"), 'moderation media links must reject non-HTTPS protocols');
assert.ok(mediaGuard.includes('url.username || url.password'), 'moderation media links must reject URLs containing embedded credentials');
assert.ok(mediaGuard.includes('value.length > 4096'), 'moderation media URLs must have a defensive maximum length');

console.log('Moderation dashboard contract checks passed.');
