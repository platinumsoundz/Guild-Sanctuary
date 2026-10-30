import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workspace = readFileSync('src/components/AppWorkspace.tsx', 'utf8');
const navigation = readFileSync('src/components/Navigation.tsx', 'utf8');
const gates = readFileSync('src/lib/sanctuaryFeatureGates.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const context = readFileSync('src/context/AppContext.tsx', 'utf8');

assert.match(workspace, /if \(isGuest\) \{\s*if \(!\['today', 'support', 'feedback'\]\.includes\(contentNavigation\)\)/,
  'Guest sessions must be restricted to the public Today, Support and Feedback pages');
assert.match(navigation, /guestNavigationPages = new Set<NavigationState>\(\['today', 'support', 'feedback'\]\)/,
  'Guest navigation must not expose basic-user or preview pages');
assert.match(workspace, /if \(isGuest\) \{\s*if \(!\['today', 'support', 'feedback'\]\.includes\(contentNavigation\)\)/,
  'Guest routing redirects all non-public destinations before rendering');
assert.match(context, /setActiveNavigation\('today'\)/, 'Guest sessions start on the public welcome page');
assert.match(workspace, /contentNavigation === 'feedback'/, 'Guest feedback route remains public');
assert.match(gates, /feedback: 'user'/, 'Feedback remains available to all signed-in roles');
assert.match(gates, /today: 'user'/, 'Today remains available to basic users');
assert.match(gates, /feed: 'user'/, 'Community remains available to basic users');
assert.match(gates, /planner: 'user'/, 'Daily Planner remains available to basic users');
assert.match(gates, /notifications: 'user'/, 'Notifications remain available to basic users');
assert.match(workspace, /Sign in to post, react, comment, message/,
  'Guest restrictions explain account-only actions');
assert.equal(packageJson.scripts['check:guest-access'], 'node scripts/check-guest-access.mjs',
  'Guest access contract is exposed as an npm script');
assert.match(workflow, /npm run check:guest-access/, 'Guest access contract runs in CI');

console.log('Guest/basic-user access contract passed.');
