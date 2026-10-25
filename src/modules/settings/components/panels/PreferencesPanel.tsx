'use client';

import type { AccountPreferences } from '@/types/database';
import { preferenceLabels, type PreferenceKey } from '../settingsData';
import styles from '../SettingsHub.module.css';

interface PreferencesPanelProps {
  preferences: AccountPreferences;
  onUpdatePreference: (key: PreferenceKey, value: boolean) => void | Promise<void>;
}

export function PreferencesPanel({ preferences, onUpdatePreference }: PreferencesPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="preferences-title">
      <h2 id="preferences-title">Account preferences</h2>
      <div className={styles.toggleList}>
        {(Object.entries(preferenceLabels) as [PreferenceKey, string][]).map(([key, label]) => (
          <label className={styles.toggleRow} key={key}>
            <span>{label}</span>
            <input
              type="checkbox"
              checked={preferences[key]}
              onChange={(event) => void onUpdatePreference(key, event.currentTarget.checked)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
