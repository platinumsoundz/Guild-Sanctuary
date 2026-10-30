# Messages

Owns direct and group conversation threads, message history, conversation discovery, and message composition. Guild and Sanctuary use the same Supabase messaging engine, but every conversation is scoped to its own `world_type`; Guild messages must never appear in Sanctuary and vice versa.

## Persistence and live updates

The active inbox and thread route through `service.ts`. When Supabase URL/key are configured and `NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES=true`, authenticated sessions use `supabaseRepository.ts` for durable PostgreSQL tables, authenticated conversation-creation RPCs, message writes, and per-conversation Realtime subscriptions. If the flag is absent, local/demo sessions use an in-memory store; those messages are device-session-only and must not be represented as durable or shared.

Realtime is the fast path. The active thread refreshes periodically while visible and when the tab becomes visible again to recover missed events after mobile sleep or network changes. Inbox refresh is a recovery path for conversations created elsewhere. These fallbacks do not replace authentication, database authorization, or two-account integration tests.

## Read receipts

One-to-one conversations support server-timestamped read receipts. The authenticated recipient calls `mark_direct_messages_read`; the database derives the reader from `auth.uid()`, checks active conversation membership and the environment scope, and stamps unread incoming messages with database time. The client cannot choose another reader or write arbitrary receipt timestamps.

Group chats intentionally do not show read receipts yet because the current `messages.read_at` column represents one timestamp, not a per-member receipt map. A future group receipt feature must use a separate member-scoped model rather than overloading this field.

## Security and scope

The live project must retain member-scoped RLS on conversations, memberships, and messages; authenticated-only writes; the scoped conversation-creation RPC; and the messages table in the Supabase Realtime publication. Guild and Sanctuary are isolated by the conversation's `world_type`.

The product direction is **Supabase-first messaging**: Supabase Auth for identity, Postgres for messages and conversation state, and Supabase Realtime for updates. Do not add peer-to-peer/WebRTC calling, a separate messaging server, or another database as part of the messaging roadmap. Attachments should use the existing private Supabase Storage bucket after member-scoped storage policies are implemented. Voice notes and short video clips are stored media, not live calls. Live calls are a separate, later decision and are not required for reliable messaging.

End-to-end encryption is not implemented. Messages are not currently end-to-end encrypted; do not describe them as such. Database/TLS encryption is not E2EE. The product must keep the privacy notice accurate and provide clear reporting/moderation paths and retention rules.

## Release verification

CI contract checks cover the repository and migration shape, but do not prove a real two-account send/receive flow. Before release, test two real accounts, both Guild and Sanctuary scope, refresh/reconnect, account switching, direct-message preferences, read receipts, group membership, and unauthorized reads/writes. Apply new migrations through the approved Supabase migration workflow and verify them against the connected project before claiming they are live.
