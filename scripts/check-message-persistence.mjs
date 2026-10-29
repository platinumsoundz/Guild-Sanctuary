import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const service = read('../src/modules/messages/service.ts');
const repository = read('../src/modules/messages/supabaseRepository.ts');
const hook = read('../src/modules/messages/useDirectMessages.ts');
const inbox = read('../src/modules/messages/MessagesInbox.tsx');
const thread = read('../src/modules/messages/DirectMessageThread.tsx');
const privacyNotice = read('../src/modules/messages/MessagePrivacyNotice.tsx');
const readme = read('../src/modules/messages/README.md');
const encryptionPlan = read('../docs/design/END_TO_END_ENCRYPTION_READINESS.md');

const migration = read('../supabase/migrations/20261027001557_restore_secure_persistent_messaging.sql');
const dmPreferenceFix = read('../supabase/migrations/20261027002103_fix_direct_message_preference_source.sql');
const databaseTypes = read('../src/services/supabase/database.types.ts');

const checks = [
  ['inbox and thread clearly disclose that end-to-end encryption is not active', /MessagePrivacyNotice/.test(inbox) && /MessagePrivacyNotice/.test(thread)],
  ['privacy notice does not claim encryption is already active', /End-to-end encryption is not active yet/.test(privacyNotice) && /not currently end-to-end encrypted/.test(privacyNotice)],
  ['encryption plan states this is design only and requires independent review', /design requirements only/.test(encryptionPlan) && /independent security review required/.test(encryptionPlan)],
  ['encryption plan forbids custom cryptography and requires a maintained reviewed library', /Do not implement primitives, key exchange, ratchets, group membership cryptography, or serialization from scratch/.test(encryptionPlan) && /maintained, independently reviewed implementations/.test(encryptionPlan)],
  ['encryption plan covers device lifecycle, recovery, and group membership', /Device model/.test(encryptionPlan) && /Recovery/.test(encryptionPlan) && /Group membership/.test(encryptionPlan)],
  ['encryption plan requires generic notification previews and consented reporting', /must not contain plaintext by default/.test(encryptionPlan) && /preview and confirmation/.test(encryptionPlan)],
  ['encryption plan keeps legacy messages accurately labelled and forbids plaintext downgrade', /pre-E2EE messages as unencrypted/.test(encryptionPlan) && /Do not transparently downgrade an encrypted conversation to plaintext/.test(encryptionPlan)],

  ['member search clears old results before a new query resolves', /const normalizedQuery = value\.trim\(\);\s*setResults\(\[\]\);\s*setError\(null\);/.test(inbox)],
  ['inbox loads ignore responses from stale requests or accounts', /inboxRequest = useRef\(0\)/.test(inbox) && /activeUserId\.current !== requestedUserId/.test(inbox)],
  ['member search ignores stale results and removes the current user', /searchRequest = useRef\(0\)/.test(inbox) && /nextResults\.filter\(\(profile\) => profile\.userId !== requestedUserId\)/.test(inbox)],
  ['account changes clear inbox and member selection state', /setConversations\(\[\]\)/.test(inbox) && /setSelectedMembers\(\[\]\)/.test(inbox) && /setResults\(\[\]\)/.test(inbox)],
  ['group creation prevents duplicate submits and stale account navigation', /isCreatingGroup \|\| selectedMembers\.length < 2/.test(inbox) && /groupRequest\.current/.test(inbox) && /onOpenConversation\(conversation\)/.test(inbox)],
  ['persistent mode is opt-in and verifies the authenticated user ID', /isPersistentMessagingEnabled/.test(service) && /NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES === 'true'/.test(service) && /data\.user\.id !== userId/.test(service)],
  ['identity mismatches fail closed instead of falling back to demo storage', /active Sanctuary session does not match the signed-in account/.test(service)],
  ['demo mode never claims it checked a recipient live DM setting', /local demo profile has direct messages turned off/.test(service) && !/This member is not accepting direct messages/.test(service)],
  ['direct conversation creation routes through the authenticated RPC', /createPersistentConversation\('direct', \[peerUserId\], null\)/.test(service)],
  ['group creation routes through the authenticated RPC', /createPersistentConversation\('group', participantIds, normalizedName\)/.test(service)],
  ['persistent inbox listing reads memberships from Supabase', /fetchPersistentConversations\(userId\)/.test(service)],
  ['persistent thread reads and sends use the repository', /fetchPersistentThread\(conversationId\)/.test(service) && /sendPersistentMessage\(conversationId, normalizedBody\)/.test(service)],
  ['message writes derive sender identity from the authenticated Supabase user', /auth\.getUser\(\)/.test(repository) && /sender_id: authData\.user\.id/.test(repository)],
  ['message history is limited to visible rows and bounded in size', /\.eq\('state', 'visible'\)/.test(repository) && /\.limit\(500\)/.test(repository)],
  ['realtime subscriptions are connected to the active message hook', /subscribeToPersistentMessages/.test(service) && /subscribeToConversationMessages/.test(hook)],
  ['realtime events are deduplicated against send responses', /some\(\(message\) => message\.id === incoming\.id\)/.test(hook)],
  ['local/demo conversation authorization remains in place', /requireParticipant\(conversationId, userId\)/.test(service) && /requireParticipant\(conversationId, senderId\)/.test(service)],
  ['repair migration restores all four durable messaging tables idempotently', ['conversations', 'conversation_members', 'direct_conversation_pairs', 'messages'].every((table) => migration.includes('create table if not exists public.' + table))],
  ['all durable messaging tables have row-level security enabled', ['conversations', 'conversation_members', 'direct_conversation_pairs', 'messages'].every((table) => migration.includes('alter table public.' + table + ' enable row level security'))],
  ['conversation reads and message inserts are member-scoped', /members read conversations/.test(migration) && /members read membership/.test(migration) && /active members read messages/.test(migration) && /active members send messages/.test(migration)],
  ['message insert policy binds sender to auth.uid and active membership', /sender_id = \(select auth\.uid\(\)\)/.test(migration) && /is_active_conversation_member\(conversation_id\)/.test(migration)],
  ['direct-message creation checks profile and saved privacy settings', /allow_direct_messages/.test(migration) && /privacy->>'allowDirectMessages'/.test(migration) && /preferences->>'allowDirectMessages'/.test(migration)],
  ['messaging tables are not granted to anon and writes are limited to messages', /from public, anon, authenticated/.test(migration) && /grant select on table public\.conversations, public\.conversation_members, public\.direct_conversation_pairs, public\.messages to authenticated/.test(migration) && /grant insert on table public\.messages to authenticated/.test(migration)],
  ['migration refreshes schema cache and conditionally enables Realtime', /notify pgrst, 'reload schema'/.test(migration) && /supabase_realtime/.test(migration) && /alter publication supabase_realtime add table public\.messages/.test(migration)],
  ['latest migration treats saved Settings DM preference as authoritative', /s\.preferences->>'allowDirectMessages'/.test(dmPreferenceFix) && /p\.allow_direct_messages/.test(dmPreferenceFix) && !/privacy->>'allowDirectMessages'/.test(dmPreferenceFix)],
];

checks.push(
  ['persistent conversation RPC exists in generated database types', /create_sanctuary_conversation:\s*\{/.test(databaseTypes)],
  ['persistent conversation RPC arguments stay aligned with repository calls', /requested_kind:\s*kind/.test(repository) && /requested_member_ids:\s*uniqueIds/.test(repository) && /requested_name:\s*name/.test(repository) && /requested_kind:\s*'direct' \| 'group'/.test(databaseTypes) && /requested_member_ids:\s*string\[\]/.test(databaseTypes) && /requested_name\?:\s*string \| null/.test(databaseTypes)],
  ['repository uses the typed RPC name rather than the lower-level migration function name', /rpc\('create_sanctuary_conversation'/.test(repository) && !/rpc\('create_conversation'/.test(repository)],
);

checks.push(
  ['conversation RPC rejects unauthenticated or inactive callers', /caller_id is null or not public\.is_active_user\(\)/.test(migration)],
  ['conversation RPC requires caller membership and bounds group size', /if not caller_id = any\(coalesce\(requested_member_ids/.test(migration) && /member_count < 3 or member_count > 50/.test(migration)],
  ['direct conversation pairs are normalized and unique per world', /check \(first_user_id < second_user_id\)/.test(migration) && /unique \(first_user_id, second_user_id, world_type\)/.test(migration)],
  ['security-definer conversation RPCs pin search_path and revoke public/anon execution', /language plpgsql security definer set search_path = ''/.test(migration) && /language sql security definer set search_path = ''/.test(migration) && /revoke all on function public\.create_conversation[\s\S]*?from public, anon/.test(migration) && /revoke all on function public\.create_sanctuary_conversation[\s\S]*?from public, anon/.test(migration)],
  ['message trigger function is not directly executable by app roles', /revoke all on function public\.touch_conversation_on_message\(\) from public, anon, authenticated/.test(migration)],
  ['authenticated clients cannot directly mutate conversation membership or history', /revoke all on table public\.conversations, public\.conversation_members, public\.direct_conversation_pairs, public\.messages from public, anon, authenticated/.test(migration) && !/grant (update|delete|insert) on table public\.conversations/.test(migration) && !/grant (update|delete|insert) on table public\.conversation_members/.test(migration) && !/grant (update|delete|insert) on table public\.direct_conversation_pairs/.test(migration)],
  ['conversation reads and message reads fail closed for non-members', /using \(public\.is_active_conversation_member\(id\)\)/.test(migration) && /using \(public\.is_active_conversation_member\(conversation_id\) and state = 'visible'\)/.test(migration)],
  ['conversation creation validates recipient status and direct-message preferences', /p\.status = 'active'/.test(migration) && /p\.allow_direct_messages/.test(migration) && /s\.preferences->>'allowDirectMessages'/.test(dmPreferenceFix)],
);

checks.push(
  ['message thread state is synchronously hidden when the account or selected thread changes', /const threadKey = `\$\{userId\}:\$\{selectedConversationId \?\? `peer:\$\{peerUserId \?\? ''\}`\}`/.test(hook) && /const visibleMessages = messagesThreadKey === threadKey \? messages : \[\]/.test(hook)],
  ['message sending is blocked while the rendered thread key is stale', /messagesThreadKey !== threadKey \|\| !sendingConversationId/.test(hook)],
  ['inbox hides prior-account conversations synchronously until the new session reset runs', /const sessionReady = sessionUserId === currentUserId/.test(inbox) && /const visibleConversations = sessionReady \? conversations : \[\]/.test(inbox) && /!sessionReady \|\| isLoading/.test(inbox)],
  ['inbox hides prior-account member selections and search results during account transitions', /const visibleSelectedMembers = sessionReady \? selectedMembers : \[\]/.test(inbox) && /sessionReady && results\.length > 0/.test(inbox) && /if \(!sessionReady \|\| isCreatingGroup/.test(inbox)],
);

checks.push(
  ['active message threads recover missed Realtime events while visible', /window\.setInterval\(refreshWhenVisible, 15_000\)/.test(hook) && /document\.addEventListener\('visibilitychange', refreshWhenVisible\)/.test(hook)],
  ['message inbox refreshes for conversations created on another device', /window\.setInterval\(refreshWhenVisible, 30_000\)/.test(inbox) && /document\.addEventListener\('visibilitychange', refreshWhenVisible\)/.test(inbox)],
  ['messaging documentation accurately describes conditional durable mode and demo-only memory', /NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES=true/.test(readme) && /device-session-only/.test(readme) && /two real accounts/.test(readme)],
);

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Messaging persistence contract checks passed: ${checks.length}`);
