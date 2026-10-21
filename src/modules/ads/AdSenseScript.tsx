import Script from 'next/script';
import { ADSENSE_CLIENT_ID, isValidAdsenseClientId } from './config';

const publisherId = ADSENSE_CLIENT_ID;
const validPublisherId = isValidAdsenseClientId(publisherId);

/** Loads Google AdSense only when a valid public publisher ID is configured. */
export function AdSenseScript() {
  if (!validPublisherId) return null;

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
