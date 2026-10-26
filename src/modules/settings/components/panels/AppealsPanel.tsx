'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { fetchMyAppeals, submitModerationAppeal } from '@/modules/moderation';
import type { ModerationAppealRow } from '@/services/supabase/database.types';
import type { SettingsErrorHandler } from '../settingsData';
import styles from '../SettingsHub.module.css';

interface AppealsPanelProps {
  onError: SettingsErrorHandler;
}

export function AppealsPanel({ onError }: AppealsPanelProps) {
  const [appeals, setAppeals] = useState<ModerationAppealRow[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyAppeals()
      .then((rows) => { if (!cancelled) setAppeals(rows); })
      .catch(() => { if (!cancelled) setAppeals([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);
    try {
      await submitModerationAppeal(null, message);
      setMessage('');
      setAppeals(await fetchMyAppeals());
      setNotice('Your appeal was submitted for moderator review.');
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Your appeal could not be submitted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="appeals-title">
      <h2 id="appeals-title">Appeals</h2>
      <p className={styles.hint}>
        If a moderation action was applied to your account, you can ask for a review here. Include the
        decision you are appealing and why. Abuse of the appeal process may limit future appeals.
      </p>
      <form className={styles.linksForm} onSubmit={(event) => void submit(event)}>
        <label className={styles.field}>
          <span>Appeal message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.currentTarget.value)}
            minLength={10}
            maxLength={2000}
            rows={4}
            placeholder="Explain which decision you are appealing and why."
            required
          />
        </label>
        <button className={styles.primaryButton} type="submit" disabled={isSubmitting || message.trim().length < 10}>
          {isSubmitting ? 'Submitting…' : 'Submit appeal'}
        </button>
      </form>
      {notice && <p className={styles.status} role="status">{notice}</p>}
      {isLoading ? (
        <p className={styles.status} role="status">Loading your appeals…</p>
      ) : appeals.length > 0 ? (
        <ul className={styles.appealList}>
          {appeals.map((appeal) => (
            <li key={appeal.id}>
              <div>
                <strong>{appeal.status}</strong>
                <time dateTime={appeal.created_at}>{new Date(appeal.created_at).toLocaleDateString('en-GB')}</time>
              </div>
              <p>{appeal.message}</p>
              {appeal.resolution_notes && <p className={styles.hint}>Moderator note: {appeal.resolution_notes}</p>}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
