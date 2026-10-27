import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const component = readFileSync(new URL('../src/modules/practice/components/DailyReflection.tsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/modules/practice/service.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261027150000_create_private_daily_reflections.sql', import.meta.url), 'utf8');
const checks = [
  ['daily reflections never use browser local storage', !/localStorage|sessionStorage/.test(component + service)],
  ['guest mode cannot write reflections', /if \(isGuest\)[\s\S]*?Sign in to keep a private reflection diary/.test(component)],
  ['account switching clears prior entries while loading', /setEntries\(\[\]\)/.test(component) && /loadedUserId !== userId/.test(component)],
  ['repository verifies authenticated user matches requested account', /auth\.getUser\(\)/.test(service) && /data\.user\.id !== expectedUserId/.test(service)],
  ['reads are scoped to the authenticated owner', /\.eq\('user_id', ownerId\)/.test(service)],
  ['daily save is idempotent through user/date upsert', /onConflict: 'user_id,reflection_date'/.test(service) && /daily_reflections_user_day_unique_idx/.test(migration)],
  ['mood is required before save', /if \(!mood\)[\s\S]*?Choose the mood/.test(component)],
  ['free-text fields have bounded lengths', /maxLength=\{180\}/.test(component) && /maxLength=\{1200\}/.test(component) && /slice\(0, 1200\)/.test(service)],
  ['history is loaded from database and rendered chronologically', /fetchDailyReflections\(userId\)/.test(component) && /\.order\('reflection_date', \{ ascending: false \}\)/.test(service) && /Diary history/.test(component)],
  ['deletion requires confirmation and is scoped to the current owner', /window\.confirm\('Permanently delete every daily reflection/.test(component) && /deleteDailyReflections\(userId\)/.test(component)],
  ['database row security restricts every operation to the owner', /enable row level security/i.test(migration) && /auth\.uid\(\) = user_id/.test(migration) && /revoke all on public\.daily_reflections from anon/i.test(migration)],
  ['database errors are shown instead of claiming a local save', /could not be saved to your account/.test(service) && /setStatus\(error instanceof Error/.test(component)],
  ['reflection content is not published to the public posts feed', !/from\('posts'\)/.test(service + component)],
  ['feature avoids medical diagnosis or treatment claims', /not medical advice, diagnosis or treatment/.test(component)],
  ['form and status messaging are accessible', /aria-live="polite"/.test(component) && /fieldset/.test(component) && /legend/.test(component)],
];
for (const [label, passed] of checks) { console.log((passed ? 'PASS ' : 'FAIL ') + label); assert.ok(passed, label); }
console.log('Daily reflection contract checks passed: ' + checks.length + '. Static checks only; authenticated browser integration is still required.');
