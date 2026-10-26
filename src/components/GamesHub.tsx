'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Gamepad2, Maximize2, X } from 'lucide-react';
import styles from './GamesHub.module.css';

type GameId = 'online' | 'training3d';

const games: {
  id: GameId;
  title: string;
  description: string;
  genre: string;
  url: string | null;
  badge: string;
}[] = [
  {
    id: 'online',
    title: 'The 5 Sleeves Online',
    description: 'A browser-based multiplayer action RPG. Explore the settlements and dangerous roads, fight Rust Wardens, develop your operative, and clear regional towers.',
    genre: 'Multiplayer action RPG',
    // Configure this with the verified Render URL; never guess a production host.
    url: process.env.NEXT_PUBLIC_5_SLEEVES_2D_URL?.trim() || null,
    badge: 'Online world',
  },
  {
    id: 'training3d',
    title: 'The 5 Sleeves — 3D Training Ground',
    description: 'A third-person training and wilderness prototype. Practice with Sensei, explore the outpost, and reach the First Tower.',
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
    <main className={styles.hub}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>THE SANCTUARY ARCADE</p>
        <h1>Games</h1>
        <p>Play The 5 Sleeves games from one place. Each game still runs on its existing host while we build the shared Sanctuary account and wallet connection.</p>
      </header>

      {selectedGame ? (
        <section className={styles.player} aria-label={selectedGame.title}>
          <div className={styles.playerHeader}>
            <div>
              <span className={styles.gameBadge}>{selectedGame.badge}</span>
              <h2>{selectedGame.title}</h2>
            </div>
            <div className={styles.playerActions}>
              {selectedGame.url && <a href={selectedGame.url} target="_blank" rel="noopener noreferrer" className={styles.iconButton} aria-label="Open game in a new tab">
                <ExternalLink size={17} aria-hidden="true" />
              </a>}
              <button type="button" className={styles.iconButton} onClick={() => setActiveGame(null)} aria-label="Close game">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          {selectedGame.url ? (
            <>
              <div className={styles.frameWrap}>
                <iframe
                  className={styles.frame}
                  src={selectedGame.url}
                  title={selectedGame.title}
                  loading="lazy"
                  allow="fullscreen; gamepad; pointer-lock"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-fullscreen"
                />
              </div>
              <p className={styles.hint}>If the host blocks embedding or a game control behaves differently inside the app, use the open-in-new-tab button.</p>
            </>
          ) : (
            <p className={styles.hint}>The verified Render address has not been configured yet. The game launch is paused to avoid sending you to an unverified address.</p>
          )}
        </section>
      ) : (
        <section className={styles.grid} aria-label="Available games">
          {games.map((game) => (
            <article className={styles.card} key={game.id}>
              <div className={styles.art} aria-hidden="true">
                <Gamepad2 size={44} strokeWidth={1.2} />
              </div>
              <div className={styles.cardBody}>
                <span className={styles.gameBadge}>{game.badge}</span>
                <h2>{game.title}</h2>
                <p className={styles.genre}>{game.genre}</p>
                <p className={styles.description}>{game.description}</p>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.playButton} onClick={() => setActiveGame(game.id)} disabled={!game.url}>
                    <Gamepad2 size={17} aria-hidden="true" /> Play in Sanctuary
                  </button>
                  {game.url ? (
                    <a href={game.url} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                      Open separately <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className={styles.hint}>Host URL needs configuration</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby="community-games-title">
        <header className={styles.header}>
          <p className={styles.eyebrow}>COMMUNITY WORLDS</p>
          <h2 id="community-games-title">Play with the community</h2>
          <p>Your Roblox experience and Platinum Survival Minecraft server are linked here for quick access.</p>
        </header>
        <div className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.art} aria-hidden="true"><Gamepad2 size={44} strokeWidth={1.2} /></div>
            <div className={styles.cardBody}>
              <span className={styles.gameBadge}>Roblox · Experience</span>
              <h2>My Roblox World</h2>
              <p className={styles.description}>Jump straight into the Roblox experience.</p>
              <div className={styles.cardActions}>
                <a className={styles.playButton} href="https://www.roblox.com/share?code=569803cb5f9abd4aa9c44b092aa7130d&type=ExperienceDetails&stamp=1793047846576" target="_blank" rel="noopener noreferrer">Open Roblox <ExternalLink size={15} aria-hidden="true" /></a>
              </div>
            </div>
          </article>
          <article className={styles.card}>
            <div className={styles.art} aria-hidden="true"><Gamepad2 size={44} strokeWidth={1.2} /></div>
            <div className={styles.cardBody}>
              <span className={styles.gameBadge}>Minecraft · Java</span>
              <h2>Platinum Survival</h2>
              <p className={styles.description}>Join the Minecraft server using this address in the Multiplayer server field.</p>
              <p><strong>Server address</strong></p>
              <code>platinumsurvival.minekeep.gg</code>
              <div className={styles.cardActions}>
                <button type="button" className={styles.playButton} onClick={() => void copyServerAddress('platinumsurvival.minekeep.gg')}><Copy size={15} aria-hidden="true" /> {copiedServer === 'platinumsurvival.minekeep.gg' ? 'Copied address' : 'Copy address'}</button>
                <a className={styles.externalLink} href="https://platinumsurvival.minekeep.gg" target="_blank" rel="noopener noreferrer">Open host <ExternalLink size={14} aria-hidden="true" /></a>
              </div>
            </div>
          </article>
          <article className={styles.card}>
            <div className={styles.art} aria-hidden="true"><Gamepad2 size={44} strokeWidth={1.2} /></div>
            <div className={styles.cardBody}>
              <span className={styles.gameBadge}>Minecraft · Bedrock</span>
              <h2>Platinum Survival Bedrock</h2>
              <p className={styles.description}>Use this Bedrock server address in the Servers tab. Add a port if your host panel specifies one.</p>
              <p><strong>Server address</strong></p>
              <code>platinumsurvival.bedrock.minekeep.gg</code>
              <div className={styles.cardActions}>
                <button type="button" className={styles.playButton} onClick={() => void copyServerAddress('platinumsurvival.bedrock.minekeep.gg')}><Copy size={15} aria-hidden="true" /> {copiedServer === 'platinumsurvival.bedrock.minekeep.gg' ? 'Copied address' : 'Copy address'}</button>
                <a className={styles.externalLink} href="https://platinumsurvival.bedrock.minekeep.gg" target="_blank" rel="noopener noreferrer">Open host <ExternalLink size={14} aria-hidden="true" /></a>
              </div>
            </div>
          </article>
        </div>
      </section>

      <aside className={styles.walletNotice}>
        <Maximize2 size={18} aria-hidden="true" />
        <div>
          <strong>Sanctuary Tokens in games</strong>
          <p>The games are listed and launchable here, but their existing in-game credits are not yet linked to your Sanctuary Token wallet. We will not show a fake shared balance; the secure account bridge and server-authoritative spend flow are the next integration step.</p>
        </div>
      </aside>
    </main>
  );
}
