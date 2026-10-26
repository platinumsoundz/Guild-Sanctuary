'use client';

import { useMemo, useState } from 'react';
import { Activity, BellRing, CheckCircle2, CircleDashed, Clock3, Gamepad2, ShieldCheck, WalletCards } from 'lucide-react';
import styles from './SanctuaryRoadmap.module.css';

type Status = 'Available' | 'Preview' | 'Planned' | 'Security gated';

const systems: { title: string; group: string; status: Status; description: string }[] = [
  { title: 'Community feed', group: 'Community', status: 'Available', description: 'Browse and share community posts.' },
  { title: 'Profiles and discovery', group: 'Community', status: 'Available', description: 'Manage your profile and discover other members.' },
  { title: 'Private messages', group: 'Community', status: 'Available', description: 'Open conversations and message threads.' },
  { title: 'Short-form video', group: 'Community', status: 'Available', description: 'The Shorts experience and media feed.' },
  { title: 'Events and meetups', group: 'Community', status: 'Preview', description: 'Calendar and meetup tools; parts of the experience remain placeholders.' },
  { title: 'Notifications centre', group: 'Community', status: 'Preview', description: 'Database-backed likes/comments and persistent read state are wired, with periodic refresh while signed in. Realtime push and full end-to-end production verification remain outstanding.' },
  { title: 'Games Hub', group: 'Games', status: 'Preview', description: 'A single place to open The 5 Sleeves game experiences.' },
  { title: 'The 5 Sleeves Online', group: 'Games', status: 'Planned', description: 'The verified production host must be configured before launch is enabled.' },
  { title: '3D Training Ground', group: 'Games', status: 'Preview', description: 'Hosted prototype; full device and gameplay verification remains outstanding.' },
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
];


const projects = [
  {
    name: 'Guild Sanctuary',
    scope: 'Community platform',
    status: 'Active build',
    summary: 'Community, identity, moderation, notifications and the shared project roadmap.',
    next: 'Verify the compact-header release on production, then complete the real password-reset email smoke test.',
    repo: 'https://github.com/platinumsoundz/Guild-Sanctuary',
    plan: 'https://github.com/platinumsoundz/Guild-Sanctuary/blob/main/MASTER_BLUEPRINT.md',
  },
  {
    name: 'The 5 Sleeves Online',
    scope: '2D multiplayer RPG',
    status: 'Playable · verification pending',
    summary: 'Village-scale world, six safe cities, wilderness roads, tower rooms, PvE/PvP modes and character progression.',
    next: 'Build one owner-approved gameplay system at a time; verify wilderness balancing, durable account progress and live hosting before calling them complete.',
    repo: 'https://github.com/platinumsoundz/The-5-Sleeves',
    plan: 'https://github.com/platinumsoundz/The-5-Sleeves/blob/main/ROADMAP.md',
  },
  {
    name: 'The 5 Sleeves 3D',
    scope: '3D browser training game',
    status: 'Prototype · device checks pending',
    summary: 'Playable training settlement, sparring, wilderness test route, progression, inventory, skills and First Tower prototype.',
    next: 'Run an owner device/browser pass on the newer progression, tower, scan and minimap systems before expanding the feature set.',
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
