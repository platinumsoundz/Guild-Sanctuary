'use client';

import { useEffect } from 'react';
import type { Profile, ProfilePrivacy, SocialLinks } from '@/types/database';
import { useAccountSettings } from '../useAccountSettings';
import type { PreferenceKey, ProfileUpdate } from './settingsData';
import { AdvertisingPanel } from './panels/AdvertisingPanel';
import { AppealsPanel } from './panels/AppealsPanel';
import { DeleteAccountPanel } from './panels/DeleteAccountPanel';
import { LayoutPanel } from './panels/LayoutPanel';
import { PreferencesPanel } from './panels/PreferencesPanel';
import { PrivacyPanel } from './panels/PrivacyPanel';
import { PrivateVaultPanel } from './panels/PrivateVaultPanel';
import { SocialLinksPanel } from './panels/SocialLinksPanel';
import styles from './SettingsHub.module.css';

interface SettingsHubProps {
  userId: string;
  email: string;
  twoFactorEnabled: boolean;
  privacy: ProfilePrivacy;
  visibility: Profile['visibility'];
  socialLinks: SocialLinks;
  onUpdateProfile: (updates: ProfileUpdate) => Promise<void>;
  onDeleteAccount: (emailConfirmation: string, phrase: string, twoFactorCode: string) => Promise<void>;
}

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

  useEffect(() => {
    document.documentElement.dataset.layout = settings.preferences.layout;
  }, [settings.preferences.layout]);

  const updatePreference = async (key: PreferenceKey, value: boolean) => {
    try {
      await updatePreferences({ [key]: value });
      if (key === 'allowProfileDiscovery') {
        await onUpdateProfile({ visibility: value ? 'public' : 'private' });
      }
      if (key === 'allowDirectMessages') {
        await onUpdateProfile({ privacy: { ...privacy, allowDirectMessages: value } });
      }
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The setting could not be saved.');
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
          <PreferencesPanel
            preferences={settings.preferences}
            onUpdatePreference={updatePreference}
          />
          <AdvertisingPanel />
          <PrivacyPanel
            privacy={privacy}
            visibility={visibility}
            updatePreferences={updatePreferences}
            onUpdateProfile={onUpdateProfile}
            onError={setError}
          />
          <SocialLinksPanel
            socialLinks={socialLinks}
            onUpdateProfile={onUpdateProfile}
            onError={setError}
          />
          <PrivateVaultPanel userId={userId} />
          <AppealsPanel onError={setError} />
          <LayoutPanel
            layout={settings.preferences.layout}
            updatePreferences={updatePreferences}
            onError={setError}
          />
          <DeleteAccountPanel
            email={email}
            twoFactorEnabled={twoFactorEnabled}
            onDeleteAccount={onDeleteAccount}
            onError={setError}
          />
        </>
      )}
    </main>
  );
}
