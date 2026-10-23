export { AdsConsent } from './AdsConsent';
export { AdSlot } from './AdSlot';
export type { AdSlotPlacement } from './AdSlot';

/*
 * Native AdMob placements are intentionally not re-exported from this barrel.
 * Import them from `@/modules/ads/native` so the Capacitor plugin is never
 * pulled into the web bundle.
 */
