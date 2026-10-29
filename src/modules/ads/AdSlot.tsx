'use client';

import { useEffect, useRef } from 'react';
import styles from './AdSlot.module.css';
import { ADSENSE_CLIENT_ID, isValidAdsenseClientId } from './config';

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
  const adRef = useRef<HTMLModElement>(null);
  const publisherId = ADSENSE_CLIENT_ID;
  const adsEnabled =
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true' &&
    process.env.NEXT_PUBLIC_ADSENSE_ENVIRONMENT === 'production' &&
    process.env.NODE_ENV === 'production';
  const configured =
    adsEnabled &&
    isValidAdsenseClientId(publisherId) &&
    Boolean(slotId && /^\\d+$/.test(slotId));

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
