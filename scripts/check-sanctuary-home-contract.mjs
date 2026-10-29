import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync('src/components/SanctuaryHome.tsx', 'utf8');
const workspace = readFileSync('src/components/AppWorkspace.tsx', 'utf8');
const context = readFileSync('src/context/AppContext.tsx', 'utf8');
const navigation = readFileSync('src/components/Navigation.tsx', 'utf8');
const css = readFileSync('src/components/SanctuaryHome.module.css', 'utf8');
const profile = readFileSync('src/modules/profiles/components/ProfileDashboard.tsx', 'utf8');
const profileCss = readFileSync('src/modules/profiles/components/ProfileDashboard.module.css', 'utf8');
const profileCard = readFileSync('src/modules/profiles/components/ProfileCard.tsx', 'utf8');
const profileCardCss = readFileSync('src/modules/profiles/components/Profiles.module.css', 'utf8');

assert.match(workspace, /activeNavigation === 'today'[\s\S]*?<SanctuaryHome onNavigate=\{openNavigation\} \/>/, 'Today route renders the Sanctuary home');
assert.match(context, /NavigationState = 'today'/, 'Today is a supported navigation state');
assert.match(context, /useState<NavigationState>\('today'\)/, 'Today is the initial destination');
assert.match(navigation, /id: 'today', label: 'Today'/, 'Today is reachable in navigation');
assert.match(home, /not diagnoses or predictions/i, 'home copy avoids clinical or predictive claims');
assert.match(home, /target: 'feed'/, 'home has a community destination');
assert.match(home, /target: 'discover'/, 'home has a discovery destination');
assert.match(css, /@media/, 'home has responsive layout rules');
assert.match(css, /prefers-reduced-motion/, 'home respects reduced-motion preferences');

assert.match(profile, /A space to be, reflect, and grow/, 'profile dashboard uses reflective Sanctuary language');
assert.match(profile, /A little more of you/, 'profile includes a personal journey overview');
assert.match(profile, /profileCompletion/, 'profile details completeness is calculated from real profile fields');
assert.match(profile, /Your story[\s\S]*?What grounds you[\s\S]*?Where you are today/, 'profile highlights personal story, grounding values, and current intention');
assert.match(profile, /<ProfileCard profile=\{draft\} \/>/, 'profile preview appears before the journey and posts');
assert.match(profileCss, /\.journeyGrid/, 'journey cards have dedicated responsive styling');
assert.match(profileCss, /prefers-reduced-motion/, 'profile motion respects reduced-motion preferences');
assert.match(profileCard, /YOUR SPACE/, 'own profile has a personal rather than generic community heading');
assert.match(profileCardCss, /celestialFallback|✧   ·   ☾   ·   ✦/, 'profile banner fallback has a calm celestial motif');
assert.match(profileCardCss, /@media \(max-width: 580px\)/, 'profile hero adapts to mobile screens');

console.log('Sanctuary home contract checks passed.');
