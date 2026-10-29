# Community connection toolkit verification — 2026-10-28

The repository already contains two checks for the guided community-post composer, but they were not wired into the main CI workflow:

- `scripts/check-community-connection-toolkit.mjs` verifies the guided modes, required-field copy, character limits, accessibility labels, responsive styling, and that this composer does not add its own local-storage or external-request path.
- `scripts/test-community-connection.mjs` exercises the pure `buildCommunityPost` helper for open posts, media-only posts, life lessons, conversation starters, inactive-field validation, and character limits.

This change exposes both through package scripts and runs them in CI. It is a regression-coverage improvement; it does not change feed runtime behaviour or claim browser/device QA. The static contract and pure helper tests do not validate publishing against the live Supabase schema, media upload flows, or multi-account privacy/RLS. Those still need authenticated staging checks.
