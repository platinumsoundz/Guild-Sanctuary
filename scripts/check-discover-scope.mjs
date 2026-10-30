import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/components/AppWorkspace.tsx');
const discover = read('../src/modules/profiles/components/ProfileDiscovery.tsx');
const discoverCss = read('../src/modules/profiles/components/ProfileDiscovery.module.css');
const events = read('../src/modules/events/service.ts');
const profiles = read('../src/modules/profiles/service.ts');

assert.match(app, /<ProfileDiscovery[\s\S]*?worldType=\{worldType\}/, 'Discover receives the active Guild/Sanctuary scope');
assert.match(discover, /worldType: WorldType/, 'Discover requires an explicit world scope');
assert.match(discover, /fetchEvents\(currentUserId \|\| '', worldType\)/, 'Gathering discovery passes the active world to the event service');
assert.match(discover, /fetchFeed\(worldType\)/, 'Community post discovery passes the active world to the feed service');
assert.match(discover, /fetchPublicProfileById\(authorId\)/, 'Post author labels resolve only through public profile lookup');
assert.match(discover, /\.slice\(0, 100\)/, 'Post author lookup workload is capped for predictable discovery performance');
assert.match(discover, /fetchEvents\(currentUserId \|\| '', worldType\)[\s\S]*?setEvents/, 'Gatherings are loaded through the scoped service');
assert.match(events, /\.eq\('world_type', worldType\)/, 'Event service filters database rows by world');
assert.match(discover, /searchPublicProfiles\(normalizedQuery\)/, 'People search uses the public-profile search service');
assert.match(profiles, /from\('public_profiles'\)/, 'People search reads the public profile projection');
assert.match(discover, /Private reflections are never included/, 'Discover explicitly excludes private reflections');
assert.doesNotMatch(discover, /selfDiscovery|dailyReflection|journalEntries|privateVault/i, 'Private journal and reflection systems are not imported into Discover');
assert.match(discoverCss, /\.eventGrid/, 'Gathering cards have a dedicated responsive layout');
assert.match(discoverCss, /prefers-reduced-motion/, 'Discover respects reduced-motion preferences');

console.log('Discover world-scope and privacy contract checks passed. Static contract only; browser and RLS verification remain required.');
