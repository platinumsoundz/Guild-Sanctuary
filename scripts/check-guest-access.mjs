import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workspace = readFileSync('src/components/AppWorkspace.tsx', 'utf8');
const navigation = readFileSync('src/components/Navigation.tsx', 'utf8');
const gates = readFileSync('src/lib/sanctuaryFeatureGates.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const context = readFileSync('src/context/AppContext.tsx', 'utf8');
const guestAllowlist = "['today', 'feed', 'discover', 'events', 'shorts', 'games', 'roadmap', 'support', 'feedback']";

assert.ok(workspace.includes(guestAllowlist), 'Guest direct routing must allow only the public showcase pages');
assert.ok(navigation.includes("guestNavigationPages = new Set<NavigationState>(" + guestAllowlist + ")"),
  'Guest navigation must show the safe public showcase');
assert.match(workspace, /isGuest && !\['support', 'feedback', 'today'\]\.includes\(contentNavigation\)/,
  'Non-interactive guest destinations must render a preview instead of redirecting');
assert.match(context, /setActiveNavigation\('today'\)/, 'Guest sessions start on the public welcome page');
assert.match(workspace, /contentNavigation === 'feedback'/, 'Guest feedback route remains public');
assert.match(workspace, /GUEST PREVIEW · READ ONLY/, 'Guest preview clearly communicates read-only access');
assert.match(workspace, /Sign in or create an account to join conversations/, 'Account-only actions explain why sign-in is needed');
assert.match(gates, /feedback: 'user'/, 'Feedback remains available to all signed-in roles');
assert.match(gates, /today: 'user'/, 'Today remains available to basic users');
assert.match(gates, /feed: 'user'/, 'Community remains available to basic users');
assert.match(gates, /planner: 'user'/, 'Daily Planner remains available to basic users');
assert.match(gates, /notifications: 'user'/, 'Notifications remain available to basic users');
assert.equal(packageJson.scripts['check:guest-access'], 'node scripts/check-guest-access.mjs',
  'Guest access contract is exposed as an npm script');
assert.match(workflow, /npm run check:guest-access/, 'Guest access contract runs in CI');

console.log('Guest/basic-user showcase access contract passed.');
