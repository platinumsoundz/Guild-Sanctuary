#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const handoffDir = join(root, 'supabase', 'handoff');
const migrationsDir = join(root, 'supabase', 'migrations');

function fail(message) {
  console.error(`SQL handoff check failed: ${message}`);
  process.exit(1);
}

function read(file) {
  return readFileSync(join(handoffDir, file), 'utf8');
}

function firstSqlLine(sql) {
  return sql
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('--'));
}

function lastSqlLine(sql) {
  return sql
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('--'))
    .at(-1);
}

const economy = read('economy_migrations.sql');
const all = read('all_migrations.sql');
const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'));

for (const [name, sql] of [
  ['economy_migrations.sql', economy],
  ['all_migrations.sql', all],
]) {
  if (sql.includes('```')) fail(`${name} contains a Markdown code fence`);
  if (firstSqlLine(sql) !== 'begin;') fail(`${name} must start with begin;`);
  if (lastSqlLine(sql) !== 'commit;') fail(`${name} must end with commit;`);
  if (!sql.includes('create table public.token_wallets')) fail(`${name} is missing the token wallet table`);
  if (!sql.includes('create or replace function public.spend_tokens')) fail(`${name} is missing spend_tokens`);
}

const allSources = [...all.matchAll(/^-- Source: supabase\/migrations\/(.+\.sql)$/gm)].map((match) => match[1]);
if (allSources.length !== migrationFiles.length) {
  fail(`all_migrations.sql references ${allSources.length} migrations, but ${migrationFiles.length} exist`);
}

const missing = migrationFiles.filter((file) => !allSources.includes(file));
if (missing.length > 0) fail(`all_migrations.sql is missing: ${missing.join(', ')}`);

// A stale verify file is worse than no verify file: it tells the operator to
// expect an object that the migrations no longer create. Cross-check every
// function and table named in the read-only checks against the migrations.
function quotedIdentifiers(sql, listPattern) {
  const names = new Set();
  for (const match of sql.matchAll(listPattern)) {
    for (const name of match[1].matchAll(/'([a-z0-9_]+)'/gi)) names.add(name[1]);
  }
  return [...names];
}

function definedFunctions(sql) {
  return new Set(
    [...sql.matchAll(/create (?:or replace )?function public\.([a-z0-9_]+)\s*\(/gi)].map((match) => match[1]),
  );
}

function definedTables(sql) {
  return new Set(
    [...sql.matchAll(/create (?:or replace )?(?:table|view) (?:if not exists )?public\.([a-z0-9_]+)/gi)]
      .map((match) => match[1]),
  );
}

const functions = definedFunctions(all);
const tables = definedTables(all);

for (const file of ['verify_all.sql', 'verify_economy.sql']) {
  const sql = read(file);
  const referencedFunctions = quotedIdentifiers(sql, /(?:proname|routine_name)\s+in\s*\(([^)]*)\)/gi);
  for (const name of referencedFunctions) {
    if (!functions.has(name)) fail(`${file} checks for function ${name}, but no migration creates it`);
  }

  const bucketReferences = new Set();
  for (const list of quotedIdentifiers(sql, /(?:\btable_name|tablename)\s+in\s*\(([^)]*)\)/gi)) {
    bucketReferences.add(list);
  }
  for (const name of bucketReferences) {
    if (!tables.has(name)) {
      fail(`${file} checks for table ${name}, but no migration creates it`);
    }
  }
}

console.log(`SQL handoff check passed: ${migrationFiles.length} migrations, no Markdown fences.`);
