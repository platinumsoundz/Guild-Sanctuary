'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAuditEvents, type AuditEvent } from '../adminService';
import styles from '../ModerationDashboard.module.css';

export function AuditPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setEvents(await fetchAuditEvents(100, 0));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The audit log could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (isLoading) return <p role="status">Loading audit log…</p>;

  return (
    <section aria-label="Audit log">
      {error && <p className={styles.error} role="alert">{error}</p>}
      {events.length === 0 ? (
        <p className={styles.notice}>No audit events yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>When</th><th>Actor</th><th>Event</th><th>Subject</th><th>Details</th></tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.createdAt).toLocaleString()}</td>
                  <td>{event.actorUsername ?? event.actorId ?? 'system'}</td>
                  <td>{event.eventType}</td>
                  <td>{event.subjectType}{event.subjectId ? `:${event.subjectId.slice(0, 8)}` : ''}</td>
                  <td><code>{JSON.stringify(event.details)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
