'use client';

import {
  ArrowRight,
  CalendarDays,
  Compass,
  Gamepad2,
  MessageCircle,
  Search,
  Clapperboard,
  WalletCards,
  UsersRound,
  CalendarCheck,
  type LucideIcon,
} from 'lucide-react';
import type { NavigationState } from '@/context/AppContext';
import styles from './TodayDashboard.module.css';

type LaunchSpace = {
  title: string;
  description: string;
  target: NavigationState;
  icon: LucideIcon;
  eyebrow: string;
  tone: 'guild' | 'arcade' | 'community' | 'shorts';
};

const launchSpaces: LaunchSpace[] = [
  {
    title: 'Guild Arcade',
    description: 'Enter the Guild, explore its world and find community game spaces.',
    target: 'guild',
    icon: Gamepad2,
    eyebrow: 'PLAY & EXPLORE',
    tone: 'guild',
  },
  {
    title: 'Cosmic Arcade',
    description: 'Jump into Sanctuary-built browser games and quick-play experiences.',
    target: 'games',
    icon: Compass,
    eyebrow: 'QUICK PLAY',
    tone: 'arcade',
  },
  {
    title: 'Community',
    description: 'Catch up with posts, share something and join the conversation.',
    target: 'feed',
    icon: UsersRound,
    eyebrow: 'THE COMMUNITY',
    tone: 'community',
  },
  {
    title: 'Shorts',
    description: 'Browse the short-video feed and discover what members are sharing.',
    target: 'shorts',
    icon: Clapperboard,
    eyebrow: 'WATCH & DISCOVER',
    tone: 'shorts',
  },
];

const quickTools: { title: string; description: string; target: NavigationState; icon: LucideIcon }[] = [
  { title: 'Daily Planner', description: 'Tasks, habits, notes and your schedule.', target: 'planner', icon: CalendarCheck },
  { title: 'Discover members', description: 'Find people and explore shared interests.', target: 'discover', icon: Search },
  { title: 'Messages', description: 'Open your conversations and inbox.', target: 'messages', icon: MessageCircle },
  { title: 'Events', description: 'See community events and upcoming plans.', target: 'events', icon: CalendarDays },
  { title: 'Wallet', description: 'Check your token balance and purchase history.', target: 'wallet', icon: WalletCards },
];

export function TodayDashboard({ onNavigate }: { onNavigate: (navigation: NavigationState) => void }) {
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(now);
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <p className={styles.eyebrow}>YOUR SANCTUARY HOME BASE</p>
          <span className={styles.date}>{dateLabel}</span>
        </div>
        <h1>{greeting}.</h1>
        <p className={styles.intro}>Your games, community and personal space — all one step away. Pick up where you want to go.</p>
      </header>

      <section className={styles.focus} aria-labelledby="today-focus-title">
        <div className={styles.focusMark} aria-hidden="true"><Compass size={23} /></div>
        <div className={styles.focusCopy}>
          <p className={styles.focusEyebrow}>YOUR PACE, YOUR SPACE</p>
          <h2 id="today-focus-title">Small steps still count.</h2>
          <p>There is no daily score to chase. Explore, connect or focus on something useful right now.</p>
        </div>
      </section>

      <section className={styles.launchSection} aria-labelledby="launch-spaces-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>QUICK LAUNCH</p>
            <h2 id="launch-spaces-title">Choose your next space</h2>
            <p>Move straight into the part of Sanctuary you came for.</p>
          </div>
        </div>
        <div className={styles.launchGrid}>
          {launchSpaces.map(({ title, description, target, icon: Icon, eyebrow, tone }) => (
            <button
              className={`${styles.launchCard} ${styles[tone]}`}
              type="button"
              key={target}
              onClick={() => onNavigate(target)}
            >
              <span className={styles.launchTopline}>
                <span className={styles.launchIcon}><Icon size={22} aria-hidden="true" /></span>
                <span className={styles.launchEyebrow}>{eyebrow}</span>
              </span>
              <span className={styles.launchTitle}>{title}</span>
              <span className={styles.launchDescription}>{description}</span>
              <span className={styles.launchFooter}>Open space <ArrowRight size={16} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.toolsSection} aria-labelledby="today-tools-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>YOUR TOOLKIT</p>
            <h2 id="today-tools-title">The things you use most</h2>
            <p>Personal tools and community essentials, without cluttering your screen.</p>
          </div>
        </div>
        <div className={styles.toolGrid}>
          {quickTools.map(({ title, description, target, icon: Icon }) => (
            <button className={styles.toolCard} type="button" key={target} onClick={() => onNavigate(target)}>
              <span className={styles.toolIcon}><Icon size={19} aria-hidden="true" /></span>
              <span className={styles.toolCopy}><strong>{title}</strong><span>{description}</span></span>
              <ArrowRight className={styles.toolArrow} size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
