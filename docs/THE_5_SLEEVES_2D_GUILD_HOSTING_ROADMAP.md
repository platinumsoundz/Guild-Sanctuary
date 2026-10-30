# The 5 Sleeves 2D — Guild Cloudflare hosting

## Hosting layout

- Guild launches the 2D browser client from `https://the-5-sleeves-2d.pages.dev/` in production and the matching Cloudflare Pages branch preview in Vercel previews.
- The 2D Pages project serves static files from the game's existing `public/` directory.
- Pages Functions forward `/socket.io/*`, `/api/*`, and `/health` to the existing Node/Socket.IO backend using the private `GAME_SERVER_ORIGIN` secret.
- No player-facing Guild URL points to Render. The backend is not migrated in this phase.
- The Guild console player accepts the versioned bridge identity for both `the-5-sleeves-2d` and `the-5-sleeves-3d`.

## Bridge contract

Both game projects use `guild.5-sleeves`, protocol version 1, parent-origin/source validation, readiness messages, correlated pause/resume acknowledgements, and visibility-aware lifecycle handling. The 2D client additionally releases held keyboard, touch-stick and gamepad input when paused.

## Release gates

1. Configure the HTTPS backend origin as a Cloudflare Pages secret for Preview and Production.
2. Confirm static assets and PWA install shell load from Pages.
3. Verify health, client module manifest, Socket.IO client script, polling, WebSocket upgrade and reconnect.
4. Test login/register, guest join, multiplayer, progression persistence, module loading and all game controls.
5. Test Guild pause/resume, hidden-tab pause, fullscreen, back to library and exit to Guild.
6. Verify the matching Vercel Guild preview can launch the matching Pages branch preview.
7. Only after the above, enable production Pages deployments and update the production Guild rollout.

No Supabase branch, migration, or purchase flow is included in this hosting batch. Existing player data remains on the existing game backend and must be backed up before any later backend migration.
