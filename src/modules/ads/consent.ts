'use client';

import { ADS_CONSENT_EVENT, ADS_CONSENT_STORAGE_KEY } from './config';

export type AdsConsent = 'granted' | 'denied';

export function getAdsConsent(): AdsConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(ADS_CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function setAdsConsent(value: AdsConsent): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ADS_CONSENT_STORAGE_KEY, value);
  } catch {
    // Storage can be blocked. Keep the in-memory event so the current page
    // still respects the choice.
  }
  window.dispatchEvent(new CustomEvent<AdsConsent>(ADS_CONSENT_EVENT, { detail: value }));
}

export function hasAdsConsent(): boolean {
  return getAdsConsent() === 'granted';
}
