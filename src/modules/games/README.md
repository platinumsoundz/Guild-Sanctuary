# Games

Owns the in-app Games hub and its launchers. `GamesHub` is mounted from the main navigation and lists The 5 Sleeves Online and the commit-pinned 3D Training Ground.

Both games remain hosted on their existing URLs. The hub embeds a selected game in an iframe with an open-in-new-tab fallback, because a host may block embedding. This is an in-app launcher, not a merged runtime, shared login, or shared wallet.

Guest and signed-in members can open the hub. The current game credits are not linked to Sanctuary Tokens; do not display a fake shared balance. A secure account bridge and server-authoritative spend flow would be required before showing wallet data inside a game.

The games and URLs are client-side configuration in `GamesHub.tsx`. No database migration is required for this page.
