# Work log — inbox account and request lifecycle

- Date: 2026-10-27
- Branch: `fix/messages-inbox-account-and-request-lifecycle-2026-10-27`, based on `main`.
- Scope: inbox conversation refresh, member search, and group creation lifecycle.
- Changes:
  - Use monotonically increasing request IDs to ignore out-of-order inbox loads and member searches.
  - Reset inbox, search results, selected group members, and form state on account changes.
  - Invalidate outstanding work on effect cleanup/account transition.
  - Filter the current account from member-search results.
  - Prevent duplicate group submissions and suppress stale create results from navigating an account that is no longer active.
  - Extend the messaging static contract script with checks for these behaviors.
- Validation: static contract assertions added; no local runtime/test runner is available through this connector. CI must run on the PR head. Static source checks are not substitutes for delayed-promise component tests.
- No production database, provider account, environment variable, or deployment changes were made.
- Follow-up: add component tests with controlled promises for out-of-order search, account switching during inbox refresh, and group creation finishing after sign-out.
