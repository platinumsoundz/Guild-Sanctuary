import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const component = readFileSync('src/components/GuildCompanionHub.tsx', 'utf8');
const styles = readFileSync('src/components/GuildCompanionHub.module.css', 'utf8');
const guild = readFileSync('src/components/GuildWorld.tsx', 'utf8');

for (const text of ['Unified game library', 'Music lounge', 'Memory gallery', 'Cloud Lab', 'persistent Linux', 'not a simulated terminal', 'RetroArch', 'RetroAchievements', 'Steam', 'Xbox', 'GOG', 'itch.io', 'localStorage', 'libraryLoaded', 'MAX_MEDIA_FILES', 'MAX_AUDIO_BYTES', 'MAX_IMAGE_BYTES', 'safeWebUrl', 'exportLibrary', 'importLibrary', 'sanctuary-guild-library', 'games.length >= 500', '500-game limit', 'noopener noreferrer', 'URL.createObjectURL', 'not uploaded', 'https:', 'target="_blank"', 'rel="noopener noreferrer"']) {
  assert.ok(component.includes(text), `Missing Guild companion feature contract: ${text}`);
}
assert.ok(component.includes('file.type.startsWith(\'audio/\')'));
assert.ok(component.includes('file.type.startsWith(\'image/\')'));
assert.ok(component.includes('setInterval'));
assert.ok(component.includes('file.size > 1024 * 1024'), 'Library import must have a file-size limit');
assert.ok(component.includes('slice(0, 500)'), 'Library import must cap imported entries');
assert.ok(component.includes('finally { setLibraryLoaded(true); }'), 'Saved library must finish loading before persistence overwrites local data');
assert.ok(component.includes('files stay in this browser session') || component.includes('Files stay in this browser session'), 'Local media privacy must be explained');
assert.ok(component.includes('Native app launching needs the optional companion.'));
assert.ok(styles.includes('@media(max-width:760px)'));
assert.ok(styles.includes(':focus-visible'));
assert.ok(guild.includes('GuildCometDodge'));
console.log('Guild companion hub contract passed.');
