import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const component = readFileSync('src/modules/messages/ConversationCallPanel.tsx', 'utf8');
const thread = readFileSync('src/modules/messages/DirectMessageThread.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20261028202753_sanctuary_call_signaling.sql', 'utf8');
const senderHardening = readFileSync('supabase/migrations/20261028203010_harden_call_signal_sender.sql', 'utf8');
const iceConfig = readFileSync('supabase/functions/call-ice-config/index.ts', 'utf8');

for (const token of ['isSignalPayload', 'SIGNAL_TYPES', '256_000', 'incomingRef', "type: 'reject'", 'getUserMedia', 'getUser', 'setAuth', 'RTCPeerConnection', 'createOffer', 'createAnswer', 'addIceCandidate', "type: 'invite'", "type: 'hangup'", 'toggleMute', 'toggleCamera', 'isGroup', '45_000', '30_000', 'config: { private: true }', 'remoteAudio', 'reconnectTimer', 'trying to reconnect', 'isSignalPayload(payload)', 'queuedCandidates.current.length < 256']) {
  assert.ok(component.includes(token), `Call panel must include ${token}`);
}
assert.ok(component.includes('candidate.description.type !== candidate.type'), 'SDP type must match the signal type');
assert.ok(component.includes('candidate.description.sdp.length > 256_000'), 'SDP payloads must be bounded');
assert.ok(component.includes('candidate.candidate.length > 4_096'), 'ICE candidate strings must be bounded');
assert.ok(component.includes('if (!isSignalPayload(payload)) return;'), 'Incoming broadcast payloads must be validated before processing');
assert.ok(component.includes('queuedCandidates.current.length < 256'), 'Pending ICE candidates must be capped');
assert.ok(component.includes('if (!isSignalPayload(payload)) return;'), 'Every incoming broadcast must pass payload validation');
assert.ok(component.includes('queuedCandidates.current.length < 256'), 'Queued ICE candidates must have a strict upper bound');
assert.ok(component.includes('activeCallRef.current === null && incomingRef.current === null'), 'Only one incoming call may be pending');
assert.ok(thread.includes('ConversationCallPanel'), 'Call controls must be integrated into Sanctuary messages');
assert.ok(migration.includes('conversation_members'), 'Call signalling must check conversation membership');
assert.ok(migration.includes('auth.uid()'), 'Call signalling must be restricted to the authenticated user');
assert.ok(migration.includes('left_at is null'), 'Former conversation members must not retain signalling access');
assert.ok(migration.includes('is_active_user()'), 'Suspended or inactive accounts must not use call signalling');
assert.ok(migration.includes("extension = 'broadcast'"), 'Policies must be scoped to broadcast signalling');
assert.ok(senderHardening.includes('realtime.messages.private is true'), 'Signalling must require private Realtime channels');
assert.ok(senderHardening.includes("payload ->> 'from' = (select auth.uid())::text"), 'Signalling sender identity must match the authenticated user');
assert.ok(iceConfig.includes('TURN_SHARED_SECRET') && iceConfig.includes('TURN_SERVER_URLS'), 'TURN credentials must be created from server-side configuration');
assert.ok(iceConfig.includes('conversation_members') && iceConfig.includes('left_at'), 'ICE configuration must require active conversation membership');
assert.ok(iceConfig.includes('Cache-Control'), 'Temporary ICE credentials must not be cached');
console.log('Conversation call source contracts passed.');
