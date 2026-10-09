'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  MaxAdContentRating,
} from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';

interface AdPlacementProps {
  isPaidMember: boolean;
  placement: 'feed' | 'shorts';
}

const testAdUnits = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
};

interface AdMobConsent {
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
}

let sdkInitialization: Promise<AdMobConsent> | null = null;
let lastInterstitialShownAt = 0;
let bannerRequested = false;
const interstitialCooldownMs = 5 * 60 * 1000;

async function initializeAdMob(): Promise<AdMobConsent> {
  if (!sdkInitialization) {
    sdkInitialization = (async () => {
      let consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        consent = await AdMob.showConsentForm();
      }
      const result = {
        canRequestAds: consent.canRequestAds,
        privacyOptionsRequired: consent.privacyOptionsRequirementStatus === 'REQUIRED',
      };
      if (result.canRequestAds) {
        await AdMob.initialize({
          initializeForTesting: process.env.NODE_ENV !== 'production' ||
            process.env.NEXT_PUBLIC_ADMOB_TEST_MODE === 'true',
          maxAdContentRating: MaxAdContentRating.General,
        });
      }
      return result;
    })();
  }

  try {
    const consent = await sdkInitialization;
    if (!consent.canRequestAds) sdkInitialization = null;
    return consent;
  } catch (error) {
    sdkInitialization = null;
    throw error;
  }
}

function getAdUnitId(placement: 'feed' | 'shorts'): string {
  const testMode = process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_ADMOB_TEST_MODE === 'true';
  const adUnitId = placement === 'feed'
    ? process.env.NEXT_PUBLIC_ADMOB_ANDROID_BANNER_ID
    : process.env.NEXT_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID;

  if (testMode) {
    return placement === 'feed' ? testAdUnits.banner : testAdUnits.interstitial;
  }
  if (!adUnitId) {
    throw new Error(`Missing the production AdMob ${placement} ad unit ID.`);
  }
  return adUnitId;
}

export function AdPlacement({ isPaidMember, placement }: AdPlacementProps) {
  const [hasError, setHasError] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [consentVersion, setConsentVersion] = useState(0);

  useEffect(() => {
    let isActive = true;
    let bannerFailureListener: PluginListenerHandle | null = null;
    const isAdPlatform = Capacitor.getPlatform() === 'android';

    const hideBanner = () => {
      if (!isAdPlatform || !bannerRequested) return;
      bannerRequested = false;
      void AdMob.removeBanner().catch((error: unknown) => {
        console.error('AdMob banner cleanup failed.', error);
      });
    };

    if (isPaidMember || !isAdPlatform) {
      hideBanner();
      return () => {
        isActive = false;
      };
    }

    const showPlacement = async () => {
      const consent = await initializeAdMob();
      if (!isActive) return;
      setPrivacyOptionsRequired(consent.privacyOptionsRequired);
      if (!consent.canRequestAds) return;
      const adId = getAdUnitId(placement);
      setHasError(false);

      if (placement === 'feed') {
        bannerFailureListener = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error) => {
          console.error('AdMob banner failed to load.', error);
          if (isActive) setHasError(true);
        });
        if (!isActive) {
          await bannerFailureListener.remove();
          return;
        }
        bannerRequested = true;
        await AdMob.showBanner({
          adId,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
        });
        return;
      }

      if (Date.now() - lastInterstitialShownAt < interstitialCooldownMs) return;
      await AdMob.prepareInterstitial({ adId });
      if (!isActive) return;
      await AdMob.showInterstitial({ adId });
      lastInterstitialShownAt = Date.now();
    };

    void showPlacement().catch((error: unknown) => {
      console.error(`AdMob ${placement} placement failed.`, error);
      if (placement === 'feed') hideBanner();
      if (isActive) setHasError(true);
    });

    return () => {
      isActive = false;
      if (bannerFailureListener) {
        void bannerFailureListener.remove().catch((error: unknown) => {
          console.error('AdMob banner listener cleanup failed.', error);
        });
      }
      hideBanner();
    };
  }, [consentVersion, isPaidMember, placement]);

  const isAdPlatform = Capacitor.getPlatform() === 'android';
  if (isPaidMember || !isAdPlatform) return null;

  const updateConsent = async () => {
    try {
      await AdMob.showPrivacyOptionsForm();
      sdkInitialization = null;
      setConsentVersion((version) => version + 1);
    } catch (error) {
      console.error('AdMob privacy options could not be opened.', error);
      setHasError(true);
    }
  };

  if (!hasError && !privacyOptionsRequired) return null;
  return (
    <aside aria-label="Advertisement options">
      {hasError && <p role="status">Sponsored content is temporarily unavailable.</p>}
      {privacyOptionsRequired && (
        <button type="button" onClick={() => void updateConsent()}>
          Privacy options
        </button>
      )}
    </aside>
  );
}
