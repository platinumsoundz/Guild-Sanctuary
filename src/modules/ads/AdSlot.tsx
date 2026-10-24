'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './AdSlot.module.css';
import {
  ADSENSE_CLIENT_ID,
  ADS_CONSENT_EVENT,
  isAdsenseConfigured,
  isValidAdSlotId,
} from './config';
import { hasAdsConsent, type AdsConsent } from './consent';

export type AdSlotPlacement = 'feed-sidebar' | 'shorts';
export type AdSlotVariant = 'rail' | 'bottom';

interface AdSlotProps {
  placement: AdSlotPlacement;
  variant?: AdSlotVariant;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

const slotIds: Record<AdSlotPlacement, string | undefined> = {
  'feed-sidebar': process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR,
  shorts: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SHORTS,
};

export function AdSlot({ placement, variant = 'bottom' }: AdSlotProps) {
  const slotId = slotIds[placement];
  const adRef = useRef<HTMLModElement>(null);
  const publisherId = ADSENSE_CLIENT_ID;
  const configured = isAdsenseConfigured() && isValidAdSlotId(slotId);
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
    <aside className={`${styles.container} ${styles[variant]}`} aria-label="Advertisement">
      <span className={styles.label}>Advertisement</span>
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
