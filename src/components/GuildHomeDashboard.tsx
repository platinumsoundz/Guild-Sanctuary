'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GuildPage } from './GuildNavigation';
import { canAccessSanctuaryPage } from '@/lib/sanctuaryFeatureGates';
import {
  ArrowRight, Bell, CalendarDays, Clapperboard, Compass, Gamepad2, Heart,
  Library, MessageCircle, Music2, Play, Search, Settings2, Sparkles, UsersRound
} from 'lucide-react';
import styles from './GuildHomeDashboard.module.css';

type GameId = 'sleeves2d' | 'sleeves3d';
type Recent = { id?: GameId; at?: number };
const RECENTS_KEY = 'guild-library-recents-v1';
const FAVOURITES_KEY = 'guild-library-favourites-v1';
const games: { id: GameId; title: string; subtitle: string; art: string; target: GuildPage }[] = [
  { id: 'sleeves3d', title: 'The 5 Sleeves 3D', subtitle: 'Third-person adventure', art: 'three-d', target: 'arcade' },
  { id: 'sleeves2d', title: 'The 5 Sleeves 2D', subtitle: 'Multiplayer action RPG', art: 'two-d', target: 'arcade' as NavigationState },
];

const destinations: { title: string; description: string; target: NavigationState; icon: typeof UsersRound }[] = [
  { title: 'Community', description: 'Posts and conversations', target: 'feed', icon: UsersRound },
  { title: 'Messages', description: 'Your private chats', target: 'messages', icon: MessageCircle },
  { title: 'Discover', description: 'People and new worlds', target: 'discover', icon: Compass },
  { title: 'Events', description: 'What is happening next', target: 'events', icon: CalendarDays },
  { title: 'Shorts', description: 'Clips from the community', target: 'shorts', icon: Clapperboard },
  { title: 'Music', description: 'Your local music player', target: 'music', icon: Music2 },
];

export function GuildHomeDashboard({ onNavigate, onContinuePlaying, role = 'user', isGuest = false }: { onNavigate: (page: GuildPage) => void; onContinuePlaying?: () => void; role?: string; isGuest?: boolean }) {
  const [recents, setRecents] = useState<Recent[]>([]);
  const [favourites, setFavourites] = useState<GameId[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [nowLabel, setNowLabel] = useState('YOUR GAMING SPACE');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENTS_KEY);
      const parsed = raw ? JSON.parse(raw) as Recent[] : [];
      if (Array.isArray(parsed)) setRecents(parsed.filter((item) => games.some((game) => game.id === item?.id)).slice(0, 8));
      const favRaw = window.localStorage.getItem(FAVOURITES_KEY);
      const favParsed = favRaw ? JSON.parse(favRaw) as GameId[] : [];
      if (Array.isArray(favParsed)) setFavourites(favParsed.filter((id) => games.some((game) => game.id === id)));
    } catch { setRecents([]); setFavourites([]); }
    setLoaded(true);
    const hour = new Date().getHours();
    setNowLabel(hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING');
  }, []);

  const recentGames = useMemo(() => recents.map((record) => games.find((game) => game.id === record.id)).filter((game): game is typeof games[number] => Boolean(game)), [recents]);
  const visibleDestinations = destinations.filter(({ target }) => {
    if (isGuest && (target === 'events' || target === 'shorts')) return false;
    if (target === 'music') return !isGuest;
    return canAccessSanctuaryPage(target, role);
  });
  const featuredGame = recentGames[0] ?? games[0];
  const toggleFavourite = (id: GameId) => {
    const next = favourites.includes(id) ? favourites.filter((item) => item !== id) : [...favourites, id];
    setFavourites(next);
    try { window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next)); } catch { /* Keep this session interactive if storage is unavailable. */ }
  };

  return (
    <main className={styles.page} aria-label="Guild console home">
      <section className={styles.welcomeBar}>
        <div><span className={styles.kicker}>{nowLabel} · THE GUILD</span><h1>Ready for your next session?</h1><p>Your Guild experience has its own community, settings and activity space. Your games, people and favourite spaces, all from one place.</p></div>
        <div className={styles.statusCluster}><span><span className={styles.liveDot} /> CONSOLE ONLINE</span><button type="button" aria-label="Open settings" onClick={() => onNavigate('settings')}><Settings2 size={18} /></button></div>
      </section>

      <section className={styles.hero} aria-label="Featured game">
        <div className={styles.heroArtwork} data-art={featuredGame.art}>
          <div className={styles.artGlow} />
          <div className={styles.heroTopline}><span><Sparkles size={13} /> {recentGames.length ? 'PICK UP WHERE YOU LEFT OFF' : 'FEATURED IN YOUR LIBRARY'}</span><span className={styles.heroIndex}>01 / 02</span></div>
          <div className={styles.heroContent}>
            <span className={styles.gameLabel}>GUILD GAME LIBRARY</span>
            <h2>{featuredGame.title}</h2>
            <p>{featuredGame.subtitle}</p>
            <div className={styles.heroActions}>
              <button type="button" className={styles.playButton} onClick={() => recentGames.length && onContinuePlaying ? onContinuePlaying() : onNavigate('arcade')}><Play size={16} fill="currentColor" /> {recentGames.length ? 'CONTINUE PLAYING' : 'EXPLORE GAMES'}</button>
              <button type="button" className={styles.outlineButton} onClick={() => onNavigate('library')}><Library size={16} /> OPEN LIBRARY</button>
            </div>
          </div>
          <div className={styles.heroOrnament} aria-hidden="true"><Gamepad2 size={104} strokeWidth={0.65} /></div>
        </div>
        <aside className={styles.sidePanel}>
          <div className={styles.sidePanelHead}><span className={styles.kicker}>QUICK RESUME</span><span className={styles.smallStatus}>LOCAL HISTORY</span></div>
          {loaded && recentGames.length ? recentGames.slice(0, 2).map((game) => (
            <button type="button" key={game.id} className={styles.resumeItem} onClick={() => game.id === recentGames[0]?.id && onContinuePlaying ? onContinuePlaying() : onNavigate('library' as NavigationState)}>
              <span className={styles.miniArt} data-art={game.art}><Gamepad2 size={22} /></span><span className={styles.resumeCopy}><strong>{game.title}</strong><small>{game.subtitle}</small></span><Play size={15} />
            </button>
          )) : <div className={styles.emptyResume}><Gamepad2 size={25} /><strong>Your next adventure starts here</strong><span>Launch a game and it will appear here for quick access.</span></div>}
          <button type="button" className={styles.libraryLink} onClick={() => onNavigate('library' as NavigationState)}>VIEW GAME COLLECTION <ArrowRight size={14} /></button>
        </aside>
      </section>

      <section className={styles.railSection} aria-labelledby="games-heading">
        <div className={styles.sectionHeading}><div><span className={styles.kicker}>YOUR COLLECTION</span><h2 id="games-heading">Jump back in</h2></div><button type="button" onClick={() => onNavigate('library' as NavigationState)}>ALL GAMES <ArrowRight size={14} /></button></div>
        <div className={styles.gameRail}>
          {games.map((game) => <article className={styles.gameCard} key={game.id}>
            <button type="button" className={styles.gameArt} data-art={game.art} onClick={() => onNavigate(game.target)} aria-label={`Open ${game.title}`}><span className={styles.artNumber}>{game.id === 'sleeves3d' ? '03' : '02'}</span><Gamepad2 size={42} strokeWidth={1.1} /><span className={styles.artPlay}><Play size={15} fill="currentColor" /></span></button>
            <div className={styles.gameMeta}><div><strong>{game.title}</strong><small>{game.subtitle}</small></div><button type="button" className={styles.favouriteButton} aria-label={favourites.includes(game.id) ? `Remove ${game.title} from favourites` : `Add ${game.title} to favourites`} aria-pressed={favourites.includes(game.id)} onClick={() => toggleFavourite(game.id)}><Heart size={17} fill={favourites.includes(game.id) ? 'currentColor' : 'none'} /></button></div>
          </article>)}
          <button type="button" className={styles.addGameCard} onClick={() => onNavigate('library' as NavigationState)}><span><Search size={23} /></span><strong>Explore library</strong><small>Find more games and links</small></button>
        </div>
      </section>

      <section className={styles.communitySection} aria-labelledby="community-heading">
        <div className={styles.sectionHeading}><div><span className={styles.kicker}>BEYOND THE GAMES</span><h2 id="community-heading">Your Guild</h2></div></div>
        <div className={styles.destinationRail}>{visibleDestinations.map(({ title, description, target, icon: Icon }) => <button type="button" key={title} className={styles.destination} onClick={() => onNavigate(target)}><span className={styles.destinationIcon}><Icon size={19} /></span><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={15} /></button>)}</div>
      </section>

      <footer className={styles.footer}><span><Bell size={14} /> Your notifications and updates are one tap away.</span><button type="button" onClick={() => onNavigate('notifications')}>OPEN NOTIFICATIONS <ArrowRight size={13} /></button></footer>
    </main>
  );
}
