import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const service = read('../src/modules/messages/service.ts');
const repository = read('../src/modules/messages/supabaseRepository.ts');
const hook = read('../src/modules/messages/useDirectMessages.ts');
const messageUi = read('../src/modules/messages/DirectMessageThread.tsx');
const messageUiCss = read('../src/modules/messages/DirectMessageThread.module.css');
const encryptionPlan = read('../docs/MESSAGING_E2EE_PLAN.md');
const migration = read('../supabase/migrations/20261027001557_restore_secure_persistent_messaging.sql');
const dmPreferenceFix = read('../supabase/migrations/20261027002103_fix_direct_message_preference_source.sql');

const checks = [
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
  ['message UI clearly states E2EE is not active', /E2EE not active/.test(messageUi) && /not end-to-end encrypted/.test(messageUi)],
  ['message UI explains server access and avoids sensitive content', /service may be able to access server-stored message text/.test(messageUi) && /Avoid sending passwords/.test(messageUi)],
  ['message UI explains local-only storage is not E2EE', /not a substitute for end-to-end encryption/.test(messageUi)],
  ['message privacy explainer has visible expandable details', /<details className=\{styles\.privacyDetails\}>/.test(messageUi) && /\.privacyDetails summary/.test(messageUiCss)],
  ['E2EE plan forbids custom cryptographic protocol and false claims', /Do not implement cryptographic primitives/.test(encryptionPlan) && /Do not describe it as end-to-end encrypted/.test(encryptionPlan)],
  ['E2EE release plan includes device-loss, revocation and group-membership gates', /device loss/i.test(encryptionPlan) && /revocation/i.test(encryptionPlan) && /group membership/i.test(encryptionPlan)]
);
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Messaging persistence contract checks passed: ${checks.length}`);
