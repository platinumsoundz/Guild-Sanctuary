'use client';

import { useEffect, useState } from 'react';
import { ADS_CONSENT_EVENT, isAdsenseConfigured } from '@/modules/ads/config';
import { getAdsConsent, setAdsConsent, type AdsConsent } from '@/modules/ads/consent';
import styles from '../SettingsHub.module.css';

export function AdvertisingPanel() {
  const [adsConsent, setAdsConsentState] = useState<AdsConsent | null>(null);
  const adsAvailable = isAdsenseConfigured();

  useEffect(() => {
    setAdsConsentState(getAdsConsent());
    const handleConsent = (event: Event) => {
      setAdsConsentState((event as CustomEvent<AdsConsent>).detail);
    };
    window.addEventListener(ADS_CONSENT_EVENT, handleConsent);
    return () => window.removeEventListener(ADS_CONSENT_EVENT, handleConsent);
  }, []);

  if (!adsAvailable) {
    return null;
  }

  const updateAdsConsent = (value: AdsConsent) => {
    setAdsConsent(value);
    setAdsConsentState(value);
  };

  return (
    <section className={styles.panel} aria-labelledby="ads-title">
      <h2 id="ads-title">Advertising</h2>
      <p className={styles.hint}>
        Google AdSense helps keep The Sanctuary free. Ads are off until you allow them.
        Your choice is stored on this device and can be changed at any time. We do not offer
        tokens or other rewards for viewing ads.
      </p>
      <div className={styles.layoutChoices} role="radiogroup" aria-label="Advertising choice">
        <label>
          <input
            type="radio"
            name="ads-consent"
            checked={adsConsent === 'granted'}
            onChange={() => updateAdsConsent('granted')}
          />
          Allow ads
        </label>
        <label>
          <input
            type="radio"
            name="ads-consent"
            checked={adsConsent === 'denied'}
            onChange={() => updateAdsConsent('denied')}
          />
          No ads
        </label>
      </div>
      {adsConsent === null && <p className={styles.hint}>No choice yet. Ads remain off.</p>}
    </section>
  );
}
