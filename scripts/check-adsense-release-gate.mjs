import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loader = readFileSync('src/modules/ads/AdSenseScript.tsx', 'utf8');
const slot = readFileSync('src/modules/ads/AdSlot.tsx', 'utf8');
const docs = readFileSync('src/modules/ads/README.md', 'utf8');
const adsTxtRoute = readFileSync('src/app/ads.txt/route.ts', 'utf8');

for (const source of [loader, slot]) {
  assert.match(source, /NEXT_PUBLIC_ADSENSE_ENABLED\s*===\s*'true'/, 'Ads must require an explicit enable flag');
  assert.match(source, /NEXT_PUBLIC_ADSENSE_ENVIRONMENT\s*===\s*'production'/, 'Ads must require the platform-neutral production flag');
  assert.match(source, /NODE_ENV\s*===\s*'production'/, 'Ads must never load in a development build');
}
assert.doesNotMatch(loader, /VERCEL_ENV/, 'AdSense loader must not depend on Vercel-specific environment variables');
assert.match(loader, /isValidAdsenseClientId\(publisherId\)/, 'Script must validate the publisher ID');
assert.match(slot, /isValidAdsenseClientId\(publisherId\)/, 'Placements must validate the publisher ID');
assert.match(slot, /NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE/, 'Inline feed slot must remain configurable');
assert.match(slot, /NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR/, 'Sidebar slot must remain configurable');
assert.match(slot, /NEXT_PUBLIC_ADSENSE_SLOT_SHORTS/, 'Shorts slot must remain configurable');
assert.match(docs, /Vercel and Cloudflare/, 'Docs must explain the cross-platform environment configuration');
assert.match(docs, /must not be guessed/, 'Docs must prohibit guessing the ads.txt publisher identity');
assert.match(adsTxtRoute, /NEXT_PUBLIC_ADSENSE_CLIENT_ID/, 'ads.txt must use an explicitly configured publisher ID');
assert.ok(adsTxtRoute.includes("if (!clientId || !/^ca-pub-\\d+$/.test(clientId))"), 'ads.txt must fail closed when publisher ID is missing or invalid');
assert.ok(adsTxtRoute.includes('google.com, ${publisherId}, DIRECT, f08c47fec0942fa0'), 'ads.txt must emit the correctly formatted Google seller record');
assert.doesNotMatch(adsTxtRoute, /ADSENSE_CLIENT_ID\s*from/, 'ads.txt must not use the fallback publisher ID');

console.log('AdSense platform-neutral release-gate checks passed.');
