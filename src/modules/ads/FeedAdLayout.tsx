import type { ReactNode } from 'react';
import { AdSlot } from './AdSlot';
import styles from './FeedAdLayout.module.css';

interface FeedAdLayoutProps {
  children: ReactNode;
}

/**
 * Keeps the feed in its normal reading column and places one responsive ad
 * beside it on wide screens. Below the rail breakpoint the same unit sits at
 * the bottom of the feed instead, so there is no overlay or fixed blocker.
 */
export function FeedAdLayout({ children }: FeedAdLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.feed}>{children}</div>
      <div className={styles.rail}>
        <AdSlot placement="feed-sidebar" variant="rail" />
      </div>
    </div>
  );
}
