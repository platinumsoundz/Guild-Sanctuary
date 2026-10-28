import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const component = readFileSync('src/components/GuildCompanionHub.tsx', 'utf8');
const styles = readFileSync('src/components/GuildCompanionHub.module.css', 'utf8');
const guild = readFileSync('src/components/GuildWorld.tsx', 'utf8');

for (const text of ['Unified game library', 'Music lounge', 'Memory gallery', 'Cloud Lab', 'persistent Linux', 'not a simulated terminal', 'RetroArch', 'RetroAchievements', 'Steam', 'Xbox', 'GOG', 'itch.io', 'localStorage', 'URL.createObjectURL', 'not uploaded', 'https:', 'target="_blank"', 'rel="noreferrer"']) {
  assert.ok(component.includes(text), `Missing Guild companion feature contract: ${text}`);
}
assert.ok(component.includes('file.type.startsWith(\'audio/\')'));
assert.ok(component.includes('file.type.startsWith(\'image/\')'));
assert.ok(component.includes('setInterval'));
assert.ok(component.includes('Native app launching needs the optional companion.'));
assert.ok(styles.includes('@media(max-width:760px)'));
assert.ok(styles.includes(':focus-visible'));
assert.ok(guild.includes('GuildCometDodge'));
console.log('Guild companion hub contract passed.');
