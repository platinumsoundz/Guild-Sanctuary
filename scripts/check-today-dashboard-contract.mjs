import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync('src/components/TodayDashboard.tsx', 'utf8');
const styles = readFileSync('src/components/TodayDashboard.module.css', 'utf8');
const planner = readFileSync('src/modules/personal-planner/PersonalPlanner.tsx', 'utf8');

assert.match(dashboard, /<h1>\{greeting\}\.<\/h1>/, 'Today has a concise personalized greeting');
assert.match(dashboard, /target: 'planner'/, 'Today links to the full planner rather than duplicating task controls');
assert.match(dashboard, /target: 'feed'/, 'Today links to Community');
assert.match(dashboard, /target: 'wallet'/, 'Today links to the wallet');
assert.doesNotMatch(dashboard, /target: 'guild'|Guild Arcade/, 'The Sanctuary Today launcher does not link to Guild or external game projects');
assert.match(dashboard, /target: 'games'/, 'The main launcher links to Cosmic Arcade');
assert.match(dashboard, /target: 'shorts'/, 'The main launcher links to Shorts');
assert.match(dashboard, /target: 'discover'/, 'The toolkit links to member discovery');
assert.match(dashboard, /target: 'messages'/, 'The toolkit links to messages');
assert.match(dashboard, /target: 'events'/, 'The toolkit links to events');
assert.match(dashboard, /aria-labelledby="launch-spaces-title"/, 'The console launcher has a labelled section');
assert.match(dashboard, /aria-labelledby="today-tools-title"/, 'The personal toolkit has a labelled section');
assert.doesNotMatch(dashboard, /onboardingTasks|feature-explorer|notesByDate|checkedDates|<textarea|type="checkbox"/, 'Today does not duplicate onboarding, planner tasks, habits, or notes');
assert.match(planner, /notesByDate|PlannerTask|PlannerHabit/, 'the planner retains detailed task, habit, and note management');
assert.match(styles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/, 'desktop launcher uses a four-column console-style grid');
assert.match(styles, /@media \(max-width: 980px\)/, 'launcher reflows for tablet widths');
assert.match(styles, /@media \(max-width: 560px\)/, 'launcher reflows for phone widths');
assert.match(styles, /:focus-visible/, 'launcher and toolkit cards have keyboard focus styles');
assert.match(styles, /prefers-reduced-motion: reduce/, 'launcher respects reduced-motion preferences');
console.log('Today console launcher contract checks passed.');
