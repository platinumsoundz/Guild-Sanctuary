# Sanctuary Messaging End-to-End Encryption Plan

**Status:** Design and readiness plan only. E2EE is not implemented. The active messaging service can use a demo in-memory path or an opt-in Supabase/PostgreSQL path, depending on configuration. When the server-backed path is enabled, readable message bodies are stored in the database. Do not describe either path as end-to-end encrypted; it must not be marketed as E2EE until the release gates below pass.

## Product decision

Prefer end-to-end encryption (E2EE) for direct messages over a "browser-only messages" design. A local-only inbox is a different product trade-off: it can lose history when a device is cleared, may expose content on shared or compromised devices, and does not by itself protect messages in transit or provide verified identity.

The intended sequence is one-to-one E2EE first, followed by group encryption after membership changes and device lifecycle are designed. Optional local caching can be considered later, but it must not be marketed as E2EE.

## Threat model

### Protect against

- The database, database backups, logs, analytics, support tooling, or a server-side compromise revealing readable message content.
- A person or device that is not a current conversation participant reading message contents.
- Message tampering, replay, and impersonation, subject to the selected protocol's guarantees and identity-verification UX.
- A former group member retaining access to future messages after membership removal.
- Private keys being copied to server storage or sent to the backend during normal message delivery.

### Not automatically solved by E2EE

- A recipient copying, exporting, photographing, or forwarding a message.
- Malware, browser extensions, a compromised operating system, or an unlocked device reading plaintext after decryption.
- Account takeover, phishing, or users accepting an unverified device identity.
- Metadata such as account identities, recipients, timestamps, delivery patterns, IP addresses, and approximate message sizes.
- Moderation needs. Reports must be an explicit user action that submits the selected message/context for review; there must not be covert server-side plaintext scanning while claiming the service cannot read messages.

## Current data flow and honest disclosure

1. In demo mode, the current messaging service keeps conversations in memory and does not provide durable history.
2. If persistent messaging is enabled and configured, the client sends the message body through the authenticated repository and the server stores it in `public.messages.body`.
3. RLS and conversation-membership checks limit which authenticated members can read server-backed messages, but those controls are not E2EE.
4. The current UI must keep a clear “end-to-end encryption is not active” disclosure visible and should advise users not to send passwords, payment details, or highly sensitive information.

This plan does not change the production database, message schema, or message delivery behavior.

## Protocol and library selection gate

Do not implement cryptographic primitives or a custom messaging protocol. Before coding, compare maintained, independently reviewed protocols/libraries against all of the following:

- Browser/PWA and Android support, maintenance status, security history, and licensing.
- Authenticated key agreement and device identity.
- Forward secrecy and post-compromise recovery where supported.
- Safe device enrolment, identity-change warnings, key rotation, and device revocation.
- Offline delivery and retry semantics without replaying or corrupting messages.
- Group membership changes and rekeying.
- Backup/recovery choices that do not silently introduce a server-held plaintext key.
- Accessibility and comprehensible safety-number / identity verification UX.
- Clear upgrade and rollback strategy for existing plaintext conversations.

A candidate is not selected merely because it supports AES or exposes a low-level encryption API. The complete protocol and key lifecycle must fit the product.

## Initial protocol/library assessment (2026-10-27)

This is a preliminary engineering screen, not a security approval or a final protocol decision.

| Candidate | Evidence found | Fit and risks for Sanctuary | Current decision |
| --- | --- | --- | --- |
| Matrix protocol with `matrix-js-sdk` + Rust/WASM crypto | The Matrix JavaScript SDK documents browser/Node support and E2EE through Rust crypto WebAssembly. The Matrix ecosystem lists the JS SDK as stable and Apache-2.0. [SDK docs](https://matrix.org/ecosystem/sdks/) · [JS SDK E2EE setup](https://matrix-org.github.io/matrix-js-sdk/) | Strongest candidate to prototype for a web/PWA client; the Rust SDK also has native mobile bindings. However, Matrix means adopting Matrix identity/device/session concepts and a homeserver, and integrating Sanctuary's existing accounts, moderation/reporting, privacy expectations and UI. Server-side metadata and room configuration still need review. | **Prototype candidate only.** Validate integration, operating model, licensing, deployment, account linking and user experience before selecting. |
| Signal `libsignal` | The official repository documents Signal Protocol APIs including TypeScript, but explicitly says use outside Signal is unsupported and the repository is AGPL-3.0. [Official repository](https://github.com/signalapp/libsignal) | Attractive protocol heritage, but unsupported third-party use and license/maintenance/API risks make it a poor default for this product without legal and specialist security review. | **Do not adopt by default.** |
| Browser Web Crypto API alone | MDN documents low-level crypto primitives and explicitly warns that misuse and key-management/system-design mistakes can defeat security. [MDN SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) | Useful building block for narrow, reviewed operations; not a complete messaging protocol. It does not supply the complete device identity, ratcheting, session, group membership, recovery or verification lifecycle Sanctuary needs. | **Not a standalone E2EE solution.** |

### Recommended next engineering step

Build an isolated **Matrix-backed one-to-one prototype spike** on a separate branch/test environment, without changing the production DM path. The spike must answer:

1. Can a Sanctuary account link to a Matrix identity safely without silently exposing the user's Matrix identity or creating an account-linking takeover path?
2. Can the PWA and Android app share the expected device/key lifecycle, including encrypted local crypto storage, multiple devices, logout and device revocation?
3. What server data remains visible (participants, timing, room IDs, IP/logs, message size), and can retention be minimised?
4. How do block/mute, message requests, abuse reports, user-selected message disclosure and Sanctuary moderation interact with E2EE?
5. What are the operational, hosting, licensing, accessibility, migration and support costs compared with retaining the current DM backend?
6. Can tests prove that the server receives only ciphertext for encrypted messages and that a failed secure setup never falls back to plaintext silently?

No new cryptography package is installed and no live messaging behavior changes in this phase. The prototype must use the maintained SDK's supported E2EE APIs; no hand-rolled crypto. Security review and two-device adversarial testing remain mandatory before release.

## Delivery phases

### Phase A — Transparency and audit (current)

- Show a clear privacy status in the conversation view.
- Audit message bodies, push notifications, search, logs, crash reporting, backups, exports, and moderation/reporting paths.
- Keep the wording explicit that access controls are not E2EE.
- Record metadata retention and the minimum data required for delivery and safety.

### Phase B — Threat model and protocol decision

- Document attackers, assets, trust boundaries, recovery requirements, and operational constraints.
- Evaluate maintained protocol candidates with a security reviewer.
- Decide how identity keys, per-device keys, key changes, and recovery work before any database migration.
- Design user-facing warnings for new or unverified devices and for missing/deleted history.

### Phase C — Isolated one-to-one prototype

- Use a separate feature branch and test accounts; no production data migration.
- Generate private keys on-device and keep them out of application logs, analytics, and server requests.
- Store public key bundles and encrypted message envelopes only on the server for the prototype.
- Make the client reject plaintext fallback silently: if secure setup fails, explain the failure and do not pretend the message is encrypted.
- Use test vectors and protocol-provided APIs rather than custom primitives.

### Phase D — Adversarial testing and review

- Test two independent devices and multiple browser sessions.
- Test key mismatch, wrong recipient, tampering, replay, offline delivery, duplicate events, stale device keys, device revocation, and recovery after device loss. The device-loss recovery path must be tested explicitly before release.
- Test that removed group members cannot decrypt future group messages before group E2EE is released.
- Verify database rows, logs, notifications, analytics, backups, error reports, and exports contain no plaintext for E2EE conversations.
- Verify reporting is a deliberate user-triggered disclosure and the user can see what will be sent.
- Obtain independent security review and fix findings before release.

### Phase E — Gradual release

- Start with opt-in one-to-one E2EE for test accounts.
- Label each conversation's actual protection state; do not imply that all chats are encrypted when only some are.
- Provide device/session management, identity verification, key-change warnings, and understandable recovery choices.
- Add group E2EE only after group rekeying and membership-removal tests pass.
- Keep a documented migration/compatibility path for existing plaintext history; do not silently relabel old messages as E2EE.

## Release-blocking acceptance criteria

- [ ] Selected protocol and library reviewed and pinned.
- [ ] Private keys never leave the intended client trust boundary.
- [ ] E2EE message payloads are ciphertext before any server request.
- [ ] Server database, logs, notifications, analytics, backups, and error reporting do not contain message plaintext for E2EE conversations.
- [ ] Key identity changes are visible and cannot silently downgrade a conversation to plaintext.
- [ ] Device loss, recovery, multi-device enrolment, and revocation have documented behavior and passing tests.
- [ ] Group membership removal is tested before group E2EE is offered.
- [ ] Report/block/mute and abuse-safety workflows remain usable without covert decryption.
- [ ] Browser/PWA and Android behavior is tested on real supported clients.
- [ ] Independent security review is complete and critical/high findings are resolved.
- [ ] Product copy and status indicators match the protection actually active for that conversation.

## Browser-local cache policy

A browser-local cache is not a replacement for E2EE. If added later, it should be optional, use a defensible encryption/key-storage design, explain that clearing site data can remove history, clear sensitive state on sign-out where appropriate, and avoid treating a shared or compromised device as trusted. Do not store private keys in ordinary localStorage or persist plaintext messages there by default.

## Current implementation boundary

The current PR only improves disclosure and adds this plan plus contract checks. It does not implement encryption, alter production tables, or make a live deployment. The current message privacy status must remain “E2EE not active” until all release-blocking criteria are satisfied.
