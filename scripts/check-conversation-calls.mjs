import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const component = readFileSync('src/modules/messages/ConversationCallPanel.tsx', 'utf8');
const thread = readFileSync('src/modules/messages/DirectMessageThread.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20261028202753_sanctuary_call_signaling.sql', 'utf8');
const senderHardening = readFileSync('supabase/migrations/20261028203010_harden_call_signal_sender.sql', 'utf8');

for (const token of ['getUserMedia', 'getUser', 'setAuth', 'RTCPeerConnection', 'createOffer', 'createAnswer', 'addIceCandidate', "type: 'invite'", "type: 'hangup'", 'toggleMute', 'toggleCamera', 'isGroup', '45_000', '30_000', 'config: { private: true }']) {
  assert.ok(component.includes(token), `Call panel must include ${token}`);
}
assert.ok(thread.includes('ConversationCallPanel'), 'Call controls must be integrated into Sanctuary messages');
assert.ok(migration.includes('conversation_members'), 'Call signalling must check conversation membership');
assert.ok(migration.includes('auth.uid()'), 'Call signalling must be restricted to the authenticated user');
assert.ok(migration.includes('left_at is null'), 'Former conversation members must not retain signalling access');
assert.ok(migration.includes('is_active_user()'), 'Suspended or inactive accounts must not use call signalling');
assert.ok(migration.includes("extension = 'broadcast'"), 'Policies must be scoped to broadcast signalling');
assert.ok(senderHardening.includes('realtime.messages.private is true'), 'Signalling must require private Realtime channels');
assert.ok(senderHardening.includes("payload ->> 'from' = (select auth.uid())::text"), 'Signalling sender identity must match the authenticated user');
console.log('Conversation call source contracts passed.');
