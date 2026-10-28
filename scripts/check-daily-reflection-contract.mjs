import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const component = readFileSync(new URL('../src/modules/practice/components/DailyReflection.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/modules/practice/components/DailyReflection.module.css', import.meta.url), 'utf8');
const checks = [
  ['reflection storage is scoped to the active authenticated account', /authData\.user\.id !== userId/.test(component) && /from\('daily_reflections'\)/.test(component)],
  ['guest mode cannot write reflections', /if \(isGuest\)[\s\S]*?setReadableKey\(key\)/.test(component) && /if \(isGuest\) \{ setStatus\('Sign in to save a reflection/.test(component)],
  ['account switch does not render prior reflection data while loading', /loadedKey !== key/.test(component) && /setLoadedKey\(null\)/.test(component)],
  ['mood is required before save', /if \(!mood\)[\s\S]*?Choose the mood/.test(component)],
  ['free-text fields have bounded lengths', /maxLength=\{180\}/.test(component) && /maxLength=\{1200\}/.test(component)],
  ['only a bounded history is retained', /\.slice\(0, 90\)/.test(component)],
  ['recent previous entries can be revisited without leaving the planner', /Previous reflections/.test(component) && /\.slice\(0, 7\)/.test(component) && /<details/.test(component)],
  ['history deletion requires explicit confirmation', /window\.confirm\('Delete all Sanctuary reflections saved to your account/.test(component)],
  ['reflection saves to the database rather than localStorage', /\.upsert\(payload, \{ onConflict: 'user_id,reflection_date' \}\)/.test(component) && !/localStorage\.setItem/.test(component)],
  ['legacy local reflection history is imported only when not already present', /const missingEntries = legacyEntries\.filter/.test(component) && /if \(migrateError\)/.test(component) && /localStorage\.removeItem\(key\)/.test(component)],
  ['privacy note explains account-backed storage', /Saved to your Sanctuary account database/.test(component) && /row-level security/.test(component)],
  ['feature is framed as reflection, not medical care', /not medical advice, diagnosis or treatment/.test(component)],
  ['form and status messaging are accessible', /aria-live="polite"/.test(component) && /fieldset/.test(component) && /legend/.test(component)],
  ['responsive layouts and reduced-motion preferences are respected', /@media \(max-width: 760px\)/.test(styles) && /prefers-reduced-motion: reduce/.test(styles)],
];
checks.push(
  ['unavailable database storage fails closed rather than silently falling back to local storage', /Database storage is not configured/.test(component) && /The reflections database could not be reached/.test(component)],
  ['database errors are reported without discarding existing local data', /previous browser reflection copy could not be read/.test(component) && /It has not been changed/.test(component)],
);
for (const [label, passed] of checks) { console.log((passed ? 'PASS ' : 'FAIL ') + label); assert.ok(passed, label); }
console.log('Daily reflection contract checks passed: ' + checks.length + '. Static checks only; browser integration is still required.');
