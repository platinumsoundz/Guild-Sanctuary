import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const player = read('../src/components/GuildConsolePlayer.tsx');
const library = read('../src/components/GamesHub.tsx');
const playerStyles = read('../src/components/GuildConsolePlayer.module.css');
const workspace = read('../src/components/AppWorkspace.tsx');
const roadmap = read('../docs/THE_5_SLEEVES_3D_GUILD_INTEGRATION_ROADMAP.md');

assert.ok(player.includes('const returnHome = useCallback(async () => {'), 'player must have one central exit-to-home handler');
assert.ok(player.includes('await exitFullscreen();'), 'exit-to-home must leave fullscreen before unmounting the game');
assert.ok(player.includes('onExit();'), 'player exit must notify the Guild host');
assert.ok(player.includes('aria-label="Exit game and return to Guild home"'), 'close control must clearly describe its destination');
assert.ok(player.includes('<strong>Exit to Guild home</strong>'), 'system menu must expose a Guild home exit action');
assert.ok(player.includes('Escape/browser exits may not expose orientation unlock'), 'fullscreen exit must clean up orientation lock when supported');
assert.ok(playerStyles.includes('.stage:fullscreen .gameFrame iframe'), 'fullscreen must keep the game iframe filling the viewport');
assert.ok(player.includes('allow="fullscreen; gamepad; pointer-lock; autoplay"'), 'embedded game must retain the required browser capabilities');

assert.ok(library.includes('onExitToGuildHome?: () => void'), 'game library must accept the Guild home navigation callback');
assert.ok(library.includes('onExit={() => { setActiveGame(null); onExitToGuildHome?.(); }}'), 'player exit must return to Guild home rather than stopping at the library');
assert.ok(library.includes('Back to library'), 'a separate library return must remain available');

assert.equal((workspace.match(/onExitToGuildHome=\{\(\) => \{ setGuildAutoLaunchRecent\(false\); setGuildPage\('home'\); \}\}/g) || []).length, 2, 'Arcade and Library must both route game exit to the Guild home dashboard');
assert.ok(roadmap.includes('returns directly to the Guild home dashboard'), 'integration roadmap must document the return destination');
console.log('Guild game exit contract checks passed.');
