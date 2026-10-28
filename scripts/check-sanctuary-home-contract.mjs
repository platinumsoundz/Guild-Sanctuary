import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync('src/components/SanctuaryHome.tsx', 'utf8');
const workspace = readFileSync('src/components/AppWorkspace.tsx', 'utf8');
const context = readFileSync('src/context/AppContext.tsx', 'utf8');
const navigation = readFileSync('src/components/Navigation.tsx', 'utf8');
const css = readFileSync('src/components/SanctuaryHome.module.css', 'utf8');
const art = readFileSync('src/components/CosmicSanctuaryArt.tsx', 'utf8');
const navigationCss = readFileSync('src/components/Navigation.module.css', 'utf8');
const notificationCss = readFileSync('src/components/NotificationBar.module.css', 'utf8');
const workspaceCss = readFileSync('src/components/AppWorkspace.module.css', 'utf8');
const globalCss = readFileSync('src/app/globals.css', 'utf8');

assert.match(workspace, /activeNavigation === 'today'[\s\S]*?<SanctuaryHome onNavigate=\{openNavigation\} \/>/, 'Today route renders the Sanctuary home');
assert.match(context, /NavigationState = 'today'/, 'Today is a supported navigation state');
assert.match(context, /useState<NavigationState>\('today'\)/, 'Today is the initial destination');
assert.match(navigation, /id: 'today', label: 'Today'/, 'Today is reachable in navigation');
assert.match(home, /not diagnoses or predictions/i, 'home copy avoids clinical or predictive claims');
assert.match(home, /target: 'feed'/, 'home has a community destination');
assert.match(home, /target: 'discover'/, 'home has a discovery destination');
assert.match(css, /@media/, 'home has responsive layout rules');
assert.match(css, /prefers-reduced-motion/, 'home respects reduced-motion preferences');
assert.match(home, /Find your place among the/, 'home hero reflects the cosmic Sanctuary direction');
assert.match(home, /CosmicSanctuaryArt/, 'home hero includes the dedicated cosmic artwork');
assert.match(art, /luminous portal|luminous/i, 'cosmic artwork documents its visual subject');
assert.match(art, /cosmic-wing-feathers/, 'cosmic artwork includes wing details');
assert.match(art, /cosmic-energy/, 'cosmic artwork includes flowing cosmic energy');
assert.match(home, /world-destinations-title/, 'home has a distinct destination section');
assert.match(home, /onNavigate\('games'\)/, 'Cosmic Arcade has its own destination');
assert.match(home, /onNavigate\('support'\)/, 'Support the Creator has its own destination');
assert.match(home, /onNavigate\('shop'\)/, 'shop has its own destination');
assert.match(css, /worldGrid \{ display: grid/, 'destination cards use a responsive grid');
assert.match(css, /@media \(max-width: 560px\)/, 'cosmic hero has a dedicated mobile layout');

assert.match(navigationCss, /luminous active states/, 'navigation has cosmic glass styling');
assert.match(navigationCss, /mobileBottomNavigation \\{ background: rgb\\(10 13 38/, 'mobile navigation has a cosmic glass surface');
assert.match(notificationCss, /Cosmic glass treatment/, 'notifications share the cosmic visual system');
assert.match(workspaceCss, /Extend the cosmic art direction/, 'routed workspace shares the cosmic art direction');
assert.match(workspaceCss, /linear-gradient\\(145deg, rgb\\(20 24 61/, 'section surfaces use the midnight glass palette');
assert.match(workspaceCss, /text-wrap: balance/, 'section headings use balanced typography');
assert.match(globalCss, /--bg: #090d25/, 'cosmic midnight is the default theme');
assert.match(globalCss, /--cosmic-violet: #a995ff/, 'default theme exposes cosmic accent tokens');
assert.match(globalCss, /:root\\[data-theme=\\"ocean\\"\\]/, 'alternate ocean theme remains independently selectable');
assert.match(globalCss, /:root\\[data-theme=\\"dusk\\"\\]/, 'alternate dusk theme remains independently selectable');

console.log('Sanctuary home contract checks passed.');
