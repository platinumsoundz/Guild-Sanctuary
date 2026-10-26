import Script from 'next/script';
import { ADSENSE_CLIENT_ID, isValidAdsenseClientId } from './config';

const publisherId = ADSENSE_CLIENT_ID;
const validPublisherId = isValidAdsenseClientId(publisherId);
// Host-neutral, explicit opt-in: set true only for the approved production build.
// Keep this false/unset in previews and local development on every hosting provider.
const adsEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true';

/** Loads Google AdSense only when explicitly enabled in the deployment's build environment. */
export function AdSenseScript() {
  if (!adsEnabled || !validPublisherId) return null;

  return (
    <Script
      id="google-adsense"
      async
      strategy="beforeInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
    />
  );
}
