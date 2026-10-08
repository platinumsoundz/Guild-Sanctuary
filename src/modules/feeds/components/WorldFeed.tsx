import type { WorldType } from '@/types';
import { WorldContent } from './WorldContent';
import styles from './WorldFeed.module.css';

interface WorldFeedProps {
  worldType: WorldType;
}

const worldCopy: Record<WorldType, { eyebrow: string; title: string; description: string }> = {
  sanctuary: {
    eyebrow: 'A PLACE TO PAUSE',
    title: 'Grow at your own pace.',
    description: 'A quieter corner for reflection, shared practice, and small acts of care.',
  },
  guild: {
    eyebrow: 'YOUR PEOPLE ARE HERE',
    title: 'Make room for play.',
    description: 'Find your party, share the wins, and see what your community is getting into.',
  },
};

export function WorldFeed({ worldType }: WorldFeedProps) {
  const copy = worldCopy[worldType];

  return (
    <main className={styles.feed}>
      <section className={styles.intro} aria-labelledby="world-title">
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 id="world-title">{copy.title}</h1>
          <p className={styles.description}>{copy.description}</p>
        </div>
        <div className={styles.worldStamp} aria-hidden="true">
          <span>{worldType === 'sanctuary' ? '01' : '02'}</span>
          <span className={styles.stampRule} />
          <span>WORLD</span>
        </div>
      </section>
      <WorldContent worldType={worldType} />
    </main>
  );
}