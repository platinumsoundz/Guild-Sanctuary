'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Gamepad2, LockKeyhole, Sparkles } from 'lucide-react';
import styles from './GuildRoadmap.module.css';

type Status = 'Available' | 'Preview' | 'In development' | 'Planned' | 'Blocked';

const items = [
  { title: 'Console HUD and quick-access overlay', group: 'Console UI', status: 'In development' as Status, summary: 'Open a compact system panel over the current page or game without losing your place.', more: 'Prioritise Resume, Guild Home, controller status, display/fullscreen, Guild-managed audio, notifications and Exit to Sanctuary. Keep the game mounted behind the panel; test keyboard, touch and physical gamepad behaviour, focus restoration, Escape/B/back and reduced-motion preferences.' },
  { title: 'Console home dashboard and game artwork', group: 'Console UI', status: 'In development' as Status, summary: 'Give Guild a console-style home screen with one featured world, clear Play actions and a strong visual hierarchy.', more: 'Use original artwork for each featured game, a featured-game hero, Continue Playing and compact activity shortcuts. Avoid a grid of equal-weight buttons, generic placeholder art, duplicate navigation or oversized empty headers. Keep the mobile layout fast and readable.' },
  { title: 'Recent games and Continue Playing', group: 'Console UI', status: 'In development' as Status, summary: 'Return quickly to the last-launched game and keep a useful recent-games row.', more: 'Browser-local launch history, favourites, search, readiness filters and empty states are now in source. This is not account sync and it cannot restore an exact gameplay session without game-side save/resume support.' },
  { title: 'Unified Guild search and library filters', group: 'Console UI', status: 'In development' as Status, summary: 'Search the game library now; expand next into a unified controller-friendly Guild search.', more: 'The game library has text search, ready-to-play and favourites filters. Next add search across Guild destinations, an on-screen keyboard and platform filters. Do not claim installed-game discovery without a separate, consent-based desktop companion.' },
  { title: 'Console settings and controller diagnostics', group: 'Console UI', status: 'Planned' as Status, summary: 'Provide a consistent settings centre for display, input, accessibility and Guild-managed audio.', more: 'Include connection diagnostics, keyboard alternatives, touch-control visibility, UI scale, reduced motion, fullscreen guidance, sound preferences and privacy. Label which settings apply to Guild and which depend on a game or browser.' },
  { title: 'Game detail pages and verified progress', group: 'Console UI', status: 'In development' as Status, summary: 'Featured game cards now include launch, input, compatibility and save/progress disclosures.', more: 'Expandable detail panels explain launch method, documented input, host/embed limitations and the current lack of Guild-verified achievements or cloud saves. A richer dedicated detail page and verified game/server progress remain future work.' },
  { title: 'Gaming identity, friends and parties', group: 'Console UI', status: 'Planned' as Status, summary: 'Add an optional gaming profile and social features distinct from Sanctuary spiritual progress.', more: 'Future work includes favourites, friends, invitations and parties. Presence, game activity and sharing must be consent-based and have privacy controls. Keep reward/token spending gated until server-authoritative ownership and abuse protections are verified.' },
  { title: 'Cosmic Guild world', group: 'Experience', status: 'Preview' as Status, summary: 'A hidden, cosmic-themed gaming space inside The Sanctuary.', more: 'The current world is a browser experience. It is not a native desktop app and cannot inspect installed games on your device.' },
  { title: 'Browser arcade and original games', group: 'Games', status: 'Preview' as Status, summary: 'Play Guild browser games with keyboard, touch and controller support.', more: 'Expand game variety, improve controller remapping, add accessible instructions and test game focus, pause and fullscreen on real devices.' },
  { title: 'Cosmic Arcade controller support', group: 'Games', status: 'Preview' as Status, summary: 'Navigate supported arcade experiences with a connected gamepad.', more: 'Controller support varies by browser and device. Continue testing disconnect/reconnect, focus, keyboard alternatives and mobile touch controls.' },
  { title: 'Unified game library', group: 'Library', status: 'In development' as Status, summary: 'Keep track of games and links in one personal library.', more: 'Device-local library, search, platform filtering and JSON backup/restore are implemented in source. Optional account sync depends on a staged database migration and has not been live-verified.' },
  { title: 'Installed-game detection and launch', group: 'Integrations', status: 'Planned' as Status, summary: 'Explore safe ways to discover and launch supported PC games.', more: 'A normal website cannot scan installed apps or launch arbitrary local programs. This needs an optional, explicitly installed desktop companion with narrow permissions and a clear user consent flow.' },
  { title: 'Steam, Xbox, GOG and retro services', group: 'Integrations', status: 'Planned' as Status, summary: 'Connect supported game platforms where authorised access is available.', more: 'Official service links are available. Ownership, achievements, OAuth, native launch and cross-platform sync are not connected. Each integration needs provider approval, secure token storage and user consent.' },
  { title: 'Music lounge and photo gallery', group: 'Media lounge', status: 'Preview' as Status, summary: 'Play music and view a slideshow from files you choose.', more: 'Selected files stay in the current browser session and are not uploaded by default. The UI applies per-file, total-size and file-count limits. Persistent media storage would require a separate opt-in and quota-backed design.' },
  { title: 'Account library sync', group: 'Library', status: 'In development' as Status, summary: 'Keep library entries available across signed-in devices.', more: 'The sync path and owner-scoped migration are staged in the repository. Do not rely on cross-device sync until the migration is reviewed/applied in staging and tested with multiple accounts, deletion, offline edits and quota errors.' },
  { title: 'Cloud Lab: persistent Linux workspace', group: 'Cloud Lab', status: 'Blocked' as Status, summary: 'A future optional Linux workspace with a persistent home directory.', more: 'This is intentionally pinned for later. There is no live terminal or compute provider. A secure release requires isolated compute, encrypted persistent storage, network/egress controls, lifecycle workers, quotas, monitoring and an approved spend limit.' },
  { title: 'Voice and video in the Guild', group: 'Social', status: 'Planned' as Status, summary: 'Bring reliable calling into the Guild experience.', more: 'One-to-one calling is implemented in the Sanctuary direct-message surface, but still needs two-device QA and TURN setup. Group calling would require a suitable SFU service and a separate cost/security review.' },
  { title: 'Guild profiles, quests and achievements', group: 'Progression', status: 'Planned' as Status, summary: 'Add optional progress, goals and achievement tracking.', more: 'No cloud progression, reward economy or cross-game account linking is claimed as live. Design must prevent forged client rewards and keep token spending disabled until server-authoritative checks pass.' },
  { title: 'Privacy, performance and beta testing', group: 'Beta readiness', status: 'In development' as Status, summary: 'Make Guild features understandable, responsive and safe to test.', more: 'Complete mobile/desktop browser testing, keyboard and screen-reader checks, media cleanup, library sync isolation tests, error recovery, performance checks and documented known limitations before broad beta.' },
];

const groups = ['All', 'Console UI', 'Experience', 'Games', 'Library', 'Media lounge', 'Integrations', 'Social', 'Progression', 'Cloud Lab', 'Beta readiness'];

function StatusIcon({ status }: { status: Status }) {
  if (status === 'Available') return <CheckCircle2 size={14} aria-hidden="true" />;
  if (status === 'Blocked') return <LockKeyhole size={14} aria-hidden="true" />;
  if (status === 'In development') return <Sparkles size={14} aria-hidden="true" />;
  return <Clock3 size={14} aria-hidden="true" />;
}

export function GuildRoadmap() {
  const [selectedGroup, setSelectedGroup] = useState('All');
  const visible = useMemo(() => selectedGroup === 'All' ? items : items.filter(item => item.group === selectedGroup), [selectedGroup]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>THE SANCTUARY · GUILD</p>
        <h1>Guild Roadmap</h1>
        <p>The plan for the cosmic gaming world, personal library and media lounge.</p>
        <div className={styles.notice} role="note"><Gamepad2 size={17} aria-hidden="true" /><span>Guild features are built in stages. This page distinguishes working browser features from integrations and infrastructure that are still planned or blocked.</span></div>
      </header>
      <section className={styles.releaseSummary} aria-labelledby="guild-focus-heading">
        <h2 id="guild-focus-heading">What comes next</h2>
        <p>Polish the console HUD and home screen first, verify the two flagship game launch flows, then improve the library and only afterwards expand into optional desktop or cloud features.</p>
        <ul>
          <li>First: upgrade the quick-access HUD, visual hierarchy, game artwork and controller focus states.</li>
          <li>Redesign the home dashboard around Featured World and Continue Playing.</li>
          <li>Test controller, keyboard, touch, fullscreen and return-to-library flows on real devices.</li>
          <li>Verify library sync before relying on it across devices.</li>
          <li>Keep music and photos local unless a member opts into storage.</li>
          <li>Do not launch native scanning or Cloud Lab until their security model is ready.</li>
        </ul>
      </section>
      <div className={styles.sectionHeading}>
        <div><p className={styles.eyebrow}>GUILD FEATURES</p><h2>Explore the plan</h2></div>
        <span className={styles.projectCount}>{visible.length} areas</span>
      </div>
      <nav className={styles.filters} aria-label="Filter Guild roadmap">
        {groups.map(group => <button key={group} type="button" aria-pressed={selectedGroup === group} className={selectedGroup === group ? styles.filterActive : styles.filter} onClick={() => setSelectedGroup(group)}>{group}</button>)}
      </nav>
      <section className={styles.grid} aria-label="Guild roadmap areas">
        {visible.map(item => (
          <article className={styles.card} key={item.title}>
            <div className={styles.cardTop}>
              <span className={styles.group}>{item.group}</span>
              <span className={item.status === 'Available' ? styles.statusAvailable : item.status === 'Blocked' ? styles.statusGated : item.status === 'In development' ? styles.statusPreview : styles.statusPlanned}><StatusIcon status={item.status} />{item.status}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <details className={styles.moreInfo}><summary>More info</summary><p>{item.more}</p></details>
          </article>
        ))}
      </section>
      <footer className={styles.footer}>The Guild shares Sanctuary sign-in, but its roadmap and gaming-specific milestones are tracked separately.</footer>
    </main>
  );
}
