import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const component = readFileSync('src/modules/messages/ConversationCallPanel.tsx', 'utf8');
const thread = readFileSync('src/modules/messages/DirectMessageThread.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20261028190000_sanctuary_call_signaling.sql', 'utf8');

for (const token of ['getUserMedia', 'RTCPeerConnection', 'createOffer', 'createAnswer', 'addIceCandidate', "type: 'invite'", "type: 'hangup'", 'toggleMute', 'toggleCamera', 'isGroup']) {
  assert.ok(component.includes(token), `Call panel must include ${token}`);
}
assert.ok(thread.includes('ConversationCallPanel'), 'Call controls must be integrated into Sanctuary messages');
assert.ok(migration.includes('conversation_members'), 'Call signalling must check conversation membership');
assert.ok(migration.includes('auth.uid()'), 'Call signalling must be restricted to the authenticated user');
assert.ok(migration.includes('left_at is null'), 'Former conversation members must not retain signalling access');
console.log('Conversation call source contracts passed.');
