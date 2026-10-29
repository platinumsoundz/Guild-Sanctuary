import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const component = read('../src/modules/personal-planner/PersonalPlanner.tsx');
const workspace = read('../src/components/AppWorkspace.tsx');
const navigation = read('../src/components/Navigation.tsx');
const context = read('../src/context/AppContext.tsx');

const checks = [
  ['planner is scoped to the current account in browser storage', /sanctuary-private-planner:v1:\$\{userId\}/.test(component)],
  ['planner does not write prior-account state before loading the new account key', /loadedStorageKey !== storageKey/.test(component) && /setLoadedStorageKey\(storageKey\)/.test(component)],
  ['planner clearly discloses local-only storage and browser-profile access', /Stored on this device only/.test(component) && /Anyone with access to this browser profile/.test(component)],
  ['planner exports data only after an explicit user action', /const exportData = \(\) =>/.test(component) && /onClick=\{exportData\}/.test(component)],
  ['deleting local planner data requires explicit confirmation', component.includes("window.confirm('Delete all planner tasks, habits, check-ins, and daily notes")],
  ['daily notes and task titles have bounded lengths', /MAX_TASK_LENGTH = 120/.test(component) && /MAX_NOTE_LENGTH = 5000/.test(component)],
  ['planner avoids network calls and automatic AI processing', !/fetch\(|\.from\(['"]/.test(component) && !/openai|anthropic|ai prompt/i.test(component)],
  ['daily reflection is part of the planner rather than the community feed', /DailyReflection userId=\{userId\} isGuest=\{false\}/.test(component) && !/DailyReflection userId=\{currentUser\.user\.id\}/.test(workspace)],
  ['planner navigation is wired to the authenticated workspace', /(activeNavigation|contentNavigation) === 'planner'/.test(workspace) && /PersonalPlanner/.test(workspace) && /'planner'/.test(context) && /id: 'planner'/.test(navigation)],
  ['seven-day review derives counts locally without scoring the member', /Your seven-day review/.test(component) && /reviewTasks = useMemo/.test(component) && /not a score or a judgement/.test(component)],
  ['export and deletion provide accessible status feedback', /role="status" aria-live="polite"/.test(component) && /setStatus\('All local planner data was cleared\.'\)/.test(component)],
];

for (const [label, passed] of checks) {
  assert.ok(passed, label);
  console.log(`PASS ${label}`);
}
console.log(`Personal planner contract: ${checks.length} checks passed.`);

const plannerAccountIsolation = read('../src/modules/personal-planner/PersonalPlanner.tsx');
const accountIsolationChecks = [
  ['planner hides in-memory data until the current account storage key is loaded', /const sessionReady = ready && loadedStorageKey === storageKey/.test(plannerAccountIsolation) && /const visibleData = sessionReady \? data : EMPTY_DATA/.test(plannerAccountIsolation)],
  ['planner refuses to write unless storage was successfully read for the same account', /storageWritableKey !== storageKey/.test(plannerAccountIsolation) && /setStorageWritableKey\(storageKey\)/.test(plannerAccountIsolation)],
  ['planner does not persist stale state after a storage read failure', /Never persist another account.s in-memory data when this storage read fails/.test(plannerAccountIsolation) && /setStorageWritableKey\(null\)/.test(plannerAccountIsolation)],
  ['private planner editing and export controls are gated during account transitions', /disabled=\{!sessionReady\}/.test(plannerAccountIsolation) && /disabled=\{!sessionReady \|\|/.test(plannerAccountIsolation)],
];
for (const [label, passed] of accountIsolationChecks) { assert.ok(passed, label); console.log(`PASS ${label}`); }
console.log(`Planner account-isolation contract: ${accountIsolationChecks.length} checks passed.`);

const plannerSessionReset = read('../src/modules/personal-planner/PersonalPlanner.tsx');
assert.ok(/SelfDiscoveryCentre key=\{userId\}/.test(plannerSessionReset), 'session-only self-discovery answers must reset when the planner account changes');
console.log('PASS session-only self-discovery state resets across account changes');
