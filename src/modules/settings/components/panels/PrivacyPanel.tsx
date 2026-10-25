'use client';

import type { Profile, ProfilePrivacy } from '@/types/database';
import {
  privacyLabels,
  type ProfilePrivacyDisplayKey,
  type ProfileUpdate,
  type SettingsErrorHandler,
  type UpdatePreferences,
} from '../settingsData';
import styles from '../SettingsHub.module.css';

interface PrivacyPanelProps {
  privacy: ProfilePrivacy;
  visibility: Profile['visibility'];
  updatePreferences: UpdatePreferences;
  onUpdateProfile: (updates: ProfileUpdate) => Promise<void>;
  onError: SettingsErrorHandler;
}

export function PrivacyPanel({
  privacy,
  visibility,
  updatePreferences,
  onUpdateProfile,
  onError,
}: PrivacyPanelProps) {
  const saveError = (error: unknown, fallback: string) => {
    onError(error instanceof Error ? error.message : fallback);
  };

  return (
    <section className={styles.panel} aria-labelledby="privacy-title">
      <h2 id="privacy-title">Profile privacy</h2>
      <label className={styles.toggleRow}>
        <span>Profile visibility</span>
        <select
          value={visibility}
          onChange={(event) => {
            const selectedVisibility = event.currentTarget.value;
            if (selectedVisibility !== 'public' && selectedVisibility !== 'private') return;
            const nextVisibility = selectedVisibility;
            void (async () => {
              try {
                await updatePreferences({ allowProfileDiscovery: nextVisibility === 'public' });
                await onUpdateProfile({ visibility: nextVisibility });
                onError(null);
              } catch (error) {
                saveError(error, 'The setting could not be saved.');
              }
            })();
          }}
        >
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
                const checked = event.currentTarget.checked;
                void (async () => {
                  try {
                    await onUpdateProfile({ privacy: { ...privacy, [key]: checked } });
                    onError(null);
                  } catch (error) {
                    saveError(error, 'The privacy setting could not be saved.');
                  }
                })();
              }}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
