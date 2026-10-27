# The Sanctuary — End-to-End Encrypted Messaging Readiness Plan

**Status:** design requirements only — no end-to-end encryption is implemented by this document.  
**Owner:** product owner, with independent security review required before implementation.  
**Date:** 2026-10-27  
**Related:** `ROADMAP.md`, `MASTER_BLUEPRINT.md`, `src/modules/messages/MessagePrivacyNotice.tsx`

## Goal and honest current state

The Sanctuary should aim to make private member-to-member conversations end-to-end encrypted (E2EE), including group conversations, without overstating what the current service protects.

Today, the message UI explicitly states that messages are stored in the message database and are **not** end-to-end encrypted. Keep that notice until the released implementation has passed the acceptance gates below. HTTPS/TLS, database access controls, and E2EE protect different parts of the journey; transport encryption and row-level security do not make stored message content end-to-end encrypted.

This plan does not authorize a home-grown cryptographic protocol, production schema changes, or a claim that messages are secure against the service operator.

## Security objectives

1. Message plaintext is created and decrypted only on authorized member devices.
2. The service stores and relays ciphertext, not readable message bodies or private keys.
3. Each conversation member is cryptographically bound to the intended conversation and membership epoch.
4. Device addition, removal, key replacement, and recovery are explicit, visible events.
5. The UI communicates identity/key changes and the limits of metadata protection in understandable language.
6. A lost key has a documented recovery outcome; recovery must not silently weaken E2EE or give the server a decryption key.
7. Reporting remains possible only through an explicit member action that clearly warns the reporter that selected content will be shared with moderators.
8. Existing non-encrypted history is never silently represented as encrypted retroactively.

## Protocol and dependency decision — a gate, not a guess

Before implementation, compare maintained, independently reviewed implementations of established protocols (for example, the Signal protocol family for asynchronous conversations and Messaging Layer Security / MLS for groups). Do not implement primitives, key exchange, ratchets, group membership cryptography, or serialization from scratch.

Record the selected protocol and library only after reviewing:
- maintenance activity, security advisories, independent audits, supported platforms and browser/WebCrypto compatibility;
- licensing, dependency tree, supply-chain posture, reproducible builds where available, and a practical update policy;
- multi-device support, group membership changes, forward secrecy, post-compromise recovery, identity verification and key transparency options;
- persistence format, algorithm/version migration, interoperability tests, and ability to delete or rotate device keys;
- whether the library is production-ready for this web application rather than a research example.

If no suitable, maintained, reviewable library fits the product, keep the feature blocked and keep the current disclosure. Do not replace a missing protocol with custom cryptography.

## Threat model

### In scope

- Database reads, backups, logs, analytics, and support tooling should not reveal plaintext message bodies or private keys.
- A curious or compromised service operator should not be able to decrypt stored message content using server-held secrets alone.
- Unauthorized accounts should not be able to add themselves to a conversation, fetch keys, replay messages across conversations, or impersonate a sender.
- Stale sessions, changed devices, duplicate events, reconnects, and membership changes must not silently expose or misattribute messages.

### Not fully solved by E2EE

- A recipient can screenshot, copy, photograph, forward, or disclose plaintext.
- A compromised or unlocked endpoint can expose plaintext and keys.
- Traffic patterns, participants, timestamps, delivery state, IP addresses, and message sizes may remain visible unless separately minimized.
- E2EE does not prove a member's real-world identity.
- Moderation cannot inspect ciphertext by default. User-initiated reporting must be a deliberate, consented disclosure of selected messages and relevant context.

## Product and recovery decisions required before coding

- **Device model:** define one or multiple devices per member, device naming, device approval, revocation, and how existing sessions react when a device is added or removed.
- **Identity verification:** define how users compare/verify safety numbers or another library-supported identity fingerprint, how key changes are shown, and how suspicious changes block or pause sending.
- **Recovery:** choose and explain either unrecoverable message history without old keys, or an explicitly designed user-controlled recovery mechanism. No silent server escrow of plaintext keys.
- **Backups:** off by default until encrypted backup and recovery are separately designed and tested. Never upload unencrypted key material.
- **Group membership:** joining, leaving, removal, and role changes must rotate/advance cryptographic group state so removed members cannot decrypt future messages; document limits for old messages already received.
- **Notifications:** push/email/OS previews must not contain plaintext by default. Use generic notification text unless the member explicitly chooses a riskier preview setting.
- **Search and attachments:** perform search locally over decrypted content. Encrypt attachments client-side with fresh per-file keys; store only ciphertext and minimal required metadata.
- **Reporting:** require a preview and confirmation of exactly what plaintext/context will be shared; record the report action without retaining unrelated plaintext.
- **Legacy history:** clearly mark pre-E2EE messages as unencrypted. Do not re-label old database rows as encrypted.

## Proposed implementation slices

1. **Protocol decision record:** independent security reviewer approves protocol/library, threat model, key lifecycle, recovery and dependency audit.
2. **Cryptographic test harness:** known-answer tests, interoperability vectors from the selected library, malformed ciphertext, replay, nonce/sequence handling, wrong-conversation, wrong-device, membership-change and key-rotation tests.
3. **Device identity and key registry:** authenticated registration, public-key verification, device revocation, key versioning and strict RLS. The server must never receive private keys.
4. **Ciphertext-only transport/storage:** introduce versioned encrypted payload fields and migration compatibility. Do not silently fall back to plaintext when encryption fails; fail closed for E2EE-enabled conversations.
5. **One-to-one pilot:** opt-in test cohort, clear per-conversation encryption state, identity/key-change UX, safe generic notifications and explicit recovery warnings.
6. **Group support:** only after membership-change and forward-secrecy tests pass for the selected protocol.
7. **Attachments, reporting, backup and migration:** separate reviewed slices; no hidden plaintext fallback.
8. **Release gate:** independent cryptography/security review, staging tests on real devices/browsers, recovery drill, accessibility review, documented incident response and owner approval.

## Acceptance criteria

- Automated tests demonstrate that server payloads contain ciphertext and no message plaintext or private keys.
- Cross-conversation ciphertext replay, removed-member future decryption, unauthorized device registration, identity-key changes, and malformed payloads fail closed.
- Key generation, storage, rotation, revocation, loss, recovery and device migration have tested outcomes.
- Notifications, logs, analytics, crash reports, backups and moderation flows are inspected for accidental plaintext.
- Browser/device compatibility and performance are measured on supported targets.
- A reviewer who did not implement the cryptography signs off on the exact commit and dependencies.
- UI wording matches the verified protection level for each conversation and legacy message.
- Rollback does not silently send plaintext to a conversation presented as encrypted. If encryption cannot be maintained, pause sending and explain the issue.

## Rollback and operational rule

A release can be disabled only in a way that preserves the truth of the encryption label. Do not transparently downgrade an encrypted conversation to plaintext. If a critical key or protocol problem is detected, stop sending in affected conversations, preserve ciphertext for investigation, notify affected members through a reviewed incident plan, and require explicit member action before any fallback path.

## Current status

**Blocked before cryptographic implementation:** protocol/library selection, independent security review, device/recovery decisions, and staging/device test setup are not yet evidenced. The current message privacy notice is intentional and must remain visible until the release gates pass.
