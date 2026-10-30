import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const navigation = read('../src/components/Navigation.tsx');
const navigationStyles = read('../src/components/Navigation.module.css');
const shellStyles = read('../src/components/ResponsiveShell.module.css');

for (const [label, pattern] of [
  ['mobile navigation exposes the Today home destination', /\{ id: 'today', label: 'Today'/],
  ['the Daily Planner remains available separately', /\{ id: 'planner', label: 'Daily Planner'/],
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
assert.doesNotMatch(navigation, /<span className=\{styles\.siteName\}>The Sanctuary<\/span>/, 'compact header omits redundant page branding');
assert.match(navigation, /<NotificationBar compact \/>/, 'compact notification control remains in the top-right header');
assert.match(navigation, /className=\{styles\.accountButton\}/, 'account and guest access remain available in the compact header');
assert.match(navigation, /aria-label="Open main navigation"/, 'hamburger navigation is available on desktop and mobile');
assert.doesNotMatch(navigation, /<nav className=\{styles\.desktopNavigation\}/, 'overflowing desktop navigation strip is removed');
assert.match(navigationStyles, /\.desktopNavigation\s*\{[^}]*display:\s*none/s, 'desktop navigation strip stays hidden');
assert.match(navigationStyles, /\.mobileBottomButton\s*\{[^}]*min-height:\s*48px/s, 'mobile tabs provide a 48px minimum touch target');
console.log('Navigation contract checks passed.');

assert.doesNotMatch(navigation.slice(navigation.indexOf('const navigationItems'), navigation.indexOf('const navigationGroups')), /id: 'guild'|id: 'guild-roadmap'|Guild Arcade|Guild Roadmap/, 'hidden Guild console and its roadmap are not exposed in the Sanctuary page selector');
assert.doesNotMatch(navigation.slice(navigation.indexOf('const navigationGroups'), navigation.indexOf('interface NavigationProps')), /label: 'Guild'|items: \['guild'|guild-roadmap/, 'Sanctuary selector has no Guild navigation group');
console.log('Hidden Guild selector contract passed.');

assert.match(navigation, /canAccessSanctuaryPage/, 'navigation uses the shared role allowlist');
assert.match(navigation, /id: 'feedback', label: 'Feedback'/, 'Feedback is a named navigation destination');
assert.match(navigation, /item\.id === 'feedback' \|\| item\.id === 'feedback-inbox' \|\| isPageVisible/, 'Feedback and its privileged inbox ignore configurable page-visibility restrictions');
assert.match(navigation, /navigationItems\.filter\(\(item\) => item\.id === 'feedback-inbox'[\s\S]*canAccessSanctuaryPage\(item\.id, currentUser \? role : 'user'\)\)/, 'feedback inbox is restricted to developer/owner while all other pages use the shared role allowlist');
assert.match(navigation, /\['developer', 'owner'\]\.includes\(role\)/, 'feedback inbox explicitly requires developer or owner role');
assert.match(navigation, /guestNavigationPages = new Set<NavigationState>\(\['today', 'support', 'feedback'\]\)/, 'guest mode keeps only public entry pages and feedback');
