// AdSense publisher IDs are public. Allow deployments to override this default.
export const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-8267279636493149';

export const isValidAdsenseClientId = (clientId: string): boolean =>
  /^ca-pub-\d+$/.test(clientId);
