import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const component = readFileSync(new URL('../src/modules/practice/components/DailyReflection.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/modules/practice/components/DailyReflection.module.css', import.meta.url), 'utf8');
const checks = [
  ['reflection data is namespaced per user and versioned', /sanctuary-daily-reflection:v1:\$\{encodeURIComponent\(userId\)\}/.test(component)],
  ['guest mode cannot write reflections', /if \(isGuest\)[\s\S]*?Sign in to keep a reflection/.test(component)],
  ['mood is required before save', /if \(!mood\)[\s\S]*?Choose the mood/.test(component)],
  ['free-text fields have bounded lengths', /maxLength=\{180\}/.test(component) && /maxLength=\{1200\}/.test(component)],
  ['only a bounded history is retained', /\.slice\(0, 90\)/.test(component)],
  ['history deletion requires explicit confirmation', /window\.confirm\('Delete all Sanctuary reflections/.test(component)],
  ['storage errors are handled instead of crashing', /catch[\s\S]*?browser could not save the reflection/.test(component)],
  ['privacy note explains local-only storage and shared-browser risk', /not synced to your account or sent to Sanctuary servers/.test(component) && /may be able to read it/.test(component)],
  ['feature is framed as reflection, not medical care', /not medical advice, diagnosis or treatment/.test(component)],
  ['form and status messaging are accessible', /aria-live="polite"/.test(component) && /fieldset/.test(component) && /legend/.test(component)],
  ['responsive layouts and reduced-motion preferences are respected', /@media \(max-width: 760px\)/.test(styles) && /prefers-reduced-motion: reduce/.test(styles)],
];
for (const [label, passed] of checks) { console.log((passed ? 'PASS ' : 'FAIL ') + label); assert.ok(passed, label); }
console.log('Daily reflection contract checks passed: ' + checks.length + '. Static checks only; browser integration is still required.');
