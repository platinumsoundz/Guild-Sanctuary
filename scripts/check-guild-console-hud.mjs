import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const world = read('../src/components/GuildWorld.tsx');
const styles = read('../src/components/GuildWorld.module.css');
const roadmap = read('../GUILD_ROADMAP.md');

assert.match(world, /aria-modal="true"/, 'Guild console must remain a modal experience');
assert.match(world, /aria-labelledby="guild-title"/, 'console dialog must have an accessible title');
assert.match(world, /className=\{styles\.bigPictureButton\}/, 'Big Picture control must remain reachable');
assert.match(world, /className=\{styles\.connected\}/, 'controller/input status must remain visible');
assert.match(world, /className=\{styles\.gameGrid\}/, 'featured trial and local progress must remain grouped');
assert.match(world, /className=\{styles\.touchControls\}/, 'touch controls must remain available in the game panel');
assert.match(styles, /\.bigPictureButton:focus-visible/, 'Big Picture control must have a visible focus indicator');
assert.match(styles, /@media \(min-width: 1280px\)/, 'wide-screen console layout must be tuned for large displays');
assert.match(styles, /@media \(max-width: 520px\)/, 'console layout must adapt to narrow phones');
assert.match(styles, /@media \(orientation: landscape\) and \(max-height: 520px\)/, 'short landscape screens must have dedicated layout rules');
assert.match(styles, /env\(safe-area-inset-top\)/, 'console header must respect device safe areas');
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/, 'HUD polish must respect reduced-motion preferences');
assert.match(styles, /\.gameCard, \.progressCard, \.gamePanel \{ box-shadow:/, 'game surfaces must have consistent visual depth');
assert.match(roadmap, /Console HUD polish batch — 2026-10-29/, 'roadmap must record this implementation batch');
assert.match(roadmap, /not a device-QA pass/i, 'roadmap must distinguish source checks from device QA');

console.log('Guild console HUD polish contract checks passed.');
