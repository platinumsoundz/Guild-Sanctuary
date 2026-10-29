# Guest-safe preview access batch — 2026-10-28

- Branch: `feat/guest-safe-preview-access-2026-10-28`
- Base: `main` (rebuilt to preserve current compact-shell integration)
- Base SHA: `73d65f0e304dd1df82e9b9bc7713ee1d1d382e30`
- Pull request: https://github.com/platinumsoundz/Guild-Sanctuary/pull/213
- Status: rebuilt against current mainline; exact-head CI and browser checks required.

## Scope and decisions

- Keep guest browsing intentionally narrow and useful: Today, support, Cosmic Arcade, Sanctuary Roadmap and Guild Roadmap.
- For other routes, render a sign-in explainer before mounting account-oriented feature components.
- Do not pass the synthetic guest identity into profile-post loading.
- Add a source-level contract and CI step.
- This is a UI boundary only. It does not replace backend authorization, Supabase RLS, or per-service mutation checks.

## Changed paths

- `src/components/AppWorkspace.tsx`
- `scripts/check-guest-access.mjs`
- `package.json`
- `.github/workflows/ci.yml`
- `ROADMAP.md`
- `docs/agent-logs/guest-safe-preview-access-2026-10-28.md`

## Verification

- `npm run check:guest-access`: pending exact-head CI.
- `npm run typecheck`: pending exact-head CI.
- `npm run build`: pending exact-head CI.
- Browser checks of allowed/restricted routes and mobile layout: outstanding.
- Service/RLS authorization and cross-account tests: outstanding.

## Security, persistence and deployment

- No database migrations, production data changes, provider settings, secrets, billing, or production deployment.
- Do not merge until exact-head CI is green and route behaviour is reviewed.
- Rollback: revert this branch/PR; no persistent data is introduced.
- Next: validate CI, then continue with a separately scoped Guild browser arcade recovery from the diverged feature branch, without merging its history wholesale.
