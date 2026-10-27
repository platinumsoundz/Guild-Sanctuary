import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const component = readFileSync(new URL('../src/modules/practice/components/DailyReflection.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/modules/practice/components/DailyReflection.module.css', import.meta.url), 'utf8');
const types = readFileSync(new URL('../src/services/supabase/database.types.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261027150000_create_private_daily_reflections.sql', import.meta.url), 'utf8');

const checks = [
  ['uses account database client, not browser localStorage', /getSupabaseBrowserClient/.test(component) && !/localStorage/.test(component)],
  ['verifies the active Supabase identity before read, write and delete', /auth\.getUser\(\)/.test(component) && /data\.user\.id !== expectedUserId/.test(component) && (component.match(/verifyReflectionOwner\(userId\)/g) ?? []).length === 3],
  ['loads rows using the verified owner id', /from\('daily_reflections'\)[\s\S]*?\.eq\('user_id', ownerId\)/.test(component)],
  ['orders history newest first and bounds the query', /order\('reflection_date', \{ ascending: false \}\)/.test(component) && /\.limit\(90\)/.test(component)],
  ['diary history renders loaded previous entries without a short fixed slice', /Previous reflections/.test(component) && /\.filter\(\(entry\) => entry\.date !== today\)\.map\(\(entry\) =>/.test(component) && !/slice\(0, 7\)/.test(component)],
  ['saves using the verified owner and per-user per-day upsert key', /\.upsert\([\s\S]*?user_id: ownerId[\s\S]*?reflection_date: today[\s\S]*?onConflict: 'user_id,reflection_date'/.test(component)],
  ['never silently falls back to local-only storage', /Nothing has been saved locally/.test(component) && !/localStorage/.test(component)],
  ['guest mode remains read-only', /if \(isGuest\)[\s\S]*?Sign in to save private diary entries/.test(component)],
  ['requires mood and non-empty reflection or intention', /if \(!mood\)/.test(component) && /!intention\.trim\(\) && !reflection\.trim\(\)/.test(component)],
  ['bounds free-text input to schema limits', /maxLength=\{180\}/.test(component) && /maxLength=\{1200\}/.test(component)],
  ['states that the diary is private and not in public feed', /Private to your account/.test(component) && /public feed/.test(component)],
  ['provides confirmed delete-all scoped to the verified owner', /window\.confirm\('Delete all Sanctuary reflections/.test(component) && /\.delete\(\)\.eq\('user_id', ownerId\)/.test(component)],
  ['handles database failures and announces status accessibly', /could not be loaded from your account/.test(component) && /could not be saved to the database/.test(component) && /could not be deleted/.test(component) && /aria-live="polite"/.test(component)],
  ['keeps non-clinical disclaimer and accessible mood fieldset', /not medical advice, diagnosis or treatment/.test(component) && /fieldset/.test(component) && /legend/.test(component)],
  ['mood selector has all five options with semantic radio inputs', /value: 'low'/.test(component) && /value: 'heavy'/.test(component) && /value: 'steady'/.test(component) && /value: 'good'/.test(component) && /value: 'bright'/.test(component) && /type="radio"/.test(component)],
  ['mobile layout uses a compact three-column mood grid', /@media \(max-width: 760px\)[\s\S]*?\.moodOptions \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/.test(styles)],
  ['each mood has its own colour and selected state', /data-mood='low'[\s\S]*?--mood: #64748b/.test(styles) && /data-mood='heavy'[\s\S]*?--mood: #8b5e83/.test(styles) && /data-mood='steady'[\s\S]*?--mood: #b08b35/.test(styles) && /data-mood='good'[\s\S]*?--mood: #36836b/.test(styles) && /data-mood='bright'[\s\S]*?--mood: #c77a35/.test(styles) && /\.moodSelected/.test(styles)],
  ['keyboard focus and reduced-motion preference are respected', /\.moodOption:focus-within/.test(styles) && /prefers-reduced-motion: reduce/.test(styles)],
  ['database types include daily_reflections', /daily_reflections: Table</.test(types)],
  ['migration enables RLS and owner-scoped CRUD policies', /enable row level security/.test(migration) && /for select to authenticated[\s\S]*?auth\.uid\(\) = user_id/.test(migration) && /for insert to authenticated[\s\S]*?auth\.uid\(\) = user_id/.test(migration) && /for update to authenticated[\s\S]*?with check \(auth\.uid\(\) = user_id\)/.test(migration) && /for delete to authenticated[\s\S]*?auth\.uid\(\) = user_id/.test(migration)],
  ['migration denies anonymous grants and enforces one entry per user per day', /revoke all on public\.daily_reflections from anon/.test(migration) && /unique index if not exists daily_reflections_user_day_unique_idx/.test(migration)],
];

for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label);
  assert.ok(passed, label);
}
console.log('Daily Reflection contract checks passed: ' + checks.length + '. Static checks only; authenticated browser/database integration still requires owner-applied migration and live QA.');
