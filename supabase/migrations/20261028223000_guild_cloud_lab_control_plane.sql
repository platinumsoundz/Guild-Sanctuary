-- Cloud Lab control-plane metadata only. This does not provision compute or storage.
-- Keep provider identifiers and volume references out of authenticated client-readable rows.
begin;

create table if not exists public.guild_workspace_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null default 'stopped'
    check (state in ('requested', 'starting', 'running', 'stopping', 'stopped', 'error')),
  disk_quota_mb integer not null default 1024 check (disk_quota_mb between 256 and 10240),
  cpu_limit_millicores integer not null default 500 check (cpu_limit_millicores between 250 and 2000),
  memory_limit_mb integer not null default 1024 check (memory_limit_mb between 256 and 4096),
  runtime_limit_minutes integer not null default 60 check (runtime_limit_minutes between 5 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_started_at timestamptz,
  last_stopped_at timestamptz
);

comment on table public.guild_workspace_status is
  'Safe, owner-readable Cloud Lab lifecycle and quota metadata. No provider IDs, volume references, secrets, or terminal output.';
comment on column public.guild_workspace_status.state is
  'Reported control-plane state only; changing this row does not start or stop compute. Lifecycle actions require an authenticated server-side orchestrator.';

create index if not exists guild_workspace_status_owner_updated_idx
  on public.guild_workspace_status (user_id, updated_at desc);

alter table public.guild_workspace_status enable row level security;

drop policy if exists "Members can read their Cloud Lab status" on public.guild_workspace_status;
create policy "Members can read their Cloud Lab status"
on public.guild_workspace_status for select to authenticated
using (user_id = (select auth.uid()) and public.is_active_user());

grant select on public.guild_workspace_status to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.guild_workspace_status from authenticated;
revoke all on public.guild_workspace_status from anon;

create table if not exists public.guild_workspace_runtime_private (
  workspace_id uuid primary key references public.guild_workspace_status(id) on delete cascade,
  provider text not null check (char_length(btrim(provider)) between 1 and 80),
  provider_instance_id text not null,
  persistent_volume_ref text not null,
  region text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.guild_workspace_runtime_private is
  'Server-only mapping to infrastructure resources. Never expose provider instance identifiers or persistent volume references to browser clients.';

alter table public.guild_workspace_runtime_private enable row level security;
revoke all on public.guild_workspace_runtime_private from anon, authenticated;
revoke all on public.guild_workspace_status from anon;

grant select, insert, update, delete on public.guild_workspace_status to service_role;
grant select, insert, update, delete on public.guild_workspace_runtime_private to service_role;

create or replace function public.set_guild_workspace_status_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists set_guild_workspace_status_updated_at on public.guild_workspace_status;
create trigger set_guild_workspace_status_updated_at
before update on public.guild_workspace_status
for each row execute function public.set_guild_workspace_status_updated_at();

create or replace function public.set_guild_workspace_runtime_private_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists set_guild_workspace_runtime_private_updated_at on public.guild_workspace_runtime_private;
create trigger set_guild_workspace_runtime_private_updated_at
before update on public.guild_workspace_runtime_private
for each row execute function public.set_guild_workspace_runtime_private_updated_at();

commit;
