// AdSense publisher IDs are public. No default is shipped: ads stay disabled
// until a deployment explicitly configures its own publisher ID.
export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '';

export const isValidAdsenseClientId = (clientId: string): boolean =>
  /^ca-pub-\d+$/.test(clientId);

export const ADS_CONSENT_STORAGE_KEY = 'guild-sanctuary:ads-consent:v1';
export const ADS_CONSENT_EVENT = 'sanctuary:ads-consent';
