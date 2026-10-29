import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = readFileSync('src/modules/shorts/service.ts', 'utf8');
const engagementStart = service.indexOf('export async function getShortEngagement(');
const engagementEnd = service.indexOf('export async function updateShortComment(', engagementStart);
assert.ok(engagementStart >= 0 && engagementEnd > engagementStart, 'getShortEngagement must remain a distinct service function');
const engagement = service.slice(engagementStart, engagementEnd);

assert.match(engagement, /await requireCommunityStorageUser\(userId\)/, 'Engagement reads must require the signed-in caller before the RPC');
assert.match(engagement, /rpc\('get_short_engagement_stats',\s*\{\s*requested_short_id:\s*shortId,?\s*\}\)/s, 'The RPC name and requested_short_id argument must match the deployed SQL signature');
assert.match(engagement, /Short video reactions could not be loaded: \$\{error\.message\}/, 'The user-facing failure must retain the exact PostgREST error for diagnosis');
assert.match(engagement, /const stats = data\?\.\[0\]/, 'The service must handle the table-returning RPC response shape');
assert.match(engagement, /if \(!stats\) throw new Error\('This short video is unavailable for reactions\.'\)/, 'Missing or invisible shorts must not fabricate engagement stats');

const likeStart = service.indexOf('export async function toggleShortLike(');
const likeEnd = service.indexOf('\nexport async function ', likeStart + 1);
assert.ok(likeStart >= 0 && likeEnd > likeStart, 'toggleShortLike must remain a distinct service function');
const like = service.slice(likeStart, likeEnd);
assert.match(like, /rpc\('toggle_short_like',\s*\{\s*requested_short_id:\s*shortId,?\s*\}\)/s, 'Like mutations must use the same exact argument name');
assert.match(like, /await requireCommunityStorageUser\(userId\)/, 'Like mutations must retain authenticated-user validation');

console.log('Short engagement RPC contract checks passed.');
