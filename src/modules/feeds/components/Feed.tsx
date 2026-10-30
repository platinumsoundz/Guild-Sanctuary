'use client';

import { Compass, MessageCircle, PenLine, Sparkles } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { FeedContent } from './FeedContent';
import type { WorldType } from '@/types/database';
import styles from './Feed.module.css';

export function Feed({ worldType = 'sanctuary' }: { worldType?: WorldType }) {
  const { setActiveNavigation } = useAppContext();
  const isGuild = worldType === 'guild';
  return (
    <main className={styles.feed} data-world={worldType}>
      <header className={styles.communityHero}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}><Sparkles size={13} aria-hidden="true" /> {isGuild ? 'THE GUILD NETWORK' : 'YOUR SANCTUARY NETWORK'}</p>
          <h1>{isGuild ? 'Guild community' : 'Community'}</h1>
          <p>Good conversations start here. Share an update, exchange ideas, and find the people and moments worth coming back to.</p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryHeroAction} onClick={() => document.getElementById('community-composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
              <PenLine size={16} aria-hidden="true" /> Share an update
            </button>
            <button type="button" className={styles.secondaryHeroAction} onClick={() => setActiveNavigation('discover')}>
              <Compass size={16} aria-hidden="true" /> Explore Discover
            </button>
          </div>
        </div>
        <div className={styles.heroSide} aria-label="Community highlights">
          <div className={styles.heroSideIcon}><MessageCircle size={22} aria-hidden="true" /></div>
          <strong>A space to connect</strong>
          <span>Posts, reflections, questions and shared interests — all in one feed.</span>
        </div>
      </header>
      <FeedContent worldType={worldType} />
    </main>
  );
}
