# E2EE Protocol Assessment — Initial Engineering Screen

**Date:** 2026-10-27  
**Status:** Preliminary research only. No protocol has been approved, no cryptography dependency has been installed, and no messaging behavior has changed.

## Decision summary

The leading candidate for an isolated proof of concept is the **Matrix protocol with the Matrix JavaScript SDK and its Rust/WASM cryptography implementation**. This is a candidate to test, not a final adoption decision. It has a maintained browser-capable SDK with documented E2EE support and a native Rust SDK path, but adopting Matrix changes the messaging architecture and creates account-linking, hosting, metadata, moderation, and support questions that must be answered first.

Do not implement a home-grown encryption protocol. Do not use browser Web Crypto primitives alone as if they were a complete E2EE system.

## Candidate comparison

| Candidate | Verified source facts | Benefits | Risks / unknowns | Decision |
| --- | --- | --- | --- | --- |
| Matrix + `matrix-js-sdk` / Rust crypto | The official SDK documentation says it runs in browsers and Node.js and implements E2EE through WebAssembly bindings of the Rust crypto library. The Matrix ecosystem lists the JS SDK as stable and Apache-2.0. [Matrix SDK ecosystem](https://matrix.org/ecosystem/sdks/) · [JS SDK documentation](https://matrix-org.github.io/matrix-js-sdk/) | Existing protocol and maintained SDK; browser/PWA path and native Rust SDK ecosystem; avoids inventing key agreement, device identity and ratcheting ourselves. | Needs a Matrix homeserver or compatible service; Matrix user/device identities, room model, account linking, push notifications, moderation/reporting, hosting and retention need a product/security review. Server metadata is not automatically hidden. Integration with Sanctuary auth and existing DMs is non-trivial. | **Prototype candidate.** Validate in an isolated environment before choosing. |
| Signal `libsignal` | Official repository describes Signal Protocol APIs including TypeScript, but explicitly says use outside Signal is unsupported; repository license is AGPL-3.0. [Official repository](https://github.com/signalapp/libsignal) | Strong protocol pedigree and modern cryptographic design. | Third-party use is explicitly unsupported; licensing and API/maintenance risks need specialist legal/security review. | **Not the default candidate.** |
| Browser Web Crypto API | MDN documents low-level primitives and warns that misuse and key-management/system-design errors can make security ineffective. [MDN SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) | Useful for narrow cryptographic operations when designed and reviewed appropriately. | Does not by itself provide a complete messaging protocol, identity verification, ratcheting, device lifecycle, group membership, recovery or abuse-reporting design. | **Not a standalone E2EE solution.** |

## Prototype questions to answer

A separate branch and isolated test environment should prove the following before any production migration is proposed:

1. **Account linking:** Can a Sanctuary account link to a Matrix identity without account-takeover paths or unexpectedly exposing a Matrix username?
2. **Device lifecycle:** How are device keys created, verified, stored, backed up, rotated, revoked and recovered? What happens when a user loses their device?
3. **PWA and Android:** Can browser/PWA and Android clients share a comprehensible multi-device model? What is the supported crypto-store behavior and what happens on logout or shared devices?
4. **Server visibility:** Which metadata remains visible to the server (participants, timing, room identifiers, IP/log data, approximate message size), and what retention is necessary?
5. **Safety and moderation:** How do blocks, mutes, message requests, rate limits, user-selected message reports and safety escalations work without covert plaintext scanning?
6. **Attachments and notifications:** Are attachments encrypted before upload? Do push notifications avoid leaking plaintext? Are previews, analytics, crash reports, backups and exports free of message bodies?
7. **Migration:** How are existing plaintext messages clearly distinguished from encrypted conversations? No automatic claim that old messages have become encrypted.
8. **Failure behavior:** If crypto initialization or recipient-device verification fails, sending must fail closed with a clear explanation; there must be no silent plaintext fallback.
9. **Security testing:** Test ciphertext-only server rows, wrong-recipient delivery, tampering, replay, duplicate events, offline delivery, device revocation, key changes, account recovery and two-device interoperability. Arrange independent security review before launch.

## Guardrails

- No private key is uploaded to Sanctuary servers.
- No server-side plaintext fallback under an E2EE label.
- E2EE does not prevent recipients from copying messages or protect plaintext on compromised/unlocked devices.
- Minimise metadata and document what the service still sees.
- Group messaging is a later phase, after member removal and key rotation are tested.
- Message reporting is a deliberate action by the user that discloses selected content/context.
- Do not advertise E2EE until the actual protocol, all delivery paths, storage, notifications, attachments, recovery and adversarial tests pass review.

## Sources reviewed

- [Matrix.org SDK ecosystem](https://matrix.org/ecosystem/sdks/)
- [Matrix JavaScript SDK documentation and E2EE initialization](https://matrix-org.github.io/matrix-js-sdk/)
- [Signal libsignal official repository and license](https://github.com/signalapp/libsignal)
- [MDN SubtleCrypto security guidance](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
