import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const component = readFileSync('src/components/GuildCompanionHub.tsx', 'utf8');
const styles = readFileSync('src/components/GuildCompanionHub.module.css', 'utf8');
const guild = readFileSync('src/components/GuildWorld.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20261028214500_guild_library_entries.sql', 'utf8');

for (const text of [
  'Account library sync is available', 'Local cache + account sync', 'DELETED_IDS_KEY', 'OWNER_KEY', 'previousOwner !== authData.user.id', 'prevent mixing private libraries', 'removeGame', 'queued removals were applied', 'disabled={!libraryLoaded || syncBusy}', 'Your visible library was left unchanged',
  'Sign in & sync', 'syncLibrary', 'if (syncBusy || !libraryLoaded) return;', 'Loading library…', 'supabase.auth.getUser()', 'pendingDeletes', "from('guild_library_entries').delete().in('id', pendingDeletes)",
  "from('guild_library_entries')", 'Your local library is unchanged',
  'Syncing…', 'storageWarning', 'could not read or save the device-local cache', 'Sign in and sync to keep a server copy',
  'Persistent home directory', 'Unified game library', 'Music lounge',
  'Memory gallery', 'Cloud Lab', 'persistent Linux', 'not a simulated terminal',
  'RetroArch', 'RetroAchievements', 'Steam', 'Xbox', 'GOG', 'itch.io',
  'localStorage', 'libraryLoaded', 'MAX_MEDIA_FILES', 'MAX_AUDIO_BYTES',
  'MAX_IMAGE_BYTES', 'MAX_AUDIO_TOTAL_BYTES', 'MAX_IMAGE_TOTAL_BYTES', 'safeWebUrl', 'exportLibrary', 'importLibrary',
  'sanctuary-guild-library', 'games.length >= 500', '500-game limit',
  'noopener noreferrer', 'URL.createObjectURL', 'not uploaded', 'https:',
  'target="_blank"', 'rel="noopener noreferrer"',
  'librarySearch', 'libraryPlatformFilter', 'visibleGames', 'Search library', 'Filter games by platform', 'No games match these filters.',
]) {
  assert.ok(component.includes(text), `Missing Guild companion feature contract: ${text}`);
}
assert.ok(component.includes("file.type.startsWith('audio/')"));
assert.ok(component.includes("file.type.startsWith('image/')"));
assert.ok(component.includes('setInterval'));
assert.ok(component.includes('file.size > 1024 * 1024'), 'Library import must have a file-size limit');
assert.ok(component.includes('slice(0, 500)'), 'Library import must cap imported entries');
assert.ok(component.includes('finally { setLibraryLoaded(true); }'), 'Saved library must finish loading before persistence overwrites local data');
assert.ok(component.includes('Files stay in this browser session') || component.includes('files stay in this browser session'), 'Local media privacy must be explained');
assert.ok(component.includes('Native app launching needs the optional companion.'));
assert.ok(styles.includes('@media(max-width:760px)'));
assert.ok(styles.includes(':focus-visible'));
assert.ok(styles.includes('.libraryFilters'));
assert.ok(guild.includes('GuildCometDodge'));

for (const text of [
  'create table if not exists public.guild_library_entries',
  'references auth.users(id) on delete cascade',
  'enable row level security',
  'user_id = (select auth.uid())',
  'public.is_active_user()',
  'for select', 'for insert', 'for update', 'for delete',
  "platform in ('Browser', 'Steam', 'Xbox', 'RetroArch', 'Other')",
  "launch_url = '' or launch_url ~* '^https?://'",
  'guild_library_entries_owner_title_platform_uidx',
  'enforce_guild_library_entry_limit', 'pg_advisory_xact_lock',
  '$guild_limit$', 'entry limit reached (500)',
  'Guild library ownership cannot be changed.',
  'repository code only',
]) {
  assert.ok(migration.includes(text), `Missing Guild server-library schema contract: ${text}`);
}
console.log('Guild companion hub contract passed.');
