# Sanctuary messaging privacy and E2EE implementation contract

> **Product decision — 30 October 2026: PARKED / HISTORICAL RESEARCH.** The current approved direction is Supabase-backed messaging with authenticated access controls and Realtime delivery. E2EE is not part of the active roadmap and must not be implemented, promised, or represented as planned unless the owner explicitly reopens that decision. These notes are retained only as historical security research. Message bodies remain readable by the service and are not end-to-end encrypted.

**Status:** design contract only; not a claim that messaging is persistent or end-to-end encrypted.  
**Date:** 2026-10-27  
**Scope:** define a safe implementation sequence before adding database tables, realtime delivery, or cryptographic code.

## Product promises

- Until the end-to-end encryption protocol is implemented and independently reviewed, describe messaging as private messaging with transport security and access controls, not E2EE.
- Do not persist plaintext message bodies in server tables, logs, analytics, crash reports, moderation events, or notification payloads once E2EE is enabled.
- E2EE is opt-in only if product UX makes the limitations explicit; otherwise launch only after key recovery, multi-device, and abuse-reporting behaviour is designed.
- Never infer or expose self-discovery answers, reflections, journal entries, or sensitive profile traits to other members, guilds, moderators, or analytics.

## Recommended architecture

### 1. Identity and device keys

- Each authenticated account has one or more registered devices.
- Generate private encryption keys on the client using a vetted platform/library implementation; private key material must never be sent to Supabase or application servers.
- Store public identity/pre-key material server-side with version, device identifier, created/revoked timestamps, and key transparency/audit events.
- Support device revocation and a clear lost-device/recovery story before claiming multi-device support.
- Do not invent a bespoke cryptographic protocol. Select a well-reviewed protocol/library and commission independent review before production use.

### 2. Message envelope

Store only a versioned envelope and routing metadata required for delivery:
- conversation ID, sender user/device ID, client-generated message ID, ciphertext, nonce/header fields required by the chosen protocol, protocol version, created/expiry timestamps, and delivery/read receipts if enabled.
- No plaintext body, plaintext preview, attachment content key, or unencrypted sensitive title in database rows.
- Use client-generated stable IDs and a unique constraint to make retries idempotent.
- Keep envelope fields minimal; metadata such as who contacted whom and when is still sensitive even if bodies are encrypted.

### 3. Authorization and data access

- RLS must require active membership in the conversation for reads and writes; users cannot add themselves to a conversation by forging a client-supplied conversation ID.
- Server-side membership changes and device revocation use narrow, audited operations with least-privilege grants.
- Do not use broad service-role access from client code. Service credentials stay server-side.
- Blocked users cannot initiate new conversations or send messages where policy says the block applies; define existing-history behaviour explicitly.
- Moderators should receive report metadata and only the user-selected message plaintext that a reporter explicitly chooses to disclose. E2EE means routine server-side content inspection is not possible.

### 4. Attachments, search, and notifications

- Encrypt attachment bytes on-device with a fresh content key; upload ciphertext only; share content keys inside encrypted message payloads.
- Never create server-side plaintext search indexes. If search is offered, implement it locally over decrypted messages.
- Push notifications should say only that a new message exists by default; previews are a separate explicit privacy preference and must not undermine the E2EE promise.
- Signed/expiring media URLs must not expose decrypted content or reusable encryption keys.

### 5. Abuse handling and retention

- Provide block, mute, report, and rate-limit paths before opening messaging broadly.
- A report flow should let the member select specific messages and knowingly submit their decrypted content for moderation. Explain that submitting a report discloses selected content.
- Define deletion, disappearing messages, legal retention exceptions, backup behaviour, and recipient copies before presenting deletion as guaranteed.
- Avoid a claim that E2EE prevents screenshots, recipient exports, compromised devices, or metadata access.

## Delivery sequence and acceptance criteria

1. **Inventory current UI and schema**: identify mock/in-memory paths, existing tables, policies, realtime subscriptions, and notification code. Do not create overlapping tables before this inventory.
2. **Threat model and protocol decision**: document attackers, device loss, account recovery, multi-device, key rotation, group membership changes, abuse reports, and metadata risks.
3. **Schema and RLS proposal**: migrations for conversations, membership, device keys, encrypted envelopes, receipts, and reports must be reviewed against the actual live migration ledger and an isolated staging project.
4. **Persistence before E2EE claim**: verify authenticated member-only reads/writes, idempotent sends, retries, pagination, blocking, reporting, and no cross-user access with automated tests.
5. **Cryptographic integration**: use an established protocol/library; test identity verification, forward secrecy where supported, key rotation, device removal, group membership changes, and malicious/replayed envelopes.
6. **Independent security review**: no production E2EE launch until review findings are resolved and a recovery playbook exists.

Required tests:
- Member A cannot read/write Member B's conversation or guess its ID.
- Revoked or blocked device/user cannot send new messages under the stated policy.
- Duplicate client message ID cannot create duplicate messages.
- Replayed/malformed envelopes fail safely.
- Logs, errors, telemetry, and push payloads contain no plaintext or key material.
- Reporting discloses only messages explicitly selected by the reporting member.
- Key loss and device revocation produce the documented user experience.
- Database policy tests run against isolated staging; production migrations are not applied as part of design work.

## Explicit non-goals for the first persistence slice

- Do not build custom cryptography.
- Do not silently migrate existing in-memory messages into a server database.
- Do not claim server-side moderation can inspect E2EE content.
- Do not store self-discovery results or journal content in messaging tables.
- Do not enable broad production access or change production RLS without a reviewed migration plan.

## Owner handoff

Before staging implementation, the owner must identify a dedicated disposable/staging Supabase project and confirm the backup/restore path. The project currently known to be active is not automatically a safe migration sandbox; the inactive project is not automatically staging either.
