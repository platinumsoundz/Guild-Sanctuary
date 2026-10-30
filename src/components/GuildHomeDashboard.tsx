'use client';

import { useEffect, useState } from 'react';
import type { NavigationState } from '@/context/AppContext';
import { CalendarDays, Clapperboard, Gamepad2, Library, MessageSquare, Music2, Search, Settings, ShieldCheck, UsersRound, MessageSquareText } from 'lucide-react';
import styles from './GuildHomeDashboard.module.css';

const destinations: { title: string; description: string; target: NavigationState; icon: typeof Gamepad2; kind: 'featured' | 'community' | 'utility' }[] = [
  { title: 'Game library', description: 'Jump back into your games and saved collection.', target: 'arcade' as NavigationState, icon: Gamepad2, kind: 'featured' },
  { title: 'Community', description: 'Catch up with posts and join the conversation.', target: 'feed', icon: UsersRound, kind: 'community' },
  { title: 'Messages', description: 'Open your private conversations.', target: 'messages', icon: MessageSquare, kind: 'community' },
  { title: 'Events', description: 'Find meetups, activities and upcoming plans.', target: 'events', icon: CalendarDays, kind: 'community' },
  { title: 'Shorts', description: 'Browse short-form clips from the community.', target: 'shorts', icon: Clapperboard, kind: 'community' },
  { title: 'Discover', description: 'Find people and explore profiles.', target: 'discover', icon: Search, kind: 'utility' },
  { title: 'Collection', description: 'Manage your saved games and links.', target: 'library' as NavigationState, icon: Library, kind: 'utility' },
  { title: 'Music lounge', description: 'Open your local music player.', target: 'music' as NavigationState, icon: Music2, kind: 'utility' },
  { title: 'Settings', description: 'Personalise your Guild experience.', target: 'settings', icon: Settings, kind: 'utility' },
  { title: 'Feedback', description: 'Report a bug or suggest an improvement.', target: 'feedback', icon: MessageSquareText, kind: 'utility' },
];

export function GuildHomeDashboard({ onNavigate, onContinuePlaying }: { onNavigate: (page: NavigationState) => void; onContinuePlaying?: () => void }) {
  const [recentTitle, setRecentTitle] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('guild-library-recents-v1');
      const recent = raw ? JSON.parse(raw) as Array<{ id?: string }> : [];
      const first = Array.isArray(recent) ? recent[0]?.id : null;
      setRecentTitle(first === 'sleeves2d' ? 'The 5 Sleeves 2D' : first === 'sleeves3d' ? 'The 5 Sleeves 3D' : null);
    } catch { setRecentTitle(null); }
  }, []);
  const greeting = new Date().getHours() < 12 ? 'Ready when you are.' : new Date().getHours() < 18 ? 'Your next session starts here.' : 'Make this session yours.';
  const featured = destinations[0];
  const FeaturedIcon = featured.icon;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>YOUR CONSOLE</p>
          <h1>{greeting}</h1>
          <p>Games, community, events and your personal space — all in one place. Pick up where you want to go.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => onNavigate(featured.target)}><Gamepad2 size={18} /> Explore games</button>
            <button type="button" className={styles.secondary} onClick={() => onNavigate('feed')}><UsersRound size={18} /> Open community</button>
          </div>
        </div>
        <button type="button" className={styles.featured} onClick={() => onNavigate(featured.target)}>
          <span className={styles.featuredIcon}><FeaturedIcon size={28} /></span>
          <span className={styles.featuredLabel}>FEATURED DESTINATION</span>
          <strong>{featured.title}</strong>
          <span>{featured.description}</span>
          <span className={styles.launch}>Open library <span aria-hidden="true">→</span></span>
        </button>
      </header>

      <section className={styles.continue} aria-labelledby="continue-playing-heading">
        <div>
          <p className={styles.eyebrow}>CONTINUE PLAYING</p>
          <h2 id="continue-playing-heading">{recentTitle ?? 'Your next game is waiting'}</h2>
          <p>{recentTitle ? 'Pick up from your most recently launched game.' : 'Recently launched games will appear here when you start playing.'}</p>
        </div>
        <button type="button" className={styles.secondary} onClick={() => recentTitle && onContinuePlaying ? onContinuePlaying() : onNavigate('library' as NavigationState)}>{recentTitle ? 'Continue playing' : 'Browse games'} <span aria-hidden="true">→</span></button>
      </section>

      <section className={styles.section} aria-labelledby="community-shortcuts">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>QUICK ACCESS</p><h2 id="community-shortcuts">Go where you want</h2></div><span>10 destinations</span></div>
        <div className={styles.grid}>
          {destinations.slice(1).map(({ title, description, target, icon: Icon, kind }) => (
            <button type="button" key={title} className={styles.card} data-kind={kind} onClick={() => onNavigate(target)}>
              <span className={styles.cardIcon}><Icon size={20} /></span><strong>{title}</strong><span>{description}</span><span className={styles.arrow} aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      </section>
      <footer className={styles.footer}><ShieldCheck size={16} /> Your Guild experience has its own community, settings and activity space.</footer>
    </main>
  );
}
