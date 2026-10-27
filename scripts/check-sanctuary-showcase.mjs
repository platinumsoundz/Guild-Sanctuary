import { readFileSync, existsSync } from 'node:fs';

const requiredFiles = [
  'src/components/SanctuaryHome.tsx',
  'src/components/SanctuaryHome.module.css',
  'docs/COLLABORATION_GUIDE.md',
  'docs/BETA_TESTING_GUIDE.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
];
const failures = requiredFiles.filter((path) => !existsSync(path));
const home = readFileSync('src/components/SanctuaryHome.tsx', 'utf8');
const context = readFileSync('src/context/AppContext.tsx', 'utf8');
const navigation = readFileSync('src/components/Navigation.tsx', 'utf8');
const workspace = readFileSync('src/components/AppWorkspace.tsx', 'utf8');

for (const [label, source, pattern] of [
  ['visible status labels', home, /Available.*In preview.*In design.*Safety gated/s],
  ['explicit concept disclaimer', home, /CONCEPT PREVIEW.*NOT A LIVE FEATURE/s],
  ['feedback privacy disclosure', home, /does not submit to a server/i],
  ['browser-only onboarding progress', home, /sanctuary\.beta\.onboarding\.v1.*localStorage\.setItem\(onboardingKey/s],
  ['onboarding reset control', home, /Reset progress/],
  ['visible build radar', home, /The build radar.*Direction, not deadlines/s],
  ['preference picker disclosed as local-only', home, /not a live public poll.*only shared if you add it to a feedback report/s],
  ['preference can be added to feedback', home, /My next-feature preference/],
  ['concept modal Escape support', home, /event\.key === 'Escape'/],
  ['paced self-discovery questions', home, /A FEW GENTLE QUESTIONS.*of 4/s],
  ['self-discovery local save requires opt-in', home, /if \(!saveDiscoveryLocally\)/],
  ['self-discovery storage is browser-local', home, /self-discovery/],
  ['profile visibility defaults to private', home, /showDiscoveryOnProfile.*useState/],
  ['profile summary is clearly not published', home, /PROFILE SUMMARY PREVIEW.*NOT PUBLISHED/],
  ['zodiac prompt does not request date of birth', home, /not your date of birth/],
  ['Today route in navigation state', context, /NavigationState = 'today'/],
  ['Today route in navigation menu', navigation, /id: 'today', label: 'Today'/],
  ['Today route connected to workspace', workspace, /activeNavigation === 'today'.*SanctuaryHome/s],
]) {
  if (!pattern.test(source)) failures.push(label);
}

if (failures.length) {
  console.error('Sanctuary showcase contract failed:');
  for (const failure of failures) console.error(' - ' + failure);
  process.exitCode = 1;
} else {
  console.log('Sanctuary showcase contract passed.');
}
