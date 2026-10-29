import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync('src/components/TodayDashboard.tsx', 'utf8');
const styles = readFileSync('src/components/TodayDashboard.module.css', 'utf8');
const planner = readFileSync('src/modules/personal-planner/PersonalPlanner.tsx', 'utf8');

assert.match(dashboard, /<h1>Today<\/h1>/, 'Today has its own concise page identity');
assert.match(dashboard, /target: 'planner'/, 'Today links to the full planner rather than duplicating task controls');
assert.match(dashboard, /target: 'feed'/, 'Today links to Community');
assert.match(dashboard, /target: 'wallet'/, 'Today links to the wallet');
assert.doesNotMatch(dashboard, /onboardingTasks|feature-explorer|notesByDate|checkedDates|<textarea|type="checkbox"/, 'Today does not duplicate onboarding, planner tasks, habits, or notes');
assert.match(planner, /notesByDate|PlannerTask|PlannerHabit/, 'the planner retains detailed task, habit, and note management');
assert.match(styles, /@media \(max-width: 720px\)/, 'Today is responsive on mobile');
assert.match(styles, /:focus-visible/, 'Today action cards have keyboard focus styles');
console.log('Today dashboard contract checks passed.');
