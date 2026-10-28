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
const arcadeCss = readFileSync('src/components/CosmicArcade.module.css', 'utf8');
const cosmicThemeCss = readFileSync('src/components/CosmicTheme.module.css', 'utf8');

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
assert.match(navigationCss, /mobileBottomNavigation/, 'mobile navigation has a dedicated responsive surface');
assert.match(notificationCss, /Cosmic glass treatment/, 'notifications share the cosmic visual system');
assert.match(workspaceCss, /Cosmic visual language for every routed workspace/, 'routed workspace shares the cosmic art direction');
assert.match(workspaceCss, /linear-gradient\(145deg, color-mix/, 'section surfaces use the cosmic semantic palette');
assert.match(workspaceCss, /text-wrap: balance/, 'section headings use balanced typography');
assert.match(globalCss, /--bg: #090d25/, 'cosmic midnight is the default theme');
assert.match(globalCss, /--cosmic-violet: #a995ff/, 'default theme exposes cosmic accent tokens');
assert.match(globalCss, /data-theme="ocean"/, 'alternate ocean theme remains independently selectable');
assert.match(globalCss, /data-theme="dusk"/, 'alternate dusk theme remains independently selectable');
assert.match(cosmicThemeCss, /linear-gradient\(180deg, var\(--bg\)/, 'cosmic shell inherits the selected theme background');
assert.doesNotMatch(cosmicThemeCss, /--bg:\s*#|--surface:\s*#|--ink:\s*#/, 'cosmic shell does not override semantic theme tokens');

assert.match(globalCss, /Shared cosmic interaction layer/, 'global controls share the cosmic interaction layer');
assert.match(globalCss, /prefers-reduced-motion: reduce/, 'global motion respects reduced-motion preferences');
assert.match(arcadeCss, /Cosmic Arcade is a Sanctuary-built world/, 'Cosmic Arcade is visually integrated as its own destination');
assert.match(arcadeCss, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, 'Arcade tabs adapt to narrow screens');
assert.match(arcadeCss, /var\(--cosmic-cyan\)/, 'Arcade focus and active states use cosmic accents');
assert.doesNotMatch(arcadeCss, /var\(--text\)/, 'Arcade uses the shared semantic ink token instead of an undefined text token');
assert.match(arcadeCss, /Consistent keyboard and touch affordances/, 'all Arcade modes share keyboard and touch refinements');


assert.match(homeCss, /linear-gradient\(135deg, color-mix\(in srgb, var\(--surface-raised\)/, 'home hero uses semantic surface tokens');
assert.match(homeCss, /var\(--cosmic-cyan\)/, 'home artwork framing uses the cosmic cyan token');
assert.match(workspaceCss, /background-color: var\(--bg\)/, 'routed workspaces respect the selected theme background');
assert.doesNotMatch(workspaceCss.slice(workspaceCss.indexOf('/* Routed workspaces share')), /#[0-9a-fA-F]{3,8}/, 'routed workspace surfaces avoid hardcoded theme colours');

console.log('Sanctuary home contract checks passed.');
