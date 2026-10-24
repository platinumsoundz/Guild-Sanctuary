// AdSense publisher IDs are public. No default is shipped: ads stay disabled
// until a deployment explicitly configures its own publisher ID.
export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '';
export const ADSENSE_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true';

export const isValidAdsenseClientId = (clientId: string): boolean =>
  /^ca-pub-\d+$/.test(clientId);

export const isValidAdSlotId = (slotId: string | undefined): boolean =>
  Boolean(slotId && /^\d+$/.test(slotId));

/**
 * Production is explicit rather than inferred from NODE_ENV, because preview
 * builds are also production builds. Vercel sets VERCEL_ENV; other hosts
 * (including Cloudflare Workers) must set NEXT_PUBLIC_DEPLOYMENT_ENV.
 */
export const isAdsProductionDeployment = (): boolean =>
  process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production';

/**
 * True only when the build has the explicit AdSense flag, a production marker,
 * and a valid public publisher ID. Individual placements still need a slot ID.
 */
export const isAdsenseConfigured = (): boolean =>
  ADSENSE_ENABLED &&
  isAdsProductionDeployment() &&
  isValidAdsenseClientId(ADSENSE_CLIENT_ID);

export const ADS_CONSENT_STORAGE_KEY = 'guild-sanctuary:ads-consent:v1';
export const ADS_CONSENT_EVENT = 'sanctuary:ads-consent';
