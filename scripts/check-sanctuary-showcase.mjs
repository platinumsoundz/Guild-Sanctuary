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
  ['browser-only onboarding progress', home, /sanctuary\.beta\.onboarding\.v1/.test(home) ? /localStorage\.setItem\(onboardingKey/.test(home) : /$a/.test(home)],
  ['onboarding reset control', home, /Reset progress/.test(home)],
  ['visible build radar', home, /The build radar/.test(home) && /Direction, not deadlines/.test(home)],
  ['concept modal Escape support', home, /event\.key === 'Escape'/.test(home) ? /$a/.test(home) : /$a/.test(home)],
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
