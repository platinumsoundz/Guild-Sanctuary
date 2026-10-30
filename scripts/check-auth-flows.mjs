import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const auth = read('../src/modules/auth/supabaseAuth.ts');
const context = read('../src/context/AppContext.tsx');
const form = read('../src/modules/auth/components/AuthenticationForm.tsx');
const callback = read('../src/app/auth/callback/route.ts');
const resetPage = read('../src/app/reset-password/page.tsx');
const terms = read('../src/modules/auth/terms.ts');
const termsMigration = read('../supabase/migrations/20261030040000_mandatory_terms_acceptance.sql');

const checks = [
  ['signup requires explicit agreement and links to terms', form.includes('type="checkbox"') && form.includes('required') && form.includes('href="/terms"')],
  ['signup records current terms version in Auth metadata', auth.includes('terms_accepted: true') && auth.includes('terms_version: input.termsVersion') && terms.includes('CURRENT_TERMS_VERSION')],
  ['database blocks unaccepted signup and records acceptance', termsMigration.includes('before insert on auth.users') && termsMigration.includes('after insert on auth.users') && termsMigration.includes('terms_acceptances')],
  ['signup uses Supabase password credentials', /auth\.signUp\(\{[\s\S]*?password,[\s\S]*?emailRedirectTo/.test(auth)],
  ['login verifies email and password with Supabase', /auth\.signInWithPassword\(\{[\s\S]*?email:[\s\S]*?password,/.test(auth)],
  ['password reset sends a recovery email to the app callback', /auth\.resetPasswordForEmail\([\s\S]*?redirectTo:[\s\S]*?\/auth\/callback\?next=\/reset-password/.test(auth)],
  ['new passwords are updated through Supabase Auth', /auth\.updateUser\(\{ password \}\)/.test(auth)],
  ['app registration calls the password signup function', /signUpWithSupabasePassword\(input, password\)/.test(context)],
  ['app login calls the password login function', /signInWithSupabasePassword\(email, password\)/.test(context)],
  ['app password reset calls the recovery-email function', /sendSupabasePasswordReset\(email\)/.test(context)],
  ['signup form requires a password confirmation and minimum length', /confirmPassword !== password|password !== confirmPassword/.test(form) && /password\.length < 10/.test(form)],
  ['callback exchanges PKCE codes and verifies token-hash links', /exchangeCodeForSession\(code\)/.test(callback) && /verifyOtp\(/.test(callback)],
  ['recovery callback routes to the reset-password screen', /requestedType === 'recovery' \|\| nextPath === '\/reset-password'/.test(callback)],
  ['reset page requires an active recovery session', /if \(!session\) throw new Error\('This password reset link is invalid or has expired/.test(resetPage)],
  ['reset page submits the new password to Supabase', /client\.auth\.updateUser\(\{ password \}\)/.test(resetPage)],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Auth flow contract checks passed: ${checks.length}`);
