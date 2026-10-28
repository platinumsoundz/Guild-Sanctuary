import { readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { join } from 'node:path';

const migrationDir = new URL('../supabase/migrations/', import.meta.url);
const files = readdirSync(migrationDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const errors = [];
const versions = new Map();

for (const name of files) {
  const match = /^(\d{14})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/.exec(name);
  if (!match) {
    errors.push(`Migration filename does not match YYYYMMDDHHMMSS_description.sql: ${name}`);
    continue;
  }

  const [, version] = match;
  const prior = versions.get(version);
  if (prior) {
    errors.push(`Duplicate local migration version ${version}: ${prior} and ${name}`);
  } else {
    versions.set(version, name);
  }
}

for (const name of files) {
  console.log(`${errors.some((error) => error.includes(name)) ? 'CHECK' : 'PASS'} ${name}`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL ${error}`);
}
assert.equal(errors.length, 0, 'Local Supabase migration filenames must be valid and have unique version prefixes.');

console.log(`Supabase migration filename contract passed: ${files.length} SQL migrations checked. This validates local filenames only; it does not reconcile the remote migration ledger.`);
