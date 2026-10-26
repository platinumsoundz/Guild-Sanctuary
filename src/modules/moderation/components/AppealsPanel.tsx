'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAppeals, resolveAppeal, type AdminAppeal } from '../appealService';
import styles from '../ModerationDashboard.module.css';

export function AppealsPanel() {
  const [appeals, setAppeals] = useState<AdminAppeal[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setAppeals(await fetchAppeals('open'));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Appeals could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const resolve = async (appeal: AdminAppeal, status: 'reviewing' | 'resolved' | 'denied') => {
    setBusyId(appeal.id);
    setError(null);
    try {
      await resolveAppeal(appeal.id, status, notes[appeal.id] ?? '');
      if (status !== 'reviewing') {
        setAppeals((current) => current.filter((item) => item.id !== appeal.id));
      }
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : 'The appeal could not be updated.');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return <p role="status">Loading appeals…</p>;

  return (
    <section className={styles.queue} aria-label="Open appeals">
      {error && <p className={styles.error} role="alert">{error}</p>}
      {appeals.length === 0 ? (
        <p className={styles.notice}>No open appeals.</p>
      ) : appeals.map((appeal) => (
        <article className={styles.report} key={appeal.id}>
          <div className={styles.reportHeader}>
            <strong>{appeal.display_name} (@{appeal.username})</strong>
            <time dateTime={appeal.created_at}>{new Date(appeal.created_at).toLocaleString()}</time>
          </div>
          <p>{appeal.message}</p>
          <label className={styles.rationale}>
            <span>Resolution notes</span>
            <textarea
              value={notes[appeal.id] ?? ''}
              onChange={(event) => setNotes((current) => ({ ...current, [appeal.id]: event.currentTarget.value }))}
              minLength={3}
              maxLength={2000}
              rows={2}
            />
          </label>
          <div className={styles.actions}>
            <button disabled={busyId === appeal.id || (notes[appeal.id]?.trim().length ?? 0) < 3} onClick={() => void resolve(appeal, 'resolved')}>Uphold appeal</button>
            <button disabled={busyId === appeal.id || (notes[appeal.id]?.trim().length ?? 0) < 3} onClick={() => void resolve(appeal, 'denied')}>Deny appeal</button>
            <button disabled={busyId === appeal.id} onClick={() => void resolve(appeal, 'reviewing')}>Mark reviewing</button>
          </div>
        </article>
      ))}
    </section>
  );
}
