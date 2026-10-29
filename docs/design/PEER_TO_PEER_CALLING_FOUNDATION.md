# Sanctuary/Guild peer-to-peer calling foundation

**Status:** initial WebRTC and private signalling implementation added on a feature branch; not production-ready until migration is reviewed/applied and two-account/two-device tests pass.  
**Owner:** product owner; engineering implementation requires independent security review.  
**Scope:** one-to-one audio first, then video, initiated from an existing direct conversation.  
**Non-scope for this foundation:** group calls, call recording, call history, persistent call logs, production database changes, and claiming end-to-end encryption.

## Product intent

Use Sanctuary accounts and existing conversations to discover and authenticate the intended participant. Use a short-lived signalling channel only to negotiate a connection. Prefer WebRTC device-to-device media; do not introduce a central media server for ordinary one-to-one calls. A TURN relay may be needed as an explicit fallback on networks where direct connections fail.

## Proposed sequence

1. Caller requests a call from an existing authorized direct conversation.
2. Recipient receives a minimal invitation and can accept or decline.
3. Both clients verify that signalling messages belong to the authenticated participants and the same conversation/call ID.
4. Clients exchange WebRTC offer/answer and ICE candidates through authenticated, short-lived signalling.
5. Clients request microphone/camera permission only when appropriate and establish a peer connection.
6. UI exposes connecting, ringing, connected, reconnecting, declined, failed and ended states; both parties can end the call.
7. Ephemeral signalling data is removed/expired after the negotiation and call. Do not store recordings or a durable call history by default.

## Security and privacy gates

- Do not broadcast SDP/ICE through an unauthenticated or publicly subscribable channel.
- Use database/channel authorization tied to the authenticated conversation membership; fail closed when auth or membership cannot be verified.
- Do not trust client-supplied sender IDs. Derive caller identity from the authenticated session and validate the intended recipient server-side.
- WebRTC normally encrypts media in transit (DTLS-SRTP); this must not be marketed as a stronger independently audited E2EE guarantee without a reviewed design.
- Prefer direct peer-to-peer media. If TURN is configured, it should relay encrypted transport and should not terminate/decrypt media. Document that network/hosting providers may still retain connection metadata.
- Do not record calls or create call history by default. Avoid storing SDP/ICE payloads longer than required. Add rate limits, invitation expiry, abuse/report controls, and explicit permission handling.
- Avoid logging tokens, SDP, ICE candidates, IP addresses or media contents in application logs.
- Browser private-key storage is not a prerequisite for basic WebRTC transport encryption. If application-layer E2EE is later required, use a maintained and independently reviewed implementation; never invent a cryptographic protocol.

## Implementation order

1. **Implemented in this batch:** audio/video entry points, incoming accept/decline, outgoing invitations, WebRTC offer/answer/ICE negotiation, mute/camera controls, teardown, and membership-scoped private-channel RLS.
2. **Remaining before beta:** review/apply the migration in staging, deliver invitations when the recipient is not currently viewing the thread, add TURN fallback, and verify channel authorization behavior against the live Supabase project.
3. **Hardening:** server-verified sender identity, duplicate/replay protection, invitation timeout, missed-call handling and cleanup.
4. **WebRTC client:** permission checks, offer/answer/ICE, mute/camera toggles, device selection where supported, responsive call surface, reconnect and teardown.
5. **Tests:** state-machine unit tests, RLS denial tests, invitation expiry, two-account/two-device audio test, video test, permission denial, disconnect/reconnect, mobile background/foreground and account-switch isolation.
6. **Release gate:** only enable controls after exact-commit CI, staging schema/RLS review, and real two-account/two-device tests pass.

## Acceptance criteria

- Existing direct messages remain usable and unchanged.
- Call actions are visible only in direct conversations, not group chats.
- Actions are disabled until the authenticated private signalling channel subscribes successfully.
- Migration remains unapplied to production until staging SQL/RLS review is complete.
- UI does not claim independently audited E2EE; it describes standard WebRTC and current limitations.
- Automated checks validate the call lifecycle primitives and documented authorization requirements.
