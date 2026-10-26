'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchModerationAccess, type ModerationAccess } from './service';
import { AppealsPanel } from './components/AppealsPanel';
import { AuditPanel } from './components/AuditPanel';
import { MembersPanel } from './components/MembersPanel';
import { ReportsPanel } from './components/ReportsPanel';
import { ReviewsPanel } from './components/ReviewsPanel';
import styles from './ModerationDashboard.module.css';

type ModerationTab = 'reports' | 'members' | 'appeals' | 'reviews' | 'audit';

const tabs: { id: ModerationTab; label: string }[] = [
  { id: 'reports', label: 'Reports' },
  { id: 'members', label: 'Members' },
  { id: 'appeals', label: 'Appeals' },
  { id: 'reviews', label: 'Refund reviews' },
  { id: 'audit', label: 'Audit log' },
];

export function ModerationDashboard() {
  const [access, setAccess] = useState<ModerationAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ModerationTab>('reports');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setAccess(await fetchModerationAccess());
      setError(null);
    } catch (loadError) {
      setAccess(null);
      setError(loadError instanceof Error ? loadError.message : 'Moderation access could not be checked.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <main className={styles.dashboard}>
      <header>
        <p className={styles.eyebrow}>TRUST &amp; SAFETY</p>
        <h1>Moderation &amp; administration</h1>
        <p>Review reports, manage members and roles, handle appeals and refund reviews, and inspect the audit log.</p>
      </header>

      {isLoading ? (
        <p role="status">Loading moderation access…</p>
      ) : !access ? (
        <>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <p className={styles.notice}>This area is restricted to active moderators and administrators.</p>
        </>
      ) : (
        <>
          <nav className={styles.tabs} aria-label="Moderation sections">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          {tab === 'reports' && <ReportsPanel />}
          {tab === 'members' && <MembersPanel role={access.role} currentUserId={access.userId} />}
          {tab === 'appeals' && <AppealsPanel />}
          {tab === 'reviews' && <ReviewsPanel />}
          {tab === 'audit' && <AuditPanel />}
        </>
      )}
    </main>
  );
}
