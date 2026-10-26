-- Short-lived, game-scoped session tickets. The raw token is never stored.
begin;

create table if not exists public.game_wallet_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null check (game_id in ('sleeves-online', 'training-3d')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists game_wallet_sessions_user_game_idx
  on public.game_wallet_sessions (user_id, game_id, expires_at desc);

create index if not exists game_wallet_sessions_expiry_idx
  on public.game_wallet_sessions (expires_at)
  where revoked_at is null;

alter table public.game_wallet_sessions enable row level security;
revoke all privileges on table public.game_wallet_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.game_wallet_sessions to service_role;

commit;
