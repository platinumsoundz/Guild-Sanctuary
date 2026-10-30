# Sanctuary Messaging Privacy and End-to-End Encryption

> **Product decision — 30 October 2026: PARKED / HISTORICAL RESEARCH.** The current approved direction is Supabase-backed messaging with authenticated access controls and Realtime delivery. E2EE is not part of the active roadmap and must not be implemented, promised, or represented as planned unless the owner explicitly reopens that decision. These notes are retained only as historical security research. Message bodies remain readable by the service and are not end-to-end encrypted.

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

## Protocol options researched for the next decision

These are candidates to evaluate, not an implementation decision or a security endorsement:

- **Matrix JavaScript SDK + Rust crypto WASM:** Official SDK documentation says it runs in browsers and Node.js and uses Rust crypto bindings for E2EE. Its crypto store uses browser IndexedDB by default. This is the clearest browser-capable candidate found, but adopting it means operating or integrating a Matrix homeserver, mapping Sanctuary identities to Matrix devices, handling cross-signing/recovery, and preventing multiple clients from opening the same crypto store concurrently. Evaluate the additional service and account lifecycle before choosing it. References: https://github.com/matrix-org/matrix-js-sdk and https://matrix-org.github.io/matrix-js-sdk/
- **Signal `@signalapp/libsignal-client`:** Signal publishes a TypeScript API over Rust and implements the Signal Protocol, but its current npm package is AGPL-3.0-only and its published platform support is based on native Node add-ons; the upstream project says use outside Signal is unsupported. It is not a drop-in browser-only dependency for the current Next.js web client. Resolve platform compatibility and license implications before considering it. References: https://github.com/signalapp/libsignal and https://www.npmjs.com/package/@signalapp/libsignal-client
- **Do not use the archived `libsignal-protocol-javascript` package.** It is no longer maintained; a similarly named package or old tutorial is not evidence of a safe current dependency. Reference: https://github.com/signalapp/libsignal-protocol-javascript

**Current decision:** no crypto package has been added and no encrypted mode has been advertised. Next step is an architecture spike comparing Matrix integration cost against a genuinely browser-compatible, maintained protocol implementation. The choice must include threat model, licensing, multi-device support, identity verification, group protocol, recovery, and security review—not just an API that can encrypt a string.
### Additional browser-first candidate found

- **OpenE2EE Signal Protocol SDK:** The project advertises a pure-TypeScript browser/React Native/Node implementation with local device state, session ratcheting, and multi-device/group support. Its public docs explicitly say it has **not been independently audited**. Its maturity, protocol deviations, maintenance, package provenance, licensing, and security review need independent assessment before it is trusted with real private messages. It may reduce the need for a separate Matrix homeserver, but that operational convenience is not evidence that it is safer. References: https://github.com/open-e2ee/signal-protocol-js and https://docs.open-e2ee.dev/

### Decision criteria

| Criterion | Matrix JS SDK | OpenE2EE browser SDK |
|---|---|---|
| Browser crypto path | Rust crypto WASM documented by Matrix SDK | Pure TypeScript advertised by project |
| Extra service | Requires Matrix homeserver and account/device mapping | Can use custom delivery transport, according to project docs |
| Assurance signal | Established ecosystem and official SDK documentation; still needs Sanctuary-specific review | Newer/smaller project; project documentation says no independent audit |
| Licensing / integration | Review project license and homeserver deployment requirements | Verify selected package version's exact license and protocol deviations before use |
| Current status | Candidate only | Candidate only |

**Recommendation:** Do not select by convenience or claims alone. Evaluate Matrix first for ecosystem maturity, and evaluate OpenE2EE as a browser-first alternative only after an explicit assurance/licensing review. No package has been installed and neither candidate is approved for production use.