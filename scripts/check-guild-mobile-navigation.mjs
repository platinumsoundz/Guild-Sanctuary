import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const navigation = read('../src/components/GuildNavigation.tsx');
const styles = read('../src/components/GuildNavigation.module.css');
const packageJson = JSON.parse(read('../package.json'));

const headerStart = navigation.indexOf('<header className={styles.header}>');
const headerEnd = navigation.indexOf('</header>', headerStart);
assert.ok(headerStart >= 0 && headerEnd > headerStart, 'Guild console header must be a valid bounded region');
const header = navigation.slice(headerStart, headerEnd);
const afterHeader = navigation.slice(headerEnd + '</header>'.length);

assert.match(header, /aria-label=\{open \? 'Close Guild navigation' : 'Open Guild navigation'\}/, 'menu control must have state-aware accessible naming');
assert.match(header, /<NotificationBar compact worldType="guild" onNavigate=\{\(page\) => onSelect\(page\)\} \/>/, 'compact notifications must remain available in the console header');
assert.match(header, /aria-label="Open Guild quick menu"/, 'Quick Menu must remain directly reachable from the header');
assert.match(afterHeader, /className=\{styles\.quickScrim\}/, 'Quick Menu scrim must render outside the sticky header');
assert.match(afterHeader, /className=\{styles\.quickPanel\}/, 'Quick Menu panel must render outside the sticky header');
assert.match(afterHeader, /className=\{styles\.touchConsole\}/, 'touch controls must render outside the sticky header');
assert.match(afterHeader, /className=\{styles\.scrim\}/, 'navigation scrim must render outside the sticky header');
assert.match(afterHeader, /className=\{styles\.drawer\}/, 'navigation drawer must render outside the sticky header');
assert.match(navigation, /matchMedia\('\(max-width: 560px\)'\)/, 'touch controls must be discoverable by default on narrow screens');
assert.match(navigation, /setControlsOpen\(true\)/, 'narrow-screen initialization must open the touch controls');
assert.match(navigation, /aria-pressed=\{controlsOpen\}/, 'touch controls must expose their current state accessibly');
assert.match(navigation, /controlsOpen \? 'Hide controls' : 'Controls'/, 'touch controls must provide both show and hide actions');
assert.match(navigation, /aria-label="Navigate up"/, 'D-pad up control must be accessible');
assert.match(navigation, /small>Select/, 'A/Select control must be identifiable');
assert.match(navigation, /small>Back/, 'B/Back control must be identifiable');

assert.match(styles, /@media\s*\(max-width:\s*767px\)/, 'phone/tablet overlay layout rules must exist');
assert.match(styles, /@media\s*\(max-width:\s*420px\)/, 'compact phone toolbar rules must exist');
assert.match(styles, /@media\s*\(max-width:\s*370px\)/, 'extra-narrow phone toolbar rules must exist');
assert.match(styles, /bottom:\s*calc\(76px \+ env\(safe-area-inset-bottom, 0px\)\)/, 'touch controls must clear the bottom navigation and device safe area');
assert.match(styles, /\.scrim\s*\{[^}]*z-index:\s*950/s, 'navigation scrim must cover the page');
assert.match(styles, /\.drawer\s*\{[^}]*z-index:\s*960/s, 'navigation drawer must sit above its scrim');
assert.match(styles, /\.quickScrim\s*\{[^}]*z-index:\s*970/s, 'Quick Menu scrim must layer above the navigation drawer');
assert.match(styles, /\.quickPanel\s*\{[^}]*z-index:\s*980/s, 'Quick Menu panel must sit above its scrim');
assert.match(styles, /\.scrim\s*\{[^}]*z-index:\s*2147483644\s*;?\s*\}/, 'Guild drawer scrim must stay above the active page at desktop widths');
assert.match(styles, /\.drawer\s*\{[^}]*z-index:\s*2147483645\s*;?\s*\}/, 'Guild navigation drawer must stay above its scrim at desktop widths');
assert.match(styles, /\.quickScrim\s*\{[^}]*z-index:\s*2147483646\s*;?\s*\}/, 'Quick Menu scrim must stay above the Guild drawer at desktop widths');
assert.match(styles, /\.quickPanel\s*\{[^}]*z-index:\s*2147483647\s*;?\s*\}/, 'Quick Menu panel must stay above the scrim at desktop widths');
assert.equal(packageJson.scripts['check:guild-mobile-navigation'], 'node scripts/check-guild-mobile-navigation.mjs', 'mobile navigation contract must be available as an npm script');

assert.match(navigation, /createPortal\([\s\S]*?styles\.quickPanel[\s\S]*?document\.body\)/, 'Quick Menu must portal to document.body to escape shell stacking contexts');
assert.match(navigation, /createPortal\([\s\S]*?styles\.drawer[\s\S]*?document\.body\)/, 'Guild drawer must portal to document.body to escape shell stacking contexts');
console.log('Guild mobile navigation contract checks passed.');
