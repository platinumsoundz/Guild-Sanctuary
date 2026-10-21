# Messages

Owns community-wide direct and group conversation threads, message history, conversation discovery, and message composition. Group chats require a name and at least two additional selected public members. Conversations and messages are shared across The Sanctuary; there are no world-specific stores.

These mock checks are not authorization boundaries. Production messaging needs server-side participant authorization on every read/write, persistent storage, abuse controls, rate limits, moderation/reporting paths, retention policy, and transport/storage encryption decisions.

`supabaseRepository.ts` contains an optional Supabase/PostgreSQL adapter for direct/group conversation creation, durable message writes, and per-conversation INSERT subscriptions. The active inbox and thread still use the in-memory `service.ts`; do not treat the adapter as active until Supabase Auth is connected and the migration/RLS/Realtime integration tests pass.

End-to-end encryption is not implemented. The intended direction is a maintained Signal-protocol implementation, not custom cryptography; encrypted messaging must remain unavailable until device/key provisioning, key rotation on group membership changes, multi-device recovery, backup behavior, and user-reported evidence workflows have been validated. Database/TLS encryption alone is not E2EE.
