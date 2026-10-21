'use client';

import { FeedContent } from './FeedContent';
import styles from './Feed.module.css';

export function Feed() {
  return (
    <main className={styles.feed}>
      <section className={styles.intro} aria-labelledby="feed-title">
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>A PLACE TO PAUSE</p>
          <h1 id="feed-title">Grow at your own pace.</h1>
          <p className={styles.description}>A quieter corner for reflection, shared practice, and small acts of care.</p>
        </div>
        <div className={styles.sanctuaryStamp} aria-hidden="true">
          <span>SANCTUARY</span>
          <span className={styles.stampRule} />
        </div>
      </section>
      <FeedContent />
    </main>
  );
}
