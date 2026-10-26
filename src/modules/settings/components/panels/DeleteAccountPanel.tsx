'use client';

import { useState, type FormEvent } from 'react';
import type { SettingsErrorHandler } from '../settingsData';
import styles from '../SettingsHub.module.css';

interface DeleteAccountPanelProps {
  email: string;
  twoFactorEnabled: boolean;
  onDeleteAccount: (emailConfirmation: string, phrase: string, twoFactorCode: string) => Promise<void>;
  onError: SettingsErrorHandler;
}

export function DeleteAccountPanel({
  email,
  twoFactorEnabled,
  onDeleteAccount,
  onError,
}: DeleteAccountPanelProps) {
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteCode, setDeleteCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDeleting(true);
    try {
      await onDeleteAccount(deleteEmail, deletePhrase, deleteCode);
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The account could not be deleted.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className={`${styles.panel} ${styles.dangerPanel}`} aria-labelledby="delete-title">
      <h2 id="delete-title">Delete account</h2>
      <p className={styles.hint}>
        Your profile, posts, Shorts, events, and comments are hidden immediately. You then have seven
        days to sign in and restore the account. After the grace period, the account, wallet, unlocks,
        messages, and stored media are permanently purged. This cannot be undone after that date.
      </p>
      <form className={styles.linksForm} onSubmit={handleDelete}>
        <label className={styles.field}>
          <span>Confirm your account email</span>
          <input
            type="email"
            autoComplete="email"
            value={deleteEmail}
            onChange={(event) => setDeleteEmail(event.currentTarget.value)}
            required
          />
        </label>
        <label className={styles.field}>
          <span>Type DELETE to confirm</span>
          <input
            value={deletePhrase}
            onChange={(event) => setDeletePhrase(event.currentTarget.value)}
            required
          />
        </label>
        {twoFactorEnabled && (
          <label className={styles.field}>
            <span>Confirm your two-factor code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={deleteCode}
              onChange={(event) => setDeleteCode(event.currentTarget.value)}
              required
            />
          </label>
        )}
        <button
          className={styles.deleteButton}
          type="submit"
          disabled={
            isDeleting ||
            deletePhrase !== 'DELETE' ||
            deleteEmail.trim().toLowerCase() !== email.toLowerCase() ||
            (twoFactorEnabled && deleteCode.length !== 6)
          }
        >
          {isDeleting ? 'Scheduling deletion…' : 'Schedule account deletion'}
        </button>
      </form>
    </section>
  );
}
