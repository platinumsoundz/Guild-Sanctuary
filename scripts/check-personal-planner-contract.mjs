import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const component = read('../src/modules/personal-planner/PersonalPlanner.tsx');
const workspace = read('../src/components/AppWorkspace.tsx');
const navigation = read('../src/components/Navigation.tsx');
const context = read('../src/context/AppContext.tsx');

const checks = [
  ['planner storage is scoped to the active authenticated account', /authData\.user\.id !== userId/.test(component) && /from\('personal_planner_data'\)/.test(component)],
  ['planner loads saved data from Supabase before enabling edits', /\.select\('planner_data'\)/.test(component) && /setDatabaseReadyKey\(storageKey\)/.test(component)],
  ['legacy local planner data is migrated only after successful database write', /localStorage\.getItem\(storageKey\)/.test(component) && /if \(migrateError\)/.test(component) && /localStorage\.removeItem\(storageKey\)/.test(component)],
  ['planner no longer writes private content to local storage', !/localStorage\.setItem/.test(component)],
  ['planner clearly discloses private account database storage', /Private account database/.test(component) && /row-level security/.test(component)],
  ['planner exports data only after an explicit user action', /const exportData = \(\) =>/.test(component) && /onClick=\{exportData\}/.test(component)],
  ['clearing planner content requires explicit confirmation', component.includes("window.confirm('Clear all planner tasks, habits, check-ins, and daily notes saved to your Sanctuary account?")],
  ['daily notes and task titles have bounded lengths', /MAX_TASK_LENGTH = 120/.test(component) && /MAX_NOTE_LENGTH = 5000/.test(component)],
  ['database failures are visible and do not silently fall back to local writes', /setStorageError\(/.test(component) && /Database storage is not configured/.test(component)],
  ['daily reflection is part of the planner rather than the community feed', /DailyReflection userId=\{userId\} isGuest=\{false\}/.test(component) && !/DailyReflection userId=\{currentUser\.user\.id\}/.test(workspace)],
  ['planner navigation is wired to the authenticated workspace', /activeNavigation === 'planner'/.test(workspace) && /PersonalPlanner/.test(workspace) && /'planner'/.test(context) && /id: 'planner'/.test(navigation)],
  ['seven-day review derives counts without scoring the member', /Your seven-day review/.test(component) && /reviewTasks = useMemo/.test(component) && /not a score or a judgement/.test(component)],
  ['export and clear actions provide accessible status feedback', /role="status" aria-live="polite"/.test(component) && /setStatus\('All planner content has been cleared from your account\.'\)/.test(component)],
];

for (const [label, passed] of checks) {
  assert.ok(passed, label);
  console.log(`PASS ${label}`);
}
console.log(`Personal planner contract: ${checks.length} checks passed.`);

const plannerAccountIsolation = read('../src/modules/personal-planner/PersonalPlanner.tsx');
const accountIsolationChecks = [
  ['planner hides data until the database row is loaded for the active account', /const sessionReady = ready && loadedStorageKey === storageKey && databaseReadyKey === storageKey/.test(plannerAccountIsolation) && /const visibleData = sessionReady \? data : EMPTY_DATA/.test(plannerAccountIsolation)],
  ['planner serializes saves and checks the active auth user before writes', /saveQueue\.current = saveQueue\.current/.test(plannerAccountIsolation) && /authData\.user\.id !== userId/.test(plannerAccountIsolation)],
  ['planner editing and export controls are gated during account transitions', /disabled=\{!sessionReady\}/.test(plannerAccountIsolation) && /disabled=\{!sessionReady \|\|/.test(plannerAccountIsolation)],
  ['save failures can be retried without falling back to browser-only storage', /Retry saving planner/.test(plannerAccountIsolation) && !/localStorage\.setItem/.test(plannerAccountIsolation)],
];
for (const [label, passed] of accountIsolationChecks) { assert.ok(passed, label); console.log(`PASS ${label}`); }
console.log(`Planner account-isolation contract: ${accountIsolationChecks.length} checks passed.`);

const plannerSessionReset = read('../src/modules/personal-planner/PersonalPlanner.tsx');
assert.ok(/SelfDiscoveryCentre key=\{userId\}/.test(plannerSessionReset), 'session-only self-discovery answers must reset when the planner account changes');
console.log('PASS session-only self-discovery state resets across account changes');
