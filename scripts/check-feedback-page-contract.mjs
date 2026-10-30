import { readFileSync } from 'node:fs';

const feedback = readFileSync('src/components/FeedbackCenter.tsx', 'utf8');
const workspace = readFileSync('src/components/AppWorkspace.tsx', 'utf8');
const navigation = readFileSync('src/components/Navigation.tsx', 'utf8');
const home = readFileSync('src/components/SanctuaryHome.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20261030110000_sanctuary_feedback.sql', 'utf8');
const databaseTypes = readFileSync('src/services/supabase/database.types.ts', 'utf8');

const checks = [
  ['feedback form writes to the persistent feedback table', feedback.includes(".from('sanctuary_feedback').insert(")],
  ['guest submissions are supported', feedback.includes("submitter_kind: userId ? 'member' : 'guest'") && migration.includes('to anon, authenticated')],
  ['developer and owner inbox is protected by RLS', migration.includes("p.role in ('developer', 'owner')")],
  ['feedback is a public navigation item', navigation.includes("id: 'feedback', label: 'Feedback'")],
  ['workspace renders feedback for guests too', workspace.includes("contentNavigation === 'feedback'")],
  ['Today no longer contains the first-minutes tour', !home.includes('YOUR FIRST FEW MINUTES') && !home.includes('onboardingTasks')],
  ['The 5 Sleeves is no longer promoted in Sanctuary home', !home.includes('The 5 Sleeves universe') && !home.includes('5 Sleeves')],
  ['feedback schema is typed', databaseTypes.includes('sanctuary_feedback: Table<')],
];
const failed = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
if (failed.length) process.exit(1);
