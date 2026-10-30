import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const component = read('../src/modules/personal-planner/PersonalPlanner.tsx');
const migration = read('../supabase/migrations/20261030100000_personal_planner_world_scoped_storage.sql');
const databaseTypes = read('../src/services/supabase/database.types.ts');

const checks = [
  ['habits are part of the account-backed planner record', /type PlannerHabit = \{ id: string; title: string; checkedDates: string\[\]/.test(component) && /habits: PlannerHabit\[\]/.test(component)],
  ['legacy planner records without habits remain compatible', /Array\.isArray\(candidate\.habits\) \?/.test(component) && /: \[\]/.test(component)],
  ['habit titles are bounded and the list has a maximum size', /MAX_HABIT_LENGTH = 80/.test(component) && /visibleData\.habits\.length >= 20/.test(component)],
  ['habit check-ins use the selected calendar date and avoid duplicates', /checkedDates\.includes\(selectedDate\)/.test(component) && /new Set\(\[\.\.\.habit\.checkedDates, selectedDate\]\)/.test(component)],
  ['habit dates are validated and de-duplicated when account data loads', /habit\.checkedDates\.every\(\(date\) => typeof date === 'string' && \/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\//.test(component) && /new Set\(habit\.checkedDates\)/.test(component)],
  ['habit history is bounded to the most recent 366 check-ins', /slice\(-366\)/.test(component)],
  ['weekly review summarizes habit check-ins without scoring members', /weekHabits = visibleData\.habits\.reduce/.test(component) && /\{weekHabits\}[\s\S]{0,80}Habit check-ins/.test(component) && /Progress is information, not a judgement/.test(component)],
  ['habit deletion is an explicit accessible action', /aria-label=\{\x60Delete habit: \$\{habit\.title\}\x60\}/.test(component) && /habits: current\.habits\.filter\(\(item\) => item\.id !== habit\.id\)/.test(component)],
  ['habit changes are saved through the authenticated planner record', /setData\(\(current\) => \(\{[\s\S]{0,200}habits:/.test(component) && /personal_planner_data/.test(component) && /world_type/.test(migration) && /personal_planner_data/.test(databaseTypes)],
  ['planner data remains isolated by account and world with RLS', /primary key \(user_id, world_type\)/i.test(migration) && /enable row level security/i.test(migration) && /auth\.uid\(\)/.test(migration)],
];

for (const [label, passed] of checks) {
  assert.ok(passed, label);
  console.log('PASS ' + label);
}
console.log('Account-backed habit contract: ' + checks.length + ' checks passed.');
