# Messaging privacy and end-to-end encryption plan

**Status:** design and acceptance criteria only. End-to-end encryption (E2EE) is not implemented. No production database or deployment changes are authorised by this document.

## What the app must say today

- Do not describe current messages as end-to-end encrypted.
- The active inbox/thread currently calls the in-memory messaging service. A Supabase/PostgreSQL repository and schema exist, but are optional and must not be described as the active durable path until configuration, migration state, row-level security (RLS), Realtime behavior, and two-account integration tests are verified.
- If a server-backed plaintext message path is enabled, authorised service/database operators may be technically able to read message content. TLS and database-at-rest encryption do not provide E2EE.
- Browser-local storage is not a security upgrade by itself: it can expose data on shared/unlocked devices, is vulnerable to same-origin script compromise, may be cleared, and does not solve multi-device sync or recovery. It can be an optional cache only after a threat model and device-locking safeguards.
- Avoid storing message bodies in logs, analytics, error reports, notifications, or debug traces.

## Target design

### Phase 0 — Truthful baseline (before durable messaging release)
1. Keep a persistent, visible “E2EE is not active” notice.
2. Explain whether the environment is demo/in-memory or server-backed, without implying a storage path that has not been verified.
3. Verify Supabase Auth identity binding, participant-only RLS on every read/write, server-side sender identity, direct-message preferences, group membership, rate limits, block/report flows, retention/deletion behavior, and Realtime channel authorization.
4. Keep secrets and sensitive content out of logs and push-notification previews by default.
5. Do not enable durable messaging in production until staging passes two-account and adversarial RLS tests.

### Phase 1 — Protocol and threat-model decision
1. Define supported clients (web/PWA first; native Android later), attacker model, device loss, account recovery, group membership changes, abuse reports, metadata retention, and legal/safety requirements.
2. Evaluate a maintained, audited Signal-protocol implementation or another credible, independently reviewed protocol that supports the actual client platforms. No home-grown cryptography and no custom “encrypt this string” scheme.
3. Document what remains visible to the service: account IDs, participants, timestamps, delivery/read receipts, approximate message sizes, IP/device/session metadata, reports, and group membership unless specifically designed otherwise.
4. Make a security review a release blocker. Do not market the feature as “zero footprint”; encryption reduces content exposure but cannot eliminate metadata or recipient-device risk.

### Phase 2 — Device identity and key lifecycle
1. Generate private identity keys on the client using a maintained cryptographic library and secure platform primitives where available.
2. Keep private keys off the application server. Store them using appropriate platform-protected storage; browser persistence must be explicit, documented, and protected against casual shared-device access.
3. Establish identity verification and key-change warnings; define how multiple devices register, revoke, and recover.
4. Define recovery honestly: account-password reset must not silently decrypt old messages. If encrypted backups or recovery keys are offered, explain the trade-offs and make them explicit opt-ins.
5. For groups, define sender-key rotation and remove-member behavior so former members cannot decrypt future messages.

### Phase 3 — Ciphertext-only delivery
1. Server APIs accept and return protocol envelopes/ciphertext plus the minimum routing metadata, never plaintext message bodies.
2. Ensure previews, search, attachments, edits, reactions, read receipts, typing indicators, and notifications do not leak plaintext unintentionally. Local search can be device-side.
3. Authenticate envelopes, prevent replay/tampering, and define delivery/ordering semantics.
4. Test cross-device delivery, reconnects, out-of-order messages, key changes, revoked devices, group member removal, and migration/fallback behavior.
5. Keep the existing plaintext path visibly separate during rollout; never silently mix encrypted and unencrypted threads.

### Phase 4 — Safety, abuse reporting and release
1. E2EE must not remove blocking, rate limits, spam controls, user-controlled reporting, or account-level moderation.
2. Reporting must be user initiated and explicit: the user chooses which messages and context to submit; the app explains that reported content is disclosed to the moderation team. Never create a hidden decryption backdoor for moderators.
3. Provide a visible per-conversation encryption state and verified device/key status.
4. Complete independent protocol/design review, dependency audit, security testing, accessibility checks, and a staged rollout with a rollback plan.
5. Publish an accurate privacy explanation and incident-response process before calling the feature E2EE.

## Release acceptance checklist

- [ ] Security design reviewed by an experienced cryptography/security reviewer.
- [ ] No private keys or plaintext message bodies sent to server APIs, logs, analytics, crash reports, or notification payloads.
- [ ] Two-account RLS and Realtime isolation tests pass; unauthorised reads, inserts, updates, and subscription joins fail.
- [ ] Key verification, device addition/removal, lost-device, password-reset, recovery, and group-removal tests pass.
- [ ] Ciphertext tampering/replay, delivery retry, offline, reconnect, and out-of-order cases pass.
- [ ] Reporting is explicit and user initiated; block and rate-limit controls remain effective.
- [ ] Encryption state is visible and never inferred from a successful send.
- [ ] Web/PWA and Android behavior reviewed separately.
- [ ] Privacy copy, retention, deletion, backup and metadata disclosures reviewed.
- [ ] No public “E2EE” claim until all required checks and independent review are complete.

## Related existing code

- `src/modules/messages/DirectMessageThread.tsx` — user-visible privacy notice.
- `src/modules/messages/service.ts` — active in-memory service selection and Supabase session gating.
- `src/modules/messages/supabaseRepository.ts` — optional durable adapter.
- `supabase/migrations/20261027001557_restore_secure_persistent_messaging.sql` — schema/RLS migration draft; not proof that production has the schema or that E2EE exists.
