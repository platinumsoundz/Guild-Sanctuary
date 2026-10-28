import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const service = readFileSync(new URL('../src/modules/shorts/service.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261026233000_repair_short_engagement_rpc.sql', import.meta.url), 'utf8');
const types = readFileSync(new URL('../src/services/supabase/database.types.ts', import.meta.url), 'utf8');

assert.match(service, /rpc\('get_short_engagement_stats',\s*\{\s*requested_short_id:\s*shortId\s*\}\)/, 'engagement stats RPC name and argument must match the database function');
assert.match(service, /rpc\('toggle_short_like',\s*\{\s*requested_short_id:\s*shortId\s*\}\)/, 'toggle-like RPC name and argument must match the database function');
assert.ok(service.includes('Short video reactions could not be loaded:'), 'engagement failures must remain visible to the caller');
assert.ok(service.includes('Your reaction could not be saved:'), 'reaction write failures must remain visible to the caller');
assert.match(migration, /function public\.get_short_engagement_stats\(requested_short_id uuid\)/, 'read RPC must expose the expected named UUID argument');
assert.match(migration, /function public\.toggle_short_like\(requested_short_id uuid\)/, 'write RPC must expose the expected named UUID argument');
assert.ok(migration.includes('public.is_active_user()'), 'both RPCs must retain active-account checks');
assert.ok(migration.includes("public.social_target_is_visible('short'::public.report_target_type, requested_short_id)"), 'read RPC must enforce target visibility');
assert.ok(migration.includes('for update;'), 'toggle RPC must serialize concurrent reactions on the target row');
assert.ok(migration.includes('revoke all on function public.get_short_engagement_stats(uuid) from public, anon;'), 'read RPC must not be executable by public or anonymous callers');
assert.ok(migration.includes('revoke all on function public.toggle_short_like(uuid) from public, anon;'), 'write RPC must not be executable by public or anonymous callers');
assert.ok(migration.includes('grant execute on function public.get_short_engagement_stats(uuid) to authenticated;'), 'read RPC must grant execution only to authenticated callers');
assert.ok(migration.includes('grant execute on function public.toggle_short_like(uuid) to authenticated;'), 'write RPC must grant execution only to authenticated callers');
assert.ok(types.includes('get_short_engagement_stats'), 'generated database types must include the read RPC');
assert.ok(types.includes('toggle_short_like'), 'generated database types must include the write RPC');

console.log('Short engagement RPC contract checks passed.');
