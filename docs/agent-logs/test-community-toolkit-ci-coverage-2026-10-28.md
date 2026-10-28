# Work log — test/community-toolkit-ci-coverage-2026-10-28

- **Base:** `main` at `0b05cdbd2216d329491167d8c20a4e6f6b7c3f3e`.
- **Scope:** bounded CI wiring for existing community-post toolkit checks. No runtime feature changes.
- **Overlap check:** inspected the current `package.json`, `.github/workflows/ci.yml`, existing `check-community-connection-toolkit.mjs`, `test-community-connection.mjs`, and roadmap. Both checks already existed but were not run by the main CI workflow. This branch only wires them into package scripts/CI and documents coverage; it does not overlap with the separate connection-discovery feature PR's service/schema changes.
- **Changed files:**
  - `package.json`: add `check:community-toolkit` and `test:community-connection`.
  - `.github/workflows/ci.yml`: run both checks before typecheck/build.
  - `docs/COMMUNITY_TOOLKIT_CI_COVERAGE_2026-10-28.md`: coverage and limitations.
- **Tests:** pending CI on this exact head. The static contract verifies guided post modes, required fields, limits, accessibility hooks, responsive styling, and no added storage/external-request path. The pure helper test covers open posts, media-only posts, both guided modes, inactive fields, and content limits.
- **Security/privacy:** no data, RLS, migration, credentials, or provider configuration changed. Staging publishing and cross-account privacy checks remain outside this static/runtime helper test.
- **Migrations/config:** no database migrations or deployment settings changed.
- **Deployment:** pull-request Cloudflare workflow is build-only; no production deployment requested.
- **Rollback:** revert the two package script entries, two CI steps, and this documentation/log if the new check is incompatible with the runner.
- **Next step:** confirm both new commands pass in CI; fix any runner compatibility issue before marking the PR ready.
