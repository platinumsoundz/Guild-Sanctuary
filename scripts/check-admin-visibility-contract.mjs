import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const visibility = read('../src/lib/pageVisibility.ts');
const migration = read('../supabase/migrations/20261029120000_platform_page_visibility_controls.sql');
const admin = read('../src/modules/moderation/AdminDashboard.tsx');
const moderation = read('../src/modules/moderation/ModerationDashboard.tsx');
const workspace = read('../src/components/AppWorkspace.tsx');
const navigation = read('../src/components/Navigation.tsx');
const guildNavigation = read('../src/components/GuildNavigation.tsx');
const gates = read('../src/lib/sanctuaryFeatureGates.ts');

assert.match(migration, /create table if not exists public\.platform_page_visibility/i, 'global visibility table must exist');
assert.match(migration, /p\.role in \('developer', 'owner'\)/, 'only developer/owner roles can change global visibility');
assert.match(migration, /enable row level security/i, 'page visibility table must use RLS');
assert.match(visibility, /upsert\(/, 'visibility changes must persist to Supabase');
assert.match(admin, /PageVisibilityPanel/, 'Admin must include page/system visibility controls');
assert.match(admin, /canManageVisibility = \['developer', 'owner'\]/, 'only developer/owner see visibility controls');
assert.doesNotMatch(admin, /<ModerationDashboard/, 'Admin must not contain the moderation queue');
assert.match(workspace, /contentNavigation === 'moderation'[\s\S]*?<ModerationDashboard/, 'moderation queue must have a separate route');
assert.match(navigation, /label: 'Admin'/, 'navigation must label the permission page Admin');
assert.match(navigation, /label: 'Moderation'/, 'navigation must expose a separate Moderation page');
assert.match(navigation, /isPageVisible\(item\.id, pageVisibility\)/, 'main navigation must respect global visibility');
assert.match(guildNavigation, /isPageVisible\(item\.id, pageVisibility\)/, 'Guild quick navigation must respect global visibility');
assert.match(gates, /^\s*guild: 'user',$/m, 'basic users must be able to launch Guild');
assert.match(gates, /^\s*admin: 'admin',$/m, 'Admin requires admin or higher');
assert.match(gates, /^\s*moderation: 'moderator',$/m, 'Moderation requires moderator or higher');

console.log('Admin, moderation and global page visibility contracts passed.');
