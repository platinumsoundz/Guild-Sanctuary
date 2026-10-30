import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const component = read('../src/modules/personal-planner/PersonalPlanner.tsx');
const migration = read('../supabase/migrations/20261030100000_personal_planner_world_scoped_storage.sql');
const types = read('../src/services/supabase/database.types.ts');
const workspace = read('../src/components/AppWorkspace.tsx');
const navigation = read('../src/components/Navigation.tsx');
const context = read('../src/context/AppContext.tsx');

const checks = [
  ['planner loads from the authenticated account database', /from\('personal_planner_data'\)/.test(component) && /authData\.user\.id !== userId/.test(component)],
  ['planner records are isolated by account and Sanctuary/Guild world', /\.eq\('user_id', userId\)/.test(component) && /\.eq\('world_type', worldType\)/.test(component) && /onConflict: 'user_id,world_type'/.test(component)],
  ['planner data is not newly written to browser local storage', !/localStorage\.setItem/.test(component)],
  ['legacy browser data is imported only when no database record exists', /if \(!saved\)/.test(component) && /localStorage\.getItem\(storageKey\)/.test(component) && /if \(importError\)/.test(component) && /localStorage\.removeItem\(storageKey\)/.test(component)],
  ['planner hides content and editing until the correct account database record is ready', /const sessionReady = ready && loadedKey === storageKey && databaseReadyKey === storageKey/.test(component) && /const visibleData = sessionReady \? data : EMPTY_DATA/.test(component)],
  ['planner saves through a serialized account-verified queue', /saveQueue\.current = saveQueue\.current/.test(component) && /authData\.user\.id !== userId/.test(component) && /setSaveState\('saved'\)/.test(component)],
  ['database save failures remain visible and retry is available', /setSaveState\('error'\)/.test(component) && /Retry save/.test(component)],
  ['weekly calendar supports previous, next and today navigation', /weekDays/.test(component) && /Previous week/.test(component) && /Next week/.test(component) && /setSelectedDate\(today\)/.test(component)],
  ['tasks support time, category and priority metadata', /dueTime/.test(component) && /priority: newPriority/.test(component) && /category: newCategory/.test(component)],
  ['habit tracking and private daily notes remain available', /toggleHabit/.test(component) && /notesByDate/.test(component) && /Daily note/.test(component)],
  ['weekly review remains non-judgemental', /Your week, at a glance/.test(component) && /Progress is information, not a judgement/.test(component)],
  ['reflection and self-discovery remain available without dominating the planner', /DailyReflection userId=\{userId\}/.test(component) && /SelfDiscoveryCentre key=\{userId\}/.test(component)],
  ['export and clear actions are explicit and accessible', /const exportData = \(\) =>/.test(component) && /onClick=\{exportData\}/.test(component) && /window\.confirm\('Clear all tasks/.test(component) && /role="status" aria-live="polite"/.test(component)],
  ['planner page receives the active world scope and is wired to navigation', /PersonalPlanner userId=\{currentUser\.user\.id\} worldType=\{worldType\}/.test(workspace) && /id: 'planner'/.test(navigation) && /'planner'/.test(context)],
  ['planner database migration uses a composite account/world key', /primary key \(user_id, world_type\)/i.test(migration) && /world_type public\.world_type/.test(migration)],
  ['planner database migration enables owner-scoped RLS and blocks anonymous access', /enable row level security/i.test(migration) && /auth\.uid\(\)\) = user_id/.test(migration) && /revoke all on public\.personal_planner_data from anon, authenticated/i.test(migration)],
  ['planner database types include world-scoped account storage', /personal_planner_data: Table/.test(types) && /world_type: SanctuaryScope/.test(types)],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Personal planner overhaul contract passed: ${checks.length} checks. Static source checks; live browser QA remains required.`);
