import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const gates = read('../src/lib/sanctuaryFeatureGates.ts');
const workspace = read('../src/components/AppWorkspace.tsx');
const nav = read('../src/components/Navigation.tsx');

for (const page of ['wallet', 'shop', 'games', 'shorts']) {
  assert.match(gates, new RegExp('^\\s*' + page + ": 'vip',$", 'm'),
    page + ' must be hidden from basic users and require VIP or above');
}
for (const page of ['today', 'feed', 'messages', 'discover', 'profile', 'planner', 'support', 'notifications', 'roadmap', 'settings']) {
  assert.match(gates, new RegExp('^\\s*' + page + ": 'user',$", 'm'),
    page + ' must remain available to basic users');
}
assert.match(gates, /if \(!role \|\| !\(role in roleRank\)\) return false/, 'unknown roles fail closed');
assert.match(gates, /if \(!\(page in pageMinimumRole\)\) return false/, 'unknown pages fail closed');
assert.match(workspace, /canAccessSanctuaryPage\(contentNavigation, currentRole\)/, 'workspace guards direct navigation by role');
assert.match(workspace, /if \(!currentUser \|\| !canAccessSanctuaryPage\(contentNavigation, currentRole\)\)/, 'unauthorized direct navigation returns to Today');
assert.match(workspace, /RESTRICTED DESTINATION/, 'unauthorized destinations show a clear access message instead of their content');
assert.match(nav, /navigationItems\.filter\(\(item\) => item\.id === 'feedback-inbox'[\s\S]*canAccessSanctuaryPage\(item\.id, currentUser \? role : 'user'\)\)/, 'feedback inbox has its own privileged gate while other pages share the workspace role allowlist');
assert.match(nav, /\['developer', 'owner'\]\.includes\(role\)/, 'feedback inbox is restricted to developers and owners');
assert.ok(gates.includes("guild: 'user'"), 'basic users can launch The Guild from Settings');
assert.ok(gates.includes("admin: 'admin'"), 'admin page is reserved for admin and higher');
assert.ok(gates.includes("moderation: 'moderator'"), 'moderation page is separate and reserved for moderators and higher');

console.log('Role page access contract passed: basic/VIP/staff page gates, direct-navigation guard and fail-closed unknown pages/roles.');
