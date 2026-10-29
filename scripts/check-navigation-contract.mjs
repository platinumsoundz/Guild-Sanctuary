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

assert.match(navigation, /Sign in \/ Guest/, 'Signed-out users get one compact account-entry trigger instead of separate guest and sign-in buttons');
assert.match(navigation, /id="account-entry-menu"[\s\S]*?Sign in \/ Register[\s\S]*?Explore as Guest/, 'The unified account-entry menu preserves both sign-in and guest paths');
assert.match(navigation, /closeOnEscape[\s\S]*?entryMenuButtonRef\.current\?\.focus\(\)/, 'Escape closes the account-entry menu and restores focus');
assert.doesNotMatch(navigation, /className=\{styles\.guestButton\}/, 'Guest entry is no longer a separate header button');
assert.match(navigationStyles, /\.accountEntryMenu\s*\{[^}]*position:\s*absolute/s, 'Account choices overlay the current page without shifting the layout');
console.log('Compact account-entry contract checks passed.');
