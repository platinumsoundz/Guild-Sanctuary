# Work log — message thread async response guards

- Date: 2026-10-27
- Task: prevent late fetch/send/realtime results from one conversation being applied to another active thread.
- Branch: `fix/message-thread-async-response-guards-2026-10-27`; based on `main`.
- Changed file: `src/modules/messages/useDirectMessages.ts`.
- Implementation: track thread request generations and the active conversation; clear the active ID before opening another thread; ignore stale open/refresh/send/error/subscription callbacks; merge refresh results by message ID and sort chronologically; deduplicate realtime and send-response messages.
- Tests: no local test runner/build/browser available through this connector action. CI must validate this exact PR head; real-account test remains required.
- Provider/database: no migrations, database writes, environment changes, or deployments.
- Security: client guards prevent stale UI state but do not replace server-side RLS and authenticated membership enforcement.
- Rollback: revert the hook change.
- Follow-up: add automated hook tests for delayed A/B thread opens, refresh finishing after a switch, and send response arriving after a switch.
