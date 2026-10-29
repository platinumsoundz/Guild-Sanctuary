'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Gamepad2, Play, ShieldCheck } from 'lucide-react';
import { GuildConsolePlayer } from './GuildConsolePlayer';
import styles from './GamesHub.module.css';

type GameId = 'sleeves2d' | 'sleeves3d';
type GameEntry = { id: GameId; title: string; description: string; genre: string; url: string | null; badge: string; embed: 'supported' | 'verify' };

const games: GameEntry[] = [
  {
    id: 'sleeves2d',
    title: 'The 5 Sleeves 2D',
    description: 'A browser-based multiplayer action RPG with touch, keyboard and gamepad input documented by the game project. Explore settlements and dangerous roads, fight Rust Wardens, develop your operative, and clear regional towers.',
    genre: 'Multiplayer action RPG',
    url: process.env.NEXT_PUBLIC_5_SLEEVES_2D_URL?.trim() || null,
    badge: 'Online world',
    embed: 'verify',
  },
  {
    id: 'sleeves3d',
    title: 'The 5 Sleeves 3D',
    description: 'A third-person 3D prototype with a mobile touch-control layout and gamepad input documented by the game project. Practice with Sensei, explore the outpost, and reach the First Tower.',
    genre: 'Third-person 3D prototype',
    url: 'https://the-5-sleeves-3d.pages.dev/',
    badge: '3D prototype',
    embed: 'verify',
  },
];

export function GamesHub() {
  const [activeGame, setActiveGame] = useState<GameEntry | null>(null);
  const [copiedServer, setCopiedServer] = useState<string | null>(null);
  const copyServerAddress = async (address: string) => {
    try { await navigator.clipboard.writeText(address); setCopiedServer(address); }
    catch { setCopiedServer(null); }
  };

  if (activeGame?.url) {
    return (
      <div className={styles.hub}>
        <GuildConsolePlayer title={activeGame.title} url={activeGame.url} onExit={() => setActiveGame(null)} />
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

      <section className={styles.grid} aria-label="Guild game library">
        {games.map((game) => (
          <article className={styles.card} key={game.id}>
            <div className={styles.art} aria-hidden="true"><Gamepad2 size={44} strokeWidth={1.2} /></div>
            <div className={styles.cardBody}>
              <span className={styles.gameBadge}>{game.badge}</span>
              <h2>{game.title}</h2>
              <p className={styles.genre}>{game.genre}</p>
              <p className={styles.description}>{game.description}</p>
              <div className={styles.cardActions}>
                <button type="button" className={styles.playButton} onClick={() => setActiveGame(game)} disabled={!game.url} aria-label={!game.url ? 'The 5 Sleeves 2D launch is waiting for its verified host URL' : `Launch ${game.title} inside The Guild`}><Play size={16} /> {game.url ? 'Launch in Guild' : 'Host URL needed'}</button>
                {game.url && <a href={game.url} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>Open separately <ExternalLink size={14} /></a>}
              </div>
              {!game.url && <p className={styles.hint}>The verified 2D client URL is not configured in this build. Follow the 3D static-hosting pattern where possible; the hub will not guess a production address.</p>}
            </div>
          </article>
        ))}
      </section>

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
