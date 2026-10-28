# feat/events-map-discovery-2026-10-28

## Agent run — 2026-10-28 UTC
- Project / workstream: The Sanctuary — events geographic discovery
- Status: In progress
- Reservation: https://github.com/platinumsoundz/Guild-Sanctuary/issues/180
- Branch: feat/events-map-discovery-2026-10-28
- Canonical base: main @ eba8beafc67932f10287aa7147cee3073ea1e1ed
- Active overlap reviewed: PR #178 (Today landing/navigation); PR #179 (Cosmic Arcade/shared navigation); existing build/event-account-isolation-2026-10-27 branch. None are being edited or reused.
- Scope: events presentation only; map/pin browsing and readable map context. No database schema or provider changes.
- Design: keyless OpenStreetMap embed centered on the selected event; keyboard-accessible event selector; event cards/list remain as an accessible alternative; coordinates remain available as a technical fallback, not the primary discovery interface.
- Privacy/security: preserve existing event fetch and account-isolation service paths; do not change RLS or migration behavior.
- Tests: not run yet. Deployment/preview intentionally deferred until final release pass per owner instruction.
- Rollback: close the eventual PR or revert the isolated UI commits; no data migration is planned.
- Next: implement map discovery and responsive styling, add a source contract if repository conventions allow, inspect changes, and report exact checks.
