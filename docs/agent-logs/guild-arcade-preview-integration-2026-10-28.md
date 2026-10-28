# Guild arcade preview integration — 2026-10-28

- Branch: `feat/guild-arcade-preview-integration-v2-2026-10-28`
- Base/dependency: `feat/guest-safe-preview-access-2026-10-28`
- Pull request will target the guest-safety branch first; this is intentionally a dependency batch.
- Source recovery: `feat/guild-browser-arcade-first-2026-10-28`, selected components only.

## Scope

- Recovered `GuildWorld`, `GuildCometDodge`, shared controller input helper, companion hub and their styles.
- Added the dedicated `guild` navigation state, visible Guild Arcade navigation item and workspace route.
- Kept Cosmic Arcade distinct from Guild Arcade.
- Kept Guild Arcade gated from guest sessions; only authenticated sessions reach the game route.
- Added `check:guild-browser-arcade` to CI and documented the batch in `ROADMAP.md`.

## Changed paths

- `src/components/GuildWorld.tsx`
- `src/components/GuildWorld.module.css`
- `src/components/GuildCometDodge.tsx`
- `src/components/GuildCometDodge.module.css`
- `src/components/GuildCompanionHub.tsx`
- `src/components/GuildCompanionHub.module.css`
- `src/lib/controllerInput.ts`
- `src/context/AppContext.tsx`
- `src/components/AppWorkspace.tsx`
- `src/components/Navigation.tsx`
- `scripts/check-guild-browser-arcade.mjs`
- `package.json`
- `.github/workflows/ci.yml`
- `ROADMAP.md`

## Verification status

- Source-level Guild arcade contract: wired into CI; execution pending.
- TypeScript check and production build: pending exact-head CI.
- Desktop/mobile browser and physical gamepad QA: outstanding.
- Companion library/media: local browser state unless the existing opt-in sync path is configured and verified. No cloud sync claim.
- Cloud Lab and calling are not included in this batch.

## Security, persistence and rollback

- No Supabase migration applied, no production data or provider settings changed, no billing changes and no production deployment.
- Account route gate is a UI-level guard; backend RLS/service authorization remains independently required.
- Rollback: revert this feature PR; local game state is browser storage/session state and no new database schema is introduced.
- Merge order: guest-safety dependency first, then this Guild arcade batch after its checks pass.
