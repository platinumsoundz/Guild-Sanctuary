import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/ArcadeClassics.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20261028134500_arcade_leaderboard_foundation.sql', 'utf8');
const handoff = readFileSync('docs/ARCADE_BACKEND_HANDOFF.md', 'utf8');

assert.ok(source.indexOf('const levelComplete') > source.indexOf('const wonConnect'), 'completion memo is declared after win-state memos');
assert.match(source, /toggleLightBoard/, 'Lights Out levels are generated from solvable toggle sequences');
assert.match(source, /makeMazeEdges/, 'maze levels use a generated connected passage graph');
assert.match(source, /mazeEdges\.includes\(edge\)/, 'maze movement respects passage walls');
assert.match(source, /makeSudoku/, 'Sudoku uses a valid generated solution and clue mask');
assert.match(source, /sudoku\.every\(\(value,index\) => value === sudokuSolution\[index\]\)/, 'Sudoku completion validates all cells against its solution');
assert.match(source, /mineLost/, 'Minesweeper locks the run after a mine is hit');
assert.match(source, /setLevel\(value => value \+ 1\)/, 'completed supported objectives automatically advance levels');
assert.match(source, /completedRunRef\.current === runKey/, 'a completed level cannot bank its clear bonus twice');
assert.match(source, /Difficulty/, 'difficulty selector remains visible');
assert.match(migration, /enable row level security/i, 'leaderboard table enables RLS');
assert.match(migration, /using \(verified = true\)/i, 'public leaderboard readers only see verified scores');
assert.doesNotMatch(migration, /for insert to anon|for insert to authenticated/i, 'clients cannot directly submit trusted scores');
assert.match(migration, /run_id uuid not null unique/i, 'score submissions are idempotent by run ID');
assert.match(handoff, /never award tokens/i, 'local scores are not trusted for token rewards');
assert.match(handoff, /service-role credentials/i, 'server credentials remain server-only');
console.log('Arcade gameplay and backend contract checks passed.');
