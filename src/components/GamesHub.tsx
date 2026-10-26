'use client';

import { useState } from 'react';
import { ExternalLink, Gamepad2, Maximize2, X } from 'lucide-react';
import styles from './GamesHub.module.css';

type GameId = 'online' | 'training3d';

const games: {
  id: GameId;
  title: string;
  description: string;
  genre: string;
  url: string;
  badge: string;
}[] = [
  {
    id: 'online',
    title: 'The 5 Sleeves Online',
    description: 'A browser-based multiplayer action RPG. Explore the settlements and dangerous roads, fight Rust Wardens, develop your operative, and clear regional towers.',
    genre: 'Multiplayer action RPG',
    url: 'https://the-5-sleeves.onrender.com/',
    badge: 'Online world',
  },
  {
    id: 'training3d',
    title: 'The 5 Sleeves — 3D Training Ground',
    description: 'A third-person training and wilderness prototype. Practice with Sensei, explore the outpost, and reach the First Tower.',
    genre: 'Third-person 3D prototype',
    url: 'https://raw.githack.com/platinumsoundz/The-5-Sleeves-3D/0fcbb06/index.html',
    badge: '3D prototype',
  },
];

export function GamesHub() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
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
              <a href={selectedGame.url} target="_blank" rel="noreferrer" className={styles.iconButton} aria-label="Open game in a new tab">
                <ExternalLink size={17} aria-hidden="true" />
              </a>
              <button type="button" className={styles.iconButton} onClick={() => setActiveGame(null)} aria-label="Close game">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
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
                  <button type="button" className={styles.playButton} onClick={() => setActiveGame(game.id)}>
                    <Gamepad2 size={17} aria-hidden="true" /> Play in Sanctuary
                  </button>
                  <a href={game.url} target="_blank" rel="noreferrer" className={styles.externalLink}>
                    Open separately <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

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
