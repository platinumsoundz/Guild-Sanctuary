'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, LockKeyhole, Sparkles } from 'lucide-react';
import styles from './SanctuaryRoadmap.module.css';

type Status = 'Available' | 'Preview' | 'In development' | 'Planned' | 'Needs verification';

type RoadmapItem = {
  title: string;
  group: string;
  status: Status;
  summary: string;
  more: string;
};

const items: RoadmapItem[] = [
  { title: 'Community feed', group: 'Community', status: 'Available', summary: 'Share posts and follow what is happening in the community.', more: 'Before beta, complete reporting, privacy, persistence and real-account journey checks across supported devices.' },
  { title: 'Profiles and discovery', group: 'Community', status: 'Available', summary: 'Set up your profile and discover other members.', more: 'Verify visibility settings, profile updates, blocking and account-bound data with multiple test accounts.' },
  { title: 'Short videos', group: 'Community', status: 'Preview', summary: 'Explore short-form community media.', more: 'Confirm upload and playback limits, moderation/reporting, accessibility and failure recovery before calling the experience beta-ready.' },
  { title: 'Messages and calls', group: 'Connect', status: 'Preview', summary: 'Talk privately, with voice and video calling in development.', more: 'Messaging still needs durable conversation verification. Calls need two-device tests for permissions, decline, hang-up, refresh, reconnect and restrictive networks. TURN is not configured, so calls may fail on some networks.' },
  { title: 'Events and meetups', group: 'Connect', status: 'Preview', summary: 'Find community activities and manage event details.', more: 'Verify event creation, RSVP persistence, time zones, cancellation and account permissions against the configured backend.' },
  { title: 'Notifications', group: 'Connect', status: 'Preview', summary: 'See updates and activity in one place.', more: 'Check unread state across sessions, preference controls, delivery reliability and the difference between refresh-based updates and real-time push.' },
  { title: 'Today and personal planning', group: 'Personal growth', status: 'Preview', summary: 'Keep your daily intentions, habits and reflections together.', more: 'Test saving, editing, empty states, private-by-default behaviour, account separation and recovery from network errors.' },
  { title: 'Sanctuary Intelligence', group: 'Personal growth', status: 'Preview', summary: 'Explore self-discovery and personalised learning tools.', more: 'Keep results non-clinical and explainable. Verify consent, data minimisation, private storage, deletion and the accuracy of personalisation.' },
  { title: 'Cosmic Arcade', group: 'Sanctuary features', status: 'Preview', summary: 'Play Sanctuary-built mini-games in a cosmic-themed arcade.', more: 'Test touch, keyboard, controller, reduced motion and game state on mobile and desktop. Token spending and rewards remain disabled until independently verified.' },
  { title: 'Themes and accessibility', group: 'Sanctuary features', status: 'Needs verification', summary: 'Make the app comfortable to use across screens and preferences.', more: 'Run keyboard-only and screen-reader checks, contrast review, reduced-motion checks, zoom/layout testing and real-device visual QA.' },
  { title: 'Account security and privacy', group: 'Safety', status: 'Needs verification', summary: 'Protect accounts and give members control over their information.', more: 'Review authentication, role boundaries, session handling, account export/deletion, data retention and row-level security with independent test accounts.' },
  { title: 'Reporting and moderation', group: 'Safety', status: 'Needs verification', summary: 'Help keep the community respectful and safer.', more: 'Verify report submission, moderator permissions, audit history, enforcement, appeals and abuse-resistant rate limits before opening beta broadly.' },
  { title: 'Support and donations', group: 'Support', status: 'Preview', summary: 'Find ways to support the project.', more: 'Keep checkout disabled until provider settings, webhook verification, refunds, legal copy and test-mode end-to-end flows are confirmed.' },
  { title: 'Reliable data and recovery', group: 'Beta readiness', status: 'In development', summary: 'Make sure important information saves safely and errors are recoverable.', more: 'Separate local/demo data from server-backed data, verify migrations and RLS, test backups and deletion, and provide clear loading, offline and retry states.' },
  { title: 'Release checks and feedback', group: 'Beta readiness', status: 'In development', summary: 'Catch problems before wider testing and make it easy to report them.', more: 'Require a clean CI run, migration review, security and accessibility checks, mobile/desktop smoke tests, known-issues notes and a rollback plan.' },
];

const groups = ['All', 'Community', 'Connect', 'Personal growth', 'Sanctuary features', 'Safety', 'Support', 'Beta readiness'];

function StatusIcon({ status }: { status: Status }) {
  if (status === 'Available') return <CheckCircle2 size={14} aria-hidden="true" />;
  if (status === 'Needs verification') return <LockKeyhole size={14} aria-hidden="true" />;
  if (status === 'In development') return <Sparkles size={14} aria-hidden="true" />;
  return <Clock3 size={14} aria-hidden="true" />;
}

export function SanctuaryRoadmap() {
  const [selectedGroup, setSelectedGroup] = useState('All');
  const visible = useMemo(() => selectedGroup === 'All' ? items : items.filter(item => item.group === selectedGroup), [selectedGroup]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>THE SANCTUARY</p>
        <h1>Roadmap</h1>
        <p>What is ready, what we are improving, and what needs more work before beta.</p>
        <div className={styles.notice} role="note">
          <Clock3 size={17} aria-hidden="true" />
          <span>Roadmap status is a plain-language guide, not a promise that every feature is live or production-ready. Some work still needs real-device, security or backend checks.</span>
        </div>
      </header>
      <section className={styles.releaseSummary} aria-labelledby="beta-heading">
        <h2 id="beta-heading">Our focus before beta</h2>
        <p>Make the core community experience safe, reliable, accessible and easy to understand. We will open up more features as their checks are completed.</p>
        <ul>
          <li>Confirm sign-in, privacy and account boundaries.</li>
          <li>Test saving, messaging and calls with real accounts and devices.</li>
          <li>Check moderation, accessibility and mobile layouts.</li>
          <li>Keep payments and other sensitive actions disabled until verified.</li>
        </ul>
      </section>
      <div className={styles.sectionHeading}>
        <div><p className={styles.eyebrow}>FEATURES</p><h2>What we are working on</h2></div>
        <span className={styles.projectCount}>{visible.length} areas</span>
      </div>
      <nav className={styles.filters} aria-label="Filter roadmap areas">
        {groups.map(group => <button key={group} type="button" aria-pressed={selectedGroup === group} className={selectedGroup === group ? styles.filterActive : styles.filter} onClick={() => setSelectedGroup(group)}>{group}</button>)}
      </nav>
      <section className={styles.grid} aria-label="Sanctuary roadmap areas">
        {visible.map(item => (
          <article className={styles.card} key={item.title}>
            <div className={styles.cardTop}>
              <span className={styles.group}>{item.group}</span>
              <span className={item.status === 'Available' ? styles.statusAvailable : item.status === 'Needs verification' ? styles.statusGated : item.status === 'In development' ? styles.statusPreview : styles.statusPlanned}><StatusIcon status={item.status} />{item.status}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <details className={styles.moreInfo}>
              <summary>More info</summary>
              <p>{item.more}</p>
            </details>
          </article>
        ))}
      </section>
      <footer className={styles.footer}>We will update this page as work is built and verified. A feature moves toward beta only when its checks and known limitations are documented.</footer>
    </main>
  );
}
