import type { WorldType } from '@/types';
import styles from './WorldContent.module.css';

interface WorldContentProps {
  worldType: WorldType;
}

const content: Record<WorldType, { heading: string; message: string; mark: string }> = {
  sanctuary: {
    heading: 'A little room to begin',
    message: 'Thoughts and reflections from your community will find a home here.',
    mark: 'S',
  },
  guild: {
    heading: 'The hall is yours',
    message: 'Stories, sessions, and updates from your crew will gather here.',
    mark: 'G',
  },
};

export function WorldContent({ worldType }: WorldContentProps) {
  const view = content[worldType];

  return (
    <section className={styles.content} aria-live="polite" aria-labelledby="feed-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.sectionEyebrow}>COMMUNITY</p>
          <h2 id="feed-heading">Your feed</h2>
        </div>
        <span className={styles.sortLabel}>LATEST</span>
      </div>
      <div className={styles.emptyState}>
        <span className={styles.emptyMark} aria-hidden="true">{view.mark}</span>
        <div>
          <h3>{view.heading}</h3>
          <p>{view.message}</p>
        </div>
        <span className={styles.worldLabel}>{worldType === 'sanctuary' ? 'SANCTUARY' : 'GUILD HALL'}</span>
      </div>
    </section>
  );
}