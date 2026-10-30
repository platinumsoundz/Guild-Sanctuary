# Inbox badges and update-awareness standard

All inbox-style destinations in The Sanctuary and The Guild must use the shared navigation badge contract in `src/lib/navigationBadges.ts`.

## Required behaviour for new or upgraded inboxes

1. Add the count query to `fetchNavigationBadgeCounts`; do not add isolated count-query logic to an individual navigation component.
2. Scope every count to the active `WorldType` (`sanctuary` or `guild`) and the authenticated account wherever the underlying data is personal.
3. Apply the same role/permission gate as the destination itself. Never expose privileged queue counts to unauthorised roles.
4. Run each destination count independently. A missing table, unavailable RPC, or query failure must not suppress other badges or block navigation.
5. Return zero when a successful query has no pending items. If a query fails, omit that badge rather than presenting a misleading zero.
6. Keep refresh lightweight: refresh on window focus and at the existing 30-second visible-page interval. Avoid unbounded polling or duplicate subscriptions.
7. Render badges in both Sanctuary navigation (`Navigation.tsx`) and Guild console navigation (`GuildNavigation.tsx`) where that destination exists. Reuse the shared count map and matching visual treatment.
8. Keep the notification panel's own unread count consistent with the same world/account scope.

## Current badge coverage

- Notifications: unread personal notifications.
- Messages: unread incoming visible messages, when persistent messaging is enabled.
- Moderation: open/reviewing reports, only for moderator/admin/developer/owner.
- Feedback: open/in-review feedback, only for developer/owner; also surfaced on Admin because the Admin dashboard contains the feedback inbox.

## Release checklist

- Confirm each query against the deployed Supabase schema and RLS policies.
- Verify Guild and Sanctuary counts independently using accounts with the relevant roles.
- Verify guest and basic-user navigation does not reveal privileged queue counts.
- Verify a failing count query does not hide another destination's valid badge.
- Run the consolidated build/test pass after deployment credentials/rate limits permit it.
