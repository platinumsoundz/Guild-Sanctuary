import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const settings = read('../src/modules/settings/components/SettingsHub.tsx');
const deletion = read('../src/services/accountDeletion.ts');
const sessionStore = read('../src/modules/auth/sessionStore.ts');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const checks = [
  ['Supabase-configured accounts are not offered local-only deletion', /isSupabaseAuthConfigured\(\)\s*\?\s*\([\s\S]*?Server-account deletion is not available in this screen yet/.test(settings)],
  ['server deletion warning explicitly says no account data is deleted from this screen', /No account data will be deleted here/.test(settings)],
  ['local demo deletion is labelled as local and not server erasure', /permanently removes your local demo account[\s\S]*?cannot securely erase server data/.test(settings)],
  ['the destructive form requires matching email and exact DELETE phrase', /deleteEmail\.trim\(\)\.toLowerCase\(\) !== email\.toLowerCase\(\)/.test(settings) && /deletePhrase !== 'DELETE'/.test(settings)],
  ['deletion service is explicitly named for demo accounts', /export function deleteDemoAccount\(/.test(deletion)],
  ['local deletion revalidates the active session, email, phrase and configured demo 2FA', /export function assertLocalAccountDeletion\([\s\S]*?restoreSession\(\)\?\.user\.id !== userId[\s\S]*?phrase !== 'DELETE'[\s\S]*?MOCK_TWO_FACTOR_CODE/.test(sessionStore)],
  ['the account deletion service removes local settings and user-owned demo content', /removeAccountSettings\(userId\)[\s\S]*?deleteLocalAccount\(userId[\s\S]*?removeUserFeedData\(userId\)[\s\S]*?removeUserEventData\(userId\)[\s\S]*?removeUserConversationData\(userId\)[\s\S]*?removeUserShortData\(userId\)/.test(deletion)],
  ['contract is exposed as a package script', packageJson.scripts?.['check:account-deletion'] === 'node scripts/check-account-deletion-boundary.mjs'],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Account deletion boundary contract checks passed: ${checks.length}`);
