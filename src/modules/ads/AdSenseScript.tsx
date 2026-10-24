import Script from 'next/script';
import { ADSENSE_CLIENT_ID, isValidAdsenseClientId } from './config';

const publisherId = ADSENSE_CLIENT_ID;
const validPublisherId = isValidAdsenseClientId(publisherId);
const adsEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true';
const isProductionDeployment = process.env.VERCEL_ENV === 'production';

/** Loads Google AdSense only when explicitly enabled for a Vercel Production deployment. */
export function AdSenseScript() {
  if (!adsEnabled || !isProductionDeployment || !validPublisherId) return null;

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
