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
  ['planner navigation is wired to the authenticated workspace', /activeNavigation === 'planner'/.test(workspace) && /PersonalPlanner/.test(workspace) && /'planner'/.test(context) && /id: 'planner'/.test(navigation)],
  ['seven-day review derives counts locally without scoring the member', /Your seven-day review/.test(component) && /reviewTasks = useMemo/.test(component) && /not a score or a judgement/.test(component)],
  ['export and deletion provide accessible status feedback', /role="status" aria-live="polite"/.test(component) && /setStatus\('All local planner data was cleared\.'\)/.test(component)],
];

for (const [label, passed] of checks) {
  assert.ok(passed, label);
  console.log(`PASS ${label}`);
}
console.log(`Personal planner contract: ${checks.length} checks passed.`);
