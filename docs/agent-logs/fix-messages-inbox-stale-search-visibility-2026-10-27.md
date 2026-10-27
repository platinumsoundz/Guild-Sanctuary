# Work log — prevent stale member-search results being shown

- Date: 2026-10-27
- Branch: `fix/messages-inbox-stale-search-visibility-2026-10-27`, stacked on PR #114.
- Change: clear displayed search results and the prior error as soon as a new query is entered, before its asynchronous result returns. Existing request IDs still ensure only the latest query can populate results.
- Why: request guards prevent stale responses from winning, but without clearing the prior list, people could still see old matches while a new search is in flight.
- Privacy/safety: UI state only; no data model, permissions, persistence, or provider configuration changed.
- Verification: added a static contract assertion. CI has not yet been observed for this branch.
- Integration: review/merge after PR #114 because this branch is stacked on its changes.
