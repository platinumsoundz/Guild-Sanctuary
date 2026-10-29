import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const gates = read('../src/lib/sanctuaryFeatureGates.ts');
const nav = read('../src/components/Navigation.tsx');
const guildNav = read('../src/components/GuildNavigation.tsx');
const workspace = read('../src/components/AppWorkspace.tsx');
const settings = read('../src/modules/settings/components/SettingsHub.tsx');
const donationRoute = read('../src/app/api/community-tips/route.ts');
const webhook = read('../src/app/api/webhooks/stripe/route.ts');
const migration = read('../supabase/migrations/20261029163000_role_based_navigation_and_paid_vip.sql');

for (const page of ['today', 'feed', 'discover', 'messages', 'profile', 'planner', 'support', 'notifications', 'roadmap', 'settings']) {
  assert.match(gates, new RegExp(`^${page}: 'user',$`, 'm'), `${page} must be available to basic users`);
}
for (const page of ['shorts', 'events', 'wallet', 'shop']) {
  assert.match(gates, new RegExp(`^${page}: 'vip',$`, 'm'), `${page} must require VIP`);
}
assert.match(gates, /^admin: 'moderator',$/m, 'moderation pages must require moderator or above');
for (const page of ['games', 'guild-roadmap', 'guild']) {
  assert.match(gates, new RegExp(`^['"]?${page}['"]?: 'developer',$`, 'm'), `${page} must require developer or owner`);
}
assert.match(gates, /if \(role === 'owner'\) return true/, 'owner bypasses page gates');
assert.match(gates, /if \(!\(page in pageMinimumRole\)\) return role === 'developer'/, 'unregistered/new pages fail closed to developer and owner');
assert.match(nav, /navigationItems\.filter\(\(item\) => canAccessSanctuaryPage\(item\.id, role\)\)/, 'main navigation filters pages by role');
assert.match(guildNav, /const canOpenGuild = role === 'developer' \|\| role === 'owner'/, 'Guild navigation is restricted to developers and owners');
assert.match(workspace, /canAccessSanctuaryPage\(activeNavigation, currentRole\)/, 'direct navigation attempts are redirected');
assert.match(workspace, /activeNavigation === 'guild' && canUseGuild/, 'Guild experience is guarded at the render boundary');
assert.match(settings, /\(role === 'developer' \|\| role === 'owner'\) && <section[^>]*aria-labelledby="hidden-guild-title"/, 'settings hide Guild entry controls from other roles');
assert.match(donationRoute, /sanctuary_purchase: 'community_donation'/, 'donation checkout identifies its account-linked purpose');
assert.match(webhook, /record_sanctuary_donation/, 'verified donation webhook records entitlements server-side');
assert.match(webhook, /session\.client_reference_id !== userId/, 'donation account identity is verified');
assert.match(migration, /grant_vip_after_token_purchase/, 'verified token purchases grant VIP to basic users');
assert.match(migration, /requested_event_id|record_sanctuary_donation/, 'donation fulfillment is idempotently recorded');
assert.match(migration, /role = 'vip'.*role = 'user'/s, 'paid entitlement never demotes higher roles');

console.log('Role access contract passed: basic/VIP/moderator/admin/developer/owner page gates, fail-closed new pages, and verified payment/donation VIP grants.');
