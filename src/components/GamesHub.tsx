'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Copy, ExternalLink, Gamepad2, Heart, Play, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { GuildConsolePlayer } from './GuildConsolePlayer';
import styles from './GamesHub.module.css';

type GameId = 'sleeves2d' | 'sleeves3d';
type GameEntry = { id: GameId; title: string; description: string; genre: string; url: string | null; badge: string; embed: 'supported' | 'verify' };
type LaunchRecord = { id: GameId; at: number };
type LibraryFilter = 'all' | 'ready' | 'favourites';
const RECENTS_KEY = 'guild-library-recents-v1';
const FAVOURITES_KEY = 'guild-library-favourites-v1';

const games: GameEntry[] = [
  {
    id: 'sleeves2d',
    title: 'The 5 Sleeves 2D',
    description: 'A browser-based multiplayer action RPG with touch, keyboard and gamepad input documented by the game project. Explore settlements and dangerous roads, fight Rust Wardens, develop your operative, and clear regional towers.',
    genre: 'Multiplayer action RPG',
    url: (() => {
      const configured = process.env.NEXT_PUBLIC_5_SLEEVES_2D_URL?.trim();
      const defaultHost = process.env.VERCEL_ENV === 'preview'
        ? 'https://integration-cloudflare-guild.the-5-sleeves-2d.pages.dev/'
        : 'https://the-5-sleeves-2d.pages.dev/';
      if (!configured) return defaultHost;
      try {
        const parsed = new URL(configured);
        return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.toString() : defaultHost;
      } catch { return defaultHost; }
    })(),
    badge: 'Online world',
    embed: 'verify',
  },
  {
    id: 'sleeves3d',
    title: 'The 5 Sleeves 3D',
    description: 'A third-person 3D prototype with a mobile touch-control layout and gamepad input documented by the game project. Practice with Sensei, explore the outpost, and reach the First Tower.',
    genre: 'Third-person 3D prototype',
    url: (() => {
      const configured = process.env.NEXT_PUBLIC_5_SLEEVES_3D_URL?.trim();
      const defaultHost = process.env.VERCEL_ENV === 'preview'
        ? 'https://integration-guild-host-bridg.the-5-sleeves-3d.pages.dev/'
        : 'https://the-5-sleeves-3d.pages.dev/';
      if (!configured) return defaultHost;
      try {
        const parsed = new URL(configured);
        return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.toString() : defaultHost;
      } catch { return defaultHost; }
    })(),
    badge: '3D prototype',
    embed: 'verify',
  },
];

export function GamesHub({ autoLaunchRecent = false, onExitToGuildHome }: { autoLaunchRecent?: boolean; onExitToGuildHome?: () => void }) {
  const [activeGame, setActiveGame] = useState<GameEntry | null>(null);
  const [copiedServer, setCopiedServer] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [recentLaunches, setRecentLaunches] = useState<LaunchRecord[]>([]);
  const [favourites, setFavourites] = useState<GameId[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<GameId | null>(null);

  useEffect(() => {
    try {
      const recentValue = window.localStorage.getItem(RECENTS_KEY);
      const favouriteValue = window.localStorage.getItem(FAVOURITES_KEY);
      if (recentValue) {
        const parsed = JSON.parse(recentValue) as LaunchRecord[];
        if (Array.isArray(parsed)) {
          const safeRecent = parsed.filter((item) => item && games.some((game) => game.id === item.id) && Number.isFinite(item.at)).slice(0, 8);
          setRecentLaunches(safeRecent);
          if (autoLaunchRecent && safeRecent[0]) {
            const recentGame = games.find((game) => game.id === safeRecent[0].id);
            if (recentGame?.url) setActiveGame(recentGame);
          }
        }
      }
      if (favouriteValue) {
        const parsed = JSON.parse(favouriteValue) as GameId[];
        if (Array.isArray(parsed)) setFavourites(parsed.filter((id): id is GameId => games.some((game) => game.id === id)));
      }
    } catch { /* Preferences are optional; malformed local data must not block the library. */ }
    finally { setLibraryReady(true); }
  }, [autoLaunchRecent]);

  const rememberLaunch = (game: GameEntry) => {
    const next = [{ id: game.id, at: Date.now() }, ...recentLaunches.filter((item) => item.id !== game.id)].slice(0, 8);
    setRecentLaunches(next);
    try { window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /* Launching remains available when storage is blocked. */ }
  };

  const clearRecentLaunches = () => {
    setRecentLaunches([]);
    try { window.localStorage.removeItem(RECENTS_KEY); } catch { /* Clearing this view still works for the current session. */ }
  };

  const toggleFavourite = (id: GameId) => {
    const next = favourites.includes(id) ? favourites.filter((item) => item !== id) : [...favourites, id];
    setFavourites(next);
    try { window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next)); } catch { /* Keep in-memory preferences usable. */ }
  };

  const filteredGames = useMemo(() => games.filter((game) => {
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || [game.title, game.description, game.genre, game.badge].some((value) => value.toLowerCase().includes(needle));
    const matchesFilter = filter === 'all' || (filter === 'ready' && Boolean(game.url)) || (filter === 'favourites' && favourites.includes(game.id));
    return matchesQuery && matchesFilter;
  }), [query, filter, favourites]);
  const recentGames = recentLaunches.map((record) => games.find((game) => game.id === record.id)).filter((game): game is GameEntry => Boolean(game));
  const copyServerAddress = async (address: string) => {
    try { await navigator.clipboard.writeText(address); setCopiedServer(address); }
    catch { setCopiedServer(null); }
  };

  if (activeGame?.url) {
    return (
      <div className={styles.hub}>
        <GuildConsolePlayer title={activeGame.title} gameId={activeGame.id} url={activeGame.url} onExit={() => { setActiveGame(null); onExitToGuildHome?.(); }} />
        <p className={styles.hint}>If this game refuses to load inside the player, use the external launch option below. Host security headers and browser permissions can prevent embedding even when the Guild player supports fullscreen.</p>
        <div className={styles.cardActions}>
          <button type="button" className={styles.playButton} onClick={() => setActiveGame(null)}><Gamepad2 size={16} /> Back to library</button>
          <a className={styles.externalLink} href={activeGame.url} target="_blank" rel="noopener noreferrer">Open game separately <ExternalLink size={14} /></a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.hub}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>THE GUILD · GAME LIBRARY</p>
        <h2>Your console. Your worlds.</h2>
        <p>A console-first Guild experience inspired by living-room game launchers: your own games first, fast launch, fullscreen, and a persistent way back. Touch and mouse remain first-class controls; a physical gamepad is optional.</p>
      </header>

      <section className={styles.libraryTools} aria-label="Controller status and help">
        <div><Gamepad2 size={21} /><div><strong>Touch-first and controller-ready</strong><p>The Guild system menu supports touch D-pad navigation, A to select and B to back, plus keyboard and detected gamepad input. Both 5 Sleeves repositories document native in-game touch controls; actual device gameplay still needs a browser/device pass.</p></div></div>
        <span className={styles.libraryHint}>Hidden entry · shared Sanctuary identity and theme</span>
      </section>

      <section className={styles.libraryControls} aria-label="Search and filter your game library">
        <label className={styles.searchBox}><Search size={18} aria-hidden="true" /><span className={styles.visuallyHidden}>Search games</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your games…" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}</label>
        <div className={styles.filterRow} role="group" aria-label="Filter game library">
          <button type="button" className={filter === "all" ? styles.filterActive : styles.filterButton} aria-pressed={filter === "all"} onClick={() => setFilter("all")}><Gamepad2 size={14} />All games</button>
          <button type="button" className={filter === "ready" ? styles.filterActive : styles.filterButton} aria-pressed={filter === "ready"} onClick={() => setFilter("ready")}><Check size={14} />Ready to play</button>
          <button type="button" className={filter === "favourites" ? styles.filterActive : styles.filterButton} aria-pressed={filter === "favourites"} onClick={() => setFilter("favourites")}><Heart size={14} />Favourites</button>
          <span className={styles.resultCount}>{filteredGames.length} {filteredGames.length === 1 ? "game" : "games"}</span>
        </div>
      </section>
      {recentGames.length > 0 && filter !== "favourites" && !query.trim() && <section className={styles.recentSection} aria-labelledby="guild-recent-heading">
        <div className={styles.rowHeading}><div><p className={styles.eyebrow}>PICK UP WHERE YOU LEFT OFF</p><h2 id="guild-recent-heading"><Clock3 size={19} /> Recently played</h2></div><div className={styles.recentActions}><span>Saved on this device</span><button type="button" className={styles.clearHistory} onClick={clearRecentLaunches}><Trash2 size={14} /> Clear history</button></div></div>
        <div className={styles.recentRow}>{recentGames.map((game) => <article className={styles.recentCard} key={game.id}><div className={styles.recentOrb}><Gamepad2 size={22} /></div><div className={styles.recentCopy}><strong>{game.title}</strong><small>{game.url ? "Ready to launch" : "Host URL needed"}</small></div><button type="button" className={styles.recentPlay} disabled={!game.url} onClick={() => { rememberLaunch(game); setActiveGame(game); }} aria-label={`Continue playing ${game.title}`}><Play size={15} /></button></article>)}</div>
      </section>}

      <section className={styles.grid} aria-label="Guild game library">
        {filteredGames.map((game) => (
          <article className={styles.card} key={game.id}>
            <div className={styles.art}><Gamepad2 size={44} strokeWidth={1.2} aria-hidden="true" /><span className={styles.artCaption}>{game.url ? "READY TO PLAY" : "SETUP REQUIRED"}</span><button type="button" className={styles.favouriteButton} aria-pressed={favourites.includes(game.id)} aria-label={favourites.includes(game.id) ? `Remove ${game.title} from favourites` : `Add ${game.title} to favourites`} onClick={() => toggleFavourite(game.id)}><Heart size={18} fill={favourites.includes(game.id) ? "currentColor" : "none"} /></button></div>
            <div className={styles.cardBody}>
              <span className={styles.gameBadge}>{game.badge}</span>
              <h2>{game.title}</h2>
              <p className={styles.genre}>{game.genre}</p>
              <p className={styles.description}>{game.description}</p>
              <div className={styles.cardActions}>
                <button type="button" className={styles.playButton} onClick={() => { rememberLaunch(game); setActiveGame(game); }} disabled={!game.url} aria-label={!game.url ? 'The 5 Sleeves 2D launch is waiting for its verified host URL' : `Launch ${game.title} inside The Guild`}><Play size={16} /> {game.url ? 'Launch in Guild' : 'Host URL needed'}</button>
                {game.url && <a href={game.url} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>Open separately <ExternalLink size={14} /></a>}
                <button type="button" className={styles.detailsToggle} aria-expanded={detailsOpen === game.id} aria-controls={`details-${game.id}`} onClick={() => setDetailsOpen((current) => current === game.id ? null : game.id)}>{detailsOpen === game.id ? 'Hide details' : 'Game details'}</button>
              </div>
              {detailsOpen === game.id && <section id={`details-${game.id}`} className={styles.gameDetails} aria-label={`${game.title} details`}>
                <div><strong>Launch method</strong><p>{game.url ? 'Guild embedded player with an external-browser fallback.' : 'Waiting for a verified host URL; no address is guessed.'}</p></div>
                <div><strong>Input support</strong><p>Touch, keyboard and gamepad support are described by the game project. Confirm actual input on your browser and device; controller behaviour can vary.</p></div>
                <div><strong>Compatibility</strong><p>Embedding can be blocked by the game host’s security headers or browser policy. Use Open separately if the embedded view does not load.</p></div>
                <div><strong>Progress and saves</strong><p>Guild does not currently report verified achievements or cloud saves for this title. Use the game’s own save/account features where available.</p></div>
              </section>}
              {!game.url && <p className={styles.hint}>The verified 2D client URL is not configured in this build. Follow the 3D static-hosting pattern where possible; the hub will not guess a production address.</p>}
            </div>
          </article>
        ))}
      </section>
      {filteredGames.length === 0 && <div className={styles.emptyState}><Sparkles size={24} /><h3>No games match this view</h3><p>Try a different search or switch back to all games. Favourites are stored on this device.</p><button type="button" className={styles.playButton} onClick={() => { setQuery(""); setFilter("all"); }}>Show all games</button></div>}
      <p className={styles.localDataNote}>{libraryReady ? "Recent launches and favourites are stored locally in this browser." : "Loading local library preferences…"} They are not synced to your account yet.</p>

      <section className={styles.futureSection} aria-labelledby="guild-roadmap-title">
        <header className={styles.header}><p className={styles.eyebrow}>GUILD ROADMAP</p><h2 id="guild-roadmap-title">More ways to play together</h2><p>These remain planned features until the required game-side and server-side integration is implemented and tested.</p></header>
        <div className={styles.futureGrid}>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Coming soon</span><h3>Shared Sanctuary account</h3><p>Link game identity to your Sanctuary profile after consent, session and recovery flows are verified.</p><button type="button" className={styles.placeholderButton} disabled>Account linking · coming soon</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Coming soon</span><h3>Cloud saves and progression</h3><p>Sync supported progress without replacing each game's existing save and recovery paths.</p><button type="button" className={styles.placeholderButton} disabled>Cloud saves · coming soon</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Coming soon</span><h3>Guilds and parties</h3><p>Form groups, invite friends and coordinate sessions across supported games.</p><button type="button" className={styles.placeholderButton} disabled>Groups · coming soon</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Coming soon</span><h3>Quests and achievements</h3><p>Track milestones and rankings using verified game events, not client-reported scores.</p><button type="button" className={styles.placeholderButton} disabled>Progression · coming soon</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Security gated</span><h3>Cosmetics and rewards</h3><p>Profile themes and game cosmetics require server-side ownership checks.</p><button type="button" className={styles.placeholderButton} disabled>Locked · checks required</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Security gated</span><h3>Sanctuary Tokens in games</h3><p>Shared balances and spending remain unavailable until server-authoritative integration and abuse tests pass.</p><button type="button" className={styles.placeholderButton} disabled>Wallet bridge · locked</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Catalog planned</span><h3>Guild Token Shop</h3><p>A Guild-specific catalog for gaming themes and digital cosmetics, using the existing Sanctuary wallet and ownership checks. No duplicate balance and no purchases until the secure transaction path is verified.</p><button type="button" className={styles.placeholderButton} disabled>Guild catalog · planned</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Integration planned</span><h3>Spotify listening</h3><p>Future account linking and playback controls will require explicit consent, supported API access and licensing-compliant playback. Guild games will continue to work without it.</p><button type="button" className={styles.placeholderButton} disabled>Spotify · planned</button></article>
        </div>
      </section>

      <section aria-labelledby="community-games-title">
        <header className={styles.header}><p className={styles.eyebrow}>COMMUNITY WORLDS</p><h2 id="community-games-title">Play with the community</h2><p>External platforms remain available from the same library.</p></header>
        <div className={styles.grid}>
          <article className={styles.card}><div className={styles.art} aria-hidden="true"><Gamepad2 size={44} strokeWidth={1.2} /></div><div className={styles.cardBody}><span className={styles.gameBadge}>Roblox · Experience</span><h2>My Roblox World</h2><p className={styles.description}>Jump straight into the Roblox experience.</p><div className={styles.cardActions}><a className={styles.playButton} href="https://www.roblox.com/share?code=569803cb5f9abd4aa9c44b092aa7130d&type=ExperienceDetails&stamp=1793047846576" target="_blank" rel="noopener noreferrer">Open Roblox <ExternalLink size={15} /></a></div></div></article>
          <article className={styles.card}><div className={styles.art} aria-hidden="true"><Gamepad2 size={44} strokeWidth={1.2} /></div><div className={styles.cardBody}><span className={styles.gameBadge}>Minecraft · Java</span><h2>Platinum Survival</h2><p className={styles.description}>Join using this address in the Minecraft Multiplayer server field.</p><p><strong>Server address</strong></p><code>platinumsurvival.minekeep.gg</code><div className={styles.cardActions}><button type="button" className={styles.playButton} onClick={() => void copyServerAddress('platinumsurvival.minekeep.gg')}><Copy size={15} /> {copiedServer === 'platinumsurvival.minekeep.gg' ? 'Copied address' : 'Copy address'}</button><a className={styles.externalLink} href="https://platinumsurvival.minekeep.gg" target="_blank" rel="noopener noreferrer">Open host <ExternalLink size={14} /></a></div></div></article>
          <article className={styles.card}><div className={styles.art} aria-hidden="true"><Gamepad2 size={44} strokeWidth={1.2} /></div><div className={styles.cardBody}><span className={styles.gameBadge}>Minecraft · Bedrock</span><h2>Platinum Survival Bedrock</h2><p className={styles.description}>Use this address in the Servers tab. Add a port if the host panel specifies one.</p><p><strong>Server address</strong></p><code>platinumsurvival.bedrock.minekeep.gg</code><div className={styles.cardActions}><button type="button" className={styles.playButton} onClick={() => void copyServerAddress('platinumsurvival.bedrock.minekeep.gg')}><Copy size={15} /> {copiedServer === 'platinumsurvival.bedrock.minekeep.gg' ? 'Copied address' : 'Copy address'}</button><a className={styles.externalLink} href="https://platinumsurvival.bedrock.minekeep.gg" target="_blank" rel="noopener noreferrer">Open host <ExternalLink size={14} /></a></div></div></article>
        </div>
      </section>

      <aside className={styles.walletNotice}><ShieldCheck size={18} /><div><strong>Secure game integration</strong><p>Games are launchable from the library, but their existing credits are not linked to Sanctuary Tokens. The shared account bridge and server-authoritative spending flow remain locked until verified.</p></div></aside>
    </div>
  );
}
