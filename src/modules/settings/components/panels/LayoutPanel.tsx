'use client';

import type { AccountPreferences } from '@/types/database';
import type { SettingsErrorHandler, UpdatePreferences } from '../settingsData';
import styles from '../SettingsHub.module.css';

interface LayoutPanelProps {
  layout: AccountPreferences['layout'];
  updatePreferences: UpdatePreferences;
  onError: SettingsErrorHandler;
}

export function LayoutPanel({ layout, updatePreferences, onError }: LayoutPanelProps) {
  const saveLayout = (nextLayout: AccountPreferences['layout']) => {
    void updatePreferences({ layout: nextLayout })
      .then(() => onError(null))
      .catch((error: unknown) => {
        onError(error instanceof Error ? error.message : 'The layout could not be saved.');
      });
  };

  return (
    <section className={styles.panel} aria-labelledby="layout-title">
      <h2 id="layout-title">Layout arrangement</h2>
      <div className={styles.layoutChoices}>
        <label>
          <input
            type="radio"
            name="layout"
            value="comfortable"
            checked={layout === 'comfortable'}
            onChange={() => saveLayout('comfortable')}
          />
          Comfortable
        </label>
        <label>
          <input
            type="radio"
            name="layout"
            value="compact"
            checked={layout === 'compact'}
            onChange={() => saveLayout('compact')}
          />
          Compact
        </label>
      </div>
    </section>
  );
}
