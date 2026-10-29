# Messages

Owns community-wide direct and group conversation threads, message history, conversation discovery, and message composition. Group chats require a name and at least two additional selected public members. Conversations and messages are shared across The Sanctuary; there are no world-specific stores.

## Persistence and live updates

The active inbox and thread route through `service.ts`. When Supabase URL/key are configured and `NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES=true`, authenticated sessions use `supabaseRepository.ts` for the durable PostgreSQL tables, authenticated conversation-creation RPC, message writes, and per-conversation Realtime INSERT subscription. If that feature flag is absent, local/demo sessions use an in-memory store; those demo messages are device-session-only and must not be represented as durable or shared.

Realtime is the fast path. The active thread also refreshes every 15 seconds while visible (and when the tab becomes visible again), and the inbox refreshes every 30 seconds. These are recovery paths for missed events or mobile sleep; they do not replace authentication, database authorization, or integration tests.

The live project must retain member-scoped RLS on conversations, memberships, and messages; authenticated-only writes; the `create_sanctuary_conversation` RPC; and the messages table in the Supabase Realtime publication. The repository includes contract checks for the migration and adapter, but CI does not prove a real two-account send/receive flow. Release verification must still test two real accounts, refresh/reconnect, account switching, DM privacy, group membership, and unauthorized reads/writes.

## Encryption and safety

End-to-end encryption is not implemented. The intended direction is a maintained Signal-protocol implementation, not custom cryptography; encrypted messaging must remain unavailable until device/key provisioning, key rotation on group membership changes, multi-device recovery, backup behavior, and user-reported evidence workflows have been validated. Database/TLS encryption alone is not E2EE. Production messaging also requires abuse controls, rate limits, moderation/reporting paths, and a retention policy.
