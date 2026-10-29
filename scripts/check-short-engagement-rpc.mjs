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


const migration = readFileSync('supabase/migrations/20261029100000_integrate_short_engagement_and_dm_preferences.sql', 'utf8');
const types = readFileSync('src/services/supabase/database.types.ts', 'utf8');
assert.match(migration, /function public\.get_short_engagement_stats\(requested_short_id uuid\)/, 'The migration must expose the exact read RPC signature');
assert.match(migration, /function public\.toggle_short_like\(requested_short_id uuid\)/, 'The migration must expose the exact like RPC signature');
assert.ok(migration.includes('public.is_active_user()'), 'Both RPCs must retain active-account checks');
assert.ok(migration.includes("public.social_target_is_visible('short'::public.report_target_type, requested_short_id)"), 'Read RPC must enforce visible-target access');
assert.ok(migration.includes('for update;'), 'Like mutations must serialize on the target row');
assert.ok(migration.includes('revoke all on function public.get_short_engagement_stats(uuid) from public, anon;'), 'Read RPC must revoke public/anonymous execution');
assert.ok(migration.includes('revoke all on function public.toggle_short_like(uuid) from public, anon;'), 'Like RPC must revoke public/anonymous execution');
assert.ok(migration.includes('grant execute on function public.get_short_engagement_stats(uuid) to authenticated;'), 'Read RPC execution is limited to authenticated users');
assert.ok(migration.includes('grant execute on function public.toggle_short_like(uuid) to authenticated;'), 'Like RPC execution is limited to authenticated users');
assert.ok(types.includes('get_short_engagement_stats') && types.includes('toggle_short_like'), 'Generated types must include both RPCs');
assert.match(migration, /notify pgrst, 'reload schema';/i, 'The integration migration must explicitly refresh the PostgREST schema cache');
assert.match(migration, /drop trigger if exists sync_profile_message_preference on public\.account_settings/i, 'The DM preference sync trigger must be recreated idempotently');
assert.match(migration, /after insert or update of preferences on public\.account_settings/i, 'The DM preference sync must run when saved account preferences change');

console.log('Short engagement RPC contract checks passed.');
