# Creator games relocation into Guild — 2026-10-28

## Intent
Move the creator-project/community-world hub off the Support the creator page and into the Guild experience.

## Scope
- The 5 Sleeves 2D and The 5 Sleeves 3D
- Roblox experience
- Platinum Survival Minecraft Java and Bedrock endpoints
- Keep the Support page focused on optional contributions.
- Guests can browse a read-only Guild game lobby; the original Guild browser arcade remains authenticated-only.
- Keep Sanctuary-built Cosmic Arcade distinct from external creator projects.
- No URL, provider, database, save, identity-linking, or token-spending changes.

## Validation status
- Exact-head CI passed, including Guild, guest-access and Cosmic Arcade contracts, TypeScript and production build.
- Visual Preview Screenshots workflow passed. Vercel's daily deployment limit was reported on preview attempts; no production deployment occurred.
- Real mobile/desktop browser and game interaction QA remains outstanding.

## Remaining validation
- Run `npm run check:guild-browser-arcade` and `npm run check:guest-access`.
- Run TypeScript and production build.
- Verify Guild game links and embeds on mobile and desktop; confirm Support page no longer includes the games hub.
- No production deployment or PR merge is performed by this change.
