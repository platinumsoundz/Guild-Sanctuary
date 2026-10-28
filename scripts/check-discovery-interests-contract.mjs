import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const migration = readFileSync(new URL('../supabase/migrations/20261028150000_member_discovery_interests.sql', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/modules/profiles/discoveryInterests.ts', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../src/modules/profiles/components/ProfileInterestsEditor.tsx', import.meta.url), 'utf8');
const discovery = readFileSync(new URL('../src/modules/profiles/components/ProfileDiscovery.tsx', import.meta.url), 'utf8');
const workspace = readFileSync(new URL('../src/components/AppWorkspace.tsx', import.meta.url), 'utf8');

for (const required of [
  'create table if not exists public.profile_interests',
  'primary key (user_id, interest)',
  'alter table public.profile_interests enable row level security',
  'members read own or public interests',
  'members add own interests',
  'members update own interests',
  'members delete own interests',
  'private.public_profile_projection',
  'grant select, insert, update, delete on public.profile_interests to authenticated',
]) assert.ok(migration.includes(required), `missing interest schema/security contract: ${required}`);

assert.ok(!/grant\s+.*\bto\s+anon\b/i.test(migration), 'private discovery-interest table must not grant anonymous access');
assert.ok(service.includes('MAX_INTERESTS = 12'), 'interest editor must keep a clear upper limit');
assert.ok(service.includes('is_public'), 'interest visibility must be explicit');
assert.ok(service.includes('requireCommunityStorageUser(userId)'), 'writes must be bound to the authenticated member');
assert.ok(service.includes('findUserIdsByPublicInterest'), 'public interests should be searchable');
assert.ok(editor.includes('Keep these interests private'), 'private-by-default choice must be visible');
assert.ok(editor.includes('Show these interests in discovery'), 'public visibility must be explicit and opt-in');
assert.ok(discovery.includes('fetchPublicDiscoveryInterests'), 'discovery cards must read only public interests');
assert.ok(discovery.includes('findUserIdsByPublicInterest'), 'people discovery must search opted-in interests');
assert.ok(discovery.includes('fetchFeed()'), 'topic discovery should reuse the existing public feed');
assert.ok(discovery.includes('fetchEvents(currentUserId)'), 'community gathering discovery should reuse existing events');
assert.ok(workspace.includes("onExploreFeed={() => setActiveNavigation('feed')}"), 'topic actions must navigate to the existing feed');
assert.ok(workspace.includes("onExploreEvents={() => setActiveNavigation('events')}"), 'gathering actions must navigate to existing events');
console.log('Discovery interest contract checks passed.');
