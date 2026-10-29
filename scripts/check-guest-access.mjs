import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workspace = readFileSync('src/components/AppWorkspace.tsx', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const context = readFileSync('src/context/AppContext.tsx', 'utf8');

assert.match(workspace, /isGuest && !\['support', 'games', 'roadmap'\]\.includes\(activeNavigation\)/,
  'Guests must be limited to explicitly approved read-only routes');
assert.doesNotMatch(workspace, /isGuest && activeNavigation === 'guild'/, 'guest sessions cannot open the hidden Guild');
assert.match(context, /setActiveNavigation\('today'\)/, 'Guest sessions start on the public welcome page');
assert.match(workspace, /Explore before you join/, 'Restricted guest routes explain the guest-mode boundary');
assert.match(workspace, /Explore Cosmic Arcade/, 'Guest mode offers the public Cosmic Arcade');
assert.match(workspace, /Sanctuary Roadmap/, 'Guest mode offers the Sanctuary roadmap');
assert.doesNotMatch(workspace, /review the Sanctuary and Guild roadmaps|onClick=\{\(\) => setActiveNavigation\('guild-roadmap'\)\}/, 'guest mode has no Guild Roadmap entry point');
assert.match(workspace, /if \(isGuest \|\| activeNavigation !== 'profile' \|\| !currentUser\)/,
  'Guest sessions must not trigger account-profile post loading');
assert.match(workspace, /Sign in to post, react, comment, message/, 'Guest restrictions explain account-only actions');
assert.equal(packageJson.scripts['check:guest-access'], 'node scripts/check-guest-access.mjs',
  'Guest access contract is exposed as an npm script');
assert.match(workflow, /npm run check:guest-access/, 'Guest access contract runs in CI');

console.log('Guest read-only access contract passed.');
