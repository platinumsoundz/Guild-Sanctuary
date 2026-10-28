import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workspace = readFileSync('src/components/AppWorkspace.tsx', 'utf8');
const guild = readFileSync('src/components/GuildWorld.tsx', 'utf8');
const css = readFileSync('src/components/GuildWorld.module.css', 'utf8');

assert.match(workspace, /<GuildWorld userId=\{currentUser\?\.user\.id \?\? null\} isAuthenticated=\{isAuthenticated\} \/>/, 'hidden Guild shell is mounted without a navigation item');
assert.doesNotMatch(workspace, /activeNavigation === 'guild'|label:\s*'The Guild'/, 'Guild is not exposed in ordinary navigation');
assert.match(guild, /getGamepads/, 'controller support polls connected gamepads');
assert.match(guild, /ctrlKey && event\.shiftKey/, 'keyboard accessibility override exists');
assert.match(guild, /Orbital Drift/, 'first original browser game is present');
assert.match(guild, /localStorage\.setItem\(BEST_KEY/, 'best run is stored locally');
assert.match(guild, /No cloud rewards or cross-world sharing are enabled/, 'prototype does not claim cloud progression');
assert.match(guild, /!isAuthenticated\\s*\\|\\|\\s*!userId/, 'Guild entry requires the shared authenticated identity');
assert.match(guild, /setSeconds\(START_SECONDS\)/, 'game run has a resettable countdown');
assert.match(guild, /nextScore >= TARGET/, 'game has a defined completion condition');
assert.match(css, /prefers-reduced-motion:reduce/, 'motion respects reduced-motion preference');
assert.match(css, /env\(safe-area-inset-bottom\)/, 'entry respects mobile safe areas');
console.log('Guild browser Arcade contract checks passed.');
