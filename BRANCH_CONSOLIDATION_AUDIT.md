# Branch Consolidation Audit — 2026-10-26

This is a repository hygiene report, not approval to merge production changes or apply database migrations.

## Canonical working branches

| Workstream | Canonical branch / PR | Decision |
| --- | --- | --- |
| Dual-host setup and Cloudflare deploy guard | `feature/domain-database-improvements` / [PR #13](https://github.com/platinumsoundz/Guild-Sanctuary/pull/13) | Keep as the deployment-safety candidate. CI, typecheck/build and the guarded Cloudflare workflow passed on the checked head. Keep draft until the auth, Supabase and deployment gates in the launch checklist are satisfied. |
| Scheduled health checks | `automation/scheduled-health-check-clean` / [PR #14](https://github.com/platinumsoundz/Guild-Sanctuary/pull/14) | Clean extraction from current `main`; one workflow file only. Latest observed checks passed. Draft is retained pending review. |
| Notification bar | `feature/notifications-bar-clean` / [PR #15](https://github.com/platinumsoundz/Guild-Sanctuary/pull/15) | Clean extraction from current `main`: UI, layout mount, settings Instagram field, and notification migration. CI was still running at audit time. Migration is committed only; do not apply to a live database without review. |
| Games Hub / Token Shop | `feature/notifications-bar-and-games-hub` → `feature/token-shop-and-games-hub` → `feature/game-wallet-bridge` | Preserve the dependency order. PR #4 targets the notification branch; PR #5 targets the token shop branch. Do not merge the stack as a single change; review wallet, token spending and migrations separately. |
| RPC/view grants | `security/supabase-function-and-view-grants` / PR #2 | Security review required before integration. |
| Public projections | `security/safe-public-projections` / PR #6 | Review alongside PR #2 for duplicate/conflicting grants and migration order. |
| Runtime recovery | `build/sanctuary-error-recovery` / PR #9 | Keep separate; validate error/loading boundaries. |
| Beta/automation plan | `planning/beta-automation-operating-plan` / PR #7 | Documentation-only candidate; reconcile with this audit and the master blueprint. |

## Superseded pull requests

- PR #1 (Vercel Analytics) closed: its remaining changes were generated-file/lockfile churn; keep the branch for recovery only.
- PR #3 (notification bar) closed in favour of clean PR #15. The old branch remains untouched.
- PR #8 (scheduled health checks) closed in favour of clean PR #14. Its unrelated terms-acceptance and auth/session commits remain on the original branch and are **not** included in PR #14.

## Duplicate Cloudflare setup branches

- `setup/cloudflare-auto-deploy` is 6 commits ahead and 1 behind `main`.
- `setup/cloudflare-auto-deploy-20261026` is 7 commits ahead and 1 behind `main`.
- The second branch contains a different Worker name (`sanctuary-web-auto`) from the older branch (`guild-sanctuary`); do not merge either configuration blindly.
- `main` already has the basic guarded workflow; PR #13 adds the explicit guard against placeholder Supabase configuration. Treat PR #13 as the canonical candidate and leave both setup branches intact until unique configuration/docs are reviewed.

## Branches requiring selective extraction, not wholesale merge

- `audit/fixes-2026-10-23`: 15 commits ahead, 47 behind, with broad application changes, migrations, generated lockfile changes and legal/ads docs. Review files individually and take only confirmed missing work.
- `fix/supabase-signin-recovery`: 14 commits ahead, 2 behind. Compare password-reset and callback changes against PR #13 before extracting any unique fix.
- `vercel/install-vercel-web-analytics-i-d5gpqt`: 1 commit ahead, 298 behind. Keep as historical only; associated PR #1 is closed.
- `build/cloudflare-ads-host-neutral`: one commit ahead, two behind, only the AdSense script change. Compare against current host-neutral ads implementation before deciding whether any change remains useful.

## Safe integration order

1. Review/merge the guarded deployment candidate only after checks and configuration review.
2. Validate PR #14 CI; review the cadence/cost and merge only after review.
3. Validate PR #15 CI and the notification migration against actual schema/RLS. Do not apply to production as part of branch cleanup.
4. Resolve PR #2 and PR #6 together as a migration-order/security review, not parallel independent production changes.
5. Integrate notification UI, Games Hub, token shop, and wallet in dependency order with separate test gates.
6. Extract only unique fixes from old auth/audit branches, then close their PRs only if one exists and the replacement is verified.
7. Delete no source branches until the replacement work is merged and verified; preserve historical recovery points.

## Explicit non-actions

No production merge, live database migration, Worker switch, checkout enablement, token-spending enablement, branch deletion, or domain change is authorized by this audit.
