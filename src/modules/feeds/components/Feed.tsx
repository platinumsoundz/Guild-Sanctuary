'use client';

import { FeedContent } from './FeedContent';
import type { WorldType } from '@/types/database';
import styles from './Feed.module.css';

export function Feed({ worldType = 'sanctuary' }: { worldType?: WorldType }) {
  return (
    <main className={styles.feed} data-world={worldType}>
      <FeedContent worldType={worldType} />
    </main>
  );
}
