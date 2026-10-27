import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const navigation = read('../src/components/Navigation.tsx');
const navigationStyles = read('../src/components/Navigation.module.css');
const shellStyles = read('../src/components/ResponsiveShell.module.css');

for (const [label, pattern] of [
  ['mobile navigation exposes a Today destination for the planner', /\{ id: 'planner', label: 'Today'/],
  ['mobile navigation exposes Community feed', /\{ id: 'feed', label: 'Community'/],
  ['mobile navigation exposes Discover, Messages, and You', /\{ id: 'discover', label: 'Discover'/] ,
]) {
  assert.match(navigation, pattern, label);
  console.log('PASS ' + label);
}
assert.match(navigation, /className=\{styles\.mobileBottomNavigation\}/, 'mobile bottom navigation is rendered');
assert.match(navigation, /aria-label="Quick navigation"/, 'mobile tabs have an accessible navigation name');
assert.match(navigation, /aria-current=\{activeNavigation === item\.id \? 'page' : undefined\}/, 'current tab is announced semantically');
assert.doesNotMatch(navigation.slice(navigation.indexOf('const mobilePrimaryItems'), navigation.indexOf('const navigationItems')), /shop|admin|Token Shop|Admin & Moderation/, 'commerce and admin are not primary mobile tabs');
assert.match(navigationStyles, /\.mobileBottomNavigation\s*\{[^}]*position:\s*fixed/s, 'mobile tabs remain fixed at the bottom');
assert.match(navigationStyles, /env\(safe-area-inset-bottom\)/, 'mobile tabs respect device safe areas');
assert.match(shellStyles, /padding: 0 0 calc\(80px \+ env\(safe-area-inset-bottom\)\)/, 'page content reserves space below fixed mobile tabs');
assert.match(navigationStyles, /\.desktopNavigationButton\s*\{[^}]*font-size:\s*14px/s, 'desktop navigation uses more legible 14px labels');
assert.match(navigationStyles, /\.mobileBottomButton\s*\{[^}]*min-height:\s*48px/s, 'mobile tabs provide a 48px minimum touch target');
console.log('Navigation contract checks passed.');
