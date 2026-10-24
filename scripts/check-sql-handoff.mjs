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

console.log(`SQL handoff check passed: ${migrationFiles.length} migrations, no Markdown fences.`);
