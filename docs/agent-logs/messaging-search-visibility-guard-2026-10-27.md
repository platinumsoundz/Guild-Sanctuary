# Work log — stale member search visibility

- Date: 2026-10-27
- Branch: `fix/messages-inbox-stale-search-visibility-2026-10-27`, stacked on PR #114.
- Change: clear displayed member-search results and previous errors immediately when a new query is entered. Existing request IDs ensure only the latest asynchronous query can populate the results.
- Rationale: old matches should not remain visible while a different query is in flight.
- Safety: UI state only; no persistence, permissions, or provider settings changed.
- Validation: static contract assertion added; CI pending.
