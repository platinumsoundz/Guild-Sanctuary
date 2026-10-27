import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const migration = read('../supabase/migrations/20261027144338_grant_account_settings_write_permissions.sql');
const service = read('../src/modules/settings/service.ts');
const hook = read('../src/modules/settings/useAccountSettings.ts');

const checks = [
  ['migration grants SELECT, INSERT, UPDATE to authenticated', /grant\s+select\s*,\s*insert\s*,\s*update\s+on\s+table\s+public\.account_settings\s+to\s+authenticated\s*;/i.test(migration)],
  ['migration does not grant DELETE or anonymous access', !/grant[^;]*\bdelete\b/i.test(migration) && !/\bto\s+(anon|public)\b/i.test(migration)],
  ['settings save verifies the active Supabase user', /hasMatchingSupabaseUser\(userId\)/.test(service)],
  ['settings save uses user-scoped upsert conflict key', /from\('account_settings'\)[\s\S]*?upsert\(\{\s*user_id:\s*userId[\s\S]*?onConflict:\s*'user_id'/.test(service)],
  ['settings save returns an actionable database error', /Account settings could not be saved to your account: \$\{error\.message\}/.test(service)],
  ['previous account preferences are not exposed while the next account loads', /const visibleSettings = settings\.userId === userId \? settings/.test(hook)],
  ['preference writes are blocked until settings have loaded for the active account', /loadedUserId !== userId \|\| isLoading \|\| settings\.userId !== userId/.test(hook) && /setLoadedUserId\(userId\)/.test(hook)],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Account settings permission contract checks passed: ${checks.length}`);
