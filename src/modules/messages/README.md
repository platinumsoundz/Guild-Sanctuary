# Messages

Owns private direct and group conversation threads, message history, conversation discovery, and message composition. Group chats require a name and at least two additional selected public members. The current adapter stores conversations/messages in memory and checks that the acting user is a conversation participant.

These mock checks are not authorization boundaries. Production messaging needs server-side participant authorization on every read/write, persistent storage, abuse controls, rate limits, moderation/reporting paths, retention policy, and transport/storage encryption decisions.