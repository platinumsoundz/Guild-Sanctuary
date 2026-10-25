'use client';

import { useState, type FormEvent } from 'react';
import {
  isSupabaseAuthConfigured,
  lockPrivateProfileVault,
  savePrivateProfileVault,
  unlockPrivateProfileVault,
  type PrivateProfileData,
} from '@/modules/auth';
import styles from '../SettingsHub.module.css';

interface PrivateVaultPanelProps {
  userId: string;
}

export function PrivateVaultPanel({ userId }: PrivateVaultPanelProps) {
  const [vaultPassphrase, setVaultPassphrase] = useState('');
  const [vaultData, setVaultData] = useState<PrivateProfileData | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultStatus, setVaultStatus] = useState<string | null>(null);
  const [isVaultBusy, setIsVaultBusy] = useState(false);

  if (!isSupabaseAuthConfigured()) {
    return null;
  }

  const handleUnlockVault = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVaultError(null);
    setVaultStatus(null);
    setIsVaultBusy(true);
    try {
      setVaultData(await unlockPrivateProfileVault(userId, vaultPassphrase));
      setVaultPassphrase('');
      setVaultStatus('Private vault unlocked for this browser session.');
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : 'The private vault could not be unlocked.');
    } finally {
      setIsVaultBusy(false);
    }
  };

  const handleSaveVault = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vaultData) return;
    setVaultError(null);
    setVaultStatus(null);
    setIsVaultBusy(true);
    try {
      await savePrivateProfileVault(userId, vaultData);
      setVaultStatus('Encrypted private details saved.');
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : 'The private vault could not be saved.');
    } finally {
      setIsVaultBusy(false);
    }
  };

  const handleLockVault = () => {
    lockPrivateProfileVault(userId);
    setVaultData(null);
    setVaultPassphrase('');
    setVaultError(null);
    setVaultStatus('Private vault locked.');
  };

  return (
    <section className={styles.panel} aria-labelledby="vault-title">
      <h2 id="vault-title">Private profile vault</h2>
      <p className={styles.hint}>
        Encrypt optional details with a passphrase. The server stores ciphertext only, and the
        passphrase never leaves this browser. If you lose it, the vault cannot be recovered.
      </p>
      {vaultError && <p className={styles.error} role="alert">{vaultError}</p>}
      {vaultStatus && <p className={styles.hint} role="status">{vaultStatus}</p>}
      {!vaultData ? (
        <form className={styles.linksForm} onSubmit={(event) => void handleUnlockVault(event)}>
          <label className={styles.field}>
            <span>Vault passphrase</span>
            <input
              type="password"
              autoComplete="current-password"
              minLength={12}
              maxLength={256}
              value={vaultPassphrase}
              onChange={(event) => setVaultPassphrase(event.currentTarget.value)}
              required
            />
          </label>
          <button className={styles.primaryButton} type="submit" disabled={isVaultBusy}>
            {isVaultBusy ? 'Unlocking…' : 'Unlock vault'}
          </button>
        </form>
      ) : (
        <form className={styles.linksForm} onSubmit={(event) => void handleSaveVault(event)}>
          <label className={styles.field}>
            <span>Private bio</span>
            <textarea
              maxLength={4000}
              rows={3}
              value={vaultData.bio}
              onChange={(event) => setVaultData({ ...vaultData, bio: event.currentTarget.value })}
            />
          </label>
          <label className={styles.field}>
            <span>Private location</span>
            <input
              maxLength={4000}
              value={vaultData.location}
              onChange={(event) => setVaultData({ ...vaultData, location: event.currentTarget.value })}
            />
          </label>
          <label className={styles.field}>
            <span>Private notes</span>
            <textarea
              maxLength={4000}
              rows={3}
              value={vaultData.belief}
              onChange={(event) => setVaultData({ ...vaultData, belief: event.currentTarget.value })}
              placeholder="Only you can decrypt this after unlocking."
            />
          </label>
          <div className={styles.formActions}>
            <button className={styles.textButton} type="button" onClick={handleLockVault}>Lock vault</button>
            <button className={styles.primaryButton} type="submit" disabled={isVaultBusy}>
              {isVaultBusy ? 'Saving…' : 'Save encrypted details'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
