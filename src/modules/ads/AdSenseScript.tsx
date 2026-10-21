import Script from 'next/script';

const publisherId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
const validPublisherId = publisherId && /^ca-pub-\d+$/.test(publisherId);

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
