import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const component = readFileSync(new URL('../src/modules/personal-planner/PersonalPlanner.tsx', import.meta.url), 'utf8');

const checks = [
  ['habits are part of the same local-only planner record', /type PlannerHabit/.test(component) && /habits: PlannerHabit\[\]/.test(component)],
  ['existing version-one planner records remain compatible when habits are absent', component.includes('Array.isArray(candidate.habits)') && component.includes(': []')],
  ['habit titles are bounded and the habit list has a maximum size', /MAX_HABIT_LENGTH = 80/.test(component) && /(?:data|visibleData)\.habits\.length >= 20/.test(component)],
  ['check-ins are stored against the selected local calendar date', /checkedDates\.includes\(selectedDate\)/.test(component) && /checkedDates: dates/.test(component)],
  ['habit check-in dates are validated and de-duplicated on load', /habit\.checkedDates\.every\(\(date\) => typeof date === 'string' && \/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\//.test(component) && /new Set\(habit\.checkedDates\)/.test(component)],
  ['weekly review includes check-ins without assigning a score', /reviewHabitCheckins/.test(component) && /no streaks or penalties/.test(component)],
  ['habit deletion is an explicit action with an accessible name', /aria-label=\{\x60Delete habit: \$\{habit\.title\}\x60\}/.test(component)],
  ['habits stay inside the environment-scoped local export and clear-all flow', /format: `\$\{worldType\}-private-planner-v1`,[\s\S]{0,100}\.{3}(?:data|visibleData)/.test(component) && /setData\(EMPTY_DATA\)/.test(component)],
  ['planner still avoids network calls and AI processing', !/fetch\(|\.from\(['"]/.test(component) && !/openai|anthropic|ai prompt/i.test(component)],
];

for (const [label, passed] of checks) {
  assert.ok(passed, label);
  console.log(`PASS ${label}`);
}
console.log(`Private habit contract: ${checks.length} checks passed.`);
