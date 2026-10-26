import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const service = read('../src/modules/messages/service.ts');
const repository = read('../src/modules/messages/supabaseRepository.ts');
const hook = read('../src/modules/messages/useDirectMessages.ts');

const checks = [
  ['persistent messaging remains opt-in', /NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES === 'true'/.test(service)],
  ['persistent mode verifies the current Supabase user', /auth\.getUser\(\)/.test(service) && /data\.user\.id !== userId/.test(service)],
  ['identity mismatch fails closed instead of mixing app users', /active Sanctuary session does not match the signed-in account/.test(service)],
  ['direct conversations require a matching persistent session', /if \(await hasPersistentSession\(userId\)\) \{\s*const conversation = await createPersistentConversation\('direct'/.test(service)],
  ['group conversations require a matching persistent session', /if \(await hasPersistentSession\(userId\)\) \{\s*return createPersistentConversation\('group'/.test(service)],
  ['inbox and thread reads verify session identity', /if \(await hasPersistentSession\(userId\)\) return fetchPersistentConversations/.test(service) && /if \(await hasPersistentSession\(userId\)\) return fetchPersistentThread/.test(service)],
  ['message writes derive sender identity from Supabase Auth', /auth\.getUser\(\)/.test(repository) && /sender_id: authData\.user\.id/.test(repository)],
  ['realtime subscription checks the same user identity', /subscribeToConversationMessages/.test(service) && /hasPersistentSession\(userId\)/.test(service)],
  ['hook handles async subscription cleanup and errors', /subscribeToConversationMessages\(conversationId, userId/.test(hook) && /unsubscribe\?\.\(\)/.test(hook) && /subscription could not be started/.test(hook)],
  ['realtime events are deduplicated by message ID', /some\(\(existing\) => existing\.id === message\.id\)/.test(hook)],
  ['demo conversation authorization remains enforced', /requireParticipant\(conversationId, userId\)/.test(service) && /requireParticipant\(conversationId, senderId\)/.test(service)],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Messaging identity and persistence contract checks passed: ${checks.length}`);
