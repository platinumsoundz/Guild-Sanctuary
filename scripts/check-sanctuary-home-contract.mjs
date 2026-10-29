import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync('src/components/SanctuaryHome.tsx', 'utf8');
const workspace = readFileSync('src/components/AppWorkspace.tsx', 'utf8');
const context = readFileSync('src/context/AppContext.tsx', 'utf8');
const navigation = readFileSync('src/components/Navigation.tsx', 'utf8');
const css = readFileSync('src/components/SanctuaryHome.module.css', 'utf8');

assert.match(workspace, /contentNavigation === 'today'[\s\S]*?<SanctuaryHome onNavigate=\{openNavigation\} \/>/, 'Today route renders the Sanctuary home');
assert.match(context, /NavigationState = 'today'/, 'Today is a supported navigation state');
assert.match(context, /useState<NavigationState>\('today'\)/, 'Today is the initial destination');
assert.match(navigation, /id: 'today', label: 'Today'/, 'Today is reachable in navigation');
assert.match(home, /not diagnoses or predictions/i, 'home copy avoids clinical or predictive claims');
assert.match(home, /target: 'feed'/, 'home has a community destination');
assert.match(home, /target: 'discover'/, 'home has a discovery destination');
assert.match(css, /@media/, 'home has responsive layout rules');
assert.match(css, /prefers-reduced-motion/, 'home respects reduced-motion preferences');

console.log('Sanctuary home contract checks passed.');
