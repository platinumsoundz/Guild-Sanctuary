'use client';

import { useMemo, useState } from 'react';
import { Activity, BellRing, CheckCircle2, CircleDashed, Clock3, Gamepad2, ShieldCheck, WalletCards } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import styles from './SanctuaryRoadmap.module.css';

type Status = 'Available' | 'Preview' | 'Planned' | 'Security gated';

const systems: { title: string; group: string; status: Status; description: string }[] = [
  { title: 'Community feed', group: 'Community', status: 'Available', description: 'Browse and share community posts.' },
  { title: 'Profiles and discovery', group: 'Community', status: 'Available', description: 'Manage your profile and discover other members.' },
  { title: 'Private messages', group: 'Community', status: 'Preview', description: 'Messaging interface is available, but conversations use demo storage until the live schema, access policies and Realtime are verified.' },
  { title: 'Short-form video', group: 'Community', status: 'Available', description: 'The Shorts experience and media feed.' },
  { title: 'Events and meetups', group: 'Community', status: 'Preview', description: 'Calendar and meetup tools; parts of the experience remain placeholders.' },
  { title: 'Notifications centre', group: 'Community', status: 'Preview', description: 'Database-backed likes/comments and persistent read state are wired, with periodic refresh while signed in. Realtime push and full end-to-end production verification remain outstanding.' },
  { title: 'Games Hub', group: 'Games', status: 'Preview', description: 'A single place to open The 5 Sleeves game experiences.' },
  { title: 'The 5 Sleeves 2D', group: 'Games', status: 'Planned', description: 'The 2D game launcher remains a visible placeholder until the verified production host and launch flow are confirmed.' },
  { title: 'The 5 Sleeves 3D', group: 'Games', status: 'Preview', description: 'Hosted 3D game prototype; device, gameplay and save verification remain outstanding.' },
  { title: 'Shared Sanctuary account / SSO', group: 'Connected systems', status: 'Planned', description: 'One secure identity across Sanctuary and connected games.' },
  { title: 'Cross-game saves and progression', group: 'Connected systems', status: 'Planned', description: 'Shared progress with each game server remaining authoritative.' },
  { title: 'Shared inventory and entitlements', group: 'Connected systems', status: 'Planned', description: 'A unified view of owned items and access rights.' },
  { title: 'Sanctuary Token wallet', group: 'Economy', status: 'Preview', description: 'Wallet interface exists; a shared in-game balance is not yet connected.' },
  { title: 'Token shop and purchases', group: 'Economy', status: 'Security gated', description: 'Checkout and token spending stay disabled until server-side validation and end-to-end security checks pass.' },
  { title: 'Game wallet bridge', group: 'Economy', status: 'Security gated', description: 'Requires short-lived scoped tokens, replay protection, idempotency and audit logs.' },
  { title: 'Trust, safety and reporting', group: 'Safety', status: 'Planned', description: 'Member reporting, review workflows and safety controls.' },
  { title: 'Moderation tools', group: 'Safety', status: 'Planned', description: 'Admin review queues, enforcement history and appeal handling.' },
  { title: 'Privacy and account security', group: 'Safety', status: 'Preview', description: 'Settings are present; some security flows and two-factor enrollment still need integration.' },
  { title: 'Community support and donations', group: 'Economy', status: 'Available', description: 'Support panel and donation return flow.' },
  { title: 'Ads and placement controls', group: 'Operations', status: 'Preview', description: 'Ad slots exist; final provider and policy configuration may vary by deployment.' },
  { title: 'Service health checks and recovery', group: 'Operations', status: 'Planned', description: 'Scheduled checks, actionable incident signals and recovery procedures.' },
  { title: 'Deployment safety and release gates', group: 'Operations', status: 'Planned', description: 'Build verification, deployment checks and safer rollback procedures.' },
  { title: 'Friend requests and connections', group: 'Community', status: 'Planned', description: 'Visible placeholder for friend requests, connection status and pending invitations.' },
  { title: 'Message read receipts and unread counts', group: 'Community', status: 'Planned', description: 'Visible placeholder for read state, unread badges and delivery status; durable messaging must be verified first.' },
  { title: 'Notification preferences and delivery', group: 'Community', status: 'Planned', description: 'Visible placeholder for per-event preferences, delivery channels and notification reliability controls.' },
  { title: 'Guilds, parties and group spaces', group: 'Community', status: 'Planned', description: 'Visible placeholder for community groups, party membership and shared spaces.' },
  { title: 'Quests and achievements', group: 'Games', status: 'Planned', description: 'Visible placeholder for quests, achievements, completion tracking and rewards.' },
  { title: 'Leaderboards and rankings', group: 'Games', status: 'Planned', description: 'Visible placeholder for game-specific rankings and verified season results.' },
  { title: 'Game launcher health and availability', group: 'Games', status: 'Planned', description: 'Visible placeholder for host status, launch readiness and service availability.' },
  { title: 'Shared game identity and account linking', group: 'Connected systems', status: 'Planned', description: 'Visible placeholder for consent-based account linking; no shared sign-in is claimed until implemented and tested.' },
  { title: 'Cloud saves and shared progression', group: 'Connected systems', status: 'Planned', description: 'Visible placeholder for secure cloud saves and per-game authoritative progression.' },
  { title: 'Shared cosmetics and entitlements', group: 'Connected systems', status: 'Planned', description: 'Visible placeholder for owned cosmetics and access rights across supported games.' },
  { title: 'Cosmetics catalogue and redemption', group: 'Economy', status: 'Security gated', description: 'Visible placeholder for frames, borders, profile themes and colours; redemption stays disabled until server-side checks pass.' },
  { title: 'Beta token bonus eligibility', group: 'Economy', status: 'Security gated', description: 'Visible placeholder for the planned verified-account beta grant; no grant is active until eligibility and atomic server-side fulfillment are tested.' },
  { title: 'Stripe test-mode beta checkout', group: 'Economy', status: 'Security gated', description: 'Visible placeholder for isolated staging checkout only; live charges remain disabled.' },
  { title: 'Support tickets and help centre', group: 'Safety', status: 'Planned', description: 'Visible placeholder for help requests, ticket status and support history.' },
  { title: 'Account data export and deletion', group: 'Safety', status: 'Planned', description: 'Visible placeholder for privacy requests, export and deletion workflows; retention rules require verification.' },
  { title: 'PWA installation and offline status', group: 'Operations', status: 'Preview', description: 'Visible install placeholder with browser-dependent availability; offline data is not promised.' },
  { title: 'Accessibility and reduced-motion settings', group: 'Operations', status: 'Planned', description: 'Visible placeholder for accessible display preferences and reduced-motion controls.' },
  { title: 'Patch notes and release announcements', group: 'Operations', status: 'Planned', description: 'Visible placeholder for version notes, planned downtime, feature announcements and maintenance notices.' },
  { title: 'Service status dashboard', group: 'Operations', status: 'Planned', description: 'Visible placeholder for current service health, incidents and component availability backed by real checks.' },
  { title: 'Backup and recovery controls', group: 'Operations', status: 'Security gated', description: 'Visible placeholder for backup verification and recovery runbooks; no destructive recovery action is exposed.' },
  { title: 'Moderation audit history', group: 'Safety', status: 'Planned', description: 'Visible placeholder for traceable moderation actions, reason codes and review history.' },
  { title: 'Member block and mute controls', group: 'Safety', status: 'Planned', description: 'Visible placeholder for blocking, muting and per-member safety preferences.' },
  { title: 'Community guidelines and appeals', group: 'Safety', status: 'Planned', description: 'Visible placeholder for published rules, enforcement explanations and appeal tracking.' },
  { title: 'Profile themes and avatar frames', group: 'Community', status: 'Planned', description: 'Visible placeholder for cosmetic profile customisation, preview and ownership checks.' },
  { title: 'Media upload and processing status', group: 'Community', status: 'Planned', description: 'Visible placeholder for upload progress, validation, processing and failure recovery.' },
  { title: 'Search and saved filters', group: 'Community', status: 'Planned', description: 'Visible placeholder for global search, saved filters and result privacy.' },
  { title: 'Localization and language preferences', group: 'Operations', status: 'Planned', description: 'Visible placeholder for language selection and locale-aware dates and numbers.' },
  { title: 'Beta feedback and bug reports', group: 'Safety', status: 'Planned', description: 'Visible placeholder for submitting feedback with optional diagnostics and status tracking.' },
  { title: 'Account session and device management', group: 'Safety', status: 'Planned', description: 'Visible placeholder for session review, sign-out-other-devices and security alerts.' },
  { title: 'Email delivery diagnostics', group: 'Operations', status: 'Security gated', description: 'Visible placeholder for controlled auth-email smoke tests and delivery status; never expose tokens or private email content.' },
  { title: 'Game save conflict recovery', group: 'Connected systems', status: 'Planned', description: 'Visible placeholder for comparing save timestamps and resolving conflicts without silently overwriting progress.' },
  { title: 'Seasonal events and limited rewards', group: 'Games', status: 'Planned', description: 'Visible placeholder for scheduled events, eligibility and auditable rewards.' },
];


const projects = [
  {
    name: 'Guild Sanctuary',
    scope: 'Community platform',
    status: 'Active build',
    summary: 'Community, identity, moderation, notifications and the shared project roadmap.',
    next: 'Browser/device smoke-test the deployed compact header, dismissible top PWA banner and Arcade placeholders; then complete the controlled password-reset email/redirect test.',
    repo: 'https://github.com/platinumsoundz/Guild-Sanctuary',
    plan: 'https://github.com/platinumsoundz/Guild-Sanctuary/blob/main/MASTER_BLUEPRINT.md',
  },
  {
    name: 'The 5 Sleeves 2D',
    scope: '2D multiplayer RPG',
    status: 'CI green · device check pending',
    summary: 'Village-scale world, six safe cities, wilderness roads, tower rooms, PvE/PvP modes and character progression.',
    next: 'Latest main-branch suite: 145/145 tests passed after refreshing stale assertions. Next: verify the production host and run an owner browser/device smoke test before enabling the Sanctuary launcher.',
    repo: 'https://github.com/platinumsoundz/The-5-Sleeves',
    plan: 'https://github.com/platinumsoundz/The-5-Sleeves/blob/main/ROADMAP.md',
  },
  {
    name: 'The 5 Sleeves 3D',
    scope: '3D game',
    status: 'Prototype · device checks pending',
    summary: 'Playable 3D prototype with exploration, sparring, progression, inventory, skills and a First Tower prototype.',
    next: 'Latest main-branch automated checks pass. Run an owner device/browser pass on the current progression, tower, scan and minimap systems before expanding the feature set.',
    repo: 'https://github.com/platinumsoundz/The-5-Sleeves-3D',
    plan: 'https://github.com/platinumsoundz/The-5-Sleeves-3D/blob/main/docs/roadmap.md',
  },
] as const;

const groups = ['All systems', 'Community', 'Games', 'Connected systems', 'Economy', 'Safety', 'Operations'];

function StatusIcon({ status }: { status: Status }) {
  if (status === 'Available') return <CheckCircle2 size={15} aria-hidden="true" />;
  if (status === 'Security gated') return <ShieldCheck size={15} aria-hidden="true" />;
  if (status === 'Preview') return <Activity size={15} aria-hidden="true" />;
  return <Clock3 size={15} aria-hidden="true" />;
}

export function SanctuaryRoadmap() {
  const [selectedGroup, setSelectedGroup] = useState('All systems');
  const visibleSystems = useMemo(
    () => selectedGroup === 'All systems' ? systems : systems.filter((system) => system.group === selectedGroup),
    [selectedGroup],
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>THE SANCTUARY BLUEPRINT</p>
        <h1>Systems &amp; Roadmap</h1>
        <p>One command centre for Sanctuary and both 5 Sleeves projects. This view separates implemented work from prototypes, planned integrations and release checks still outstanding.</p>
        <div className={styles.notice} role="note">
          <CircleDashed size={17} aria-hidden="true" />
          <span>Statuses are based on repository documentation and available build evidence. A passing code check is not proof of live email delivery, production data persistence, or device-tested gameplay.</span>
        </div>
      </header>
      <section className={styles.projectsSection} aria-labelledby="projects-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>CONNECTED WORKSTREAMS</p>
            <h2 id="projects-heading">Three projects. One roadmap.</h2>
          </div>
          <span className={styles.projectCount}>3 tracked projects</span>
        </div>
        <div className={styles.projectGrid}>
          {projects.map((project) => (
            <article className={styles.projectCard} key={project.name}>
              <div className={styles.projectTop}>
                <span className={styles.projectScope}>{project.scope}</span>
                <span className={styles.projectStatus}><Activity size={13} aria-hidden="true" />{project.status}</span>
              </div>
              <h3>{project.name}</h3>
              <p className={styles.projectSummary}>{project.summary}</p>
              <div className={styles.nextAction}>
                <span>Next milestone</span>
                <p>{project.next}</p>
              </div>
              <div className={styles.projectLinks}>
                <a href={project.repo} target="_blank" rel="noreferrer">Repository <ExternalLink size={13} aria-hidden="true" /></a>
                <a href={project.plan} target="_blank" rel="noreferrer">Project roadmap <ExternalLink size={13} aria-hidden="true" /></a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>PLATFORM CAPABILITIES</p>
          <h2>Sanctuary systems</h2>
        </div>
        <span className={styles.projectCount}>{visibleSystems.length} systems shown</span>
      </div>
      <nav className={styles.filters} aria-label="Filter roadmap systems">
        {groups.map((group) => (
          <button key={group} type="button" aria-pressed={selectedGroup === group} className={selectedGroup === group ? styles.filterActive : styles.filter} onClick={() => setSelectedGroup(group)}>
            {group}
          </button>
        ))}
      </nav>
      <section className={styles.grid} aria-label="Sanctuary system status">
        {visibleSystems.map((system) => (
          <article className={styles.card} key={system.title}>
            <div className={styles.cardTop}>
              <span className={styles.group}>{system.group}</span>
              <span className={system.status === 'Available' ? styles.statusAvailable : system.status === 'Preview' ? styles.statusPreview : system.status === 'Security gated' ? styles.statusGated : styles.statusPlanned}>
                <StatusIcon status={system.status} />{system.status}
              </span>
            </div>
            <h2>{system.title}</h2>
            <p>{system.description}</p>
            {system.status !== 'Available' && (
              <button
                className={styles.placeholderAction}
                type="button"
                disabled
                aria-label={`${system.title}: ${system.status === 'Security gated' ? 'locked until security checks pass' : system.status === 'Preview' ? 'preview only' : 'coming soon'}`}
              >
                {system.status === 'Security gated' ? 'Locked · checks required' : system.status === 'Preview' ? 'Preview only' : 'Coming soon'}
              </button>
            )}
          </article>
        ))}
      </section>
      <footer className={styles.footer}>
        <Gamepad2 size={17} aria-hidden="true" />
        <span>Build rule: one focused, testable change per project at a time. Protect active branches, record evidence, and never describe a prototype or planned integration as live.</span>
        <WalletCards size={17} aria-hidden="true" />
        <BellRing size={17} aria-hidden="true" />
      </footer>
    </main>
  );
}
