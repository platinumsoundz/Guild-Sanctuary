'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './AdSlot.module.css';
import {
  ADSENSE_CLIENT_ID,
  ADSENSE_ENABLED,
  ADS_CONSENT_EVENT,
  isAdsProductionDeployment,
  isValidAdsenseClientId,
} from './config';
import { hasAdsConsent, type AdsConsent } from './consent';

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
  const configured =
    ADSENSE_ENABLED &&
    isAdsProductionDeployment() &&
    isValidAdsenseClientId(publisherId) &&
    Boolean(slotId && /^\d+$/.test(slotId));
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(hasAdsConsent());
    const handleConsent = (event: Event) => {
      setConsented((event as CustomEvent<AdsConsent>).detail === 'granted');
    };
    window.addEventListener(ADS_CONSENT_EVENT, handleConsent);
    return () => window.removeEventListener(ADS_CONSENT_EVENT, handleConsent);
  }, []);

  useEffect(() => {
    if (!configured || !consented || !adRef.current || adRef.current.dataset.adRequested === 'true') return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adRef.current.dataset.adRequested = 'true';
    } catch (error) {
      // Ad blockers, consent controls, and invalid/unapproved units can prevent ad requests.
      console.info('AdSense placement was not requested.', error);
    }
  }, [configured, consented, placement]);

  if (!configured || !consented) return null;

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
