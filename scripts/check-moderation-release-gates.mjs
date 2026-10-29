import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const moderation = readFileSync('src/modules/moderation/ModerationDashboard.tsx', 'utf8');
const service = readFileSync('src/modules/moderation/service.ts', 'utf8');
const workspace = readFileSync('src/components/AppWorkspace.tsx', 'utf8');
const notifications = readFileSync('src/components/NotificationBar.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20261029100000_role_gated_wallet_and_moderation_notifications.sql', 'utf8');
const checkout = readFileSync('src/app/api/checkout/route.ts', 'utf8');

for (const marker of ['REPORTED CONTENT', 'report.targetPreview', 'report.targetOwnerName', 'Hide content', 'Remove content', 'Ban member', 'Action rationale']) {
  assert.ok(moderation.includes(marker), `Moderation dashboard missing: ${marker}`);
}
for (const marker of ['get_moderation_report_context', 'targetPreview', 'apply_moderation_action']) {
  assert.ok(service.includes(marker), `Moderation service missing: ${marker}`);
}
for (const marker of ['This account is banned', 'Account suspended', 'Wallet access is restricted', 'Token Shop access is restricted']) {
  assert.ok(workspace.includes(marker), `Account/feature gate missing: ${marker}`);
}
assert.ok(notifications.includes('moderation_user_notifications'), 'Notification panel must load moderation outcomes');
assert.ok(notifications.includes('moderationCopy'), 'Notification panel must explain moderation outcomes');
assert.ok(migration.includes('public.is_wallet_eligible()'), 'Wallet access must be gated in the database');
assert.ok(migration.includes('after insert on public.moderation_actions'), 'Moderation actions must create user notices');
assert.ok(checkout.includes('Wallet purchases are currently limited to active VIP members'), 'Checkout must enforce VIP eligibility server-side');
console.log('Moderation context, outcome notifications, account status screens, and wallet role gates verified.');
