'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Profile, ProfilePrivacy, SocialLinks } from '@/types/database';
import { useAccountSettings } from '../useAccountSettings';
import styles from './SettingsHub.module.css';

interface SettingsHubProps {
  userId: string;
  email: string;
  twoFactorEnabled: boolean;
  privacy: ProfilePrivacy;
  visibility: Profile['visibility'];
  socialLinks: SocialLinks;
  onUpdateProfile: (updates: Partial<Pick<Profile, 'privacy' | 'visibility' | 'socialLinks'>>) => void;
  onDeleteAccount: (emailConfirmation: string, phrase: string, twoFactorCode: string) => void;
}

const preferenceLabels = {
  allowProfileDiscovery: 'Include my profile in community discovery',
  allowDirectMessages: 'Allow direct messages',
  showOnlineStatus: 'Show my online status',
  emailNotifications: 'Email notifications',
  personalizedFeed: 'Personalize my feed',
} as const;

type ProfilePrivacyDisplayKey = Exclude<keyof ProfilePrivacy, 'allowDirectMessages'>;

const privacyLabels: Record<ProfilePrivacyDisplayKey, string> = {
  bio: 'Show my bio',
  location: 'Show my location',
  age: 'Show my age',
  starSign: 'Show my star sign',
  belief: 'Show my belief or philosophy',
  socialLinks: 'Show my connected social links',
};

const linkLabels: { key: keyof SocialLinks; label: string; host: string }[] = [
  { key: 'facebook', label: 'Facebook', host: 'facebook.com' },
  { key: 'x', label: 'X / Twitter', host: 'x.com or twitter.com' },
  { key: 'youtube', label: 'YouTube', host: 'youtube.com' },
  { key: 'xbox', label: 'Xbox gamertag', host: 'gamertag or xbox.com profile URL' },
  { key: 'playstation', label: 'PlayStation ID', host: 'Online ID or playstation.com profile URL' },
  { key: 'steam', label: 'Steam', host: 'username or steamcommunity.com profile URL' },
  { key: 'epicGames', label: 'Epic Games', host: 'display name or epicgames.com profile URL' },
  { key: 'reddit', label: 'Reddit', host: 'reddit.com/u/username' },
];

export function SettingsHub({
  userId,
  email,
  twoFactorEnabled,
  privacy,
  visibility,
  socialLinks,
  onUpdateProfile,
  onDeleteAccount,
}: SettingsHubProps) {
  const { settings, isLoading, error, updatePreferences, setError } = useAccountSettings(userId);
  const [linksDraft, setLinksDraft] = useState<SocialLinks>(socialLinks);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteCode, setDeleteCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.layout = settings.preferences.layout;
  }, [settings.preferences.layout]);

  const updatePreference = (key: keyof typeof preferenceLabels, value: boolean) => {
    try {
      updatePreferences({ [key]: value });
      if (key === 'allowProfileDiscovery') {
        onUpdateProfile({ visibility: value ? 'public' : 'private' });
      }
      if (key === 'allowDirectMessages') {
        onUpdateProfile({ privacy: { ...privacy, allowDirectMessages: value } });
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The setting could not be saved.');
    }
  };

  const handleSocialLinks = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const normalized: SocialLinks = {
        facebook: null,
        x: null,
        youtube: null,
        xbox: null,
        playstation: null,
        steam: null,
        epicGames: null,
        reddit: null,
      };
      for (const item of linkLabels) {
        const value = linksDraft[item.key]?.trim() ?? '';
        if (!value) continue;
        if (['xbox', 'playstation', 'steam', 'epicGames'].includes(item.key) &&
            /^[A-Za-z0-9_. -]{2,40}$/.test(value)) {
          normalized[item.key] = value;
          continue;
        }
        const url = new URL(value);
        const allowedHosts: Record<keyof SocialLinks, string[]> = {
          facebook: ['facebook.com', 'www.facebook.com'],
          x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
          youtube: ['youtube.com', 'www.youtube.com'],
          xbox: ['xbox.com', 'www.xbox.com'],
          playstation: ['playstation.com', 'www.playstation.com'],
          steam: ['steamcommunity.com', 'www.steamcommunity.com'],
          epicGames: ['epicgames.com', 'www.epicgames.com'],
          reddit: ['reddit.com', 'www.reddit.com', 'old.reddit.com'],
        };
        const validHost = allowedHosts[item.key].includes(url.hostname);
        if (url.protocol !== 'https:' || !validHost) {
          throw new Error(`Enter a secure ${item.label} profile URL (${item.host}).`);
        }
        normalized[item.key] = url.toString();
      }
      onUpdateProfile({ socialLinks: normalized });
      setLinksDraft(normalized);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Social links could not be saved.');
    }
  };

  const handleDelete = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDeleting(true);
    try {
      onDeleteAccount(deleteEmail, deletePhrase, deleteCode);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The account could not be deleted.');
      setIsDeleting(false);
    }
  };

  return (
    <main className={styles.settings}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>YOUR ACCOUNT</p>
        <h1>Settings &amp; customization</h1>
        <p>Manage your preferences, privacy, social links, and account.</p>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {isLoading ? <p className={styles.status} role="status">Loading settings…</p> : (
        <>
          <section className={styles.panel} aria-labelledby="preferences-title">
            <h2 id="preferences-title">Account preferences</h2>
            <div className={styles.toggleList}>
              {(Object.entries(preferenceLabels) as [keyof typeof preferenceLabels, string][]).map(([key, label]) => (
                <label className={styles.toggleRow} key={key}>
                  <span>{label}</span>
                  <input type="checkbox" checked={settings.preferences[key]} onChange={(event) => updatePreference(key, event.currentTarget.checked)} />
                </label>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="privacy-title">
            <h2 id="privacy-title">Profile privacy</h2>
            <label className={styles.toggleRow}>
              <span>Profile visibility</span>
              <select value={visibility} onChange={(event) => {
                const selectedVisibility = event.currentTarget.value;
                if (selectedVisibility !== 'public' && selectedVisibility !== 'private') return;
                const nextVisibility = selectedVisibility;
                try {
                  updatePreferences({ allowProfileDiscovery: nextVisibility === 'public' });
                  onUpdateProfile({ visibility: nextVisibility });
                } catch (saveError) {
                  setError(saveError instanceof Error ? saveError.message : 'The setting could not be saved.');
                }
              }}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
            <div className={styles.toggleList}>
              {(Object.entries(privacyLabels) as [ProfilePrivacyDisplayKey, string][]).map(([key, label]) => (
                <label className={styles.toggleRow} key={key}>
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={privacy[key]}
                    onChange={(event) => {
                      try {
                        onUpdateProfile({ privacy: { ...privacy, [key]: event.currentTarget.checked } });
                        setError(null);
                      } catch (saveError) {
                        setError(saveError instanceof Error ? saveError.message : 'The privacy setting could not be saved.');
                      }
                    }}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="social-title">
            <h2 id="social-title">Social links</h2>
            <p className={styles.hint}>Use HTTPS profile links. Your links are only public when profile privacy allows them.</p>
            <form className={styles.linksForm} onSubmit={handleSocialLinks}>
              {linkLabels.map((item) => (
                <label className={styles.field} key={item.key}>
                  <span>{item.label}</span>
                  <input
                    type="text"
                    maxLength={300}
                    autoComplete="url"
                    value={linksDraft[item.key] ?? ''}
                    onChange={(event) => setLinksDraft({ ...linksDraft, [item.key]: event.currentTarget.value || null })}
                    placeholder={['xbox', 'playstation', 'steam', 'epicGames'].includes(item.key)
                      ? item.host
                      : `https://${item.host}/your-profile`}
                  />
                </label>
              ))}
              <button className={styles.primaryButton} type="submit">Save social links</button>
            </form>
          </section>

          <section className={styles.panel} aria-labelledby="layout-title">
            <h2 id="layout-title">Layout arrangement</h2>
            <div className={styles.layoutChoices}>
              <label><input type="radio" name="layout" value="comfortable" checked={settings.preferences.layout === 'comfortable'} onChange={() => updatePreferences({ layout: 'comfortable' })} /> Comfortable</label>
              <label><input type="radio" name="layout" value="compact" checked={settings.preferences.layout === 'compact'} onChange={() => updatePreferences({ layout: 'compact' })} /> Compact</label>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.dangerPanel}`} aria-labelledby="delete-title">
            <h2 id="delete-title">Delete account</h2>
            <p className={styles.hint}>This permanently removes your local demo account and signs you out. This prototype cannot securely erase server data.</p>
            <form className={styles.linksForm} onSubmit={handleDelete}>
              <label className={styles.field}>
                <span>Confirm your account email</span>
                <input type="email" autoComplete="email" value={deleteEmail} onChange={(event) => setDeleteEmail(event.currentTarget.value)} required />
              </label>
              <label className={styles.field}>
                <span>Type DELETE to confirm</span>
                <input value={deletePhrase} onChange={(event) => setDeletePhrase(event.currentTarget.value)} required />
              </label>
              {twoFactorEnabled && (
                <label className={styles.field}>
                  <span>Confirm your two-factor code</span>
                  <input inputMode="numeric" autoComplete="one-time-code" value={deleteCode} onChange={(event) => setDeleteCode(event.currentTarget.value)} required />
                </label>
              )}
              <button className={styles.deleteButton} type="submit" disabled={isDeleting || deletePhrase !== 'DELETE' || deleteEmail.trim().toLowerCase() !== email.toLowerCase() || (twoFactorEnabled && deleteCode.length !== 6)}>
                Permanently delete account
              </button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
