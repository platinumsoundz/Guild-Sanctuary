'use client';

import { useState } from 'react';
import { Bell, CheckCheck, Info, X } from 'lucide-react';
import styles from './SanctuaryNotifications.module.css';

const previewItems = [
  { id: 'roadmap', title: 'The Sanctuary roadmap is now visible', detail: 'Planned systems and placeholders are listed with honest status labels.', time: 'Preview item' },
  { id: 'integration', title: 'Game integrations are still in progress', detail: 'Shared sign-in, saves and wallet spending are not connected yet.', time: 'Preview item' },
  { id: 'notifications', title: 'Notifications centre preview', detail: 'This panel is a UI placeholder until live notification events are wired up.', time: 'Preview item' },
];

export function SanctuaryNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const unreadCount = previewItems.filter((item) => !readIds.includes(item.id)).length;

  const markAllRead = () => setReadIds(previewItems.map((item) => item.id));

  return (
    <div className={styles.root}>
      <button className={styles.trigger} type="button" aria-label={`Notifications, ${unreadCount} unread preview items`} aria-expanded={isOpen} aria-haspopup="dialog" onClick={() => setIsOpen((open) => !open)}>
        <Bell size={17} aria-hidden="true" />
        <span>Notifications</span>
        {unreadCount > 0 && <span className={styles.count}>{unreadCount}</span>}
      </button>
      {isOpen && (
        <section className={styles.panel} role="dialog" aria-label="Notifications">
          <header className={styles.panelHeader}>
            <div><h2>Notifications</h2><p>Preview mode · not live event delivery</p></div>
            <button type="button" className={styles.close} aria-label="Close notifications" onClick={() => setIsOpen(false)}><X size={17} aria-hidden="true" /></button>
          </header>
          <div className={styles.banner}><Info size={15} aria-hidden="true" /><span>Sample system notices only. Messages, wallet events and alerts will appear here once the notification service is connected.</span></div>
          <div className={styles.items}>
            {previewItems.map((item) => {
              const isRead = readIds.includes(item.id);
              return (
                <article className={isRead ? styles.itemRead : styles.item} key={item.id}>
                  <span className={styles.dot} aria-hidden="true" />
                  <div className={styles.itemCopy}><h3>{item.title}</h3><p>{item.detail}</p><small>{item.time}</small></div>
                  {isRead && <span className={styles.readLabel}>Read</span>}
                </article>
              );
            })}
          </div>
          <footer className={styles.panelFooter}>
            <span>{unreadCount} unread preview items</span>
            <button type="button" onClick={markAllRead} disabled={unreadCount === 0}><CheckCheck size={14} aria-hidden="true" /> Mark all read</button>
          </footer>
        </section>
      )}
    </div>
  );
}
