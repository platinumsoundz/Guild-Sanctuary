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
assert.match(nav, /navigationItems\.filter\(\(item\) => canAccessSanctuaryPage\(item\.id, currentUser \? role : 'user'\)\)/, 'navigation and workspace share the same role allowlist');

console.log('Role page access contract passed: basic/VIP/staff page gates, direct-navigation guard and fail-closed unknown pages/roles.');
