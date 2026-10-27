# Sanctuary Messaging Privacy and End-to-End Encryption

## Current status

**End-to-end encryption is not active.** The current persistent messaging path writes the message body to the Supabase `public.messages.body` column. The database and authorised application paths can therefore process message plaintext. A private conversation is not the same thing as an end-to-end encrypted conversation.

The messaging interface must display a clear disclosure until an encrypted protocol has been implemented, independently reviewed, and tested. Do not market current messages as encrypted end-to-end.

## Target outcome

Use end-to-end encryption (E2EE) for direct messages first. The server should store ciphertext and the minimum routing metadata required to deliver it. Plaintext and private decryption keys must never be sent to Supabase, server logs, analytics, or push-notification payloads.

### Security requirements before enabling E2EE

1. **Use an established, reviewed protocol/library.** Do not invent a home-grown encryption protocol. Prefer a well-reviewed asynchronous messaging protocol with authenticated prekeys and a ratcheting session design. Confirm package maintenance, browser compatibility, licensing, and independent security review before choosing an implementation.
2. **Keys stay on the user's device.** Generate identity/session keys client-side. Store private key material in device-local protected storage where possible. The server stores public key material and encrypted prekeys only. Never place private keys in user metadata, the database, logs, or analytics.
3. **Key authenticity matters.** Provide a way to verify a contact's identity key (e.g. a safety number/QR comparison) and visibly warn when a key changes. A server-held public key directory without verification can be substituted by a compromised service.
4. **Do not overpromise forward secrecy.** Static ECDH + AES-GCM alone is not a complete messaging protocol and does not provide the same forward-secrecy/post-compromise properties as a ratcheting protocol. Do not ship a custom scheme as production E2EE.
5. **Plan multi-device and recovery explicitly.** Device linking, lost-device recovery, backups, key rotation, and account deletion must be designed before users rely on encrypted history. A server must not silently escrow decryption keys.
6. **Groups need a separate design.** Use a group protocol with authenticated membership changes and key rotation; do not reuse a direct-message shortcut for group chat.
7. **Metadata remains visible.** Even with E2EE, the service may see participant IDs, conversation membership, delivery times, ciphertext size, and operational events. Minimise retention and explain what remains visible.
8. **Reporting and safety must be compatible.** A user may explicitly choose to attach a decrypted message excerpt to a report. Never decrypt every message server-side for moderation. Clearly explain that reports the user submits can reveal the selected content to moderators.
9. **Notifications must not contain plaintext.** Push notifications should say that a new message arrived, with no message body or sensitive preview.
10. **Backups and exports must preserve the trust boundary.** Any export or recovery workflow must make encryption and key custody clear and must not silently upload plaintext.

## Rollout plan

### Phase 0 — Transparency and design (this PR)

- Show an honest privacy notice in the inbox and each conversation.
- Document current plaintext server storage and the E2EE requirements.
- Keep all current messaging behavior labelled as not E2EE.

### Phase 1 — Protocol and threat-model review

- Choose and pin a maintained, reviewed protocol implementation.
- Define attacker model: database exposure, compromised application server, malicious/compromised public-key directory, stolen device, and compromised endpoint.
- Define identity verification, session establishment, key-change handling, multi-device support, backup/recovery, deletion, and report-sharing UX.
- Review library maintenance and license; security review before production.

### Phase 2 — Direct-message implementation in staging

- Add public-key/prekey directory tables with strict RLS and no private-key columns.
- Store versioned ciphertext envelopes, nonce/header and protocol metadata; reject plaintext sends on the E2EE route.
- Ensure server-side moderation/report flows never claim to inspect encrypted body content.
- Add tests for tampering, wrong keys, replay, key rotation, unknown peers, offline delivery, session restoration, and concurrent sessions.
- Test with at least two separate accounts and devices against an isolated staging database.

### Phase 3 — Limited beta and group messaging

- Enable direct E2EE only for accounts that have registered and verified keys.
- Make unencrypted legacy history visibly distinct; never silently treat it as encrypted.
- Design and test group E2EE separately before enabling it.
- Publish the metadata and recovery limitations in the privacy UI.

## Browser-local storage versus E2EE

Browser-local-only messages reduce server retention but do not provide cross-device delivery and can be lost when site data is cleared, the browser is reset, or a device is lost. They are not automatically safe from other users of the same device or from compromised browser extensions. E2EE is the better target for private messaging across devices, provided key custody and recovery are done carefully. A local-only draft can remain a separate optional feature.

## Release gate

Do not remove the privacy notice or call messaging E2EE until the selected protocol is implemented, the plaintext server path is disabled for encrypted conversations, tests pass, staging verification is complete, and the security design has been reviewed. This work does not alter the production database or deployment.
