import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loader = readFileSync('src/modules/ads/AdSenseScript.tsx', 'utf8');
const slot = readFileSync('src/modules/ads/AdSlot.tsx', 'utf8');
const docs = readFileSync('src/modules/ads/README.md', 'utf8');

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

console.log('AdSense platform-neutral release-gate checks passed.');
