'use client';

import { useEffect, useRef } from 'react';
import styles from './AdSlot.module.css';

export type AdSlotPlacement = 'feed-inline' | 'feed-sidebar' | 'shorts';

interface AdSlotProps {
  placement: AdSlotPlacement;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

const slotIds: Record<AdSlotPlacement, string | undefined> = {
  'feed-inline': process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE,
  'feed-sidebar': process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR,
  shorts: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SHORTS,
};

export function AdSlot({ placement }: AdSlotProps) {
  const slotId = slotIds[placement];
  const adRef = useRef<HTMLElement>(null);
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const configured = Boolean(publisherId && /^ca-pub-\d+$/.test(publisherId) && slotId && /^\d+$/.test(slotId));

  useEffect(() => {
    if (!configured || !adRef.current || adRef.current.dataset.adRequested === 'true') return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adRef.current.dataset.adRequested = 'true';
    } catch (error) {
      // Ad blockers, consent controls, and invalid/unapproved units can prevent ad requests.
      console.info('AdSense placement was not requested.', error);
    }
  }, [configured, placement]);

  if (!configured) return null;

  return (
    <aside className={styles.container} aria-label="Advertisement">
      <ins
        ref={adRef}
        className={`adsbygoogle ${styles.unit}`}
        style={{ display: 'block' }}
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
