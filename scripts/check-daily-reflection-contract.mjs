import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const component = read('../src/modules/practice/components/DailyReflection.tsx');
const styles = read('../src/modules/practice/components/DailyReflection.module.css');
const types = read('../src/services/supabase/database.types.ts');

const checks = [
  ['normal persistence uses the authenticated Supabase database', /getSupabaseBrowserClient/.test(component) && /from\('daily_reflections'\)/.test(component)],
  ['the current authenticated user is verified before data access', /auth\.getUser\(\)/.test(component) && /data\.user\.id !== expectedUserId/.test(component)],
  ['reads and writes are scoped to the verified owner id', /\.eq\('user_id', ownerId\)/.test(component) && /user_id: ownerId/.test(component)],
  ['history is bounded to 90 entries and sorted newest first', /\.limit\(90\)/.test(component) && /order\('reflection_date', \{ ascending: false \}\)/.test(component)],
  ['one entry per user per day is saved with the unique upsert key', /onConflict: 'user_id,reflection_date'/.test(component)],
  ['delete history is confirmed and restricted to the active owner', /window\.confirm\('Delete all reflections/.test(component) && /\.delete\(\)\.eq\('user_id', ownerId\)/.test(component)],
  ['guest mode remains read-only', /if \(isGuest\)[\s\S]*?Sign in to save private diary entries/.test(component)],
  ['legacy browser entries are read only for an explicit, confirmed import', /localStorage\.getItem\(/.test(component) && /const importBrowserReflections = async/.test(component) && /This uploads private mood and reflection text/.test(component) && !component.includes('localStorage.setItem(') && !component.includes('localStorage.removeItem(')],
  ['existing account entries are not overwritten during import', /ignoreDuplicates: true/.test(component) && /existingDates = new Set\(entries\.map\(\(entry\) => entry\.date\)\)/.test(component)],
  ['legacy import accepts valid ISO dates rather than escaped literal d characters', component.includes('/^\\d{4}-\\d{2}-\\d{2}$/')],
  ['failed loads block editing rather than showing an empty diary as valid', /const sessionReady = loadedKey === key && !loadError/.test(component) && /if \(!sessionReady\)/.test(component)],
  ['the database types include every column used by the reflection component', /daily_reflections: Table<[\s\S]*?reflection_date: string;[\s\S]*?intention: string;[\s\S]*?content: string;[\s\S]*?mood: string \| null;[\s\S]*?updated_at: string;/.test(types)],
  ['the UI states private account storage and public-feed separation', /Private to your account/.test(component) && /public feed/.test(component)],
  ['the feature keeps a non-clinical disclaimer and accessible mood controls', /not medical advice, diagnosis or treatment/.test(component) && /fieldset/.test(component) && /legend/.test(component) && /aria-live="polite"/.test(component)],
  ['responsive and reduced-motion styles remain present', /@media \(max-width: 760px\)/.test(styles) && /prefers-reduced-motion: reduce/.test(styles)],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Daily Reflection database contract checks passed: ${checks.length}. Static checks only; authenticated browser and cross-account testing are still required.`);
