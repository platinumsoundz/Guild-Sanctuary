'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Gamepad2, Maximize2, X } from 'lucide-react';
import styles from './GamesHub.module.css';

type GameId = 'sleeves2d' | 'sleeves3d';

const games: {
  id: GameId;
  title: string;
  description: string;
  genre: string;
  url: string | null;
  badge: string;
}[] = [
  {
    id: 'sleeves2d',
    title: 'The 5 Sleeves 2D',
    description: 'A browser-based multiplayer action RPG. Explore the settlements and dangerous roads, fight Rust Wardens, develop your operative, and clear regional towers.',
    genre: 'Multiplayer action RPG',
    // Configure this with the verified Render URL; never guess a production host.
    url: process.env.NEXT_PUBLIC_5_SLEEVES_2D_URL?.trim() || null,
    badge: 'Online world',
  },
  {
    id: 'sleeves3d',
    title: 'The 5 Sleeves 3D',
    description: 'A third-person 3D game prototype. Practice with Sensei, explore the outpost, and reach the First Tower.',
    genre: 'Third-person 3D prototype',
    url: 'https://the-5-sleeves-3d.pages.dev/',
    badge: '3D prototype',
  },
];

export function GamesHub() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [copiedServer, setCopiedServer] = useState<string | null>(null);
  const copyServerAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedServer(address);
    } catch {
      setCopiedServer(null);
    }
  };
  const selectedGame = games.find((game) => game.id === activeGame);

  return (
    <div className={styles.hub}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>CREATOR PROJECTS</p>
        <h2>Creator projects and community worlds</h2>
        <p>These independent projects are collected here on Support the creator. Cosmic Arcade is a separate Sanctuary games page; its built-in mini-games do not include these external links.</p>
      </header>

      {selectedGame ? (
        <section className={styles.player} aria-label={selectedGame.title}>
          <div className={styles.playerHeader}>
            <div><span className={styles.gameBadge}>{selectedGame.badge}</span><h2>{selectedGame.title}</h2></div>
            <div className={styles.playerActions}>
              {selectedGame.url && <a href={selectedGame.url} target="_blank" rel="noopener noreferrer" className={styles.iconButton} aria-label="Open game in a new tab"><ExternalLink size={17} aria-hidden="true" /></a>}
              <button type="button" className={styles.iconButton} onClick={() => setActiveGame(null)} aria-label="Close game"><X size={18} aria-hidden="true" /></button>
            </div>
          </div>
          {selectedGame.url ? <><div className={styles.frameWrap}><iframe className={styles.frame} src={selectedGame.url} title={selectedGame.title} loading="lazy" allow="fullscreen; gamepad; pointer-lock" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-fullscreen" /></div><p className={styles.hint}>If the host blocks embedding or a game control behaves differently inside the app, use the open-in-new-tab button.</p></> : <p className={styles.hint}>The verified Render address has not been configured yet. The game launch is paused to avoid sending you to an unverified address.</p>}
        </section>
      ) : (
        <section className={styles.grid} aria-label="Creator-built games">
          {games.map((game) => (
            <article className={styles.card} key={game.id}>
              <div className={styles.art} aria-hidden="true"><Gamepad2 size={44} strokeWidth={1.2} /></div>
              <div className={styles.cardBody}>
                <span className={styles.gameBadge}>{game.badge}</span><h2>{game.title}</h2><p className={styles.genre}>{game.genre}</p><p className={styles.description}>{game.description}</p>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.playButton} onClick={() => setActiveGame(game.id)} disabled={!game.url} aria-label={!game.url ? `${game.title} launch coming soon: host URL is not configured` : `Play ${game.title} in Sanctuary`}><Gamepad2 size={17} aria-hidden="true" /> {game.url ? 'Play in Sanctuary' : 'Coming soon'}</button>
                  {game.url ? <a href={game.url} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>Open separately <ExternalLink size={14} aria-hidden="true" /></a> : <span className={styles.hint}>Placeholder · waiting for a verified host URL</span>}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className={styles.futureSection} aria-labelledby="creator-roadmap-title">
        <header className={styles.header}><p className={styles.eyebrow}>IN DEVELOPMENT</p><h2 id="creator-roadmap-title">More ways to play together</h2><p>These possible cross-game features are planned for the future. They stay disabled until implementation and security checks are complete.</p></header>
        <div className={styles.futureGrid}>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Coming soon</span><h3>Shared Sanctuary account</h3><p>Link game identity to your Sanctuary profile after consent, session and account-recovery flows are verified.</p><button type="button" className={styles.placeholderButton} disabled>Account linking · coming soon</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Coming soon</span><h3>Cloud saves and progression</h3><p>Securely sync supported game progress without replacing the games’ existing save and recovery paths.</p><button type="button" className={styles.placeholderButton} disabled>Cloud saves · coming soon</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Coming soon</span><h3>Guilds and parties</h3><p>Form groups, invite friends and coordinate sessions across supported games.</p><button type="button" className={styles.placeholderButton} disabled>Groups · coming soon</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Coming soon</span><h3>Quests, achievements and rankings</h3><p>Track milestones and leaderboards using verified game events, not client-reported scores.</p><button type="button" className={styles.placeholderButton} disabled>Progression · coming soon</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Security gated</span><h3>Cosmetics and rewards</h3><p>Profile themes, borders and supported game cosmetics will require server-side ownership checks.</p><button type="button" className={styles.placeholderButton} disabled>Locked · checks required</button></article>
          <article className={styles.futureCard}><span className={styles.futureStatus}>Security gated</span><h3>Sanctuary Tokens in games</h3><p>Shared balances and spending remain unavailable until server-authoritative integration and abuse tests pass.</p><button type="button" className={styles.placeholderButton} disabled>Wallet bridge · locked</button></article>
        </div>
      </section>

      <section aria-labelledby="community-games-title">
        <header className={styles.header}><p className={styles.eyebrow}>COMMUNITY WORLDS</p><h2 id="community-games-title">Play with the community</h2><p>Your Roblox experience and Platinum Survival Minecraft servers are linked here for quick access.</p></header>
        <div className={styles.grid}>
          <article className={styles.card}><div className={styles.art} aria-hidden="true"><Gamepad2 size={44} strokeWidth={1.2} /></div><div className={styles.cardBody}><span className={styles.gameBadge}>Roblox · Experience</span><h2>My Roblox World</h2><p className={styles.description}>Jump straight into the Roblox experience.</p><div className={styles.cardActions}><a className={styles.playButton} href="https://www.roblox.com/share?code=569803cb5f9abd4aa9c44b092aa7130d&type=ExperienceDetails&stamp=1793047846576" target="_blank" rel="noopener noreferrer">Open Roblox <ExternalLink size={15} aria-hidden="true" /></a></div></div></article>
          <article className={styles.card}><div className={styles.art} aria-hidden="true"><Gamepad2 size={44} strokeWidth={1.2} /></div><div className={styles.cardBody}><span className={styles.gameBadge}>Minecraft · Java</span><h2>Platinum Survival</h2><p className={styles.description}>Join the Minecraft server using this address in the Multiplayer server field.</p><p><strong>Server address</strong></p><code>platinumsurvival.minekeep.gg</code><div className={styles.cardActions}><button type="button" className={styles.playButton} onClick={() => void copyServerAddress('platinumsurvival.minekeep.gg')}><Copy size={15} aria-hidden="true" /> {copiedServer === 'platinumsurvival.minekeep.gg' ? 'Copied address' : 'Copy address'}</button><a className={styles.externalLink} href="https://platinumsurvival.minekeep.gg" target="_blank" rel="noopener noreferrer">Open host <ExternalLink size={14} aria-hidden="true" /></a></div></div></article>
          <article className={styles.card}><div className={styles.art} aria-hidden="true"><Gamepad2 size={44} strokeWidth={1.2} /></div><div className={styles.cardBody}><span className={styles.gameBadge}>Minecraft · Bedrock</span><h2>Platinum Survival Bedrock</h2><p className={styles.description}>Use this Bedrock server address in the Servers tab. Add a port if your host panel specifies one.</p><p><strong>Server address</strong></p><code>platinumsurvival.bedrock.minekeep.gg</code><div className={styles.cardActions}><button type="button" className={styles.playButton} onClick={() => void copyServerAddress('platinumsurvival.bedrock.minekeep.gg')}><Copy size={15} aria-hidden="true" /> {copiedServer === 'platinumsurvival.bedrock.minekeep.gg' ? 'Copied address' : 'Copy address'}</button><a className={styles.externalLink} href="https://platinumsurvival.bedrock.minekeep.gg" target="_blank" rel="noopener noreferrer">Open host <ExternalLink size={14} aria-hidden="true" /></a></div></div></article>
        </div>
      </section>

      <aside className={styles.walletNotice}><Maximize2 size={18} aria-hidden="true" /><div><strong>Sanctuary Tokens in games</strong><p>The games are listed and launchable here, but their existing in-game credits are not yet linked to your Sanctuary Token wallet. We will not show a fake shared balance; the secure account bridge and server-authoritative spend flow are the next integration step.</p></div></aside>
    </div>
  );
}
