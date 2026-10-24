'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { ADSENSE_CLIENT_ID, ADS_CONSENT_EVENT, isValidAdsenseClientId } from './config';
import { getAdsConsent, setAdsConsent, type AdsConsent } from './consent';
import styles from './AdsConsent.module.css';

const publisherId = ADSENSE_CLIENT_ID;
const configured = isValidAdsenseClientId(publisherId);

interface AdsConsentProps {
  enabled?: boolean;
}

/**
 * Consent-gated AdSense loader.
 *
 * The script is never injected until the visitor grants advertising consent.
 * The server layout also requires the explicit AdSense flag and an explicitly
 * configured production deployment before mounting this component.
 *
 * Production deployments in the EEA/UK must also use a Google-certified CMP;
 * this local banner is the minimum gate for non-regulated deployments.
 */
export function AdsConsent({ enabled = false }: AdsConsentProps) {
  const [decision, setDecision] = useState<AdsConsent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDecision(getAdsConsent());
    setReady(true);

    const handleChange = (event: Event) => {
      setDecision((event as CustomEvent<AdsConsent>).detail);
    };
    window.addEventListener(ADS_CONSENT_EVENT, handleChange);
    return () => window.removeEventListener(ADS_CONSENT_EVENT, handleChange);
  }, []);

  if (!enabled || !configured || !ready) return null;

  if (decision === 'granted') {
    return (
      <Script
        id="google-adsense"
        async
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
      />
    );
  }

  if (decision === 'denied') return null;

  return (
    <aside className={styles.banner} role="dialog" aria-label="Advertising consent" aria-live="polite">
      <div>
        <strong>Advertising choice</strong>
        <p>
          We can show privacy-respecting ads to keep the community free. Ads are off until you choose.
          Read the <a href="/privacy" className={styles.link}>privacy notice</a>.
        </p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => setAdsConsent('denied')}>
          No ads
        </button>
        <button type="button" className={styles.primary} onClick={() => setAdsConsent('granted')}>
          Allow ads
        </button>
      </div>
    </aside>
  );
}
