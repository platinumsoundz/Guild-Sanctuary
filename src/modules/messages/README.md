# Messages

Owns community-wide direct and group conversation threads, message history, conversation discovery, and message composition. Group chats require a name and at least two additional selected public members. Conversations and messages are shared across The Sanctuary; there are no world-specific stores.

When Supabase is configured, `service.ts` delegates to `supabaseRepository.ts`:

- `create_sanctuary_conversation` creates or reuses a direct conversation transactionally.
- Conversations and messages are durable Postgres rows protected by RLS.
- `useDirectMessages` subscribes to Realtime INSERT events for the open conversation and de-duplicates messages.
- Realtime recovery: after `SUBSCRIBED`, on browser `online`, and when the tab becomes visible again, the hook fetches messages newer than the last persisted message and merges them. This closes gaps missed while the socket was down or the tab was suspended.
- Sends are optimistic: the message appears immediately with a temporary ID and a “Sending…” state, then is replaced by the persisted row. A failed send removes the temporary row and restores the error.
- The thread scrolls to the newest message on open and follows new messages when the reader is already near the bottom.
- The in-memory store remains a development fallback when Supabase is absent.

These UI checks are not authorization boundaries. Production messaging still needs abuse controls, rate limits, moderation/reporting paths, retention policy, and operational monitoring. Realtime must be enabled for `messages` and tested with RLS.

End-to-end encryption is not implemented. The intended direction is a maintained Signal-protocol implementation, not custom cryptography; encrypted messaging must remain unavailable until device/key provisioning, key rotation on group membership changes, multi-device recovery, backup behavior, and user-reported evidence workflows have been validated. Database/TLS encryption alone is not E2EE.
