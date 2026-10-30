import Script from 'next/script';
import { ADSENSE_CLIENT_ID, isValidAdsenseClientId } from './config';

const publisherId = ADSENSE_CLIENT_ID;
const validPublisherId = isValidAdsenseClientId(publisherId);
const adsEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true';
const isExplicitProductionDeployment =
  process.env.NEXT_PUBLIC_ADSENSE_ENVIRONMENT === 'production' &&
  process.env.NODE_ENV === 'production';

/**
 * Loads AdSense only when explicitly enabled for a production build.
 * The explicit environment flag works on Vercel and Cloudflare Pages/Workers.
 * Preview environments must leave NEXT_PUBLIC_ADSENSE_ENVIRONMENT unset.
 */
export function AdSenseScript() {
  if (!adsEnabled || !isExplicitProductionDeployment || !validPublisherId) return null;

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
