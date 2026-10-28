import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const endpoint = readFileSync('supabase/functions/guild-cloud-lab-control/index.ts', 'utf8');
const hub = readFileSync('src/components/GuildCompanionHub.tsx', 'utf8');
const config = readFileSync('supabase/config.toml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

for (const text of [
  "withSupabase({ auth: 'user' }",
  "req.method !== 'POST'",
  "req.headers.get('origin')",
  "origin !== allowedOrigin",
  "ctx.userClaims?.id",
  ".from('profiles')",
  "profile?.status !== 'active'",
  ".from('guild_workspace_status')",
  ".eq('user_id', userId)",
  "'Cache-Control': 'no-store, max-age=0'",
  "RUNTIME_NOT_CONFIGURED",
  "CONTROL_PLANE_UNAVAILABLE",
  "if (body.action !== 'status')",
  "Never change the visible lifecycle state to imply a VM or terminal was started.",
]) {
  assert.ok(endpoint.includes(text), `Missing Cloud Lab endpoint security contract: ${text}`);
}
assert.ok(config.includes('[functions.guild-cloud-lab-control]'));
assert.ok(config.includes('verify_jwt = true'));
assert.equal(packageJson.scripts['check:guild-cloud-lab-control'], 'node scripts/check-guild-cloud-lab-control.mjs');
assert.ok(hub.includes("supabase.functions.invoke('guild-cloud-lab-control', { body: { action: 'status' } })"));
assert.ok(hub.includes('Check workspace status'));
assert.ok(hub.includes('No compute was started.'));
assert.ok(!hub.includes("body: { action: 'start' }"), 'The UI must not expose a non-functional start action.');
console.log('Guild Cloud Lab control endpoint contract passed.');
