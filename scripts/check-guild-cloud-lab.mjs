import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const migration = readFileSync('supabase/migrations/20261028223000_guild_cloud_lab_control_plane.sql', 'utf8');
const architecture = readFileSync('docs/guild-cloud-lab-and-calling-architecture.md', 'utf8');

for (const text of [
  'create table if not exists public.guild_workspace_status',
  'create table if not exists public.guild_workspace_runtime_private',
  'guild_workspace_status_one_per_owner_uidx',
  'references auth.users(id) on delete cascade',
  'enable row level security',
  'user_id = (select auth.uid()) and public.is_active_user()',
  'grant select on public.guild_workspace_status to authenticated',
  'revoke insert, update, delete, truncate, references, trigger on public.guild_workspace_status from authenticated',
  'revoke all on public.guild_workspace_runtime_private from public, anon, authenticated',
  'revoke all on public.guild_workspace_status from public, anon',
  'grant select, insert, update, delete on public.guild_workspace_runtime_private to service_role',
  'provider_instance_id text not null',
  'persistent_volume_ref text not null',
  "state in ('requested', 'starting', 'running', 'stopping', 'stopped', 'error')",
  'disk_quota_mb between 256 and 10240',
  'cpu_limit_millicores between 250 and 2000',
  'memory_limit_mb between 256 and 4096',
  'runtime_limit_minutes between 5 and 240',
  'set search_path = \'\'',
  'set_guild_workspace_status_updated_at',
  'guard_guild_workspace_status_owner',
  'Cloud Lab workspace ownership cannot be changed.',
]) {
  assert.ok(migration.includes(text), `Missing Cloud Lab control-plane contract: ${text}`);
}
assert.ok(architecture.includes('provider credentials in server-side secrets'));
assert.ok(architecture.includes('persistent home storage'));
assert.ok(architecture.includes('spend budgets'));
console.log('Guild Cloud Lab control-plane contract passed.');
