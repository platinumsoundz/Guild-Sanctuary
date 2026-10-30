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

assert.ok(player.includes("event.origin !== gameOrigin || event.source !== gameFrameRef.current?.contentWindow"), 'game lifecycle messages must be accepted only from the expected game origin and iframe window');
assert.ok(player.includes("sendGameCommand(menuOpen ? 'pause' : 'resume')"), 'opening and closing the Guild menu must pause and resume the embedded game');
assert.ok(player.includes("document.visibilityState === 'hidden' || menuOpen ? 'pause' : 'resume'"), 'the embedded game must pause when the Guild tab or app is backgrounded');
assert.ok(player.includes("message.channel !== 'guild.5-sleeves' || message.version !== 1"), 'the host bridge must validate its versioned message channel');
assert.ok(player.includes('ref={gameFrameRef}'), 'the host bridge must bind messages to the active iframe');

assert.ok(library.includes('NEXT_PUBLIC_5_SLEEVES_3D_URL'), 'the 3D game host must support an HTTPS-only staging override with the canonical Pages URL as fallback');

assert.ok(player.includes("message.type === 'ack' && message.requestId === latestBridgeRequest.current"), 'the Guild player must correlate game pause/resume acknowledgements');
assert.ok(player.includes("command: menuOpen ? 'pause' : 'resume'"), 'the Guild menu must send the matching lifecycle command');
assert.ok(player.includes('requestId'), 'lifecycle commands must carry a request identifier');
assert.ok(library.includes("process.env.VERCEL_ENV === 'preview'"), 'preview deployments must use the matching game bridge preview by default');
assert.ok(library.includes('integration-guild-host-bridg.the-5-sleeves-3d.pages.dev'), 'preview deployment must target the game branch preview');
assert.ok(library.includes('https://the-5-sleeves-3d.pages.dev/'), 'production fallback must remain the canonical game host');

console.log('Guild game exit and lifecycle bridge contract checks passed.');
