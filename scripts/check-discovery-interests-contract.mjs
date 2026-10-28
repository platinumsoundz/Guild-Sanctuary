import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const migration = readFileSync(new URL('../supabase/migrations/20261028150000_member_discovery_interests.sql', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/modules/profiles/discoveryInterests.ts', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../src/modules/profiles/components/ProfileInterestsEditor.tsx', import.meta.url), 'utf8');
const discovery = readFileSync(new URL('../src/modules/profiles/components/ProfileDiscovery.tsx', import.meta.url), 'utf8');
const workspace = readFileSync(new URL('../src/components/AppWorkspace.tsx', import.meta.url), 'utf8');
const publicProfile = readFileSync(new URL('../src/modules/profiles/components/PublicProfilePage.tsx', import.meta.url), 'utf8');
const relationshipMigration = readFileSync(new URL('../supabase/migrations/20261028170000_connection_relationships.sql', import.meta.url), 'utf8');
const relationshipService = readFileSync(new URL('../src/modules/profiles/connectionService.ts', import.meta.url), 'utf8');

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
assert.ok(service.includes('findUserIdsBySharedPublicInterests'), 'shared public interests should support suggestions');
assert.ok(editor.includes('Keep these interests private'), 'private-by-default choice must be visible');
assert.ok(editor.includes('Show these interests in discovery'), 'public visibility must be explicit and opt-in');
assert.ok(discovery.includes('fetchPublicDiscoveryInterests'), 'discovery cards must read only public interests');
assert.ok(discovery.includes('findUserIdsByPublicInterest'), 'people discovery must search opted-in interests');
assert.ok(publicProfile.includes('fetchPublicDiscoveryInterests'), 'public profile must expose only public interests');
assert.ok(discovery.includes('fetchFeed()'), 'topic discovery should reuse the existing public feed');
assert.ok(discovery.includes('fetchEvents(currentUserId)'), 'community gathering discovery should reuse existing events');
assert.ok(workspace.includes("onExploreFeed={() => setActiveNavigation('feed')}"), 'topic actions must navigate to the existing feed');
assert.ok(workspace.includes("onExploreEvents={() => setActiveNavigation('events')}"), 'gathering actions must navigate to existing events');
for (const required of [
  'create table if not exists public.profile_follows',
  'create table if not exists public.profile_connections',
  'create table if not exists public.profile_blocks',
  'alter table public.profile_follows enable row level security',
  'alter table public.profile_connections enable row level security',
  'alter table public.profile_blocks enable row level security',
  'private.guard_profile_relationships',
  'private.apply_profile_block_cleanup',
  'private.is_profile_blocked',
  'private.guard_direct_message_blocks',
  'private.guard_direct_conversation_blocks',
  'private.notify_profile_follow',
  'private.notify_connection_request',
  "'connection_request'",
  "'connection_accepted'",
  'requester_id = (select auth.uid())',
  'recipients respond to connection requests',
  'revoke all on table public.profile_follows, public.profile_connections, public.profile_blocks from anon, authenticated',
]) assert.ok(relationshipMigration.includes(required), `missing relationship security contract: ${required}`);

for (const required of [
  'fetchRelationshipStates',
  'followProfile',
  'unfollowProfile',
  'requestConnection',
  'respondToConnection',
  'blockProfile',
  'unblockProfile',
  'fetchIncomingConnectionRequests',
  'fetchBlockedProfileIds',
]) assert.ok(relationshipService.includes(required), `missing relationship service action: ${required}`);

assert.ok(discovery.includes('Connection requests'), 'discovery must expose incoming connection requests');
assert.ok(discovery.includes('Block member'), 'discovery must provide a block control');
assert.ok(discovery.includes('Blocked members'), 'members must be able to manage their block list');
const notificationBar = readFileSync(new URL('../src/components/NotificationBar.tsx', import.meta.url), 'utf8');
assert.ok(notificationBar.includes('connection_request'), 'notification panel must render connection request events');
assert.ok(notificationBar.includes('started following you'), 'notification panel must render follow events');
console.log('Discovery interest and relationship contract checks passed.');
