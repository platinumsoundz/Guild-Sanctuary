import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const nextVersion = lock.packages?.['node_modules/next']?.version;
const envVersion = lock.packages?.['node_modules/@next/env']?.version;
const nextSpec = packageJson.dependencies?.next;

function atLeast(version, minimum) {
  const a = version.split('.').map(Number);
  const b = minimum.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
  }
  return true;
}

assert.ok(nextVersion && atLeast(nextVersion, '16.4.1'), 'Next.js must be at least 16.4.1 to include the October 2026 critical security fixes');
assert.equal(envVersion, nextVersion, '@next/env must match the locked Next.js version');
assert.ok(typeof nextSpec === 'string' && nextSpec.startsWith('^16.4.') && atLeast(nextSpec.slice(1), '16.4.1'), 'package.json must keep Next.js on the patched 16.4.x line');
for (const name of Object.keys(lock.packages).filter((key) => key.startsWith('node_modules/@next/swc-'))) {
  assert.equal(lock.packages[name].version, nextVersion, name + ' must match the locked Next.js version');
  assert.ok(lock.packages[name].integrity?.startsWith('sha512-'), name + ' must retain package integrity verification');
}
const sharpVersion = lock.packages?.['node_modules/sharp']?.version;
assert.ok(sharpVersion && atLeast(sharpVersion, '0.35.5'), 'sharp must be at least 0.35.5 for the SVG processing mitigation');
console.log('Framework security contract passed: patched Next.js, aligned SWC/env packages, and safe sharp version are locked.');
