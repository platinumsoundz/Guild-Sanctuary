'use client';

import { FeedContent } from './FeedContent';
import styles from './Feed.module.css';

export function Feed() {
  return (
    <main className={styles.feed}>
      <FeedContent />
    </main>
  );
}
