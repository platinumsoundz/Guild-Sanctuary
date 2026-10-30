import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const hub = read('../src/components/GuildCompanionHub.tsx');
const hubStyles = read('../src/components/GuildCompanionHub.module.css');
const navigation = read('../src/components/GuildNavigation.tsx');
const workspace = read('../src/components/AppWorkspace.tsx');

for (const [name, source] of [['Guild companion hub', hub], ['Guild navigation', navigation], ['App workspace', workspace], ['Guild media styles', hubStyles]]) {
  assert.doesNotMatch(source, /photo slideshow|photo gallery|photoGallery|slideshow|\.gallery\b|galleryControls/i, `${name} must not retain photo gallery or slideshow UI`);
}
assert.ok(hub.includes("setAttribute('webkitdirectory', '')"), 'music player should request folder selection where supported');
assert.ok(hub.includes('Choose music folder'), 'music player should expose folder selection');
assert.ok(hub.includes('Add individual tracks'), 'music player should provide an individual-file fallback');
assert.ok(hub.includes('file.type.startsWith(\'audio/\')'), 'music queue should accept audio files only');
assert.ok(hub.includes('URL.createObjectURL(file)'), 'selected audio should remain local to the browser session');
assert.ok(hub.includes('URL.revokeObjectURL(item.url)'), 'local audio object URLs should be released on cleanup');
assert.ok(hub.includes("action === 'next'"), 'quick music panel should support next track');
assert.ok(hub.includes("action === 'previous'"), 'quick music panel should support previous track');
assert.ok(hub.includes("action === 'play-pause'"), 'quick music panel should support play/pause');
assert.ok(hub.includes('onEnded={() => changeTrack(1)}'), 'music player should advance automatically at track end');
assert.ok(navigation.includes('guild-music-state'), 'quick music panel should receive current playback state');
assert.ok(navigation.includes('guild-music-action'), 'quick music panel controls should reach the music player');
assert.ok(navigation.includes('Now playing'), 'quick music panel should show the current track');
console.log('Guild media removal and music player contract checks passed.');
