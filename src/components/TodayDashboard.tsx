'use client';

import { ArrowRight, CalendarDays, Compass, MessageCircle, WalletCards } from 'lucide-react';
import type { NavigationState } from '@/context/AppContext';
import styles from './TodayDashboard.module.css';

const quickLinks: { title: string; description: string; target: NavigationState; icon: typeof CalendarDays }[] = [
  { title: 'Daily Planner', description: 'Organise tasks, habits, notes and your schedule.', target: 'planner', icon: CalendarDays },
  { title: 'Community', description: 'See what people are sharing and join a conversation.', target: 'feed', icon: MessageCircle },
  { title: 'Wallet', description: 'Check your token balance and purchase history.', target: 'wallet', icon: WalletCards },
];

export function TodayDashboard({ onNavigate }: { onNavigate: (navigation: NavigationState) => void }) {
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(now);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>THE SANCTUARY</p>
        <h1>Today</h1>
        <p className={styles.date}>{dateLabel}</p>
        <p className={styles.intro}>A calm starting point for your day. Choose what you need, then head straight to the place designed for it.</p>
      </header>

      <section className={styles.focus} aria-labelledby="today-focus-title">
        <div className={styles.focusMark} aria-hidden="true"><Compass size={23} /></div>
        <div>
          <p className={styles.focusEyebrow}>A MOMENT FOR YOURSELF</p>
          <h2 id="today-focus-title">Small steps still count.</h2>
          <p>There is no daily score to chase. Start with whatever feels useful right now.</p>
        </div>
      </section>

      <section className={styles.links} aria-labelledby="today-links-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="today-links-title">Where would you like to go?</h2>
            <p>Each space has its own purpose, so you only see the tools you need there.</p>
          </div>
        </div>
        <div className={styles.linkGrid}>
          {quickLinks.map(({ title, description, target, icon: Icon }) => (
            <button className={styles.linkCard} type="button" key={target} onClick={() => onNavigate(target)}>
              <span className={styles.linkIcon}><Icon size={20} aria-hidden="true" /></span>
              <span className={styles.linkCopy}><strong>{title}</strong><span>{description}</span></span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
