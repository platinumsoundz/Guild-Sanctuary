# Persistent messaging schema repair runbook

## Why this exists

The connected Supabase project reports the baseline social migrations in its migration ledger, but a read-only catalog check found none of these public tables:

- `conversations`
- `conversation_members`
- `direct_conversation_pairs`
- `messages`

The application already has a typed repository and RPC contract for these objects. This migration restores the missing tables, member-only RLS policies, a guarded conversation-creation RPC, and Realtime publication membership when the schema is absent.

## Safety gate

**Do not apply this migration directly to production just because it passes source CI.** The live migration ledger differs from the repository and some production schema objects are not represented by the current migration files.

Before applying anywhere:

1. Confirm the project ref and environment are correct.
2. Take/verify a database backup and capture current table, function, trigger, policy and publication inventories.
3. Confirm the four messaging tables are either all absent or all present. The migration intentionally aborts if only some are present.
4. Apply to a disposable or approved staging environment first.
5. Inspect the resulting policies and function grants. Confirm a non-member cannot read a conversation or its messages.
6. With two verified test accounts, create a direct conversation and a group conversation, send messages in both directions, reload inbox/thread state, and verify Realtime delivery.
7. Verify a member with direct messages disabled cannot be added; verify guest access is denied; verify group limits and invalid payloads are rejected.
8. Keep `NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES=false` until all checks pass and the production migration plan is explicitly reviewed.

## Expected application contract

- `create_sanctuary_conversation(requested_kind, requested_member_ids, requested_name)` returns a conversation UUID.
- Direct conversations are unique per unordered participant pair.
- Only active conversation members can select conversation metadata, membership and visible messages.
- Inserts require the authenticated sender to match `auth.uid()` and be an active conversation member.
- Message bodies are limited to 2,000 characters; groups are limited to 3–50 members.
- Realtime publication adds `messages` and `conversations` only if they are not already published.

## Not covered

This repair does not implement read receipts, unread counts, message retention, attachment uploads, or a moderation UI. It does not change user accounts or migrate any message history. If old message data exists outside these missing tables, stop and design a separate reviewed data-recovery plan.
