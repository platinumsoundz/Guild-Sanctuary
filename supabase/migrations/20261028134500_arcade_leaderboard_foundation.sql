-- Arcade score leaderboard foundation. This migration is committed for owner review only; do not apply automatically.
create table if not exists public.arcade_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  game_id text not null check (game_id in ('2048','mines','lights','memory','hangman','wordle','tictactoe','connect4','rpsls','hanoi','flood','life','whack','trivia','fifteen','simon','pong','breakout','tetris','sudoku','maze','typing','asteroids','invaders','snake','solitaire','crossword')),
  score integer not null check (score between 0 and 100000000),
  level integer not null check (level between 1 and 10000),
  difficulty text not null check (difficulty in ('chill','standard','expert')),
  elapsed_seconds integer not null check (elapsed_seconds between 0 and 86400),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists arcade_scores_leaderboard_idx
  on public.arcade_scores (game_id, score desc, created_at asc)
  where verified = true;
create index if not exists arcade_scores_player_idx
  on public.arcade_scores (user_id, created_at desc);
alter table public.arcade_scores enable row level security;
revoke all on public.arcade_scores from anon, authenticated;
grant select on public.arcade_scores to anon, authenticated;
drop policy if exists "Public can read verified arcade scores" on public.arcade_scores;
create policy "Public can read verified arcade scores"
  on public.arcade_scores for select to anon, authenticated
  using (verified = true);
-- Intentionally no INSERT/UPDATE/DELETE policy: only a trusted server-side
-- submit endpoint using the service role may insert after validating the run.
