import { readFileSync, existsSync } from 'node:fs';

const requiredFiles = [
  'src/components/SanctuaryHome.tsx',
  'src/components/SanctuaryHome.module.css',
  'src/modules/profiles/components/SelfDiscovery.tsx',
  'src/modules/profiles/components/SelfDiscovery.module.css',
  'supabase/migrations/20261027050000_persist_private_self_discovery.sql',
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
const selfDiscovery = readFileSync('src/modules/profiles/components/SelfDiscovery.tsx', 'utf8');
const selfDiscoveryMigration = readFileSync('supabase/migrations/20261027050000_persist_private_self_discovery.sql', 'utf8');
const profileCard = readFileSync('src/modules/profiles/components/ProfileCard.tsx', 'utf8');

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
  ['Today links to account-backed Self-discovery Centre', home, /Open my Self-discovery Centre/],
  ['self-discovery produces a private actionable reflection', selfDiscovery, /buildReflection\(answers\).*PRIVATE.*BASED ON YOUR ANSWERS/s],
  ['self-discovery includes communication and learning preferences', selfDiscovery, /key: 'communication'.*key: 'learning'/s],
  ['self-discovery provides tailored learning advice', selfDiscovery, /const learning = .*Experimenting may help new ideas click for you/s],
  ['self-discovery advice is not a diagnosis and stays private', selfDiscovery, /not a mental-health assessment or diagnosis.*not included in your public profile summary/s],
  ['self-discovery answers saved to the website after consent', selfDiscovery, /self_discovery_responses.*upsert/s],
  ['self-discovery uses explicit save consent', selfDiscovery, /I agree to save these answers to my Sanctuary account/],
  ['profile summary sharing starts hidden', selfDiscoveryMigration, /self_discovery_visible boolean not null default false/],
  ['raw answers protected by row-level security', selfDiscoveryMigration, /enable row level security.*auth.uid/s],
  ['public view exposes curated summary only', selfDiscoveryMigration, /case when self_discovery_visible then self_discovery_summary else null end as self_discovery_summary/],
  ['profile card supports published summary only', profileCard, /selfDiscoverySummary && Object.keys/],
  ['zodiac prompt does not request date of birth', selfDiscovery, /not your date of birth/],
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
