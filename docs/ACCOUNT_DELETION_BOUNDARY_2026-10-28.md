# Account deletion boundary — 2026-10-28

## Current behavior

- When Supabase Auth is configured, SettingsHub deliberately does not expose the local demo-account deletion form. It tells the user server-account deletion is not available in this screen and that no account data is deleted there.
- When Supabase Auth is not configured, the demo flow requires a matching account email and the exact `DELETE` phrase, then removes the local demo account, account preferences, and local demo content in the feed, events, conversations, and short-video modules.
- The local demo flow is not a secure server-account deletion mechanism. Its two-factor check uses the prototype's local demo code, not a production authentication challenge.

## Future server-account deletion requirements

Do not wire the demo deletion function to a Supabase-authenticated account. A real implementation must be a server-authorized operation with fresh authentication (and verified MFA where enabled), confirmation scoped to the authenticated user, and an auditable/idempotent deletion workflow. It must enumerate and remove or appropriately anonymize the account's profile, posts/comments, event ownership and RSVPs, messages under the product's retention rules, media/storage objects, notifications, relationship records, private reflections/planner/habits, settings, token ledger (retaining legally/financially required records), and auth identity. It must distinguish data deletion from legally required retention and explain any delayed deletion.

Before release, add integration tests proving: user A cannot delete user B; stale/expired sessions fail; MFA is actually verified server-side; retries are safe; partial failures are observable and recoverable; storage objects and database rows are handled; the auth identity is removed only after dependent cleanup is committed; and deletion completion is not reported before the server confirms it. Reconcile all affected tables, storage buckets, triggers, RLS policies, and provider retention obligations against the actual Supabase project.

## Regression contract

`npm run check:account-deletion` checks the current code boundary and UI warnings. This is a static source contract only; it is not a deletion integration test and does not prove data has been erased from any live system.
